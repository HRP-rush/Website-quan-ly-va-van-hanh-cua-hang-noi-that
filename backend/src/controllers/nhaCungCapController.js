const { sql, getPool } = require("../config/db");

const TRANG_THAI = ["Đang hợp tác", "Ngừng hợp tác"];

function loi(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function taoBoLoc(trangThai) {
  return `(
    @q = '%%'
    OR CAST(ncc.MaNCC AS NVARCHAR(20)) LIKE @q
    OR ncc.TenNCC LIKE @q
    OR ISNULL(ncc.NguoiLienHe, N'') LIKE @q
    OR ISNULL(ncc.DienThoai, '') LIKE @q
    OR ISNULL(ncc.Email, '') LIKE @q
  )${trangThai ? " AND ncc.TrangThai = @trangThai" : ""}`;
}

async function layDanhSachNhaCungCap(req, res) {
  const q = String(req.query.q || "").trim().slice(0, 100);
  const trangThai = String(req.query.trangThai || "").trim();
  const trang = Math.max(1, Number.parseInt(req.query.trang, 10) || 1);
  const soDong = Math.min(50, Math.max(1, Number.parseInt(req.query.soDong, 10) || 10));

  if (trangThai && !TRANG_THAI.includes(trangThai)) {
    return res.status(400).json({ success: false, message: "Trạng thái nhà cung cấp không hợp lệ." });
  }

  try {
    const pool = await getPool();
    const danhSachRequest = pool.request()
      .input("q", sql.NVarChar(300), `%${q}%`)
      .input("offset", sql.Int, (trang - 1) * soDong)
      .input("soDong", sql.Int, soDong);
    if (trangThai) danhSachRequest.input("trangThai", sql.NVarChar(30), trangThai);

    const demRequest = pool.request()
      .input("q", sql.NVarChar(300), `%${q}%`);
    if (trangThai) demRequest.input("trangThai", sql.NVarChar(30), trangThai);

    const [danhSach, dem, tongQuan] = await Promise.all([
      danhSachRequest.query(`
        SELECT ncc.MaNCC, ncc.TenNCC, ncc.NguoiLienHe, ncc.DienThoai,
               ncc.Email, ncc.DiaChi, ncc.TrangThai
        FROM dbo.NhaCungCap AS ncc
        WHERE ${taoBoLoc(trangThai)}
        ORDER BY ncc.TenNCC, ncc.MaNCC
        OFFSET @offset ROWS FETCH NEXT @soDong ROWS ONLY
      `),
      demRequest.query(`
        SELECT COUNT(*) AS Tong
        FROM dbo.NhaCungCap AS ncc
        WHERE ${taoBoLoc(trangThai)}
      `),
      pool.request().query(`
        SELECT COUNT(*) AS Tong,
          COALESCE(SUM(CASE WHEN TrangThai = N'Đang hợp tác' THEN 1 ELSE 0 END), 0) AS DangHopTac,
          COALESCE(SUM(CASE WHEN TrangThai = N'Ngừng hợp tác' THEN 1 ELSE 0 END), 0) AS NgungHopTac
        FROM dbo.NhaCungCap
      `)
    ]);

    return res.json({
      success: true,
      data: danhSach.recordset,
      total: Number(dem.recordset[0]?.Tong || 0),
      tongQuan: tongQuan.recordset[0],
      trang,
      soDong
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách nhà cung cấp:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách nhà cung cấp." });
  }
}

async function layChiTietNhaCungCap(req, res) {
  const maNCC = Number(req.params.id);
  if (!Number.isSafeInteger(maNCC) || maNCC < 1) {
    return res.status(400).json({ success: false, message: "Mã nhà cung cấp không hợp lệ." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("maNCC", sql.Int, maNCC)
      .query(`
        SELECT ncc.MaNCC, ncc.TenNCC, ncc.NguoiLienHe, ncc.DienThoai,
               ncc.Email, ncc.DiaChi, ncc.TrangThai,
               COUNT(pn.MaPhieuNhap) AS SoPhieuNhap,
               MAX(pn.NgayNhap) AS LanNhapGanNhat
        FROM dbo.NhaCungCap AS ncc
        LEFT JOIN dbo.PhieuNhap AS pn ON pn.MaNCC = ncc.MaNCC
        WHERE ncc.MaNCC = @maNCC
        GROUP BY ncc.MaNCC, ncc.TenNCC, ncc.NguoiLienHe, ncc.DienThoai,
                 ncc.Email, ncc.DiaChi, ncc.TrangThai
      `);
    if (!result.recordset[0]) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp." });
    }
    return res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error("Lỗi lấy chi tiết nhà cung cấp:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tải thông tin nhà cung cấp." });
  }
}

async function themNhaCungCap(req, res) {
  const body = req.body || {};
  const tenNCC = typeof body.tenNCC === "string" ? body.tenNCC.trim() : "";
  const nguoiLienHe = typeof body.nguoiLienHe === "string" ? body.nguoiLienHe.trim() : "";
  const dienThoai = typeof body.dienThoai === "string" ? body.dienThoai.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const diaChi = typeof body.diaChi === "string" ? body.diaChi.trim() : "";
  const trangThai = body.trangThai || "Đang hợp tác";

  if (!tenNCC || tenNCC.length > 250) {
    return res.status(400).json({ success: false, message: "Tên nhà cung cấp là bắt buộc và tối đa 250 ký tự." });
  }
  if (nguoiLienHe.length > 150 || dienThoai.length > 20 || email.length > 254 || diaChi.length > 500) {
    return res.status(400).json({ success: false, message: "Thông tin liên hệ vượt quá độ dài cho phép." });
  }
  if (dienThoai && !/^\+?[0-9().\s-]{8,20}$/.test(dienThoai)) {
    return res.status(400).json({ success: false, message: "Số điện thoại không hợp lệ." });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Email không hợp lệ." });
  }
  if (!TRANG_THAI.includes(trangThai)) {
    return res.status(400).json({ success: false, message: "Trạng thái nhà cung cấp không hợp lệ." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("tenNCC", sql.NVarChar(250), tenNCC)
      .input("nguoiLienHe", sql.NVarChar(150), nguoiLienHe || null)
      .input("dienThoai", sql.VarChar(20), dienThoai || null)
      .input("email", sql.VarChar(254), email || null)
      .input("diaChi", sql.NVarChar(500), diaChi || null)
      .input("trangThai", sql.NVarChar(30), trangThai)
      .query(`
        INSERT INTO dbo.NhaCungCap (TenNCC, NguoiLienHe, DienThoai, Email, DiaChi, TrangThai)
        OUTPUT INSERTED.MaNCC, INSERTED.TenNCC, INSERTED.NguoiLienHe,
               INSERTED.DienThoai, INSERTED.Email, INSERTED.DiaChi, INSERTED.TrangThai
        VALUES (@tenNCC, @nguoiLienHe, @dienThoai, @email, @diaChi, @trangThai)
      `);
    return res.status(201).json({ success: true, message: "Đã thêm nhà cung cấp.", data: result.recordset[0] });
  } catch (error) {
    console.error("Lỗi thêm nhà cung cấp:", error.message);
    return res.status(500).json({ success: false, message: "Không thể thêm nhà cung cấp." });
  }
}

async function capNhatTrangThaiNhaCungCap(req, res) {
  const maNCC = Number(req.params.id);
  const trangThai = req.body?.trangThai;
  if (!Number.isSafeInteger(maNCC) || maNCC < 1 || !TRANG_THAI.includes(trangThai)) {
    return res.status(400).json({ success: false, message: "Mã hoặc trạng thái nhà cung cấp không hợp lệ." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("maNCC", sql.Int, maNCC)
      .input("trangThai", sql.NVarChar(30), trangThai)
      .query(`
        UPDATE dbo.NhaCungCap
        SET TrangThai = @trangThai
        OUTPUT INSERTED.MaNCC, INSERTED.TrangThai
        WHERE MaNCC = @maNCC
      `);
    if (!result.recordset[0]) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhà cung cấp." });
    }
    return res.json({ success: true, message: "Đã cập nhật trạng thái hợp tác.", data: result.recordset[0] });
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái nhà cung cấp:", error.message);
    return res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái nhà cung cấp." });
  }
}

module.exports = {
  layDanhSachNhaCungCap,
  layChiTietNhaCungCap,
  themNhaCungCap,
  capNhatTrangThaiNhaCungCap
};
