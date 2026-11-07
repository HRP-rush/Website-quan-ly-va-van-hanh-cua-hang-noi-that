const fs = require("node:fs");
const path = require("node:path");

const { getPool } = require("../src/config/db");

async function napDuLieuTestGioHang() {
  const duongDanScript = path.resolve(
    __dirname,
    "..",
    "..",
    "database",
    "DuLieuTestGioHang.sql"
  );
  const noiDungScript = fs.readFileSync(duongDanScript, "utf8")
    .replace(/^\s*USE\s+[\w.[\]]+\s*;\s*$/im, "")
    .replace(/^\s*GO\s*;?\s*$/gim, "");

  const pool = await getPool();
  try {
    const ketQua = await pool.request().query(noiDungScript);
    for (const tapKetQua of ketQua.recordsets) {
      if (tapKetQua.length) {
        console.table(tapKetQua);
      }
    }
    console.log("Đã nạp dữ liệu giỏ hàng mẫu thành công.");
  } finally {
    await pool.close();
  }
}

napDuLieuTestGioHang().catch((loi) => {
  console.error("Không thể nạp dữ liệu mẫu:", loi.message);
  process.exitCode = 1;
});
