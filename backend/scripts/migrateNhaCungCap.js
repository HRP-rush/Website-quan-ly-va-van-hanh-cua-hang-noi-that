require("dotenv").config();

const { getPool } = require("../src/config/db");

async function migrateNhaCungCap() {
  const pool = await getPool();
  try {
    await pool.request().query(`
      IF COL_LENGTH('dbo.NhaCungCap', 'NguoiLienHe') IS NULL
        ALTER TABLE dbo.NhaCungCap ADD NguoiLienHe NVARCHAR(150) NULL;

      IF COL_LENGTH('dbo.NhaCungCap', 'TrangThai') IS NULL
      BEGIN
        ALTER TABLE dbo.NhaCungCap
          ADD TrangThai NVARCHAR(30) NOT NULL
          CONSTRAINT DF_NhaCungCap_TrangThai DEFAULT (N'Đang hợp tác') WITH VALUES;
      END;
    `);
    process.stdout.write("Đã cập nhật cấu trúc bảng nhà cung cấp.\n");
  } finally {
    await pool.close();
  }
}

migrateNhaCungCap().catch((error) => {
  console.error("Không thể cập nhật cấu trúc bảng nhà cung cấp:", error.message);
  process.exitCode = 1;
});
