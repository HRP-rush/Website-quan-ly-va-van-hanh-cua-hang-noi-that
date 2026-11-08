const router = require("express").Router();
const multer = require("multer");

const {
  xacThuc,
  choPhepVaiTro
} = require("../middleware/xacThuc");

const controller = require("../controllers/danhMucController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 6,
    fieldSize: 8000
  }
}).single("hinhAnh");

router.use(
  xacThuc,
  choPhepVaiTro("Quản lý", "Admin")
);

function image(req, res, next) {
  upload(req, res, err => {
    if (!err) return next();

    res.status(400).json({
      success: false,
      field: "hinhAnh",
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "Mỗi ảnh tối đa 5 MB."
          : "Chỉ nhận một ảnh JPG, PNG hoặc WEBP tối đa 5 MB."
    });
  });
}

router.get("/", controller.list);
router.get("/:id", controller.detail);
router.post("/", image, controller.save);
router.put("/:id", image, controller.save);
router.patch("/:id/trang-thai", controller.status);
router.delete("/:id", controller.remove);

module.exports = router;