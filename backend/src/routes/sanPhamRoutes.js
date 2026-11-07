
const express = require("express");

const {
  layDanhSachSanPham,
  layGioHang,
  kiemTraTonKho,
  tangSoLuongTrongGio,
  xoaSanPhamKhoiGioHang,
  tienHanhThanhToan
} = require("../controllers/sanPhamController");

const router = express.Router();

router.get("/san-pham/danh-sach", layDanhSachSanPham);
router.post("/gio-hang/kiem-tra-ton-kho", kiemTraTonKho);
router.get("/gio-hang/:maNguoiDung", layGioHang);
router.post("/gio-hang/:maNguoiDung/tang-so-luong/:maCTGio", tangSoLuongTrongGio);
router.delete("/gio-hang/:maNguoiDung/xoa-san-pham/:maCTGio", xoaSanPhamKhoiGioHang);
router.post("/don-hang/tao-moi", tienHanhThanhToan);

module.exports = router;
