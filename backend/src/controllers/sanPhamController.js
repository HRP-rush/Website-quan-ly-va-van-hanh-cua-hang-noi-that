
const { getPool } = require("../config/db");

async function layDanhSachSanPham(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        sp.MaSanPham,
        sp.TenSanPham,
        sp.MoTa,
        sp.PhongCach,
        sp.TrangThai,
        dm.TenDanhMuc
      FROM dbo.SanPham AS sp
      INNER JOIN dbo.DanhMuc AS dm
        ON sp.MaDanhMuc = dm.MaDanhMuc
      ORDER BY sp.MaSanPham DESC
    `);

    return res.json({
      success: true,
      total: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    console.error("Lỗi lấy sản phẩm:", error.message);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách sản phẩm"
    });
  }
}

module.exports = { layDanhSachSanPham };
