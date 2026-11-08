const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Khởi tạo ứng dụng Express
const app = express();

// Cấu hình Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Khai báo các Routes của hệ thống
const donHangRoutes = require("./routes/donHangRoutes");

// Gắn prefix cho route đơn hàng
app.use("/api/don-hang", donHangRoutes);

// Route kiểm tra server hoạt động
app.get("/", (req, res) => {
  res.json({ message: "API Mộc An Interior đang hoạt động ổn định!" });
});

// Cấu hình cổng chạy Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
