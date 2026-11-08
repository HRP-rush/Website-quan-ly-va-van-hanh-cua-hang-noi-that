const { sql, getPool } = require("../config/db");

const trangThaiGiuHang = ["Chờ xác nhận", "Đã xác nhận", "Đang chuẩn bị", "Đang giao"];

function loi(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function laSoNguyenDuong(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function laMaSanPhamHopLe(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,50}$/.test(value);
}

function laMaBienTheHopLe(value) {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(value);
}

function ganTrangThai(item) {
  const khaDung = Math.max(Number(item.SoLuongTon) - Number(item.DaGiu || 0), 0);
  const tinhTrangKho =
    item.TrangThai !== "Đang bán" || item.TrangThaiSanPham !== "Đang bán"
      ? "Ngừng bán"
      : khaDung > 0
        ? "Còn hàng"
        : "Hết hàng";

  return { ...item, SoLuongKhaDung: khaDung, TinhTrangKho: tinhTrangKho };
}

function ganThamSoGiuHang(request) {
  return request
    .input("ttChoXacNhan", sql.NVarChar(40), trangThaiGiuHang[0])
    .input("ttDaXacNhan", sql.NVarChar(40), trangThaiGiuHang[1])
    .input("ttDangChuanBi", sql.NVarChar(40), trangThaiGiuHang[2])
    .input("ttDangGiao", sql.NVarChar(40), trangThaiGiuHang[3]);
}

async function layThongTinTonKho(request, khoaTonKho = false) {
  const khoa = khoaTonKho ? " WITH (UPDLOCK, HOLDLOCK)" : "";

  return ganThamSoGiuHang(request).query(`
    SELECT
      b.MaBienThe,
      b.SKU,
      b.GiaBan,
      b.TrangThai,
      sp.MaSanPham,
      sp.TenSanPham,
      sp.TrangThai AS TrangThaiSanPham,
      ISNULL(t.SoLuongTon, 0) AS SoLuongTon,
      ISNULL(g.DaGiu, 0) AS DaGiu,
      anh.DuongDan
    FROM dbo.BienTheSanPham b
    INNER JOIN dbo.SanPham sp ON sp.MaSanPham = b.MaSanPham
    LEFT JOIN dbo.TonKho t${khoa} ON t.MaBienThe = b.MaBienThe
    OUTER APPLY (
      SELECT SUM(ct.SoLuong) AS DaGiu
      FROM dbo.CTDonHang ct
      INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
      WHERE ct.MaBienThe = b.MaBienThe
        AND dh.TrangThai IN (@ttChoXacNhan, @ttDaXacNhan, @ttDangChuanBi, @ttDangGiao)
    ) g
    OUTER APPLY (
      SELECT TOP (1) a.DuongDan
      FROM dbo.AnhSanPham a
      WHERE a.MaSanPham = sp.MaSanPham
      ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC
    ) anh
    WHERE (@maBienThe IS NOT NULL AND b.MaBienThe = @maBienThe)
       OR (@maBienThe IS NULL AND b.MaSanPham = @maSanPham)
    ORDER BY
      CASE
        WHEN b.TrangThai = N'Đang bán'
          AND sp.TrangThai = N'Đang bán'
          AND ISNULL(t.SoLuongTon, 0) - ISNULL(g.DaGiu, 0) > 0 THEN 0
        ELSE 1
      END,
      b.MaBienThe
  `);
}

async function kiemTraTonKho(req, res) {
  const maBienThe = String(req.query.maBienThe || "").trim();
  const maSanPham = String(req.query.maSanPham || "").trim();
  const timTheoBienThe = laMaBienTheHopLe(maBienThe);
  const timTheoSanPham = laMaSanPhamHopLe(maSanPham);
  if (timTheoBienThe === timTheoSanPham) {
    return res.status(400).json({
      success: false,
      message: "Cần cung cấp mã biến thể hoặc mã sản phẩm hợp lệ."
    });
  }

  try {
    const pool = await getPool();
    const result = await layThongTinTonKho(
      pool.request()
        .input("maBienThe", sql.VarChar(80), timTheoBienThe ? maBienThe : null)
        .input("maSanPham", sql.VarChar(50), timTheoSanPham ? maSanPham : null)
    );
    const item = result.recordset[0];

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Sản phẩm chưa có biến thể bán hàng hoặc không tìm thấy thông tin tồn kho."
      });
    }

    return res.json({ success: true, data: ganTrangThai(item) });
  } catch (error) {
    console.error("Lỗi kiểm tra tồn kho giỏ hàng:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể kiểm tra tồn kho. Vui lòng thử lại."
    });
  }
}

async function layGioHang(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .input("ttChoXacNhan", sql.NVarChar(40), trangThaiGiuHang[0])
      .input("ttDaXacNhan", sql.NVarChar(40), trangThaiGiuHang[1])
      .input("ttDangChuanBi", sql.NVarChar(40), trangThaiGiuHang[2])
      .input("ttDangGiao", sql.NVarChar(40), trangThaiGiuHang[3])
      .query(`
        SELECT
          ct.MaCTGio,
          b.MaBienThe,
          b.SKU,
          b.MauSac,
          b.ChatLieu,
          b.KichThuoc,
          b.GiaBan,
          b.TrangThai,
          sp.MaSanPham,
          sp.TenSanPham,
          sp.TrangThai AS TrangThaiSanPham,
          anh.DuongDan,
          ct.SoLuong,
          ISNULL(t.SoLuongTon, 0) AS SoLuongTon,
          ISNULL(g.DaGiu, 0) AS DaGiu
        FROM dbo.GioHang gh
        INNER JOIN dbo.CTGioHang ct ON ct.MaGio = gh.MaGio
        INNER JOIN dbo.BienTheSanPham b ON b.MaBienThe = ct.MaBienThe
        INNER JOIN dbo.SanPham sp ON sp.MaSanPham = b.MaSanPham
        LEFT JOIN dbo.TonKho t ON t.MaBienThe = b.MaBienThe
        OUTER APPLY (
          SELECT SUM(dct.SoLuong) AS DaGiu
          FROM dbo.CTDonHang dct
          INNER JOIN dbo.DonHang dh ON dh.MaDon = dct.MaDon
          WHERE dct.MaBienThe = b.MaBienThe
            AND dh.TrangThai IN (@ttChoXacNhan, @ttDaXacNhan, @ttDangChuanBi, @ttDangGiao)
        ) g
        OUTER APPLY (
          SELECT TOP (1) a.DuongDan
          FROM dbo.AnhSanPham a
          WHERE a.MaSanPham = sp.MaSanPham
          ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC
        ) anh
        WHERE gh.MaNguoiDung = @maNguoiDung
        ORDER BY ct.MaCTGio
      `);

    return res.json({
      success: true,
      data: result.recordset.map(ganTrangThai)
    });
  } catch (error) {
    console.error("Lỗi lấy giỏ hàng:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể tải giỏ hàng."
    });
  }
}

async function layBienTheTrongGio(req, res) {
  const maSanPham = String(req.params.maSanPham || "").trim();
  if (!laMaSanPhamHopLe(maSanPham)) {
    return res.status(400).json({ success: false, message: "Mã sản phẩm không hợp lệ." });
  }

  try {
    const pool = await getPool();
    const result = await ganThamSoGiuHang(pool.request())
      .input("maSanPham", sql.VarChar(50), maSanPham)
      .query(`
        SELECT b.MaBienThe, b.SKU, b.MauSac, b.ChatLieu, b.KichThuoc,
               b.GiaBan, b.TrangThai, sp.TrangThai AS TrangThaiSanPham,
               ISNULL(t.SoLuongTon, 0) AS SoLuongTon, ISNULL(g.DaGiu, 0) AS DaGiu
        FROM dbo.BienTheSanPham b
        INNER JOIN dbo.SanPham sp ON sp.MaSanPham = b.MaSanPham
        LEFT JOIN dbo.TonKho t ON t.MaBienThe = b.MaBienThe
        OUTER APPLY (
          SELECT SUM(ct.SoLuong) AS DaGiu
          FROM dbo.CTDonHang ct
          INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
          WHERE ct.MaBienThe = b.MaBienThe
            AND dh.TrangThai IN (@ttChoXacNhan, @ttDaXacNhan, @ttDangChuanBi, @ttDangGiao)
        ) g
        WHERE b.MaSanPham = @maSanPham
        ORDER BY b.MaBienThe
      `);

    return res.json({ success: true, data: result.recordset.map(ganTrangThai) });
  } catch (error) {
    console.error("Lỗi lấy biến thể sản phẩm trong giỏ hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách biến thể sản phẩm." });
  }
}

async function tinhTongTienGioHang(req, res) {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        SELECT COUNT(ct.MaCTGio) AS SoSanPham,
               COALESCE(SUM(ct.SoLuong), 0) AS TongSoLuong,
               COALESCE(SUM(ct.SoLuong * b.GiaBan), 0) AS TienHang
        FROM dbo.GioHang gh
        LEFT JOIN dbo.CTGioHang ct ON ct.MaGio = gh.MaGio
        LEFT JOIN dbo.BienTheSanPham b ON b.MaBienThe = ct.MaBienThe
        WHERE gh.MaNguoiDung = @maNguoiDung
      `);
    const row = result.recordset[0];
    const tienHang = Number(row?.TienHang || 0);
    const soSanPham = Number(row?.SoSanPham || 0);
    const phiGiao = soSanPham ? 300000 : 0;
    return res.json({
      success: true,
      data: {
        SoSanPham: soSanPham,
        TongSoLuong: Number(row?.TongSoLuong || 0),
        TienHang: tienHang,
        PhiGiao: phiGiao,
        GiamGia: 0,
        TongThanhToan: tienHang + phiGiao
      }
    });
  } catch (error) {
    console.error("Lỗi tính tổng tiền giỏ hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tính tổng tiền giỏ hàng." });
  }
}

async function layHoacTaoGioHang(request, maNguoiDung) {
  const result = await request
    .input("maNguoiDung", sql.Int, maNguoiDung)
    .query(`
      SELECT MaGio
      FROM dbo.GioHang WITH (UPDLOCK, HOLDLOCK)
      WHERE MaNguoiDung = @maNguoiDung
    `);

  if (result.recordset[0]) return result.recordset[0].MaGio;

  const created = await request.query(`
    INSERT INTO dbo.GioHang (MaNguoiDung)
    OUTPUT INSERTED.MaGio
    VALUES (@maNguoiDung)
  `);
  return created.recordset[0].MaGio;
}

async function themSanPham(req, res) {
  const body = req.body || {};
  const maBienThe = String(body.maBienThe || "").trim().toUpperCase();
  const maSanPham = String(body.maSanPham || "").trim();
  const soLuong = Number(body.soLuong ?? 1);
  const timTheoBienThe = laMaBienTheHopLe(maBienThe);
  const timTheoSanPham = laMaSanPhamHopLe(maSanPham);
  if (timTheoBienThe === timTheoSanPham || !laSoNguyenDuong(soLuong)) {
    return res.status(400).json({
      success: false,
      message: "Cần cung cấp đúng một mã sản phẩm hoặc mã biến thể và số lượng hợp lệ."
    });
  }

  let transaction;
  let transactionStarted = false;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    const request = new sql.Request(transaction);
    const maGio = await layHoacTaoGioHang(request, req.user.MaNguoiDung);
    const stock = await layThongTinTonKho(
      new sql.Request(transaction)
        .input("maBienThe", sql.VarChar(80), timTheoBienThe ? maBienThe : null)
        .input("maSanPham", sql.VarChar(50), timTheoSanPham ? maSanPham : null),
      true
    );
    const item = stock.recordset[0];

    if (!item || ganTrangThai(item).TinhTrangKho !== "Còn hàng") {
      throw loi(409, "Sản phẩm chưa có biến thể bán hàng, đã hết hàng hoặc ngừng kinh doanh.");
    }

    const maBienTheDuocChon = item.MaBienThe;
    const existing = await new sql.Request(transaction)
      .input("maGio", sql.Int, maGio)
      .input("maBienThe", sql.VarChar(80), maBienTheDuocChon)
      .query(`
        SELECT MaCTGio, SoLuong
        FROM dbo.CTGioHang WITH (UPDLOCK, HOLDLOCK)
        WHERE MaGio = @maGio AND MaBienThe = @maBienThe
      `);
    const soLuongMoi = Number(existing.recordset[0]?.SoLuong || 0) + soLuong;
    const khaDung = ganTrangThai(item).SoLuongKhaDung;

    if (soLuongMoi > khaDung) {
      throw loi(409, `Chỉ còn ${khaDung} sản phẩm trong kho.`);
    }

    if (existing.recordset[0]) {
      await new sql.Request(transaction)
        .input("maCTGio", sql.Int, existing.recordset[0].MaCTGio)
        .input("soLuong", sql.Int, soLuongMoi)
        .query("UPDATE dbo.CTGioHang SET SoLuong = @soLuong WHERE MaCTGio = @maCTGio");
    } else {
      await new sql.Request(transaction)
        .input("maGio", sql.Int, maGio)
        .input("maBienThe", sql.VarChar(80), maBienTheDuocChon)
        .input("soLuong", sql.Int, soLuong)
        .query(`
          INSERT INTO dbo.CTGioHang (MaGio, MaBienThe, SoLuong)
          VALUES (@maGio, @maBienThe, @soLuong)
        `);
    }

    const cartSummary = await new sql.Request(transaction)
      .input("maGio", sql.Int, maGio)
      .input("maBienThe", sql.VarChar(80), maBienTheDuocChon)
      .query(`
        SELECT
          SUM(SoLuong) AS TongSoLuong,
          (SELECT MaCTGio FROM dbo.CTGioHang WHERE MaGio = @maGio AND MaBienThe = @maBienThe) AS MaCTGio
        FROM dbo.CTGioHang
        WHERE MaGio = @maGio
      `);

    await transaction.commit();
    return res.status(201).json({
      success: true,
      message: "Đã thêm sản phẩm vào giỏ hàng.",
      data: {
        MaBienThe: maBienTheDuocChon,
        MaCTGio: cartSummary.recordset[0]?.MaCTGio,
        SoLuongTrongGio: Number(cartSummary.recordset[0]?.TongSoLuong || 0)
      }
    });
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error("Lỗi thêm sản phẩm vào giỏ hàng:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể thêm sản phẩm vào giỏ hàng."
    });
  }
}

async function capNhatSoLuong(req, res) {
  const maCTGio = Number(req.body.maCTGio);
  const soLuong = Number(req.body.soLuong);
  if (
    !laSoNguyenDuong(maCTGio) ||
    !laSoNguyenDuong(soLuong) ||
    maCTGio > 2147483647 ||
    soLuong > 2147483647
  ) {
    return res.status(400).json({
      success: false,
      message: "Mã sản phẩm trong giỏ và số lượng phải là số nguyên dương."
    });
  }

  let transaction;
  let transactionStarted = false;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;
    const itemResult = await new sql.Request(transaction)
      .input("maCTGio", sql.Int, maCTGio)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        SELECT ct.MaCTGio
        FROM dbo.CTGioHang ct WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.GioHang gh ON gh.MaGio = ct.MaGio
        WHERE ct.MaCTGio = @maCTGio AND gh.MaNguoiDung = @maNguoiDung
      `);

    if (!itemResult.recordset[0]) throw loi(404, "Không tìm thấy sản phẩm trong giỏ hàng.");

    await new sql.Request(transaction)
      .input("maCTGio", sql.Int, maCTGio)
      .input("soLuong", sql.Int, soLuong)
      .query("UPDATE dbo.CTGioHang SET SoLuong = @soLuong WHERE MaCTGio = @maCTGio");
    await transaction.commit();
    return res.json({ success: true, message: "Đã cập nhật số lượng sản phẩm." });
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error("Lỗi cập nhật số lượng giỏ hàng:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật số lượng sản phẩm."
    });
  }
}

async function capNhatBienThe(req, res) {
  const maCTGio = Number(req.body?.maCTGio);
  const maBienThe = String(req.body?.maBienThe || "").trim();
  if (!laSoNguyenDuong(maCTGio) || maCTGio > 2147483647 || !laMaBienTheHopLe(maBienThe)) {
    return res.status(400).json({ success: false, message: "Mã sản phẩm trong giỏ hoặc mã biến thể không hợp lệ." });
  }

  let transaction;
  let transactionStarted = false;
  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    transactionStarted = true;

    const currentResult = await new sql.Request(transaction)
      .input("maCTGio", sql.Int, maCTGio)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        SELECT ct.MaCTGio, ct.MaGio, ct.MaBienThe, ct.SoLuong, b.MaSanPham
        FROM dbo.CTGioHang ct WITH (UPDLOCK, HOLDLOCK)
        INNER JOIN dbo.GioHang gh ON gh.MaGio = ct.MaGio
        INNER JOIN dbo.BienTheSanPham b ON b.MaBienThe = ct.MaBienThe
        WHERE ct.MaCTGio = @maCTGio AND gh.MaNguoiDung = @maNguoiDung
      `);
    const current = currentResult.recordset[0];
    if (!current) throw loi(404, "Không tìm thấy sản phẩm trong giỏ hàng.");

    const selectedResult = await layThongTinTonKho(
      new sql.Request(transaction)
        .input("maBienThe", sql.VarChar(80), maBienThe)
        .input("maSanPham", sql.VarChar(50), null),
      true
    );
    const selected = selectedResult.recordset[0];
    if (!selected || selected.MaSanPham !== current.MaSanPham) {
      throw loi(400, "Biến thể đã chọn không thuộc sản phẩm này.");
    }
    if (selected.TrangThai !== "Đang bán" || selected.TrangThaiSanPham !== "Đang bán") {
      throw loi(409, "Biến thể này hiện không còn được kinh doanh.");
    }

    let targetCartItemId = current.MaCTGio;
    let targetQuantity = Number(current.SoLuong);
    if (selected.MaBienThe !== current.MaBienThe) {
      const duplicateResult = await new sql.Request(transaction)
        .input("maGio", sql.Int, current.MaGio)
        .input("maBienThe", sql.VarChar(80), selected.MaBienThe)
        .input("maCTGio", sql.Int, current.MaCTGio)
        .query(`
          SELECT MaCTGio, SoLuong
          FROM dbo.CTGioHang WITH (UPDLOCK, HOLDLOCK)
          WHERE MaGio = @maGio AND MaBienThe = @maBienThe AND MaCTGio <> @maCTGio
        `);
      const duplicate = duplicateResult.recordset[0];

      if (duplicate) {
        targetQuantity += Number(duplicate.SoLuong);
        if (targetQuantity > 2147483647) throw loi(409, "Tổng số lượng vượt giới hạn cho phép.");
        targetCartItemId = duplicate.MaCTGio;
        await new sql.Request(transaction)
          .input("maCTGio", sql.Int, targetCartItemId)
          .input("soLuong", sql.Int, targetQuantity)
          .query("UPDATE dbo.CTGioHang SET SoLuong = @soLuong WHERE MaCTGio = @maCTGio");
        await new sql.Request(transaction)
          .input("maCTGio", sql.Int, current.MaCTGio)
          .query("DELETE FROM dbo.CTGioHang WHERE MaCTGio = @maCTGio");
      } else {
        await new sql.Request(transaction)
          .input("maCTGio", sql.Int, current.MaCTGio)
          .input("maBienThe", sql.VarChar(80), selected.MaBienThe)
          .query("UPDATE dbo.CTGioHang SET MaBienThe = @maBienThe WHERE MaCTGio = @maCTGio");
      }
    }

    await transaction.commit();
    return res.json({
      success: true,
      message: "Đã cập nhật biến thể sản phẩm.",
      data: { MaCTGio: targetCartItemId, MaBienThe: selected.MaBienThe, SoLuong: targetQuantity }
    });
  } catch (error) {
    if (transactionStarted) await transaction.rollback();
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error("Lỗi cập nhật biến thể giỏ hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể cập nhật biến thể sản phẩm." });
  }
}

async function xoaSanPham(req, res) {
  const maCTGio = Number(req.params.id);
  if (!laSoNguyenDuong(maCTGio)) {
    return res.status(400).json({
      success: false,
      message: "Mã sản phẩm trong giỏ không hợp lệ."
    });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("maCTGio", sql.Int, maCTGio)
      .input("maNguoiDung", sql.Int, req.user.MaNguoiDung)
      .query(`
        DELETE ct
        FROM dbo.CTGioHang ct
        INNER JOIN dbo.GioHang gh ON gh.MaGio = ct.MaGio
        WHERE ct.MaCTGio = @maCTGio AND gh.MaNguoiDung = @maNguoiDung
      `);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm trong giỏ hàng."
      });
    }
    return res.json({ success: true, message: "Đã xóa sản phẩm khỏi giỏ hàng." });
  } catch (error) {
    console.error("Lỗi xóa sản phẩm khỏi giỏ hàng:", error.message);
    return res.status(500).json({
      success: false,
      message: "Không thể xóa sản phẩm khỏi giỏ hàng."
    });
  }
}

async function xacNhanGiaoNhan(req, res) {
  const body = req.body || {};
  const {
    hoTen,
    soDienThoai,
    email,
    maTinh,
    tinhThanhPho,
    maPhuongXa,
    phuongXa,
    diaChiChiTiet,
    diaChiGiao,
    ghiChu = ""
  } = body;

  const tenHopLe = typeof hoTen === "string" && hoTen.trim().length >= 2 && hoTen.trim().length <= 150;
  const dienThoaiChuanHoa = typeof soDienThoai === "string"
    ? soDienThoai.replace(/[\s.-]/g, "")
    : "";
  const dienThoaiHopLe = /^(?:0(?:2\d{8,9}|[35789]\d{8})|\+84(?:2\d{8,9}|[35789]\d{8}))$/.test(dienThoaiChuanHoa);
  const emailHopLe = typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const diaChiHopLe = typeof diaChiChiTiet === "string" &&
    diaChiChiTiet.trim().length >= 5 &&
    diaChiChiTiet.trim().length <= 500;
  const ghiChuHopLe = typeof ghiChu === "string" && ghiChu.length <= 500;

  if (
    !tenHopLe ||
    !dienThoaiHopLe ||
    !emailHopLe ||
    !Number.isSafeInteger(Number(maTinh)) ||
    Number(maTinh) <= 0 ||
    typeof tinhThanhPho !== "string" ||
    !tinhThanhPho.trim() ||
    tinhThanhPho.trim().length > 100 ||
    !Number.isSafeInteger(Number(maPhuongXa)) ||
    Number(maPhuongXa) <= 0 ||
    typeof phuongXa !== "string" ||
    !phuongXa.trim() ||
    phuongXa.trim().length > 150 ||
    !diaChiHopLe ||
    typeof diaChiGiao !== "string" ||
    !diaChiGiao.trim() ||
    diaChiGiao.trim().length > 500 ||
    !ghiChuHopLe
  ) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng kiểm tra đầy đủ và chính xác thông tin người nhận, liên hệ và địa chỉ giao hàng."
    });
  }

  return res.json({
    success: true,
    message: "Đã xác nhận thông tin giao nhận.",
    data: {
      hoTen: hoTen.trim(),
      soDienThoai: dienThoaiChuanHoa,
      email: email.trim(),
      maTinh: Number(maTinh),
      tinhThanhPho: tinhThanhPho.trim(),
      maPhuongXa: Number(maPhuongXa),
      phuongXa: phuongXa.trim(),
      diaChiChiTiet: diaChiChiTiet.trim(),
      diaChiGiao: diaChiGiao.trim(),
      ghiChu: ghiChu.trim()
    }
  });
}

module.exports = {
  layGioHang,
  layBienTheTrongGio,
  themSanPham,
  capNhatSoLuong,
  capNhatBienThe,
  xoaSanPham,
  kiemTraTonKho,
  tinhTongTienGioHang,
  xacNhanGiaoNhan
};
