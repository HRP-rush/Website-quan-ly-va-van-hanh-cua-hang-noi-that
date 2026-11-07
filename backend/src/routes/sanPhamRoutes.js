const express = require("express");
const { layDanhSachSanPham, layDanhMuc, themSanPham } = require("../controllers/sanPhamController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");
const { uploadAnhSanPham } = require("../middleware/uploadAnh");

const router = express.Router();
const quanTri = [xacThuc, choPhepVaiTro("Quản lý", "Admin")];

router.get("/", layDanhSachSanPham);
router.get("/danh-muc", ...quanTri, layDanhMuc);
// Thứ tự: đăng nhập -> kiểm tra quyền -> nhận file -> xử lý
router.post("/them-san-pham", ...quanTri, uploadAnhSanPham, themSanPham);

module.exports = router;
