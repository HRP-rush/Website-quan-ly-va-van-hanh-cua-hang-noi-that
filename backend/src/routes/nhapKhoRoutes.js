const express = require("express");
const {
  layDanhSachPhieuNhap, layKhoiTaoPhieu, layPhieuNhap, layChiTietPhieuNhap, taoPhieuNhap, capNhatPhieuNhap
} = require("../controllers/nhapKhoController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");

const router = express.Router();
const quanTri = [xacThuc, choPhepVaiTro("Quản lý", "Admin")];
const nhanVien = [xacThuc, choPhepVaiTro("Nhân viên")];

router.get("/phieu-nhap", ...quanTri, layDanhSachPhieuNhap);
router.get("/khoi-tao-phieu", ...quanTri, layKhoiTaoPhieu);
router.get("/phieu-nhap/:maPhieuNhap", ...quanTri, layPhieuNhap);
router.get("/phieu-nhap/:maPhieuNhap/chi-tiet", ...quanTri, layChiTietPhieuNhap);
router.post("/phieu-nhap", ...quanTri, taoPhieuNhap);
router.put("/phieu-nhap/:maPhieuNhap", ...quanTri, capNhatPhieuNhap);

// Đường dẫn riêng cho nhân viên: chỉ được thao tác phiếu do chính mình lập.
router.get("/nhan-vien/khoi-tao-phieu", ...nhanVien, layKhoiTaoPhieu);
router.get("/nhan-vien/phieu-nhap/:maPhieuNhap", ...nhanVien, layPhieuNhap);
router.post("/nhan-vien/phieu-nhap", ...nhanVien, taoPhieuNhap);
router.put("/nhan-vien/phieu-nhap/:maPhieuNhap", ...nhanVien, capNhatPhieuNhap);

module.exports = router;
