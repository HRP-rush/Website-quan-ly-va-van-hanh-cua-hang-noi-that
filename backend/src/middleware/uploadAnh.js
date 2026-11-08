const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const THU_MUC = path.join(__dirname, "../../../frontend/public/images");
const TIEN_TO_URL = "/images";
fs.mkdirSync(THU_MUC, { recursive: true });

const DUOI = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, THU_MUC),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + DUOI[file.mimetype])
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
  fileFilter: (req, file, cb) =>
    DUOI[file.mimetype] ? cb(null, true) : cb(new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP."))
});

// Bọc lại để lỗi multer trả về JSON 400 thay vì lỗi 500 mặc định
function boc(nhan) {
  return (req, res, next) => nhan(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Mỗi ảnh tối đa 5 MB."
      : err.code === "LIMIT_UNEXPECTED_FILE" ? "Tối đa 1 ảnh chính và 8 ảnh bổ sung."
      : err.message || "Không thể tải ảnh lên.";
    res.status(400).json({ success: false, message });
  });
}

// Trang Thêm: 1 ảnh chính + tối đa 8 ảnh bổ sung
const uploadAnhSanPham = boc(upload.fields([
  { name: "anhChinh", maxCount: 1 },
  { name: "anhBoSung", maxCount: 8 }
]));
// Trang Chỉnh sửa: chỉ các ảnh MỚI thêm, gửi chung một trường "anhMoi"
const uploadAnhChinhSua = boc(upload.array("anhMoi", 9));

module.exports = { THU_MUC, TIEN_TO_URL, uploadAnhSanPham, uploadAnhChinhSua };
