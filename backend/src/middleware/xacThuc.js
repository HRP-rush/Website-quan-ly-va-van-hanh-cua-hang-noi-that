
const jwt = require("jsonwebtoken");
const { sql, getPool } = require("../config/db");

async function xacThuc(req, res, next) {
  try {
    const token = req.cookies?.mocan_session;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Vui lòng đăng nhập."
      });
    }

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    const maNguoiDung = Number(payload.sub);

    if (!Number.isSafeInteger(maNguoiDung) || maNguoiDung <= 0) {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập không hợp lệ."
      });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("id", sql.Int, maNguoiDung)
      .query(`
        SELECT
          nd.MaNguoiDung,
          nd.HoTen,
          nd.Email,
          nd.SoDienThoai,
          nd.TrangThai,
          vt.TenVaiTro
        FROM dbo.NguoiDung nd
        INNER JOIN dbo.VaiTro vt
          ON nd.MaVaiTro = vt.MaVaiTro
        WHERE nd.MaNguoiDung = @id
      `);

    const user = result.recordset[0];

    if (!user || user.TrangThai !== "Hoạt động") {
      return res.status(401).json({
        success: false,
        message: "Tài khoản không còn hiệu lực."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ."
      });
    }

    console.error("Lỗi xác thực:", error.message);

    return res.status(500).json({
      success: false,
      message: "Không thể xác thực phiên đăng nhập."
    });
  }
}

// Dùng cho API cần phân quyền trong các giai đoạn tiếp theo.
function choPhepVaiTro(...vaiTroChoPhep) {
  return (req, res, next) => {
    if (!req.user || !vaiTroChoPhep.includes(req.user.TenVaiTro)) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện thao tác này."
      });
    }

    next();
  };
}

module.exports = { xacThuc, choPhepVaiTro };
