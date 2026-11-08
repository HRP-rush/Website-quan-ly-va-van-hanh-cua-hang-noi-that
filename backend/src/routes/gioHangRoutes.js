const express = require("express");
const {
  layGioHang,
  themSanPham,
  capNhatSoLuong,
  xoaSanPham,
  kiemTraTonKho,
  tinhTongTienGioHang,
  xacNhanGiaoNhan
} = require("../controllers/gioHangController");
const { xacThuc } = require("../middleware/xacThuc");

const router = express.Router();

router.get("/kiem-tra-ton-kho", kiemTraTonKho);
router.get("/tinh-tong-tien", xacThuc, tinhTongTienGioHang);
router.post("/xac-nhan-giao-nhan", xacNhanGiaoNhan);
router.get("/", xacThuc, layGioHang);
router.post("/them-san-pham", xacThuc, themSanPham);
router.put("/cap-nhat-so-luong", xacThuc, capNhatSoLuong);
router.delete("/xoa-san-pham/:id", xacThuc, xoaSanPham);

module.exports = router;
