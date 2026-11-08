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
    if (trangThaiMoi === "Đã xác nhận") {
      // Kiểm tra lại tại thời điểm xác nhận, không tin kết quả kiểm tra trên giao diện.
      const duHang = await new sql.Request(transaction)
        .input("maDon", sql.Int, maDon)
        .query(`
          SELECT ct.MaBienThe, SUM(ct.SoLuong) AS SoLuongDat,
                 ISNULL(t.SoLuongTon, 0) AS SoLuongTon,
                 ISNULL((SELECT SUM(ct2.SoLuong)
                         FROM dbo.CTDonHang ct2
                         INNER JOIN dbo.DonHang dh2 ON dh2.MaDon = ct2.MaDon
                         WHERE ct2.MaBienThe = ct.MaBienThe AND dh2.MaDon <> @maDon
                           AND dh2.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang chuẩn bị', N'Đang giao')), 0) AS DaGiuKhac
          FROM dbo.CTDonHang ct
          LEFT JOIN dbo.TonKho t WITH (UPDLOCK, HOLDLOCK) ON t.MaBienThe = ct.MaBienThe
          WHERE ct.MaDon = @maDon
          GROUP BY ct.MaBienThe, t.SoLuongTon
        `);
      if (!duHang.recordset.length || duHang.recordset.some(x =>
        Number(x.SoLuongTon) - Number(x.DaGiuKhac) < Number(x.SoLuongDat))) {
        throw loi(409, "Không đủ tồn kho để xác nhận đơn hàng. Vui lòng kiểm tra lại.");
      }
    }
    if (trangThaiMoi === "Hoàn tất") {
      // Đơn chỉ được hoàn tất từ "Đang giao" theo kiểm tra trạng thái phía trên.
      // Khóa đơn trong transaction SERIALIZABLE để hai yêu cầu song song không thể xuất kho hai lần.
      const chiTietResult = await new sql.Request(transaction)
        .input("maDon", sql.Int, maDon)
        .query(`
          SELECT ct.MaCTDon, ct.MaBienThe, ct.SoLuong
          FROM dbo.CTDonHang ct
          WHERE ct.MaDon = @maDon
          ORDER BY ct.MaCTDon
        `);
      const chiTiet = chiTietResult.recordset;
      if (!chiTiet.length) throw loi(409, "Đơn hàng không có sản phẩm để xuất kho.");

      // Phòng trường hợp dữ liệu đã từng được xuất kho bằng một luồng khác.
      // Không tự ý trừ thêm khi đã có bút toán Xuất kho của đơn này.
      const daXuatResult = await new sql.Request(transaction)
        .input("maDon", sql.Int, maDon)
        .query(`
          SELECT TOP (1) g.MaGiaoDich
          FROM dbo.GiaoDichKho g WITH (UPDLOCK, HOLDLOCK)
          INNER JOIN dbo.CTDonHang ct ON ct.MaCTDon = g.MaCTDon
          WHERE ct.MaDon = @maDon AND g.LoaiGiaoDich = N'Xuất kho'
        `);
      if (daXuatResult.recordset.length) {
        throw loi(409, "Đơn hàng đã có giao dịch xuất kho. Vui lòng kiểm tra lịch sử kho trước khi xử lý tiếp.");
      }

      // Gộp theo biến thể để một SKU xuất đúng tổng số lượng của các dòng đơn.
      const theoBienThe = new Map();
      for (const dong of chiTiet) {
        const soLuong = Number(dong.SoLuong);
        if (!Number.isSafeInteger(soLuong) || soLuong <= 0) {
          throw loi(409, "Số lượng sản phẩm trong đơn không hợp lệ.");
        }
        theoBienThe.set(dong.MaBienThe, (theoBienThe.get(dong.MaBienThe) || 0) + soLuong);
      }
      for (const [maBienThe, soLuong] of theoBienThe) {
        // UPDATE điều kiện thực hiện kiểm tra tồn và trừ tồn một cách nguyên tử.
        const updateStock = await new sql.Request(transaction)
          .input("maBienThe", sql.VarChar(80), maBienThe)
          .input("soLuong", sql.Int, soLuong)
          .query(`
            UPDATE dbo.TonKho WITH (UPDLOCK, HOLDLOCK)
            SET SoLuongTon = SoLuongTon - @soLuong
            WHERE MaBienThe = @maBienThe AND SoLuongTon >= @soLuong
          `);
        if (updateStock.rowsAffected[0] !== 1) {
          throw loi(409, "Tồn kho không đủ để hoàn tất đơn hàng. Vui lòng kiểm tra lại số lượng SKU.");
        }
      }

      // Bút toán xuất và tồn kho luôn commit/rollback cùng với trạng thái đơn.
      // Lịch sử kho của nhân viên lấy dữ liệu từ GiaoDichKho.
      for (const dong of chiTiet) {
        await new sql.Request(transaction)
          .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
          .input("maCTDon", sql.Int, dong.MaCTDon)
          .input("maBienThe", sql.VarChar(80), dong.MaBienThe)
          .input("soLuong", sql.Int, -Number(dong.SoLuong))
          .input("ghiChu", sql.NVarChar(500), `Xuất kho khi hoàn tất đơn #${maDon}`)
          .query(`
            INSERT INTO dbo.GiaoDichKho
              (MaNguoiDung, MaCTDon, MaBienThe, LoaiGiaoDich, SoLuongThayDoi, GhiChu)
            VALUES
              (@maNguoiDung, @maCTDon, @maBienThe, N'Xuất kho', @soLuong, @ghiChu)
          `);
      }
      // Đồng bộ thông tin vận chuyển với trạng thái hoàn tất của đơn.
      await new sql.Request(transaction)
        .input("maDon", sql.Int, maDon)
        .query(`
          UPDATE dbo.GiaoHang
          SET TrangThaiGiao = N'Đã giao',
              NgayGiaoThucTe = COALESCE(NgayGiaoThucTe, SYSDATETIME())
          WHERE MaDon = @maDon
        `);
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


// Chỉ dành cho nhân viên/quản lý: danh sách đầy đủ và chi tiết xử lý đơn hàng.
const TRANG_THAI_BO_LOC = [...TRANG_THAI_DON, "Đã hủy"];

async function danhSachDonNhanVien(req, res) {
  const q = String(req.query.q || "").trim().slice(0, 150);
  const trangThai = String(req.query.trangThai || "").trim();
  const thanhToan = String(req.query.thanhToan || "").trim();
  const gia = String(req.query.gia || "").trim();
  const tuNgay = String(req.query.tuNgay || "").trim();
  const denNgay = String(req.query.denNgay || "").trim();
  const trang = Math.max(1, Math.min(100000, Number(req.query.trang) || 1));
  const soDong = 6;
  if ((trangThai && !TRANG_THAI_BO_LOC.includes(trangThai)) ||
      (thanhToan && !["Đã thanh toán", "Chờ thanh toán"].includes(thanhToan)) ||
      (gia && !["duoi10", "10den30", "tren30"].includes(gia)) ||
      (tuNgay && !/^\d{4}-\d{2}-\d{2}$/.test(tuNgay)) ||
      (denNgay && !/^\d{4}-\d{2}-\d{2}$/.test(denNgay))) {
    return res.status(400).json({ success: false, message: "Bộ lọc không hợp lệ." });
  }
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("q", sql.NVarChar(150), q)
      .input("trangThai", sql.NVarChar(40), trangThai)
      .input("thanhToan", sql.NVarChar(40), thanhToan)
      .input("gia", sql.VarChar(20), gia)
      .input("tuNgay", sql.VarChar(10), tuNgay)
      .input("denNgay", sql.VarChar(10), denNgay)
      .input("offset", sql.Int, (trang - 1) * soDong)
      .input("soDong", sql.Int, soDong)
      .query(`
        WITH ds AS (
          SELECT dh.MaDon, dh.NgayDat, dh.TrangThai, dh.TenNguoiNhan, dh.SDTNhan,
                 dh.TongThanhToan, tt.PhuongThuc AS PhuongThucThanhToan,
                 tt.TrangThai AS TrangThaiThanhToan
          FROM dbo.DonHang dh
          OUTER APPLY (SELECT TOP (1) PhuongThuc, TrangThai FROM dbo.ThanhToan
                       WHERE MaDon = dh.MaDon ORDER BY MaThanhToan DESC) tt
          WHERE (@trangThai = N'' OR dh.TrangThai = @trangThai)
            AND (@thanhToan = N'' OR tt.TrangThai = @thanhToan)
            AND (@gia = '' OR (@gia = 'duoi10' AND dh.TongThanhToan < 10000000)
                 OR (@gia = '10den30' AND dh.TongThanhToan BETWEEN 10000000 AND 30000000)
                 OR (@gia = 'tren30' AND dh.TongThanhToan > 30000000))
            AND (@tuNgay = '' OR dh.NgayDat >= TRY_CONVERT(date, @tuNgay, 23))
            AND (@denNgay = '' OR dh.NgayDat < DATEADD(day, 1, TRY_CONVERT(date, @denNgay, 23)))
            AND (@q = N'' OR dh.TenNguoiNhan LIKE N'%' + @q + N'%'
                 OR dh.SDTNhan LIKE '%' + @q + '%'
                 OR CAST(dh.MaDon AS varchar(20)) = @q
                 OR CONCAT('MA-', CONVERT(char(8), dh.NgayDat, 112), '-', RIGHT('000' + CAST(dh.MaDon AS varchar(20)), 3)) LIKE N'%' + @q + N'%')
        )
        SELECT MaDon, CONVERT(varchar(19), NgayDat, 126) AS NgayDat, TrangThai,
               TenNguoiNhan, SDTNhan, TongThanhToan, PhuongThucThanhToan, TrangThaiThanhToan,
               COUNT(*) OVER() AS TongSo
        FROM ds
        ORDER BY NgayDat DESC, MaDon DESC
        OFFSET @offset ROWS FETCH NEXT @soDong ROWS ONLY
      `);
    const data = result.recordset.map(row => ({
      ...row, MaDonHienThi: taoMaDonHienThi(row.MaDon, row.NgayDat), TongSo: undefined
    }));
    // Trường hợp đang ở trang vượt tổng số, vẫn cần thống kê tổng.
    let tong = Number(result.recordset[0]?.TongSo || 0);
    if (!data.length) {
      const count = await pool.request()
        .input("q", sql.NVarChar(150), q).input("trangThai", sql.NVarChar(40), trangThai)
        .input("thanhToan", sql.NVarChar(40), thanhToan).input("gia", sql.VarChar(20), gia)
        .input("tuNgay", sql.VarChar(10), tuNgay).input("denNgay", sql.VarChar(10), denNgay)
        .query(`SELECT COUNT(*) AS Tong FROM dbo.DonHang dh
          OUTER APPLY (SELECT TOP (1) TrangThai FROM dbo.ThanhToan WHERE MaDon = dh.MaDon ORDER BY MaThanhToan DESC) tt
          WHERE (@trangThai = N'' OR dh.TrangThai = @trangThai)
          AND (@thanhToan = N'' OR tt.TrangThai = @thanhToan)
          AND (@gia = '' OR (@gia = 'duoi10' AND dh.TongThanhToan < 10000000) OR (@gia = '10den30' AND dh.TongThanhToan BETWEEN 10000000 AND 30000000) OR (@gia = 'tren30' AND dh.TongThanhToan > 30000000))
          AND (@tuNgay = '' OR dh.NgayDat >= TRY_CONVERT(date, @tuNgay, 23))
          AND (@denNgay = '' OR dh.NgayDat < DATEADD(day, 1, TRY_CONVERT(date, @denNgay, 23)))
          AND (@q = N'' OR dh.TenNguoiNhan LIKE N'%' + @q + N'%' OR dh.SDTNhan LIKE '%' + @q + '%' OR CAST(dh.MaDon AS varchar(20)) = @q OR CONCAT('MA-', CONVERT(char(8), dh.NgayDat, 112), '-', RIGHT('000' + CAST(dh.MaDon AS varchar(20)), 3)) LIKE N'%' + @q + N'%')`);
      tong = count.recordset[0].Tong;
    }
    return res.json({ success: true, data: { danhSach: data, tong, trang, soDong } });
  } catch (error) {
    console.error("Lỗi danh sách đơn nhân viên:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách đơn hàng." });
  }
}

async function chiTietDonNhanVien(req, res) {
  const maDon = Number(req.params.id);
  if (!Number.isSafeInteger(maDon) || maDon <= 0) return res.status(400).json({success:false, message:"Mã đơn không hợp lệ."});
  try {
    const pool = await getPool();
    const result = await pool.request().input("maDon", sql.Int, maDon).query(`
      SELECT dh.MaDon, CONVERT(varchar(19), dh.NgayDat, 126) AS NgayDat,
             dh.TrangThai, dh.TenNguoiNhan, dh.SDTNhan, dh.DiaChiGiao,
             nd.Email, dh.TienHang, dh.PhiGiao, dh.GiamGia, dh.TongThanhToan,
             tt.PhuongThuc AS PhuongThucThanhToan, tt.TrangThai AS TrangThaiThanhToan
      FROM dbo.DonHang dh
      LEFT JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = dh.MaNguoiDung
      OUTER APPLY (SELECT TOP (1) PhuongThuc, TrangThai FROM dbo.ThanhToan
                   WHERE MaDon = dh.MaDon ORDER BY MaThanhToan DESC) tt
      WHERE dh.MaDon = @maDon`);
    const don = result.recordset[0];
    if (!don) return res.status(404).json({success:false, message:"Không tìm thấy đơn hàng."});
    const [ct, ls] = await Promise.all([
      pool.request().input("maDon", sql.Int, maDon).query(`
        SELECT ct.MaBienThe, ct.TenSanPhamSnapshot AS TenSanPham,
               ct.CauHinhSnapshot AS CauHinh, ct.SKUSnapshot AS SKU,
               ct.GiaBanSnapshot AS GiaBan, ct.SoLuong, ct.ThanhTien,
               (SELECT TOP (1) a.DuongDan FROM dbo.AnhSanPham a
                INNER JOIN dbo.BienTheSanPham b ON a.MaSanPham = b.MaSanPham
                WHERE b.MaBienThe = ct.MaBienThe
                ORDER BY a.LaAnhDaiDien DESC, a.MaAnh) AS DuongDanAnh
        FROM dbo.CTDonHang ct WHERE ct.MaDon = @maDon ORDER BY ct.MaCTDon`),
      pool.request().input("maDon", sql.Int, maDon).query(`
        SELECT ls.TrangThaiCu, ls.TrangThaiMoi,
               CONVERT(varchar(19), ls.ThoiDiem, 126) AS ThoiDiem,
               COALESCE(nd.HoTen, N'Hệ thống') AS NguoiThucHien
        FROM dbo.LichSuTrangThaiDon ls
        LEFT JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = ls.MaNguoiDung
        WHERE ls.MaDon = @maDon ORDER BY ls.ThoiDiem, ls.MaLichSu`)
    ]);
    return res.json({success:true, data:{...don, MaDonHienThi:taoMaDonHienThi(don.MaDon, don.NgayDat), items:ct.recordset, lichSu:ls.recordset}});
  } catch(error) {
    console.error("Lỗi chi tiết đơn nhân viên:", error.message);
    return res.status(500).json({success:false, message:"Không thể tải chi tiết đơn hàng."});
  }
}

async function kiemTraTonDonNhanVien(req, res) {
  const maDon = Number(req.params.id);
  if (!Number.isSafeInteger(maDon) || maDon <= 0) return res.status(400).json({success:false, message:"Mã đơn không hợp lệ."});
  try {
    const pool = await getPool();
    const result = await pool.request().input("maDon", sql.Int, maDon).query(`
      SELECT ct.MaBienThe, ct.TenSanPhamSnapshot AS TenSanPham, ct.SKUSnapshot AS SKU,
             SUM(ct.SoLuong) AS SoLuongDat, ISNULL(t.SoLuongTon, 0) AS SoLuongTon,
             ISNULL((SELECT SUM(ct2.SoLuong) FROM dbo.CTDonHang ct2
                     INNER JOIN dbo.DonHang dh2 ON dh2.MaDon = ct2.MaDon
                     WHERE ct2.MaBienThe = ct.MaBienThe AND dh2.MaDon <> @maDon
                       AND dh2.TrangThai IN (N'Chờ xác nhận', N'Đã xác nhận', N'Đang chuẩn bị', N'Đang giao')), 0) AS DaGiuKhac
      FROM dbo.CTDonHang ct LEFT JOIN dbo.TonKho t ON t.MaBienThe = ct.MaBienThe
      WHERE ct.MaDon = @maDon
      GROUP BY ct.MaBienThe, ct.TenSanPhamSnapshot, ct.SKUSnapshot, t.SoLuongTon`);
    if (!result.recordset.length) return res.status(404).json({success:false, message:"Không tìm thấy chi tiết đơn hàng."});
    const items = result.recordset.map(row => ({
      ...row, KhaDung:Math.max(0,Number(row.SoLuongTon) - Number(row.DaGiuKhac)),
      DuHang:Number(row.SoLuongTon) - Number(row.DaGiuKhac) >= Number(row.SoLuongDat)
    }));
    return res.json({success:true, data:{items, duHang:items.every(x => x.DuHang)}});
  } catch(error) {
    console.error("Lỗi kiểm tra tồn đơn hàng:", error.message);
    return res.status(500).json({success:false, message:"Không thể kiểm tra tồn kho."});
  }
}

module.exports = { danhSachDonNhanVien, chiTietDonNhanVien, kiemTraTonDonNhanVien, taoDonHang, layLichSuDonHang, theoDoiDonHang, locDonHangTheoTrangThai, capNhatTrangThaiDonHang };
