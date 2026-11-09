const express = require("express");
const { layTonKho, layChiTietTonKho, traCuuTonKhoNhanVien, layDanhMucTraCuu, lichSuKhoNhanVien, chiTietGiaoDichKhoNhanVien } = require("../controllers/khoController");
const {
  layDanhSachNhaCungCap,
  layChiTietNhaCungCap,
  themNhaCungCap,
  capNhatTrangThaiNhaCungCap
} = require("../controllers/nhaCungCapController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");

const router = express.Router();
const quanTri = [xacThuc, choPhepVaiTro("Quản lý", "Admin")];

// API tra cứu CHỈ ĐỌC cho nhân viên; không mở quyền quản trị kho.
const nhanVien = [xacThuc, choPhepVaiTro("Nhân viên")];
router.get("/lich-su-kho", ...nhanVien, lichSuKhoNhanVien);
router.get("/lich-su-kho/:maGiaoDich", ...nhanVien, chiTietGiaoDichKhoNhanVien);
router.get("/tra-cuu-ton-kho", ...nhanVien, traCuuTonKhoNhanVien);
router.get("/tra-cuu-danh-muc", ...nhanVien, layDanhMucTraCuu);
router.get("/ton-kho", ...quanTri, layTonKho);
router.get("/ton-kho/:maBienThe", ...quanTri, layChiTietTonKho);
router.get("/nha-cung-cap", ...quanTri, layDanhSachNhaCungCap);
router.post("/nha-cung-cap", ...quanTri, themNhaCungCap);
router.get("/nha-cung-cap/:id", ...quanTri, layChiTietNhaCungCap);
router.patch("/nha-cung-cap/:id/trang-thai", ...quanTri, capNhatTrangThaiNhaCungCap);

module.exports = router;
