
const { sql, getPool, failed } = require("../services/taiKhoanUtils");

// Mã danh mục tự nhập, ví dụ DM-PK001
const CODE_REGEX = /^[A-Z0-9_-]{1,50}$/;

function normalizeCode(value) {
  return typeof value === "string"
    ? value.trim().toUpperCase()
    : "";
}

function validBody(body, requireCode = true) {
  if (!body || typeof body !== "object") return false;

  const name = body.tenDanhMuc;
  const desc = body.moTa ?? "";

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 150 ||
    typeof desc !== "string" ||
    desc.length > 1000
  ) {
    return false;
  }

  if (requireCode && !CODE_REGEX.test(normalizeCode(body.maDanhMuc))) {
    return false;
  }

  if (
    body.trangThai !== undefined &&
    !["Hiển thị", "Tạm ẩn"].includes(body.trangThai)
  ) {
    return false;
  }

  if (
    body.thuTuHienThi !== undefined &&
    (!Number.isInteger(Number(body.thuTuHienThi)) ||
      Number(body.thuTuHienThi) < 0)
  ) {
    return false;
  }

  return true;
}

function isDuplicate(error) {
  const code =
    error.number ||
    error.originalError?.info?.number ||
    error.cause?.number;

  return code === 2601 || code === 2627;
}

function dbError(res, error) {
  if (isDuplicate(error)) {
    return res.status(409).json({
      success: false,
      message: "Mã danh mục đã tồn tại. Hãy nhập mã khác."
    });
  }

  return failed(res, error);
}

// 1. Lấy toàn bộ danh mục
async function list(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        d.MaDanhMuc,
        d.TenDanhMuc,
        d.MoTa,
        d.MaDanhMucCha,
        d.ThuTuHienThi,
        d.TrangThai,
        cha.TenDanhMuc AS TenDanhMucCha,
        (
          SELECT COUNT(*)
          FROM dbo.SanPham s
          WHERE s.MaDanhMuc = d.MaDanhMuc
        ) AS SoSanPham
      FROM dbo.DanhMuc d
      LEFT JOIN dbo.DanhMuc cha
        ON cha.MaDanhMuc = d.MaDanhMucCha
      ORDER BY d.ThuTuHienThi, d.MaDanhMuc
    `);

    return res.json({
      success: true,
      data: result.recordset,
      total: result.recordset.length
    });

  } catch (error) {
    return dbError(res, error);
  }
}

// 2. Chi tiết danh mục
async function detail(req, res) {
  try {
    const id = normalizeCode(req.params.id);
    const pool = await getPool();

    const result = await pool.request()
      .input("id", sql.NVarChar(50), id)
      .query(`
        SELECT *
        FROM dbo.DanhMuc
        WHERE MaDanhMuc = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục."
      });
    }

    return res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    return dbError(res, error);
  }
}

// 3. Kiểm tra danh mục cha và vòng lặp cha-con
async function validParent(pool, parent, current = null) {
  if (parent === null || parent === undefined || parent === "") {
    return true;
  }

  const parentId = normalizeCode(parent);
  const currentId = current ? normalizeCode(current) : null;

  if (!CODE_REGEX.test(parentId) || parentId === currentId) {
    return false;
  }

  const result = await pool.request().query(`
    SELECT MaDanhMuc, MaDanhMucCha
    FROM dbo.DanhMuc
  `);

  const map = new Map(
    result.recordset.map(row => [
      normalizeCode(row.MaDanhMuc),
      row.MaDanhMucCha
        ? normalizeCode(row.MaDanhMucCha)
        : null
    ])
  );

  if (!map.has(parentId)) return false;

  const visited = new Set();
  let cursor = parentId;

  while (cursor !== null) {
    if (cursor === currentId || visited.has(cursor)) {
      return false;
    }

    visited.add(cursor);
    cursor = map.get(cursor) ?? null;
  }

  return true;
}

// 4. Thêm danh mục mới
async function create(req, res) {
  try {
    const body = req.body || {};

    if (!validBody(body, true)) {
      return res.status(400).json({
        success: false,
        message: "Mã, tên hoặc thông tin danh mục không hợp lệ."
      });
    }

    const maDanhMuc = normalizeCode(body.maDanhMuc);
    const parent = body.maDanhMucCha
      ? normalizeCode(body.maDanhMucCha)
      : null;

    const pool = await getPool();

    if (!(await validParent(pool, parent))) {
      return res.status(400).json({
        success: false,
        message: "Danh mục cha không hợp lệ."
      });
    }

    const result = await pool.request()
      .input("id", sql.NVarChar(50), maDanhMuc)
      .input("ten", sql.NVarChar(150), body.tenDanhMuc.trim())
      .input("moTa", sql.NVarChar(1000), body.moTa || null)
      .input("parent", sql.NVarChar(50), parent)
      .input("sort", sql.Int, Number(body.thuTuHienThi) || 0)
      .input(
        "status",
        sql.NVarChar(30),
        body.trangThai || "Hiển thị"
      )
      .query(`
        INSERT INTO dbo.DanhMuc (
          MaDanhMuc,
          TenDanhMuc,
          MoTa,
          MaDanhMucCha,
          ThuTuHienThi,
          TrangThai
        )
        OUTPUT INSERTED.MaDanhMuc
        VALUES (
          @id,
          @ten,
          @moTa,
          @parent,
          @sort,
          @status
        )
      `);

    return res.status(201).json({
      success: true,
      message: "Đã thêm danh mục.",
      data: result.recordset[0]
    });

  } catch (error) {
    return dbError(res, error);
  }
}

// 5. Cập nhật danh mục (không thay đổi mã)
async function update(req, res) {
  try {
    const body = req.body || {};
    const id = normalizeCode(req.params.id);

    if (!CODE_REGEX.test(id) || !validBody(body, false)) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu danh mục không hợp lệ."
      });
    }

    const parent = body.maDanhMucCha
      ? normalizeCode(body.maDanhMucCha)
      : null;

    const pool = await getPool();

    if (!(await validParent(pool, parent, id))) {
      return res.status(400).json({
        success: false,
        message: "Danh mục cha không hợp lệ hoặc tạo vòng lặp."
      });
    }

    const result = await pool.request()
      .input("id", sql.NVarChar(50), id)
      .input("ten", sql.NVarChar(150), body.tenDanhMuc.trim())
      .input("moTa", sql.NVarChar(1000), body.moTa || null)
      .input("parent", sql.NVarChar(50), parent)
      .input("sort", sql.Int, Number(body.thuTuHienThi) || 0)
      .input(
        "status",
        sql.NVarChar(30),
        body.trangThai || "Hiển thị"
      )
      .query(`
        UPDATE dbo.DanhMuc
        SET
          TenDanhMuc = @ten,
          MoTa = @moTa,
          MaDanhMucCha = @parent,
          ThuTuHienThi = @sort,
          TrangThai = @status
        WHERE MaDanhMuc = @id
      `);

    if (!result.rowsAffected[0]) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục."
      });
    }

    return res.json({
      success: true,
      message: "Đã cập nhật danh mục."
    });

  } catch (error) {
    return dbError(res, error);
  }
}

// 6. Xóa danh mục
async function remove(req, res) {
  try {
    const id = normalizeCode(req.params.id);
    const pool = await getPool();

    const result = await pool.request()
      .input("id", sql.NVarChar(50), id)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.SanPham
           WHERE MaDanhMuc = @id) AS SoSanPham,
          (SELECT COUNT(*) FROM dbo.DanhMuc
           WHERE MaDanhMucCha = @id) AS SoCon
      `);

    const item = result.recordset[0];

    if (item.SoSanPham > 0 || item.SoCon > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Không thể xóa danh mục đang có sản phẩm hoặc danh mục con."
      });
    }

    const deleted = await pool.request()
      .input("id", sql.NVarChar(50), id)
      .query(`
        DELETE FROM dbo.DanhMuc
        WHERE MaDanhMuc = @id
      `);

    if (!deleted.rowsAffected[0]) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục."
      });
    }

    return res.json({
      success: true,
      message: "Đã xóa danh mục."
    });

  } catch (error) {
    return dbError(res, error);
  }
}

// 7. Thay đổi thứ tự hiển thị
async function reorder(req, res) {
  const rows = req.body?.danhSach;

  if (
    !Array.isArray(rows) ||
    rows.length > 500 ||
    !rows.every(row =>
      CODE_REGEX.test(normalizeCode(row.maDanhMuc)) &&
      Number.isInteger(Number(row.thuTuHienThi)) &&
      Number(row.thuTuHienThi) >= 0
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Danh sách sắp xếp không hợp lệ."
    });
  }

  let transaction;

  try {
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const row of rows) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(50), normalizeCode(row.maDanhMuc))
        .input("sort", sql.Int, Number(row.thuTuHienThi))
        .query(`
          UPDATE dbo.DanhMuc
          SET ThuTuHienThi = @sort
          WHERE MaDanhMuc = @id
        `);
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: "Đã cập nhật thứ tự danh mục."
    });

  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch {
        // Transaction có thể đã được rollback tự động.
      }
    }

    return dbError(res, error);
  }
}

module.exports = {
  list,
  detail,
  create,
  update,
  remove,
  reorder
};
