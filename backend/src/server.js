
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getPool } = require("./config/db");

const sanPhamRoutes = require("./routes/sanPhamRoutes");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API quản lý cửa hàng nội thất"
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

app.use("/api", sanPhamRoutes);

app.listen(PORT, () => {
  console.log(
    `Backend đang chạy tại http://localhost:${PORT}`
  );
});
