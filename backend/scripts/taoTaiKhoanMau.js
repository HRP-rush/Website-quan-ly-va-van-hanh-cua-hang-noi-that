// Chạy tại backend/: node scripts/taoTaiKhoanMau.js
// Chỉ dùng cho môi trường demo. Không lưu mật khẩu gốc vào repo/SQL Server.
require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { sql, getPool } = require("../src/config/db");
const accounts = [
  { email: "demo.khachhang@mocan.test", hoTen: "Khách hàng Demo", role: "Khách hàng" },
  { email: "demo.nhanvien@mocan.test", hoTen: "Nhân viên Demo", role: "Nhân viên" },
  { email: "demo.quanly@mocan.test", hoTen: "Quản lý Demo", role: "Quản lý" }
];

async function ensureRole(pool, name) {
  await pool.request().input("name",sql.NVarChar(50),name).query(`
    IF NOT EXISTS (SELECT 1 FROM dbo.VaiTro WHERE TenVaiTro = @name)
      INSERT INTO dbo.VaiTro(TenVaiTro) VALUES(@name)
  `);
  const result = await pool.request().input("name",sql.NVarChar(50),name)
    .query("SELECT MaVaiTro FROM dbo.VaiTro WHERE TenVaiTro = @name");
  return result.recordset[0].MaVaiTro;
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Không được chạy seed demo ở production.");
  const pool=await getPool();
  console.log("=== THÔNG TIN ĐĂNG NHẬP DEMO (CHỈ HIỆN MỘT LẦN) ===");
  try {
    for (const a of accounts) {
      const found=await pool.request().input("email",sql.VarChar(254),a.email)
        .query("SELECT MaNguoiDung FROM dbo.NguoiDung WHERE Email = @email");
      if (found.recordset.length) {
        console.log(`${a.role}: ${a.email} | Đã tồn tại, KHÔNG đổi mật khẩu.`);
        continue;
      }
      const roleId=await ensureRole(pool,a.role);
      const password=crypto.randomBytes(18).toString("base64url");
      const hash=await bcrypt.hash(password,12);
      await pool.request()
        .input("id",sql.Int,roleId)
        .input("name",sql.NVarChar(150),a.hoTen)
        .input("email",sql.VarChar(254),a.email)
        .input("hash",sql.VarChar(255),hash)
        .query(`INSERT INTO dbo.NguoiDung
          (MaVaiTro,HoTen,Email,MatKhauHash,TrangThai)
          VALUES (@id,@name,@email,@hash,N'Hoạt động')`);
      console.log(`${a.role}: ${a.email} | Mật khẩu tạm: ${password}`);
    }
    console.log("Hãy lưu mật khẩu trong nơi an toàn rồi xóa màn hình Terminal.");
  } finally { await pool.close(); }
}
main().catch(err=>{console.error("Không tạo được tài khoản mẫu:",err.message);process.exitCode=1;});
