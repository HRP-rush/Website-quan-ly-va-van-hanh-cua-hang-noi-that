const express = require("express");
const { layTonKho, layChiTietTonKho } = require("../controllers/khoController");
const {
  layDanhSachNhaCungCap,
  layChiTietNhaCungCap,
  themNhaCungCap,
  capNhatTrangThaiNhaCungCap
} = require("../controllers/nhaCungCapController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");

const router = express.Router();
const quanTri = [xacThuc, choPhepVaiTro("Quản lý", "Admin")];

router.get("/ton-kho", ...quanTri, layTonKho);
router.get("/ton-kho/:maBienThe", ...quanTri, layChiTietTonKho);
router.get("/nha-cung-cap", ...quanTri, layDanhSachNhaCungCap);
router.post("/nha-cung-cap", ...quanTri, themNhaCungCap);
router.get("/nha-cung-cap/:id", ...quanTri, layChiTietNhaCungCap);
router.patch("/nha-cung-cap/:id/trang-thai", ...quanTri, capNhatTrangThaiNhaCungCap);

module.exports = router;
