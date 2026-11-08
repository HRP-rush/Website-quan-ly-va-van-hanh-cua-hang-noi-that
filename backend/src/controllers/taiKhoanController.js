
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


async function dangKy(req, res) {
  try {
    const {
      hoTen,
      email,
      soDienThoai,
      matKhau
    } = req.body || {};

    // 1. Kiểm tra kiểu dữ liệu
    if (
      typeof hoTen !== "string" ||
      typeof email !== "string" ||
      typeof soDienThoai !== "string" ||
      typeof matKhau !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Thông tin đăng ký không hợp lệ."
      });
    }

    const ten = hoTen.trim();
    const mail = email.trim().toLowerCase();
    const phone = soDienThoai.trim();

    // 2. Kiểm tra dữ liệu bắt buộc
    if (!ten || !mail || !phone || !matKhau) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin."
      });
    }

    // 3. Kiểm tra họ tên
    if (ten.length < 2 || ten.length > 150) {
      return res.status(400).json({
        success: false,
        message: "Họ tên phải có từ 2 đến 150 ký tự."
      });
    }

    // 4. Kiểm tra email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      mail.length > 254 ||
      !emailRegex.test(mail) ||
      !/^[\x00-\x7F]+$/.test(mail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Email không đúng định dạng."
      });
    }

    // 5. Kiểm tra số điện thoại
    const phoneRegex = /^0[0-9]{9,10}$/;

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ."
      });
    }

    // 6. Kiểm tra mật khẩu
    const passwordBytes = Buffer.byteLength(matKhau, "utf8");

    if (
      matKhau.length < 8 ||
      passwordBytes > 72 ||
      !/[a-z]/.test(matKhau) ||
      !/[A-Z]/.test(matKhau) ||
      !/[0-9]/.test(matKhau)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số; tối đa 72 byte."
      });
    }

    const pool = await getPool();

    // 7. Xác định mã vai trò khách hàng từ database
    // KHÔNG nhận vai trò do frontend truyền lên.
    const roleResult = await pool.request()
      .query(`
        SELECT MaVaiTro
        FROM dbo.VaiTro
        WHERE TenVaiTro = N'Khách hàng'
      `);

    if (roleResult.recordset.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Hệ thống chưa cấu hình vai trò khách hàng."
      });
    }

    const maVaiTro = roleResult.recordset[0].MaVaiTro;

    // 8. Băm mật khẩu bằng bcrypt
    const passwordHash = await bcrypt.hash(matKhau, 12);

    // 9. Thêm tài khoản vào database
    const result = await pool.request()
      .input("maVaiTro", sql.Int, maVaiTro)
      .input("hoTen", sql.NVarChar(150), ten)
      .input("email", sql.VarChar(254), mail)
      .input("matKhauHash", sql.VarChar(255), passwordHash)
      .input("soDienThoai", sql.VarChar(20), phone)
      .query(`
        INSERT INTO dbo.NguoiDung (
          MaVaiTro,
          HoTen,
          Email,
          MatKhauHash,
          SoDienThoai,
          TrangThai
        )
        OUTPUT
          INSERTED.MaNguoiDung,
          INSERTED.HoTen,
          INSERTED.Email
        VALUES (
          @maVaiTro,
          @hoTen,
          @email,
          @matKhauHash,
          @soDienThoai,
          N'Hoạt động'
        )
      `);

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công.",
      data: {
        ...result.recordset[0],
        TenVaiTro: "Khách hàng"
      }
    });

  } catch (error) {
    // SQL Server: trùng giá trị UNIQUE
    if (
      error.number === 2601 ||
      error.number === 2627 ||
      error.originalError?.info?.number === 2601 ||
      error.originalError?.info?.number === 2627
    ) {
      return res.status(409).json({
        success: false,
        message: "Email này đã được sử dụng."
      });
    }

    console.error("Lỗi đăng ký:", error.message);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo tài khoản. Vui lòng thử lại."
    });
  }
}


module.exports = {
  dangNhap,
  dangKy,
  cuaToi,
  dangXuat
};
