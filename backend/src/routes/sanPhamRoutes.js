const express = require("express");
const {
  layDanhSachSanPham, layDanhMuc, themSanPham,
  layChatLieu, layDanhSachQuanTri, doiTrangThai,
  layChiTietSanPham, layDeChinhSua, capNhatSanPham,
  layBienThe
} = require("../controllers/sanPhamController");
const { xacThuc, choPhepVaiTro } = require("../middleware/xacThuc");
const { uploadAnhSanPham, uploadAnhChinhSua } = require("../middleware/uploadAnh");

const router = express.Router();
const quanTri = [xacThuc, choPhepVaiTro("Quản lý", "Admin")];

router.get("/", layDanhSachSanPham);                       // trang khách (công khai)
router.get("/danh-muc", ...quanTri, layDanhMuc);
router.get("/chat-lieu", ...quanTri, layChatLieu);
router.get("/quan-tri", ...quanTri, layDanhSachQuanTri);   // danh sách có lọc + phân trang
router.post("/them-san-pham", ...quanTri, uploadAnhSanPham, themSanPham);
router.patch("/:maSanPham/trang-thai", ...quanTri, doiTrangThai);
router.get("/quan-tri/:maSanPham", ...quanTri, layChiTietSanPham);
router.get("/quan-tri/:maSanPham/chinh-sua", ...quanTri, layDeChinhSua);
router.put("/quan-tri/:maSanPham", ...quanTri, uploadAnhChinhSua, capNhatSanPham);
router.get("/quan-tri/:maSanPham/bien-the", ...quanTri, layBienThe);

module.exports = router;
