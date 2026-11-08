const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { sql, getPool } = require("../config/db");

const THU_MUC = path.join(__dirname, "../../uploads/danh-muc");

const SELECT = `
  SELECT
    dm.MaDanhMuc,
    dm.TenDanhMuc,
    dm.MoTa,
    dm.HienThi,
    dm.HinhAnh,
    (
      SELECT COUNT(*)
      FROM dbo.SanPham sp
      WHERE sp.MaDanhMuc = dm.MaDanhMuc
    ) AS SoSanPham
  FROM dbo.DanhMuc dm
`;

const ID = "CONVERT(NVARCHAR(80), dm.MaDanhMuc) = @id";

const fail = (res, status, message, field) =>
  res.status(status).json({
    success: false,
    message,
    field
  });

function validId(req, res) {
  const id = String(req.params.id || "").trim();

  if (!id || id.length > 80) {
    fail(res, 400, "Mã danh mục không hợp lệ.");
    return null;
  }

  return id;
}

function validate(body) {
  if (
    typeof body.tenDanhMuc !== "string" ||
    !body.tenDanhMuc.trim()
  ) {
    return ["Vui lòng nhập tên danh mục.", "tenDanhMuc"];
  }

  if (body.tenDanhMuc.trim().length > 150) {
    return ["Tên danh mục tối đa 150 ký tự.", "tenDanhMuc"];
  }

  if (
    body.moTa != null &&
    (typeof body.moTa !== "string" || body.moTa.length > 1000)
  ) {
    return ["Mô tả tối đa 1.000 ký tự.", "moTa"];
  }

  if (!["true", "false"].includes(String(body.hienThi))) {
    return ["Trạng thái không hợp lệ.", "hienThi"];
  }

  return null;
}

function error(res, err) {
  const number = err.number || err.originalError?.info?.number;

  if ([2601, 2627].includes(number)) {
    return fail(
      res,
      409,
      "Tên danh mục đã tồn tại.",
      "tenDanhMuc"
    );
  }

  if (number === 547) {
    return fail(
      res,
      409,
      "Không thể xóa danh mục đang chứa sản phẩm. Vui lòng xử lý các sản phẩm liên quan trước."
    );
  }

  console.error("Danh mục:", err.message);

  return fail(
    res,
    500,
    "Không thể xử lý danh mục. Kiểm tra kết nối DB và chạy migration 05_quan_ly_danh_muc.sql."
  );
}

async function saveImage(file) {
  if (!file) return null;

  const b = file.buffer;

  const ext =
    b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      ? ".jpg"
      : b
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? ".png"
        : b.toString("ascii", 0, 4) === "RIFF" &&
            b.toString("ascii", 8, 12) === "WEBP"
          ? ".webp"
          : null;

  if (!ext) {
    const err = new Error(
      "Ảnh không hợp lệ. Chỉ nhận JPG, PNG, WEBP."
    );
    err.image = true;
    throw err;
  }

  await fs.mkdir(THU_MUC, { recursive: true });

  const name = randomUUID() + ext;

  await fs.writeFile(path.join(THU_MUC, name), b);

  return `/uploads/danh-muc/${name}`;
}

async function removeImage(url) {
  if (
    url &&
    /^\/uploads\/danh-muc\/[a-f0-9-]+\.(jpg|png|webp)$/.test(url)
  ) {
    await fs
      .unlink(path.join(THU_MUC, path.basename(url)))
      .catch(() => {});
  }
}

async function list(req, res) {
  const q = String(req.query.q || "").trim().slice(0, 150);
  const status = String(req.query.trangThai || "");
  const page = Number(req.query.trang || 1);
  const size = Number(req.query.soDong || 10);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1000000 ||
    ![10, 20, 50].includes(size) ||
    !["", "true", "false"].includes(status)
  ) {
    return fail(res, 400, "Bộ lọc hoặc phân trang không hợp lệ.");
  }

  const where = `
    WHERE (
      @q = N''
      OR dm.TenDanhMuc LIKE @search ESCAPE '~'
      OR CONVERT(NVARCHAR(80), dm.MaDanhMuc)
          LIKE @search ESCAPE '~'
      OR N'DM-' + RIGHT(
        N'000' + CONVERT(NVARCHAR(80), dm.MaDanhMuc),
        CASE
          WHEN LEN(CONVERT(NVARCHAR(80), dm.MaDanhMuc)) > 3
          THEN LEN(CONVERT(NVARCHAR(80), dm.MaDanhMuc))
          ELSE 3
        END
      ) LIKE @search ESCAPE '~'
    )
    AND (
      @status = N''
      OR dm.HienThi =
        CASE WHEN @status = N'true' THEN 1 ELSE 0 END
    )
  `;

  try {
    const pool = await getPool();

    const rs = await pool
      .request()
      .input("q", sql.NVarChar(150), q)
      .input(
        "search",
        sql.NVarChar(310),
        "%" + q.replace(/[~%_\[]/g, "~$&") + "%"
      )
      .input("status", sql.NVarChar(5), status)
      .input("offset", sql.Int, (page - 1) * size)
      .input("size", sql.Int, size)
      .query(`
        ${SELECT}
        ${where}
        ORDER BY dm.TenDanhMuc, dm.MaDanhMuc
        OFFSET @offset ROWS
        FETCH NEXT @size ROWS ONLY;

        SELECT COUNT(*) AS total
        FROM dbo.DanhMuc dm
        ${where};

        SELECT
          (SELECT COUNT(*) FROM dbo.DanhMuc) AS tongDanhMuc,
          (SELECT COUNT(*) FROM dbo.SanPham) AS tongSanPham;
      `);

    return res.json({
      success: true,
      data: rs.recordsets[0],
      total: rs.recordsets[1][0].total,
      ...rs.recordsets[2][0],
      trang: page,
      soDong: size
    });
  } catch (err) {
    return error(res, err);
  }
}

async function detail(req, res) {
  const id = validId(req, res);
  if (!id) return;

  try {
    const pool = await getPool();

    const rs = await pool
      .request()
      .input("id", sql.NVarChar(80), id)
      .query(`${SELECT} WHERE ${ID}`);

    if (!rs.recordset.length) {
      return fail(res, 404, "Danh mục không còn tồn tại.");
    }

    return res.json({
      success: true,
      data: rs.recordset[0]
    });
  } catch (err) {
    return error(res, err);
  }
}

async function save(req, res) {
  const id = req.params.id ? validId(req, res) : null;

  if (req.params.id && !id) return;

  const invalid = validate(req.body);

  if (invalid) {
    return fail(res, 400, ...invalid);
  }

  let image;

  try {
    const pool = await getPool();
    let previous;

    if (id) {
      const old = await pool
        .request()
        .input("id", sql.NVarChar(80), id)
        .query(`${SELECT} WHERE ${ID}`);

      previous = old.recordset[0];

      if (!previous) {
        return fail(res, 404, "Danh mục không còn tồn tại.");
      }
    }

    const duplicate = await pool
      .request()
      .input("name", sql.NVarChar(150), req.body.tenDanhMuc.trim())
      .input("id", sql.NVarChar(80), id)
      .query(`
        SELECT TOP(1) MaDanhMuc
        FROM dbo.DanhMuc
        WHERE TenDanhMuc = @name
          AND (
            @id IS NULL
            OR CONVERT(NVARCHAR(80), MaDanhMuc) <> @id
          )
      `);

    if (duplicate.recordset.length) {
      return fail(
        res,
        409,
        "Tên danh mục đã tồn tại.",
        "tenDanhMuc"
      );
    }

    image = await saveImage(req.file);

    const url =
      image ||
      (req.body.xoaAnh === "true" ? null : previous?.HinhAnh) ||
      null;

    const request = pool
      .request()
      .input("name", sql.NVarChar(150), req.body.tenDanhMuc.trim())
      .input(
        "description",
        sql.NVarChar(1000),
        (req.body.moTa || "").trim() || null
      )
      .input("visible", sql.Bit, String(req.body.hienThi) === "true")
      .input("image", sql.NVarChar(1000), url);

    let rs;

    if (id) {
      rs = await request
        .input("id", sql.NVarChar(80), id)
        .query(`
          UPDATE dm
          SET
            TenDanhMuc = @name,
            MoTa = @description,
            HienThi = @visible,
            HinhAnh = @image
          OUTPUT INSERTED.*
          FROM dbo.DanhMuc dm
          WHERE ${ID}
        `);

      if (!rs.recordset.length) {
        await removeImage(image);
        return fail(res, 404, "Danh mục không còn tồn tại.");
      }
    } else {
      // Giữ nguyên kiểu khóa chính đang có trong DB.
      const meta = await pool.request().query(`
        SELECT
          COLUMNPROPERTY(
            OBJECT_ID(N'dbo.DanhMuc'),
            N'MaDanhMuc',
            'IsIdentity'
          ) AS IsIdentity,
          TYPE_NAME(user_type_id) AS Kieu
        FROM sys.columns
        WHERE object_id = OBJECT_ID(N'dbo.DanhMuc')
          AND name = N'MaDanhMuc'
      `);

      if (meta.recordset[0]?.IsIdentity === 1) {
        rs = await request.query(`
          INSERT dbo.DanhMuc (
            TenDanhMuc, MoTa, HienThi, HinhAnh
          )
          OUTPUT INSERTED.*
          VALUES (
            @name, @description, @visible, @image
          )
        `);
      } else if (
        ["varchar", "nvarchar", "char", "nchar"].includes(
          meta.recordset[0]?.Kieu
        )
      ) {
        rs = await request
          .input(
            "code",
            sql.VarChar(20),
            "DM-" + randomUUID().slice(0, 8).toUpperCase()
          )
          .query(`
            INSERT dbo.DanhMuc (
              MaDanhMuc, TenDanhMuc, MoTa, HienThi, HinhAnh
            )
            OUTPUT INSERTED.*
            VALUES (
              @code, @name, @description, @visible, @image
            )
          `);
      } else {
        throw new Error(
          "MaDanhMuc cần INT IDENTITY hoặc mã chuỗi theo cấu trúc dự án."
        );
      }
    }

    if (previous?.HinhAnh !== url) {
      await removeImage(previous?.HinhAnh);
    }

    return res.status(id ? 200 : 201).json({
      success: true,
      data: rs.recordset[0],
      message: id
        ? "Cập nhật danh mục thành công."
        : "Thêm danh mục thành công."
    });
  } catch (err) {
    await removeImage(image);

    if (err.image) {
      return fail(res, 400, err.message, "hinhAnh");
    }

    return error(res, err);
  }
}

async function status(req, res) {
  const id = validId(req, res);
  if (!id) return;

  if (typeof req.body.hienThi !== "boolean") {
    return fail(res, 400, "Trạng thái không hợp lệ.");
  }

  try {
    const pool = await getPool();

    const rs = await pool
      .request()
      .input("id", sql.NVarChar(80), id)
      .input("visible", sql.Bit, req.body.hienThi)
      .query(`
        UPDATE dm
        SET HienThi = @visible
        OUTPUT INSERTED.MaDanhMuc
        FROM dbo.DanhMuc dm
        WHERE ${ID}
      `);

    if (!rs.recordset.length) {
      return fail(res, 404, "Danh mục không còn tồn tại.");
    }

    return res.json({
      success: true,
      message: req.body.hienThi
        ? "Đã hiển thị danh mục."
        : "Đã ẩn danh mục khỏi cửa hàng."
    });
  } catch (err) {
    return error(res, err);
  }
}

async function remove(req, res) {
  const id = validId(req, res);
  if (!id) return;

  try {
    const pool = await getPool();

    // Khóa ngoại vẫn bảo vệ nếu sản phẩm được thêm đồng thời.
    const rs = await pool
      .request()
      .input("id", sql.NVarChar(80), id)
      .query(`
        DELETE dm
        OUTPUT DELETED.HinhAnh
        FROM dbo.DanhMuc dm
        WHERE ${ID}
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.SanPham sp
            WHERE sp.MaDanhMuc = dm.MaDanhMuc
          )
      `);

    if (!rs.recordset.length) {
      const check = await pool
        .request()
        .input("id", sql.NVarChar(80), id)
        .query(`${SELECT} WHERE ${ID}`);

      return fail(
        res,
        check.recordset.length ? 409 : 404,
        check.recordset.length
          ? "Không thể xóa danh mục đang chứa sản phẩm. Vui lòng xử lý các sản phẩm liên quan trước."
          : "Danh mục không còn tồn tại."
      );
    }

    await removeImage(rs.recordset[0].HinhAnh);

    return res.json({
      success: true,
      message: "Đã xóa danh mục."
    });
  } catch (err) {
    return error(res, err);
  }
}

module.exports = {
  list,
  detail,
  save,
  status,
  remove,
  validate
};