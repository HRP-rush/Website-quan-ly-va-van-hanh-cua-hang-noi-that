const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const THU_MUC = path.join(__dirname, "../../uploads/san-pham");
fs.mkdirSync(THU_MUC, { recursive: true });

const DUOI = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, THU_MUC),
    // Tên file do server tự sinh, không dùng tên người dùng gửi lên
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + DUOI[file.mimetype])
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 9 },
  fileFilter: (req, file, cb) =>
    DUOI[file.mimetype] ? cb(null, true) : cb(new Error("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP."))
});

const nhanAnh = upload.fields([
  { name: "anhChinh", maxCount: 1 },
  { name: "anhBoSung", maxCount: 8 }
]);

// Bọc lại để lỗi multer trả về JSON 400 thay vì lỗi 500 mặc định
function uploadAnhSanPham(req, res, next) {
  nhanAnh(req, res, (err) => {
    if (!err) return next();
    const message = err.code === "LIMIT_FILE_SIZE" ? "Mỗi ảnh tối đa 5 MB."
      : err.code === "LIMIT_UNEXPECTED_FILE" ? "Tối đa 1 ảnh chính và 8 ảnh bổ sung."
      : err.message || "Không thể tải ảnh lên.";
    res.status(400).json({ success: false, message });
  });
}

module.exports = { uploadAnhSanPham };
