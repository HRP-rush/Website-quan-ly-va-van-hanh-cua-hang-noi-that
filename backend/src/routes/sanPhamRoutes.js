
const express = require("express");

const {
  layDanhSachSanPham,
  layGioHang,
  tangSoLuongTrongGio,
  xoaSanPhamKhoiGioHang,
  tienHanhThanhToan
} = require("../controllers/sanPhamController");

const router = express.Router();

router.get("/san-pham", layDanhSachSanPham);
router.get("/gio-hang/:maNguoiDung", layGioHang);
router.post("/gio-hang/:maNguoiDung/san-pham/:maCTGio/tang", tangSoLuongTrongGio);
router.delete("/gio-hang/:maNguoiDung/san-pham/:maCTGio", xoaSanPhamKhoiGioHang);
router.post("/gio-hang/:maNguoiDung/thanh-toan", tienHanhThanhToan);

module.exports = router;
