
require("dotenv").config();

const bcrypt = require("bcryptjs");
const readline = require("readline-sync");
const { sql, getPool } = require("../src/config/db");

async function main() {
  const email = readline.question("Email Admin: ").trim();
  const hoTen = readline.question("Ho ten Admin: ").trim();

  const password = readline.question(
    "Mat khau Admin: ",
    { hideEchoBack: true }
  );

  if (
    !email.includes("@") ||
    !hoTen ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error(
      "Email, ho ten hoac mat khau khong hop le."
    );
  }

  const pool = await getPool();

  const existingAdmin = await pool.request().query(`
    SELECT COUNT(*) AS SoLuong
    FROM dbo.NguoiDung nd
    INNER JOIN dbo.VaiTro vt
      ON nd.MaVaiTro = vt.MaVaiTro
    WHERE vt.TenVaiTro = N'Admin'
  `);

  if (existingAdmin.recordset[0].SoLuong > 0) {
    throw new Error(
      "Da co Admin. Script nay chi tao Admin dau tien."
    );
  }

  const hash = await bcrypt.hash(password, 12);

  await pool.request()
    .input("email", sql.VarChar(254), email)
    .input("hoTen", sql.NVarChar(150), hoTen)
    .input("hash", sql.VarChar(255), hash)
    .query(`
      INSERT INTO dbo.NguoiDung (
        MaVaiTro,
        HoTen,
        Email,
        MatKhauHash,
        TrangThai
      )
      SELECT
        vt.MaVaiTro,
        @hoTen,
        @email,
        @hash,
        N'Hoạt động'
      FROM dbo.VaiTro vt
      WHERE vt.TenVaiTro = N'Admin'
    `);

  console.log("Tao tai khoan Admin thanh cong.");
}

main()
  .catch(err => {
    console.error(err.message);
    process.exitCode = 1;
  })
    .finally(async () => {
    const { getPool } = require("../src/config/db");

    try {
      const pool = await getPool();
      await pool.close();
    } catch {
      // Không mở được kết nối thì không có pool để đóng.
    }
  });
