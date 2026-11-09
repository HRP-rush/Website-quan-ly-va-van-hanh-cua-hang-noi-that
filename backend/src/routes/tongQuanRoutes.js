const router = require("express").Router();

const {
  xacThuc,
  choPhepVaiTro
} = require("../middleware/xacThuc");

const {
  layTongQuan
} = require("../controllers/tongQuanController");

router.get(
  "/",
  xacThuc,
  choPhepVaiTro("Quản lý", "Admin"),
  layTongQuan
);

module.exports = router;