const { sql, getPool } = require("../config/db");
const { TRANG_THAI_NHAP, TRANG_THAI_GHI_NHAN } = require("../config/phieuNhap");

const MA_PHIEU = `'PN-' + RIGHT('0000' + CAST(pn.MaPhieuNhap AS VARCHAR(10)), 4)`;
const DAU_THANG = `DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)`;
const THANG_NAY = `pn.NgayNhap >= ${DAU_THANG} AND pn.NgayNhap < DATEADD(MONTH, 1, ${DAU_THANG})`;
// Chỉ nhận các khoảng nằm trong danh sách này (SQL cố định, không ghép chuỗi từ người dùng)
const KHOANG_SQL = {
  homNay: "CAST(pn.NgayNhap AS DATE) = CAST(SYSDATETIME() AS DATE)",
  "7ngay": "CAST(pn.NgayNhap AS DATE) >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))",
  thangNay: THANG_NAY,
  thangTruoc: `pn.NgayNhap >= DATEADD(MONTH, -1, ${DAU_THANG}) AND pn.NgayNhap < ${DAU_THANG}`
};

async function layDanhSachPhieuNhap(req, res) {
  try {
    const q = String(req.query.q || "").trim().slice(0, 100);
    const trangThai = String(req.query.trangThai || "").trim();
    const khoang = String(req.query.khoang || "").trim();
    const trang = Math.max(1, parseInt(req.query.trang, 10) || 1);
    const soDong = Math.min(50, Math.max(1, parseInt(req.query.soDong, 10) || 10));
    if (trangThai && ![TRANG_THAI_NHAP, TRANG_THAI_GHI_NHAN].includes(trangThai)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    if (khoang && !KHOANG_SQL[khoang]) {
      return res.status(400).json({ success: false, message: "Khoảng ngày không hợp lệ." });
    }

    const nguon = `
      FROM dbo.PhieuNhap AS pn
      INNER JOIN dbo.NhaCungCap AS ncc ON ncc.MaNCC = pn.MaNCC
      INNER JOIN dbo.NguoiDung AS nd ON nd.MaNguoiDung = pn.MaNguoiDung
      OUTER APPLY (
        SELECT COUNT(*) AS SoSku, ISNULL(SUM(ct.SoLuong * ct.DonGiaNhap), 0) AS TongTien
        FROM dbo.CTPhieuNhap AS ct WHERE ct.MaPhieuNhap = pn.MaPhieuNhap
      ) AS x`;

    const dk = ["1=1"];
    const thamSo = [];
    if (q) {
      dk.push(`(${MA_PHIEU} LIKE @q ESCAPE '\\' OR ncc.TenNCC LIKE @q ESCAPE '\\')`);
      thamSo.push(["q", sql.NVarChar(210), `%${q.replace(/[\\%_[]/g, "\\$&")}%`]);
    }
    if (trangThai) { dk.push("pn.TrangThai = @trangThai"); thamSo.push(["trangThai", sql.NVarChar(40), trangThai]); }
    if (khoang) dk.push(`(${KHOANG_SQL[khoang]})`);
    const where = dk.join(" AND ");

    const pool = await getPool();
    const tao = () => { const r = pool.request(); thamSo.forEach(([n, t, v]) => r.input(n, t, v)); return r; };

    const [ds, dem, kpi] = await Promise.all([
      tao().input("offset", sql.Int, (trang - 1) * soDong).input("soDong", sql.Int, soDong).query(`
        SELECT pn.MaPhieuNhap, ${MA_PHIEU} AS MaPhieu, ncc.TenNCC,
               FORMAT(pn.NgayNhap, 'dd/MM/yyyy') AS NgayNhap,
               COALESCE(nd.HoTen, nd.Email) AS NguoiLap,
               x.SoSku, x.TongTien, pn.TrangThai
        ${nguon}
        WHERE ${where}
        ORDER BY pn.NgayNhap DESC, pn.MaPhieuNhap DESC
        OFFSET @offset ROWS FETCH NEXT @soDong ROWS ONLY`),
      tao().query(`SELECT COUNT(*) AS Tong ${nguon} WHERE ${where}`),
      // 4 thẻ tổng quan đều tính theo THÁNG HIỆN TẠI, không phụ thuộc bộ lọc
      pool.request().input("nhap", sql.NVarChar(40), TRANG_THAI_NHAP).input("ghiNhan", sql.NVarChar(40), TRANG_THAI_GHI_NHAN).query(`
        SELECT COUNT(*) AS TrongThang,
               ISNULL(SUM(CASE WHEN pn.TrangThai = @ghiNhan THEN 1 ELSE 0 END), 0) AS DaGhiNhan,
               ISNULL(SUM(CASE WHEN pn.TrangThai = @nhap THEN 1 ELSE 0 END), 0) AS Nhap,
               ISNULL(SUM(CASE WHEN pn.TrangThai = @ghiNhan THEN x.TongTien ELSE 0 END), 0) AS GiaTriDaNhap,
               FORMAT(SYSDATETIME(), 'MM/yyyy') AS Thang
        ${nguon} WHERE ${THANG_NAY}`)
    ]);

    res.json({ success: true, data: ds.recordset, total: dem.recordset[0].Tong, tongQuan: kpi.recordset[0], trang, soDong });
  } catch (error) {
    console.error("Lỗi lấy danh sách phiếu nhập:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách phiếu nhập." });
  }
}

module.exports = { layDanhSachPhieuNhap };
