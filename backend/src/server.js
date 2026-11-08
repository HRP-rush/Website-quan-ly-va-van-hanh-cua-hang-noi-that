
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const { getPool } = require("./config/db");

const sanPhamRoutes = require("./routes/sanPhamRoutes");
const diaChiRoutes = require("./routes/diaChiRoutes");
const gioHangRoutes = require("./routes/gioHangRoutes");
const donHangRoutes = require("./routes/donHangRoutes");

const app = express();
const PORT = Number(process.env.PORT || 5000);

const cookieParser = require("cookie-parser");
const { rateLimit } = require("express-rate-limit");
const taiKhoanRoutes = require("./routes/taiKhoanRoutes");

const khoRoutes = require("./routes/khoRoutes");
const nhapKhoRoutes = require("./routes/nhapKhoRoutes");

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (req, res) => {
  res.json({
    message: "API quản lý cửa hàng nội thất"
  });
});

// API kiểm tra kết nối SQL Server
app.get("/api/v1/health/db", async (req, res) => {
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

app.use("/api/v1", sanPhamRoutes);
app.use("/api/v1/dia-chi", diaChiRoutes);

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
app.use("/api/nhap-kho", nhapKhoRoutes);
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
});
