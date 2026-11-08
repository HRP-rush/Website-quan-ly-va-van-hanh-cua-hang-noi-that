const router = require("express").Router();

const c = require("../controllers/gioHangController");

const {
  xacThuc,
  choPhepVaiTro
} = require("../middleware/xacThuc");

router.get(
  "/kiem-tra-ton-kho",
  c.kiemTraTonKho
);

router.use(
  xacThuc,
  choPhepVaiTro("Khách hàng")
);

router.get("/", c.layGioHang);

router.get(
  "/tinh-tong-tien",
  c.tinhTongTienGioHang
);

router.post(
  "/xac-nhan-giao-nhan",
  c.xacNhanGiaoNhan
);

router.post(
  "/them-san-pham",
  c.themSanPham
);

router.put(
  "/cap-nhat-so-luong",
  c.capNhatSoLuong
);

router.delete(
  "/xoa-san-pham/:id",
  c.xoaSanPham
);

module.exports = router;