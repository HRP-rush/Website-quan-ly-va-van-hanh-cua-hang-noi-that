
const express = require("express");

const {
  layDanhSachSanPham
} = require("../controllers/sanPhamController");

const router = express.Router();

router.get("/", layDanhSachSanPham);

module.exports = router;
