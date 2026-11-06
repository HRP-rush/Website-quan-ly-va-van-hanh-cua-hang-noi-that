
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../config/db");

const COOKIE_NAME = "mocan_session";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/"
};

function taoThongTinCongKhai(row) {
  return {
    MaNguoiDung: row.MaNguoiDung,
    HoTen: row.HoTen,
    Email: row.Email,
    SoDienThoai: row.SoDienThoai,
    TenVaiTro: row.TenVaiTro
  };
}

async function dangNhap(req, res) {
  try {
    const { email, matKhau, ghiNho } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof matKhau !== "string" ||
      !email.trim() ||
      !matKhau
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email và mật khẩu."
      });
    }

    if (
      email.length > 254 ||
      Buffer.byteLength(matKhau, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng nhập không hợp lệ."
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("email", sql.VarChar(254), email.trim())
      .query(`
        SELECT
          nd.MaNguoiDung,
          nd.HoTen,
          nd.Email,
          nd.SoDienThoai,
          nd.MatKhauHash,
          nd.TrangThai,
          vt.TenVaiTro
        FROM dbo.NguoiDung nd
        INNER JOIN dbo.VaiTro vt
          ON nd.MaVaiTro = vt.MaVaiTro
        WHERE nd.Email = @email
      `);

    const user = result.recordset[0];

    // Luôn trả thông báo chung để tránh tiết lộ email tồn tại.
    const invalidMessage = {
      success: false,
      message: "Email hoặc mật khẩu không chính xác."
    };

    if (!user) {
      return res.status(401).json(invalidMessage);
    }

    const validPassword = await bcrypt.compare(
      matKhau,
      user.MatKhauHash
    );

    if (!validPassword) {
      return res.status(401).json(invalidMessage);
    }

    if (user.TrangThai !== "Hoạt động") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản không thể đăng nhập. Vui lòng liên hệ quản trị viên."
      });
    }

    const remember = ghiNho === true;
    const lifetime = remember ? "30d" : "8h";

    const token = jwt.sign(
      { sub: String(user.MaNguoiDung) },
      process.env.JWT_SECRET,
      {
        expiresIn: lifetime,
        algorithm: "HS256"
      }
    );

    const cookieOptions = { ...COOKIE_OPTIONS };

    if (remember) {
      cookieOptions.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.json({
      success: true,
      message: "Đăng nhập thành công.",
      data: taoThongTinCongKhai(user)
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error.message);

    return res.status(500).json({
      success: false,
      message: "Không thể đăng nhập. Vui lòng thử lại."
    });
  }
}

function cuaToi(req, res) {
  return res.json({
    success: true,
    data: taoThongTinCongKhai(req.user)
  });
}

function dangXuat(req, res) {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

  return res.json({
    success: true,
    message: "Đăng xuất thành công."
  });
}

module.exports = {
  dangNhap,
  cuaToi,
  dangXuat
};
