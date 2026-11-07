
const fs = require("fs");
const { sql, getPool } = require("../config/db");

async function layDanhSachSanPham(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        sp.MaSanPham,
        sp.TenSanPham,
        sp.MoTa,
        sp.PhongCach,
        sp.TrangThai,

        dm.TenDanhMuc,

        anh.DuongDan AS DuongDanAnh

      FROM dbo.SanPham AS sp

      INNER JOIN dbo.DanhMuc AS dm
        ON sp.MaDanhMuc = dm.MaDanhMuc

      OUTER APPLY (
        SELECT TOP (1)
          a.DuongDan
        FROM dbo.AnhSanPham AS a
        WHERE a.MaSanPham = sp.MaSanPham
        ORDER BY
          a.LaAnhDaiDien DESC,
          a.MaAnh ASC
      ) AS anh

      ORDER BY sp.MaSanPham DESC
    `);

    res.json({
      success: true,
      total: result.recordset.length,
      data: result.recordset
    });

  } catch (error) {
    console.error("Lỗi lấy sản phẩm:", error.message);

    res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách sản phẩm"
    });
  }
}

const TRANG_THAI = ["Đang bán", "Tạm ẩn"];

async function layDanhMuc(req, res) {
  try {
    const pool = await getPool();
    const r = await pool.request().query(
      "SELECT MaDanhMuc, TenDanhMuc FROM dbo.DanhMuc ORDER BY TenDanhMuc"
    );
    res.json({ success: true, data: r.recordset });
  } catch (error) {
    console.error("Lỗi lấy danh mục:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy danh mục." });
  }
}

async function themSanPham(req, res) {
  const anhChinh = req.files?.anhChinh?.[0];
  const dsAnh = [anhChinh, ...(req.files?.anhBoSung || [])].filter(Boolean);
  const xoaFileDaTai = () => dsAnh.forEach((f) => fs.unlink(f.path, () => {}));
  const loi = (status, message) => { xoaFileDaTai(); return res.status(status).json({ success: false, message }); };

  const b = req.body;
  const tenSanPham = String(b.tenSanPham || "").trim();
  const maSanPham = String(b.maSP || "").trim();                 // ĐỔI 1: đây chính là MaSanPham
  const maDanhMuc = String(b.maDanhMuc || "").trim();
  const giaCoBan = Number(b.giaCoBan);
  const trangThai = b.trangThai || "Tạm ẩn";

  if (!tenSanPham || tenSanPham.length > 250) return loi(400, "Tên sản phẩm bắt buộc, tối đa 250 ký tự.");
  if (!/^[A-Za-z0-9_-]{1,50}$/.test(maSanPham)) return loi(400, "Mã sản phẩm chỉ gồm chữ, số, - hoặc _ (tối đa 50 ký tự, không khoảng trắng).");
  if (!maDanhMuc || maDanhMuc.length > 50) return loi(400, "Vui lòng chọn danh mục.");
  if (!Number.isFinite(giaCoBan) || giaCoBan <= 0) return loi(400, "Giá cơ bản phải lớn hơn 0.");
  if (!TRANG_THAI.includes(trangThai)) return loi(400, "Trạng thái kinh doanh không hợp lệ.");

  const text = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };

  let tx;
  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);
    await tx.begin();

    await new sql.Request(tx)                                      // ĐỔI 2: không cần lấy kết quả trả về
      .input("maSanPham", sql.VarChar(50), maSanPham)
      .input("maDanhMuc", sql.VarChar(50), maDanhMuc)
      .input("ten", sql.NVarChar(250), tenSanPham)
      .input("moTaNgan", sql.NVarChar(500), text(b.moTaNgan, 500))
      .input("moTa", sql.NVarChar(sql.MAX), text(b.moTa, 20000))
      .input("gia", sql.Decimal(18, 2), giaCoBan)
      .input("trangThai", sql.NVarChar(30), trangThai)
      .input("phongCach", sql.NVarChar(100), text(b.phongCach, 100))
      .input("chatLieu", sql.NVarChar(150), text(b.chatLieuChinh, 150))
      .input("baoQuan", sql.NVarChar(sql.MAX), text(b.huongDanBaoQuan, 5000))
      .input("thongSo", sql.NVarChar(sql.MAX), text(b.thongSoKyThuat, 5000))
      .query(`
        INSERT INTO dbo.SanPham
          (MaSanPham, MaDanhMuc, TenSanPham, MoTaNgan, MoTa, GiaCoBan, TrangThai,
           PhongCach, ChatLieuChinh, HuongDanBaoQuan, ThongSoKyThuat)
        VALUES
          (@maSanPham, @maDanhMuc, @ten, @moTaNgan, @moTa, @gia, @trangThai,
           @phongCach, @chatLieu, @baoQuan, @thongSo)
      `);                                                          // ĐỔI 3: chèn MaSanPham, bỏ MaSP và OUTPUT

    for (let i = 0; i < dsAnh.length; i++) {
      await new sql.Request(tx)
        .input("ma", sql.VarChar(50), maSanPham)                   // ĐỔI 4: VarChar thay cho Int
        .input("duongDan", sql.NVarChar(1000), `/uploads/san-pham/${dsAnh[i].filename}`)
        .input("laDaiDien", sql.Bit, i === 0 ? 1 : 0)
        .query(`INSERT INTO dbo.AnhSanPham (MaSanPham, DuongDan, LaAnhDaiDien) VALUES (@ma, @duongDan, @laDaiDien)`);
    }

    await tx.commit();
    return res.status(201).json({ success: true, message: "Đã lưu sản phẩm.", data: { MaSanPham: maSanPham } });
  } catch (error) {
    if (tx) { try { await tx.rollback(); } catch {} }
    xoaFileDaTai();
    console.error("Lỗi thêm sản phẩm:", error);
    if (error.number === 2601 || error.number === 2627) return res.status(409).json({ success: false, message: "Mã sản phẩm đã tồn tại." });
    if (error.number === 547) return res.status(400).json({ success: false, message: "Danh mục không tồn tại." });
    return res.status(500).json({ success: false, message: "Không thể lưu sản phẩm." });
  }
}

module.exports = { layDanhSachSanPham, themSanPham, layDanhMuc };
