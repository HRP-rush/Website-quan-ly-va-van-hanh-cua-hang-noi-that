const { sql, getPool } = require("../config/db");

const PHI_GIAO_HANG = 300000;

const phuongThucThanhToan = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
  online: "Thanh toán trực tuyến"
};

function loi(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function thongTinGiaoNhanHopLe(information) {
  if (!information || typeof information !== "object") return false;
  const dienThoai = String(information.soDienThoai || "");

  return (
    typeof information.hoTen === "string" &&
    information.hoTen.trim().length >= 2 &&
    information.hoTen.trim().length <= 150 &&
    /^(?:0(?:2\d{8,9}|[35789]\d{8})|\+84(?:2\d{8,9}|[35789]\d{8}))$/.test(dienThoai) &&
    typeof information.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(information.email.trim()) &&
    typeof information.diaChiGiao === "string" &&
    information.diaChiGiao.trim().length >= 5 &&
    information.diaChiGiao.trim().length <= 500
  );
}

async function taoDonHang(req, res) {
  const body = req.body || {};
  const information = body.thongTinGiaoNhan;
  const paymentCode = body.phuongThucThanhToan;
  if (
    !thongTinGiaoNhanHopLe(information) ||
    !Object.prototype.hasOwnProperty.call(phuongThucThanhToan, paymentCode)
  ) {
    return res.status(400).json({
      success: false,
      message: "Thông tin giao nhận hoặc phương thức thanh toán không hợp lệ."
    });
  }

  let transaction;
  let transactionStarted = false;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;

    const cart = await new sql.Request(transaction)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .input("ttChoXacNhan", sql.NVarChar(40), "Chờ xác nhận")
      .input("ttDaXacNhan", sql.NVarChar(40), "Đã xác nhận")
      .input("ttDangChuanBi", sql.NVarChar(40), "Đang chuẩn bị")
      .input("ttDangGiao", sql.NVarChar(40), "Đang giao")
      .query(`
        SELECT
          ct.MaCTGio,
          ct.MaBienThe,
          ct.SoLuong,
          b.SKU,
          b.MauSac,
          b.ChatLieu,
          b.KichThuoc,
          b.GiaBan,
          b.TrangThai AS TrangThaiBienThe,
          sp.TenSanPham,
          sp.TrangThai AS TrangThaiSanPham,
          ISNULL(t.SoLuongTon, 0) AS SoLuongTon,
          ISNULL(g.DaGiu, 0) AS DaGiu
        FROM dbo.GioHang gh WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.CTGioHang ct WITH (UPDLOCK, HOLDLOCK) ON ct.MaGio = gh.MaGio
        INNER JOIN dbo.BienTheSanPham b ON b.MaBienThe = ct.MaBienThe
        INNER JOIN dbo.SanPham sp ON sp.MaSanPham = b.MaSanPham
        LEFT JOIN dbo.TonKho t WITH (UPDLOCK, HOLDLOCK) ON t.MaBienThe = b.MaBienThe
        OUTER APPLY (
          SELECT SUM(dct.SoLuong) AS DaGiu
          FROM dbo.CTDonHang dct
          INNER JOIN dbo.DonHang dh ON dh.MaDon = dct.MaDon
          WHERE dct.MaBienThe = b.MaBienThe
            AND dh.TrangThai IN (@ttChoXacNhan, @ttDaXacNhan, @ttDangChuanBi, @ttDangGiao)
        ) g
        WHERE gh.MaNguoiDung = @maNguoiDung
        ORDER BY ct.MaCTGio
      `);

    const items = cart.recordset;
    if (!items.length) throw loi(409, "Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi đặt hàng.");

    for (const item of items) {
      const available = Math.max(Number(item.SoLuongTon) - Number(item.DaGiu || 0), 0);
      if (item.TrangThaiBienThe !== "Đang bán" || item.TrangThaiSanPham !== "Đang bán") {
        throw loi(409, `Sản phẩm ${item.TenSanPham} hiện không còn được kinh doanh.`);
      }
      if (Number(item.SoLuong) > available) {
        throw loi(409, `Sản phẩm ${item.TenSanPham} chỉ còn ${available} sản phẩm trong kho.`);
      }
    }

    const tienHang = items.reduce(
      (sum, item) => sum + Number(item.GiaBan) * Number(item.SoLuong),
      0
    );
    const phiGiao = PHI_GIAO_HANG;
    const tongThanhToan = tienHang + phiGiao;

    const orderResult = await new sql.Request(transaction)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .input("tenNguoiNhan", sql.NVarChar(150), information.hoTen.trim())
      .input("sdtNhan", sql.VarChar(20), information.soDienThoai)
      .input("diaChiGiao", sql.NVarChar(500), information.diaChiGiao.trim())
      .input("tienHang", sql.Decimal(18, 2), tienHang)
      .input("phiGiao", sql.Decimal(18, 2), phiGiao)
      .input("tongThanhToan", sql.Decimal(18, 2), tongThanhToan)
      .query(`
        INSERT INTO dbo.DonHang (
          MaNguoiDung, TrangThai, TenNguoiNhan, SDTNhan, DiaChiGiao,
          TienHang, PhiGiao, GiamGia, TongThanhToan
        )
        OUTPUT INSERTED.MaDon
        VALUES (
          @maNguoiDung, N'Chờ xác nhận', @tenNguoiNhan, @sdtNhan, @diaChiGiao,
          @tienHang, @phiGiao, 0, @tongThanhToan
        )
      `);
    const order = orderResult.recordset[0];
    if (!order) throw new Error("Không nhận được mã đơn hàng sau khi tạo đơn.");
    const orderDateResult = await new sql.Request(transaction)
      .input("maDon", sql.Int, order.MaDon)
      .query("SELECT CONVERT(varchar(19), NgayDat, 126) AS NgayDat FROM dbo.DonHang WHERE MaDon = @maDon");
    const createdAt = orderDateResult.recordset[0]?.NgayDat;
    if (!createdAt) throw new Error("Không đọc được thời gian tạo đơn hàng.");

    await new sql.Request(transaction)
      .input("maDon", sql.Int, order.MaDon)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .input("trangThaiMoi", sql.NVarChar(40), "Chờ xác nhận")
      .query(`
        INSERT INTO dbo.LichSuTrangThaiDon (MaDon, MaNguoiDung, TrangThaiCu, TrangThaiMoi)
        VALUES (@maDon, @maNguoiDung, NULL, @trangThaiMoi)
      `);

    await new sql.Request(transaction)
      .input("maDon", sql.Int, order.MaDon)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        INSERT INTO dbo.CTDonHang (
          MaDon, MaBienThe, TenSanPhamSnapshot, CauHinhSnapshot,
          SKUSnapshot, GiaBanSnapshot, SoLuong, ThanhTien
        )
        SELECT
          @maDon,
          b.MaBienThe,
          sp.TenSanPham,
          CONCAT(
            COALESCE(NULLIF(b.MauSac, N''), N''),
            CASE WHEN NULLIF(b.ChatLieu, N'') IS NULL THEN N'' ELSE N' / ' + b.ChatLieu END,
            CASE WHEN NULLIF(b.KichThuoc, N'') IS NULL THEN N'' ELSE N' / ' + b.KichThuoc END
          ),
          b.SKU,
          b.GiaBan,
          ct.SoLuong,
          b.GiaBan * ct.SoLuong
        FROM dbo.GioHang gh
        INNER JOIN dbo.CTGioHang ct ON ct.MaGio = gh.MaGio
        INNER JOIN dbo.BienTheSanPham b ON b.MaBienThe = ct.MaBienThe
        INNER JOIN dbo.SanPham sp ON sp.MaSanPham = b.MaSanPham
        WHERE gh.MaNguoiDung = @maNguoiDung
      `);

    await new sql.Request(transaction)
      .input("maDon", sql.Int, order.MaDon)
      .input("phuongThuc", sql.NVarChar(50), phuongThucThanhToan[paymentCode])
      .input("soTien", sql.Decimal(18, 2), tongThanhToan)
      .query(`
        INSERT INTO dbo.ThanhToan (MaDon, PhuongThuc, SoTien, TrangThai)
        VALUES (@maDon, @phuongThuc, @soTien, N'Chờ thanh toán')
      `);

    await new sql.Request(transaction)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        DELETE ct
        FROM dbo.CTGioHang ct
        INNER JOIN dbo.GioHang gh ON gh.MaGio = ct.MaGio
        WHERE gh.MaNguoiDung = @maNguoiDung
      `);

    await transaction.commit();
    transactionStarted = false;

    const datePart = createdAt.slice(0, 10).replace(/-/g, "");

    return res.status(201).json({
      success: true,
      message: "Đơn hàng đã được ghi nhận.",
      data: {
        MaDon: order.MaDon,
        MaDonHienThi: `MA-${datePart}-${String(order.MaDon).padStart(3, "0")}`,
        NgayDat: createdAt,
        TrangThaiDon: "Chờ xác nhận",
        TrangThaiThanhToan: "Chờ thanh toán",
        PhuongThucThanhToan: phuongThucThanhToan[paymentCode],
        TienHang: tienHang,
        PhiGiao: phiGiao,
        GiamGia: 0,
        TongThanhToan: tongThanhToan,
        items: items.map((item) => ({
          TenSanPham: item.TenSanPham,
          SKU: item.SKU,
          MauSac: item.MauSac,
          ChatLieu: item.ChatLieu,
          KichThuoc: item.KichThuoc,
          GiaBan: Number(item.GiaBan),
          SoLuong: Number(item.SoLuong)
        }))
      }
    });
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error("Lỗi tạo đơn hàng:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể ghi nhận đơn hàng. Vui lòng thử lại."
    });
  }
}

const TRANG_THAI_DON = ["Chờ xác nhận", "Đã xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn tất"];

function taoMaDonHienThi(maDon, ngayDat) {
  const datePart = typeof ngayDat === "string" && /^\d{4}-\d{2}-\d{2}/.test(ngayDat)
    ? ngayDat.slice(0, 10).replace(/-/g, "")
    : null;
  const d = datePart ? null : new Date(ngayDat);
  const ngay = datePart || [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("");
  return `MA-${ngay}-${String(maDon).padStart(3, "0")}`;
}

async function layLichSuDonHang(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        SELECT dh.MaDon, CONVERT(varchar(19), dh.NgayDat, 126) AS NgayDat, dh.TrangThai, dh.TienHang, dh.PhiGiao,
               dh.GiamGia, dh.TongThanhToan,
               tt.PhuongThuc AS PhuongThucThanhToan, tt.TrangThai AS TrangThaiThanhToan,
               ct.TenSanPhamSnapshot AS TenSanPham, ct.CauHinhSnapshot AS CauHinh,
               ct.SKUSnapshot AS SKU, ct.GiaBanSnapshot AS GiaBan, ct.SoLuong,
               ct.ThanhTien,
               (SELECT TOP (1) a.DuongDan FROM dbo.AnhSanPham a
                INNER JOIN dbo.BienTheSanPham b ON b.MaSanPham = a.MaSanPham
                WHERE b.MaBienThe = ct.MaBienThe ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC) AS DuongDanAnh
        FROM dbo.DonHang dh
        LEFT JOIN dbo.CTDonHang ct ON ct.MaDon = dh.MaDon
        OUTER APPLY (SELECT TOP (1) PhuongThuc, TrangThai FROM dbo.ThanhToan WHERE MaDon = dh.MaDon ORDER BY MaThanhToan DESC) tt
        WHERE dh.MaNguoiDung = @maNguoiDung
        ORDER BY dh.NgayDat DESC, dh.MaDon DESC
      `);
      const ordersById = new Map();
      for (const row of result.recordset) {
        if (!ordersById.has(row.MaDon)) {
          ordersById.set(row.MaDon, {
            MaDon: row.MaDon,
            MaDonHienThi: taoMaDonHienThi(row.MaDon, row.NgayDat),
            NgayDat: row.NgayDat,
            TrangThai: row.TrangThai,
            TienHang: row.TienHang,
            PhiGiao: row.PhiGiao,
            GiamGia: row.GiamGia,
            TongThanhToan: row.TongThanhToan,
            PhuongThucThanhToan: row.PhuongThucThanhToan,
            TrangThaiThanhToan: row.TrangThaiThanhToan,
            items: []
          });
        }
        if (row.SKU) ordersById.get(row.MaDon).items.push({
          TenSanPham: row.TenSanPham,
          CauHinh: row.CauHinh,
          SKU: row.SKU,
          GiaBan: row.GiaBan,
          SoLuong: row.SoLuong,
          ThanhTien: row.ThanhTien,
          DuongDanAnh: row.DuongDanAnh
        });
      }
      return res.json({ success: true, data: [...ordersById.values()].map((order) => ({
        ...order,
        SoSanPham: order.items.length
      })) });
  } catch (error) {
    console.error("Lỗi tra cứu lịch sử đơn hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tải lịch sử đơn hàng." });
  }
}

async function theoDoiDonHang(req, res) {
  const maDon = Number(req.params.id);
  if (!Number.isSafeInteger(maDon) || maDon <= 0) {
    return res.status(400).json({ success: false, message: "Mã đơn hàng không hợp lệ." });
  }
  try {
    const pool = await getPool();
    const orderResult = await pool.request()
      .input("maDon", sql.Int, maDon)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        SELECT dh.MaDon, CONVERT(varchar(19), dh.NgayDat, 126) AS NgayDat, dh.TrangThai, dh.TenNguoiNhan, dh.SDTNhan, dh.DiaChiGiao,
               dh.TienHang, dh.PhiGiao, dh.GiamGia, dh.TongThanhToan,
               tt.PhuongThuc AS PhuongThucThanhToan, tt.TrangThai AS TrangThaiThanhToan
        FROM dbo.DonHang dh
        OUTER APPLY (SELECT TOP (1) PhuongThuc, TrangThai FROM dbo.ThanhToan WHERE MaDon = dh.MaDon ORDER BY MaThanhToan DESC) tt
        WHERE dh.MaDon = @maDon AND dh.MaNguoiDung = @maNguoiDung
      `);
    const order = orderResult.recordset[0];
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });

    const [itemsResult, historyResult] = await Promise.all([
      pool.request().input("maDon", sql.Int, maDon).query(`
        SELECT ct.TenSanPhamSnapshot AS TenSanPham, ct.CauHinhSnapshot AS CauHinh,
               ct.SKUSnapshot AS SKU, ct.GiaBanSnapshot AS GiaBan, ct.SoLuong, ct.ThanhTien,
               (SELECT TOP (1) a.DuongDan FROM dbo.AnhSanPham a
                INNER JOIN dbo.BienTheSanPham b ON b.MaSanPham = a.MaSanPham
                WHERE b.MaBienThe = ct.MaBienThe ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC) AS DuongDanAnh
        FROM dbo.CTDonHang ct WHERE ct.MaDon = @maDon ORDER BY ct.MaCTDon
      `),
      pool.request().input("maDon", sql.Int, maDon).query(`
        SELECT TrangThaiCu, TrangThaiMoi, CONVERT(varchar(19), ThoiDiem, 126) AS ThoiDiem
        FROM dbo.LichSuTrangThaiDon WHERE MaDon = @maDon ORDER BY ThoiDiem, MaLichSu
      `)
    ]);
    return res.json({ success: true, data: {
      ...order,
      MaDonHienThi: taoMaDonHienThi(order.MaDon, order.NgayDat),
      items: itemsResult.recordset,
      lichSu: historyResult.recordset
    } });
  } catch (error) {
    console.error("Lỗi theo dõi đơn hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tải thông tin đơn hàng." });
  }
}

async function locDonHangTheoTrangThai(req, res) {
  const trangThai = String(req.query.trangThai || "Chờ xác nhận").trim();
  if (!TRANG_THAI_DON.includes(trangThai)) {
    return res.status(400).json({ success: false, message: "Trạng thái đơn hàng không hợp lệ." });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("trangThai", sql.NVarChar(40), trangThai)
      .query(`
        SELECT dh.MaDon, CONVERT(varchar(19), dh.NgayDat, 126) AS NgayDat, dh.TrangThai, dh.TenNguoiNhan, dh.SDTNhan,
               dh.TongThanhToan, COUNT(ct.MaCTDon) AS SoSanPham
        FROM dbo.DonHang dh LEFT JOIN dbo.CTDonHang ct ON ct.MaDon = dh.MaDon
        WHERE dh.TrangThai = @trangThai
        GROUP BY dh.MaDon, dh.NgayDat, dh.TrangThai, dh.TenNguoiNhan, dh.SDTNhan, dh.TongThanhToan
        ORDER BY dh.NgayDat, dh.MaDon
      `);
    return res.json({ success: true, data: result.recordset.map((order) => ({
      ...order,
      MaDonHienThi: taoMaDonHienThi(order.MaDon, order.NgayDat)
    })) });
  } catch (error) {
    console.error("Lỗi lọc đơn hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách đơn hàng." });
  }
}

async function capNhatTrangThaiDonHang(req, res) {
  const maDon = Number(req.params.id);
  const trangThaiMoi = String(req.body?.trangThai || "").trim();
  if (!Number.isSafeInteger(maDon) || maDon <= 0 || !TRANG_THAI_DON.includes(trangThaiMoi)) {
    return res.status(400).json({ success: false, message: "Mã đơn hàng hoặc trạng thái không hợp lệ." });
  }
  let transaction;
  let transactionStarted = false;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    const currentResult = await new sql.Request(transaction)
      .input("maDon", sql.Int, maDon)
      .query("SELECT TrangThai FROM dbo.DonHang WITH (UPDLOCK, HOLDLOCK) WHERE MaDon = @maDon");
    const current = currentResult.recordset[0];
    if (!current) {
      await transaction.rollback();
      transactionStarted = false;
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    }
    const viTriCu = TRANG_THAI_DON.indexOf(current.TrangThai);
    const viTriMoi = TRANG_THAI_DON.indexOf(trangThaiMoi);
    if (viTriMoi !== viTriCu + 1) {
      await transaction.rollback();
      transactionStarted = false;
      return res.status(409).json({ success: false, message: "Chỉ có thể chuyển đơn sang bước trạng thái kế tiếp." });
    }
    if (trangThaiMoi === "Hoàn tất") {
      const stockResult = await new sql.Request(transaction)
        .input("maDon", sql.Int, maDon)
        .query(`
          SELECT ct.MaBienThe, SUM(ct.SoLuong) AS SoLuong, t.SoLuongTon
          FROM dbo.CTDonHang ct
          LEFT JOIN dbo.TonKho t WITH (UPDLOCK, HOLDLOCK) ON t.MaBienThe = ct.MaBienThe
          WHERE ct.MaDon = @maDon
          GROUP BY ct.MaBienThe, t.SoLuongTon
        `);
      if (!stockResult.recordset.length || stockResult.recordset.some((item) =>
        item.SoLuongTon === null || Number(item.SoLuongTon) < Number(item.SoLuong)
      )) {
        throw loi(409, "Tồn kho không đủ để hoàn tất đơn hàng này.");
      }
      for (const item of stockResult.recordset) {
        const updateStock = await new sql.Request(transaction)
          .input("maBienThe", sql.VarChar(80), item.MaBienThe)
          .input("soLuong", sql.Int, Number(item.SoLuong))
          .query(`
            UPDATE dbo.TonKho
            SET SoLuongTon = SoLuongTon - @soLuong
            WHERE MaBienThe = @maBienThe AND SoLuongTon >= @soLuong
          `);
        if (!updateStock.rowsAffected[0]) throw loi(409, "Tồn kho vừa thay đổi. Vui lòng tải lại đơn hàng.");
      }
    }
    await new sql.Request(transaction)
      .input("maDon", sql.Int, maDon)
      .input("trangThai", sql.NVarChar(40), trangThaiMoi)
      .query("UPDATE dbo.DonHang SET TrangThai = @trangThai WHERE MaDon = @maDon");
    await new sql.Request(transaction)
      .input("maDon", sql.Int, maDon)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .input("trangThaiCu", sql.NVarChar(40), current.TrangThai)
      .input("trangThaiMoi", sql.NVarChar(40), trangThaiMoi)
      .query(`
        INSERT INTO dbo.LichSuTrangThaiDon (MaDon, MaNguoiDung, TrangThaiCu, TrangThaiMoi)
        VALUES (@maDon, @maNguoiDung, @trangThaiCu, @trangThaiMoi)
      `);
    await transaction.commit();
    transactionStarted = false;
    return res.json({ success: true, data: { MaDon: maDon, TrangThai: trangThaiMoi } });
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error("Lỗi cập nhật trạng thái đơn hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái đơn hàng." });
  }
}

module.exports = { taoDonHang, layLichSuDonHang, theoDoiDonHang, locDonHangTheoTrangThai, capNhatTrangThaiDonHang };
