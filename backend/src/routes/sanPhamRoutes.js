
const express = require("express");

// Controller quản lý sản phẩm hiện tại
const {
  layDanhSachSanPham,
  layGioHang,
  kiemTraTonKho,
  tangSoLuongTrongGio,
  xoaSanPhamKhoiGioHang,
  tienHanhThanhToan
  layDanhMuc,
  themSanPham,
  layChatLieu,
  layDanhSachQuanTri,
  doiTrangThai,
  layChiTietSanPham,
  layDeChinhSua,
  capNhatSanPham,
  layBienThe,
  themBienThe,
  suaBienThe,
  doiTrangThaiBienThe
} = require("../controllers/sanPhamController");

// Controller công khai cho khách xem sản phẩm
const {
  danhSach,
  chiTiet
} = require("../controllers/catalogController");

// Middleware xác thực và phân quyền
const {
  xacThuc,
  choPhepVaiTro
} = require("../middleware/xacThuc");

// Middleware upload hình ảnh
const {
  uploadAnhSanPham,
  uploadAnhChinhSua
} = require("../middleware/uploadAnh");

const router = express.Router();

router.get("/san-pham/danh-sach", layDanhSachSanPham);
router.post("/gio-hang/kiem-tra-ton-kho", kiemTraTonKho);
router.get("/gio-hang/:maNguoiDung", layGioHang);
router.post("/gio-hang/:maNguoiDung/tang-so-luong/:maCTGio", tangSoLuongTrongGio);
router.delete("/gio-hang/:maNguoiDung/xoa-san-pham/:maCTGio", xoaSanPhamKhoiGioHang);
router.post("/don-hang/tao-moi", tienHanhThanhToan);
const quanTri = [
  xacThuc,
  choPhepVaiTro("Quản lý", "Admin")
];

// ===========================================
// 1. API CÔNG KHAI - KHÁCH HÀNG
// ===========================================

// Lấy danh sách sản phẩm đang bán
router.get("/", danhSach);

// Lấy chi tiết một sản phẩm
router.get("/cong-khai/:maSanPham", chiTiet);

// ===========================================
// 2. API QUẢN TRỊ - QUẢN LÝ
// ===========================================

// Danh mục sản phẩm
router.get("/danh-muc", ...quanTri, layDanhMuc);

// Danh sách chất liệu
router.get("/chat-lieu", ...quanTri, layChatLieu);

// Danh sách sản phẩm dành cho quản trị
router.get("/quan-tri", ...quanTri, layDanhSachQuanTri);

// Thêm sản phẩm
router.post(
  "/them-san-pham",
  ...quanTri,
  uploadAnhSanPham,
  themSanPham
);

// Cập nhật trạng thái sản phẩm
router.patch(
  "/:maSanPham/trang-thai",
  ...quanTri,
  doiTrangThai
);

// Xem chi tiết sản phẩm trong quản trị
router.get(
  "/quan-tri/:maSanPham",
  ...quanTri,
  layChiTietSanPham
);

// Lấy dữ liệu để chỉnh sửa sản phẩm
router.get(
  "/quan-tri/:maSanPham/chinh-sua",
  ...quanTri,
  layDeChinhSua
);

// Cập nhật thông tin sản phẩm
router.put(
  "/quan-tri/:maSanPham",
  ...quanTri,
  uploadAnhChinhSua,
  capNhatSanPham
);

// ===========================================
// 3. API QUẢN LÝ BIẾN THỂ SẢN PHẨM
// ===========================================

// Danh sách biến thể
router.get(
  "/quan-tri/:maSanPham/bien-the",
  ...quanTri,
  layBienThe
);

// Thêm biến thể
router.post(
  "/quan-tri/:maSanPham/bien-the",
  ...quanTri,
  themBienThe
);

// Sửa biến thể
router.put(
  "/quan-tri/bien-the/:maBienThe",
  ...quanTri,
  suaBienThe
);

// Thay đổi trạng thái biến thể
router.patch(
  "/quan-tri/bien-the/:maBienThe/trang-thai",
  ...quanTri,
  doiTrangThaiBienThe
);

module.exports = router;
