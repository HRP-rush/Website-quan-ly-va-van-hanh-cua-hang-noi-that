const express = require("express");
const { layTonKho, layChiTietTonKho } = require("../controllers/khoController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");

const router = express.Router();
const quanTri = [xacThuc, choPhepVaiTro("Quản lý", "Admin")];

router.get("/ton-kho", ...quanTri, layTonKho);
router.get("/ton-kho/:maBienThe", ...quanTri, layChiTietTonKho);

module.exports = router;
