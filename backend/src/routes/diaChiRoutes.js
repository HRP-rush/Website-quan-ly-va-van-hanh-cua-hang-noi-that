const express = require("express");
const {
  layTinhThanh,
  layPhuongXa
} = require("../controllers/diaChiController");

const router = express.Router();

router.get("/tinh-thanh", layTinhThanh);
router.get("/tinh-thanh/:maTinh/phuong-xa", layPhuongXa);

module.exports = router;
