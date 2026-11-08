const express = require("express");
const { layDanhSachPhieuNhap } = require("../controllers/nhapKhoController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");

const router = express.Router();
router.get("/phieu-nhap", xacThuc, choPhepVaiTro("Quản lý", "Admin"), layDanhSachPhieuNhap);

module.exports = router;
