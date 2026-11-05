
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

        dm.TenDanhMuc,

        anh.DuongDan AS DuongDanAnh

      FROM dbo.SanPham AS sp

      INNER JOIN dbo.DanhMuc AS dm
        ON sp.MaDanhMuc = dm.MaDanhMuc

      OUTER APPLY (
        SELECT TOP (1)
          a.DuongDan
        FROM dbo.AnhSanPham AS a
        WHERE a.MaSanPham = sp.MaSanPham
        ORDER BY
          a.LaAnhDaiDien DESC,
          a.MaAnh ASC
      ) AS anh

      ORDER BY sp.MaSanPham DESC
    `);

    res.json({
      success: true,
      total: result.recordset.length,
      data: result.recordset
    });

  } catch (error) {
    console.error("Lỗi lấy sản phẩm:", error.message);

    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách sản phẩm"
    });
  }
}

module.exports = { layDanhSachSanPham };
