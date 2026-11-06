
const express = require("express");

const {
  dangNhap,
  dangKy,
  cuaToi,
  dangXuat
} = require("../controllers/taiKhoanController");

const { xacThuc } = require("../middleware/xacThuc");

const router = express.Router();

router.post("/dang-ky", dangKy);
router.post("/dang-nhap", dangNhap);
router.get("/cua-toi", xacThuc, cuaToi);
router.post("/dang-xuat", dangXuat);

module.exports = router;
