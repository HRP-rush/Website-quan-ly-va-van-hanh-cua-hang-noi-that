const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
require("dotenv").config();

const { getPool } = require("./config/db");

// Import các routes
const sanPhamRoutes = require("./routes/sanPhamRoutes");
const gioHangRoutes = require("./routes/gioHangRoutes");
const donHangRoutes = require("./routes/donHangRoutes");
const taiKhoanRoutes = require("./routes/taiKhoanRoutes");
const khoRoutes = require("./routes/khoRoutes");
const nhapKhoRoutes = require("./routes/nhapKhoRoutes");

// Khởi tạo ứng dụng Express
const app = express();
const PORT = Number(process.env.PORT || 5000);

// Cấu hình CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
  })
);

// Cấu hình Middleware
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Route kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.json({
    message: "API Mộc An Interior đang hoạt động ổn định!"
  });
});

// API kiểm tra kết nối SQL Server
app.get("/api/health/db", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(
      "SELECT DB_NAME() AS databaseName"
    );

    res.json({
      status: "connected",
      database: result.recordset[0].databaseName
    });
  } catch (error) {
    console.error("Lỗi SQL Server:", error.message);

    res.status(503).json({
      status: "error",
      message: "Không thể kết nối cơ sở dữ liệu"
    });
  }
});

// Khai báo các Routes của hệ thống
app.use("/api/danh-muc", require("./routes/danhMucRoutes"));
app.use("/api/san-pham", sanPhamRoutes);
app.use("/api/con-nguoi", require("./routes/conNguoiRoutes"));
app.use("/api/phan-hoi", require("./routes/phanHoiRoutes"));

// Giới hạn số lần đăng nhập
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau."
  }
});

app.use("/api/v1/tai-khoan/dang-nhap", loginLimiter);

// Giới hạn số lần đăng ký
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Bạn đã gửi quá nhiều yêu cầu đăng ký. Vui lòng thử lại sau."
  }
});

app.use("/api/v1/tai-khoan/dang-ky", registerLimiter);

// Route tài khoản
app.use("/api/v1/tai-khoan", taiKhoanRoutes);

// Các route kho, giỏ hàng, đơn hàng
app.use("/api/kho", khoRoutes);
app.use("/api/v1/gio-hang", gioHangRoutes);
app.use("/api/v1/don-hang", donHangRoutes);

// Route đơn hàng
app.use("/api/don-hang", donHangRoutes);

// Các route khác
app.use("/api/nhap-kho", nhapKhoRoutes);
app.use("/api/bao-cao", require("./routes/baoCaoRoutes"));
app.use("/api/tong-quan", require("./routes/tongQuanRoutes"));

// Xử lý API không tồn tại
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy API ${req.method} ${req.originalUrl}.`
  });
});

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`Backend đang chạy tại http://localhost:${PORT}`);
});