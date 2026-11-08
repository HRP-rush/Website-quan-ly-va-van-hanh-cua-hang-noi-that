const express = require("express");
const { danhSachGiaoHang, chiTietGiaoHang, batDauGiaoHang, baoGiaoThatBai, giaoThanhCong } = require("../controllers/giaoHangController");

const {
  danhSachNhanVienXuLy, thongKeDonQuanLy, phanCongDon,
  danhSachDonNhanVien,
  chiTietDonNhanVien,
  kiemTraTonDonNhanVien,
  layLichSuDonHang,
  theoDoiDonHang,
  locDonHangTheoTrangThai,
  capNhatTrangThaiDonHang
} = require("../controllers/donHangController");

const {
  xacThuc,
  choPhepVaiTro
} = require("../middleware/xacThuc");

const { datHang } = require("../controllers/datHangController");

const router = express.Router();

const giaoQuyen = [xacThuc, choPhepVaiTro("Nhân viên", "Quản lý", "Admin")];
router.get("/nhan-vien/giao-hang", ...giaoQuyen, danhSachGiaoHang);
router.get("/nhan-vien/giao-hang/:id", ...giaoQuyen, chiTietGiaoHang);
router.post("/nhan-vien/giao-hang/:id/bat-dau", ...giaoQuyen, batDauGiaoHang);
router.post("/nhan-vien/giao-hang/:id/that-bai", ...giaoQuyen, baoGiaoThatBai);
router.post("/nhan-vien/giao-hang/:id/thanh-cong", ...giaoQuyen, giaoThanhCong);

router.get("/quan-ly/nhan-vien", xacThuc, choPhepVaiTro("Quản lý", "Admin"), danhSachNhanVienXuLy);
router.get("/quan-ly/thong-ke", xacThuc, choPhepVaiTro("Quản lý", "Admin"), thongKeDonQuanLy);
router.patch("/quan-ly/:id/phan-cong", xacThuc, choPhepVaiTro("Quản lý", "Admin"), phanCongDon);

router.get("/nhan-vien/danh-sach", xacThuc, choPhepVaiTro("Nhân viên", "Quản lý", "Admin"), danhSachDonNhanVien);
router.get("/nhan-vien/:id/chi-tiet", xacThuc, choPhepVaiTro("Nhân viên", "Quản lý", "Admin"), chiTietDonNhanVien);
router.get("/nhan-vien/:id/kiem-tra-ton", xacThuc, choPhepVaiTro("Nhân viên", "Quản lý", "Admin"), kiemTraTonDonNhanVien);

router.post(
  "/tao-moi",
  xacThuc,
  choPhepVaiTro("Khách hàng"),
  datHang
);

router.get(
  "/lich-su",
  xacThuc,
  layLichSuDonHang
);

router.get(
  "/loc-theo-trang-thai",
  xacThuc,
  choPhepVaiTro("Nhân viên", "Quản lý", "Admin"),
  locDonHangTheoTrangThai
);

router.get(
  "/:id/theo-doi",
  xacThuc,
  theoDoiDonHang
);

router.patch(
  "/:id/cap-nhat-giao-hang",
  xacThuc,
  choPhepVaiTro("Nhân viên", "Quản lý", "Admin"),
  capNhatTrangThaiDonHang
);

module.exports = router;