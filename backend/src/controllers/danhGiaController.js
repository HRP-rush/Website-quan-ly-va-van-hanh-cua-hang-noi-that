const { getPool } = require("../config/db");

exports.taoDanhGia = async (req, res) => {
  try {
    const { maSanPham, maKhachHang, soSao, noiDung, hinhAnh } = req.body;
    const pool = await getPool();

    await pool.request()
      .input('MaSanPham', maSanPham)
      .input('MaKhachHang', maKhachHang)
      .input('SoSao', soSao)
      .input('NoiDung', noiDung)
      .input('HinhAnh', hinhAnh || '')
      .query(`
        INSERT INTO ProductReviews (MaSanPham, MaKhachHang, SoSao, NoiDung, HinhAnh, NgayTao)
        VALUES (@MaSanPham, @MaKhachHang, @SoSao, @NoiDung, @HinhAnh, GETDATE())
      `);

    return res.status(200).json({
      success: true,
      message: "Thêm đánh giá thành công!"
    });
  } catch (error) {
    console.error("Lỗi tạo đánh giá:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};