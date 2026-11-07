const express = require("express");
const { layTonKho } = require("../controllers/khoController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");

const router = express.Router();
router.get("/ton-kho", xacThuc, choPhepVaiTro("Quản lý", "Admin"), layTonKho);

module.exports = router;
