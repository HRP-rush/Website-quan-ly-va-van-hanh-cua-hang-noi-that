const express = require("express");

const {
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