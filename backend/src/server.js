const express = require('express');
const cors = require('cors');
require('dotenv').config();

<<<<<<< HEAD
// Khởi tạo ứng dụng Express
const app = express();
=======
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { getPool } = require("./config/db");

const sanPhamRoutes = require("./routes/sanPhamRoutes");
const gioHangRoutes = require("./routes/gioHangRoutes");
const donHangRoutes = require("./routes/donHangRoutes");

const app = express();
const PORT = Number(process.env.PORT || 5000);

const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
const taiKhoanRoutes = require("./routes/taiKhoanRoutes");

const khoRoutes = require("./routes/khoRoutes");

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
>>>>>>> 4ef9bddc18d348b4f669190ee2f1768a68ca3155

// Cấu hình Middleware
app.use(cors());
app.use(express.json());
<<<<<<< HEAD
app.use(express.urlencoded({ extended: true }));
=======
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
>>>>>>> 4ef9bddc18d348b4f669190ee2f1768a68ca3155

// Khai báo các Routes của hệ thống
const donHangRoutes = require("./routes/donHangRoutes");

// Gắn prefix cho route đơn hàng
app.use("/api/don-hang", donHangRoutes);

// Route kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.json({ message: "API Mộc An Interior đang hoạt động ổn định!" });
});

<<<<<<< HEAD
// Cấu hình cổng chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
=======
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

app.use("/api/san-pham", sanPhamRoutes);

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

app.use(
  "/api/v1/tai-khoan/dang-nhap",
  loginLimiter
);


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

app.use(
  "/api/v1/tai-khoan/dang-ky",
  registerLimiter
);


app.use(
  "/api/v1/tai-khoan",
  taiKhoanRoutes
);

app.use("/api/kho", khoRoutes);
app.use("/api/v1/gio-hang", gioHangRoutes);
app.use("/api/v1/don-hang", donHangRoutes);

// Keep unknown API routes in JSON format so clients never try to parse an HTML 404 page.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy API ${req.method} ${req.originalUrl}.`
  });
});

app.listen(PORT, () => {
  console.log(`Backend đang chạy tại http://localhost:${PORT}`);
>>>>>>> 4ef9bddc18d348b4f669190ee2f1768a68ca3155
});
