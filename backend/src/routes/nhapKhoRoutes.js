const express = require("express");
const {
  layDanhSachPhieuNhap, layKhoiTaoPhieu, layPhieuNhap, layChiTietPhieuNhap, taoPhieuNhap, capNhatPhieuNhap
} = require("../controllers/nhapKhoController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");

const router = express.Router();
const quanTri = [xacThuc, choPhepVaiTro("Quản lý", "Admin")];

router.get("/phieu-nhap", ...quanTri, layDanhSachPhieuNhap);
router.get("/khoi-tao-phieu", ...quanTri, layKhoiTaoPhieu);
router.get("/phieu-nhap/:maPhieuNhap", ...quanTri, layPhieuNhap);
router.get("/phieu-nhap/:maPhieuNhap/chi-tiet", ...quanTri, layChiTietPhieuNhap);
router.post("/phieu-nhap", ...quanTri, taoPhieuNhap);
router.put("/phieu-nhap/:maPhieuNhap", ...quanTri, capNhatPhieuNhap);

module.exports = router;
