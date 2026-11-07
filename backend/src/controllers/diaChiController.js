const {
  layDanhSachTinhThanh,
  layDanhSachPhuongXa
} = require("../services/diaChiService");

async function layTinhThanh(req, res) {
  try {
    const data = await layDanhSachTinhThanh();
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Lỗi lấy danh sách tỉnh, thành:", error.message);
    return res.status(503).json({
      success: false,
      message: "Không thể tải danh sách tỉnh, thành. Vui lòng thử lại."
    });
  }
}

async function layPhuongXa(req, res) {
  const maTinh = req.params.maTinh;
  if (!/^\d+$/.test(maTinh) || !Number.isSafeInteger(Number(maTinh))) {
    return res.status(400).json({
      success: false,
      message: "Mã tỉnh, thành không hợp lệ"
    });
  }

  try {
    const tinhThanh = await layDanhSachTinhThanh();
    if (!tinhThanh.some((tinh) => tinh.code === Number(maTinh))) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tỉnh, thành"
      });
    }

    const data = await layDanhSachPhuongXa(maTinh);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("Lỗi lấy danh sách phường, xã:", error.message);
    return res.status(503).json({
      success: false,
      message: "Không thể tải danh sách phường, xã. Vui lòng thử lại."
    });
  }
}

module.exports = { layTinhThanh, layPhuongXa };
