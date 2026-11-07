
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

const TRANG_THAI_HOP_LE = ["Đang bán", "Tạm ẩn", "Ngừng bán"];

async function layChatLieu(req, res) {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT DISTINCT ChatLieuChinh FROM dbo.SanPham
      WHERE ChatLieuChinh IS NOT NULL ORDER BY ChatLieuChinh`);
    res.json({ success: true, data: r.recordset.map((x) => x.ChatLieuChinh) });
  } catch (error) {
    console.error("Lỗi lấy chất liệu:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách chất liệu." });
  }
}

async function layDanhSachQuanTri(req, res) {
  try {
    const q = String(req.query.q || "").trim().slice(0, 100);
    const maDanhMuc = String(req.query.maDanhMuc || "").trim();
    const trangThai = String(req.query.trangThai || "").trim();
    const chatLieu = String(req.query.chatLieu || "").trim();
    const soHoacNull = (v) => (v === undefined || v === "" ? null : Number(v));
    const giaTu = soHoacNull(req.query.giaTu);
    const giaDen = soHoacNull(req.query.giaDen);
    const trang = Math.max(1, parseInt(req.query.trang, 10) || 1);
    const soDong = Math.min(50, Math.max(1, parseInt(req.query.soDong, 10) || 8));

    if ((giaTu !== null && !Number.isFinite(giaTu)) || (giaDen !== null && !Number.isFinite(giaDen))) {
      return res.status(400).json({ success: false, message: "Khoảng giá không hợp lệ." });
    }
    if (trangThai && !TRANG_THAI_HOP_LE.includes(trangThai)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }

    // Xây điều kiện lọc: mọi giá trị đều đi qua tham số, không nối chuỗi vào SQL
    const dk = ["1=1"];
    const thamSo = [];
    if (q) {
      dk.push(`(sp.MaSanPham LIKE @q ESCAPE '\\' OR sp.TenSanPham LIKE @q ESCAPE '\\' OR dm.TenDanhMuc LIKE @q ESCAPE '\\')`);
      thamSo.push(["q", sql.NVarChar(210), `%${q.replace(/[\\%_[]/g, "\\$&")}%`]);
    }
    if (maDanhMuc) { dk.push("sp.MaDanhMuc = @maDanhMuc"); thamSo.push(["maDanhMuc", sql.VarChar(50), maDanhMuc]); }
    if (trangThai) { dk.push("sp.TrangThai = @trangThai"); thamSo.push(["trangThai", sql.NVarChar(30), trangThai]); }
    if (chatLieu) { dk.push("sp.ChatLieuChinh = @chatLieu"); thamSo.push(["chatLieu", sql.NVarChar(150), chatLieu]); }
    if (giaTu !== null) { dk.push("g.Gia >= @giaTu"); thamSo.push(["giaTu", sql.Decimal(18, 2), giaTu]); }
    if (giaDen !== null) { dk.push("g.Gia <= @giaDen"); thamSo.push(["giaDen", sql.Decimal(18, 2), giaDen]); }
    const where = dk.join(" AND ");

    // Giá hiển thị = giá cơ bản; sản phẩm cũ chưa có thì lấy giá SKU thấp nhất
    const nguon = `
      FROM dbo.SanPham AS sp
      INNER JOIN dbo.DanhMuc AS dm ON sp.MaDanhMuc = dm.MaDanhMuc
      OUTER APPLY (
        SELECT COUNT(*) AS SoBienThe, MIN(b.GiaBan) AS GiaMin
        FROM dbo.BienTheSanPham AS b WHERE b.MaSanPham = sp.MaSanPham
      ) AS bt
      CROSS APPLY (SELECT COALESCE(sp.GiaCoBan, bt.GiaMin) AS Gia) AS g`;

    const pool = await getPool();
    const tao = () => { const r = pool.request(); thamSo.forEach(([n, t, v]) => r.input(n, t, v)); return r; };

    const [ds, dem, tatCa] = await Promise.all([
      tao().input("offset", sql.Int, (trang - 1) * soDong).input("soDong", sql.Int, soDong).query(`
        SELECT sp.MaSanPham, sp.TenSanPham, sp.TrangThai, sp.ChatLieuChinh,
               dm.TenDanhMuc, g.Gia, bt.SoBienThe, anh.DuongDan AS DuongDanAnh
        ${nguon}
        OUTER APPLY (
          SELECT TOP (1) a.DuongDan FROM dbo.AnhSanPham AS a
          WHERE a.MaSanPham = sp.MaSanPham
          ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC
        ) AS anh
        WHERE ${where}
        ORDER BY sp.NgayTao DESC, sp.MaSanPham ASC
        OFFSET @offset ROWS FETCH NEXT @soDong ROWS ONLY`),
      tao().query(`SELECT COUNT(*) AS Tong ${nguon} WHERE ${where}`),
      pool.request().query("SELECT COUNT(*) AS Tong FROM dbo.SanPham")
    ]);

    res.json({
      success: true,
      data: ds.recordset,
      total: dem.recordset[0].Tong,
      tongTatCa: tatCa.recordset[0].Tong,
      trang, soDong
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách quản trị:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách sản phẩm." });
  }
}

// "Ngừng bán" không xóa dữ liệu: sản phẩm đã phát sinh đơn hàng vẫn cần để tra cứu lịch sử
async function doiTrangThai(req, res) {
  const maSanPham = String(req.params.maSanPham || "").trim();
  const trangThai = String(req.body?.trangThai || "").trim();
  if (!maSanPham || !TRANG_THAI_HOP_LE.includes(trangThai)) {
    return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ." });
  }
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input("ma", sql.VarChar(50), maSanPham)
      .input("tt", sql.NVarChar(30), trangThai)
      .query("UPDATE dbo.SanPham SET TrangThai = @tt WHERE MaSanPham = @ma");
    if (!r.rowsAffected[0]) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
    res.json({ success: true, message: "Đã cập nhật trạng thái." });
  } catch (error) {
    console.error("Lỗi đổi trạng thái:", error.message);
    res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái." });
  }
}

const DON_DANG_GIU_HANG = ["Chờ xác nhận", "Đã xác nhận"];

async function layChiTietSanPham(req, res) {
  const maSanPham = String(req.params.maSanPham || "").trim();
  if (!maSanPham || maSanPham.length > 50) {
    return res.status(400).json({ success: false, message: "Mã sản phẩm không hợp lệ." });
  }
  try {
    const pool = await getPool();
    const tao = () => pool.request().input("ma", sql.VarChar(50), maSanPham);

    const spRs = await tao().query(`
      SELECT sp.MaSanPham, sp.TenSanPham, sp.TrangThai, sp.MoTaNgan, sp.MoTa, sp.PhongCach,
             sp.ChatLieuChinh, sp.HuongDanBaoQuan, sp.ThongSoKyThuat, sp.GiaCoBan,
             FORMAT(sp.NgayTao, 'dd/MM/yyyy') AS NgayTao,
             dm.TenDanhMuc
      FROM dbo.SanPham sp
      INNER JOIN dbo.DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
      WHERE sp.MaSanPham = @ma`);
    if (!spRs.recordset.length) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
    }

    // Biến thể + tồn kho + số lượng đang bị các đơn chưa hoàn tất giữ
    const bienTheReq = tao();
    const dsTt = DON_DANG_GIU_HANG.map((t, i) => { bienTheReq.input(`tt${i}`, sql.NVarChar(40), t); return `@tt${i}`; });
    const [anhRs, btRs, donRs, demRs] = await Promise.all([
      tao().query(`
        SELECT DuongDan FROM dbo.AnhSanPham
        WHERE MaSanPham = @ma
        ORDER BY CASE WHEN MaBienThe IS NULL THEN 0 ELSE 1 END, LaAnhDaiDien DESC, MaAnh ASC`),
      bienTheReq.query(`
        SELECT b.MaBienThe, b.SKU, b.MauSac, b.ChatLieu, b.KichThuoc, b.GiaBan, b.TrangThai,
               ISNULL(t.SoLuongTon, 0) AS SoLuongTon, ISNULL(t.MucCanhBao, 5) AS MucCanhBao,
               ISNULL(g.DaGiu, 0) AS DaGiu
        FROM dbo.BienTheSanPham b
        LEFT JOIN dbo.TonKho t ON t.MaBienThe = b.MaBienThe
        OUTER APPLY (
          SELECT SUM(ct.SoLuong) AS DaGiu
          FROM dbo.CTDonHang ct
          INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
          WHERE ct.MaBienThe = b.MaBienThe AND dh.TrangThai IN (${dsTt.join(",")})
        ) g
        WHERE b.MaSanPham = @ma
        ORDER BY b.MaBienThe`),
      tao().query(`
        SELECT TOP (5)
               'MA-' + FORMAT(dh.NgayDat, 'yyyyMMdd') + '-' + RIGHT('000' + CAST(dh.MaDon AS VARCHAR(10)), 3) AS MaDonHienThi,
               COALESCE(nd.HoTen, dh.TenNguoiNhan) AS KhachHang,
               ct.SKUSnapshot AS SKU, ct.SoLuong, dh.TrangThai
        FROM dbo.CTDonHang ct
        INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
        INNER JOIN dbo.BienTheSanPham b ON b.MaBienThe = ct.MaBienThe
        LEFT JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = dh.MaNguoiDung
        WHERE b.MaSanPham = @ma
        ORDER BY dh.NgayDat DESC, dh.MaDon DESC`),
      tao().query(`
        SELECT COUNT(DISTINCT ct.MaDon) AS Tong
        FROM dbo.CTDonHang ct
        INNER JOIN dbo.BienTheSanPham b ON b.MaBienThe = ct.MaBienThe
        WHERE b.MaSanPham = @ma`)
    ]);

    const bienThe = btRs.recordset.map((b) => {
      const khaDung = Math.max(b.SoLuongTon - b.DaGiu, 0);
      const tinhTrangKho =
        b.TrangThai !== "Đang bán" ? "Ngừng bán"
        : khaDung <= 0 ? "Hết hàng"
        : khaDung <= b.MucCanhBao ? "Sắp hết"
        : "Còn hàng";
      return { ...b, KhaDung: khaDung, TinhTrangKho: tinhTrangKho };
    });
    const gia = bienThe.map((b) => Number(b.GiaBan));
    const sp = spRs.recordset[0];

    res.json({
      success: true,
      data: {
        sanPham: {
          ...sp,
          Gia: sp.GiaCoBan ?? (gia.length ? Math.min(...gia) : null),
          GiaBienTheMin: gia.length ? Math.min(...gia) : null,
          GiaBienTheMax: gia.length ? Math.max(...gia) : null
        },
        anh: anhRs.recordset.map((a) => a.DuongDan),
        bienThe,
        donHang: donRs.recordset,
        tongDon: demRs.recordset[0].Tong
      }
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết sản phẩm:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy chi tiết sản phẩm." });
  }
}

async function layDeChinhSua(req, res) {
  const ma = String(req.params.maSanPham || "").trim();
  if (!ma || ma.length > 50) return res.status(400).json({ success: false, message: "Mã sản phẩm không hợp lệ." });
  try {
    const pool = await getPool();
    const tao = () => pool.request().input("ma", sql.VarChar(50), ma);
    const btReq = tao();
    const dsTt = DON_DANG_GIU_HANG.map((t, i) => { btReq.input(`tt${i}`, sql.NVarChar(40), t); return `@tt${i}`; });

    const [spRs, anhRs, btRs] = await Promise.all([
      tao().query(`
        SELECT sp.MaSanPham, sp.TenSanPham, sp.MaDanhMuc, sp.TrangThai, sp.MoTaNgan, sp.MoTa,
               sp.PhongCach, sp.ChatLieuChinh, sp.HuongDanBaoQuan, sp.ThongSoKyThuat,
               COALESCE(sp.GiaCoBan, (SELECT MIN(GiaBan) FROM dbo.BienTheSanPham WHERE MaSanPham = sp.MaSanPham)) AS GiaCoBan,
               FORMAT(COALESCE(sp.NgayCapNhat, sp.NgayTao), 'dd/MM/yyyy, HH:mm') AS CapNhatLuc,
               CASE WHEN sp.NgayCapNhat IS NULL THEN 1 ELSE 0 END AS ChuaTungSua,
               nd.HoTen AS NguoiCapNhat
        FROM dbo.SanPham sp
        LEFT JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = sp.MaNguoiCapNhat
        WHERE sp.MaSanPham = @ma`),
      tao().query(`
        SELECT MaAnh, DuongDan FROM dbo.AnhSanPham
        WHERE MaSanPham = @ma AND MaBienThe IS NULL
        ORDER BY LaAnhDaiDien DESC, MaAnh ASC`),
      btReq.query(`
        SELECT COUNT(*) AS SoBienThe,
               ISNULL(SUM(CASE WHEN ISNULL(t.SoLuongTon,0) - ISNULL(g.DaGiu,0) > 0
                               THEN ISNULL(t.SoLuongTon,0) - ISNULL(g.DaGiu,0) ELSE 0 END), 0) AS KhaDung
        FROM dbo.BienTheSanPham b
        LEFT JOIN dbo.TonKho t ON t.MaBienThe = b.MaBienThe
        OUTER APPLY (
          SELECT SUM(ct.SoLuong) AS DaGiu FROM dbo.CTDonHang ct
          INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
          WHERE ct.MaBienThe = b.MaBienThe AND dh.TrangThai IN (${dsTt.join(",")})
        ) g
        WHERE b.MaSanPham = @ma`)
    ]);
    if (!spRs.recordset.length) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
    res.json({ success: true, data: { sanPham: spRs.recordset[0], anh: anhRs.recordset, bienThe: btRs.recordset[0] } });
  } catch (error) {
    console.error("Lỗi lấy dữ liệu chỉnh sửa:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy dữ liệu sản phẩm." });
  }
}

// Cập nhật thông tin + danh sách ảnh của sản phẩm.
// Body (multipart): các trường văn bản, thuTuAnh (JSON) và các file mới trong "anhMoi".
// thuTuAnh là thứ tự cuối cùng của TOÀN BỘ ảnh sản phẩm, ví dụ [12, "moi", 15]:
//   số  = giữ lại ảnh cũ có MaAnh đó;  "moi" = lấy file mới kế tiếp trong anhMoi.
// Ảnh cũ không có trong danh sách = bị xóa. Phần tử đầu tiên là ảnh chính.
async function capNhatSanPham(req, res) {
  const ma = String(req.params.maSanPham || "").trim();
  const filesMoi = req.files || [];
  const xoaFileMoi = () => filesMoi.forEach((f) => fs.unlink(f.path, () => {}));
  const loi = (status, message) => { xoaFileMoi(); return res.status(status).json({ success: false, message }); };

  const b = req.body;
  const tenSanPham = String(b.tenSanPham || "").trim();
  const maDanhMuc = String(b.maDanhMuc || "").trim();
  const giaCoBan = Number(b.giaCoBan);
  const trangThai = String(b.trangThai || "").trim();

  if (!ma || ma.length > 50) return loi(400, "Mã sản phẩm không hợp lệ.");
  if (!tenSanPham || tenSanPham.length > 250) return loi(400, "Tên sản phẩm bắt buộc, tối đa 250 ký tự.");
  if (!maDanhMuc || maDanhMuc.length > 50) return loi(400, "Vui lòng chọn danh mục.");
  if (!Number.isFinite(giaCoBan) || giaCoBan <= 0) return loi(400, "Giá cơ bản phải lớn hơn 0.");
  if (!TRANG_THAI_HOP_LE.includes(trangThai)) return loi(400, "Trạng thái kinh doanh không hợp lệ.");

  let thuTu;
  try { thuTu = JSON.parse(b.thuTuAnh || "[]"); } catch { return loi(400, "Thứ tự ảnh không hợp lệ."); }
  const idGiu = Array.isArray(thuTu) ? thuTu.filter((t) => t !== "moi") : [];
  if (!Array.isArray(thuTu) || thuTu.length > 9 || idGiu.some((t) => !Number.isInteger(t)) ||
      new Set(idGiu).size !== idGiu.length) return loi(400, "Thứ tự ảnh không hợp lệ.");
  if (thuTu.length - idGiu.length !== filesMoi.length) return loi(400, "Số ảnh tải lên không khớp.");

  const text = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };
  const hong = (status, message) => Object.assign(new Error(message), { status });

  let tx;
  let duongDanBiXoa = [];
  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);
    await tx.begin();

    const up = await new sql.Request(tx)
      .input("ma", sql.VarChar(50), ma)
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
      .input("nguoi", sql.Int, req.user.MaNguoiDung)
      .query(`
        UPDATE dbo.SanPham SET
          MaDanhMuc = @maDanhMuc, TenSanPham = @ten, MoTaNgan = @moTaNgan, MoTa = @moTa,
          GiaCoBan = @gia, TrangThai = @trangThai, PhongCach = @phongCach,
          ChatLieuChinh = @chatLieu, HuongDanBaoQuan = @baoQuan, ThongSoKyThuat = @thongSo,
          NgayCapNhat = SYSDATETIME(), MaNguoiCapNhat = @nguoi
        WHERE MaSanPham = @ma`);
    if (!up.rowsAffected[0]) throw hong(404, "Không tìm thấy sản phẩm.");

    // Chỉ đụng tới ảnh chung của sản phẩm (MaBienThe IS NULL); ảnh riêng của biến thể giữ nguyên
    const cu = await new sql.Request(tx).input("ma", sql.VarChar(50), ma)
      .query("SELECT MaAnh, DuongDan FROM dbo.AnhSanPham WHERE MaSanPham = @ma AND MaBienThe IS NULL");
    const duongDanCu = new Map(cu.recordset.map((a) => [a.MaAnh, a.DuongDan]));
    if (idGiu.some((id) => !duongDanCu.has(id))) throw hong(400, "Có ảnh không thuộc sản phẩm này.");

    // Xóa rồi chèn lại theo đúng thứ tự mới (MaAnh tăng dần = thứ tự hiển thị)
    await new sql.Request(tx).input("ma", sql.VarChar(50), ma)
      .query("DELETE FROM dbo.AnhSanPham WHERE MaSanPham = @ma AND MaBienThe IS NULL");
    let k = 0;
    for (let i = 0; i < thuTu.length; i++) {
      const duongDan = thuTu[i] === "moi" ? `/uploads/san-pham/${filesMoi[k++].filename}` : duongDanCu.get(thuTu[i]);
      await new sql.Request(tx)
        .input("ma", sql.VarChar(50), ma)
        .input("duongDan", sql.NVarChar(1000), duongDan)
        .input("laDaiDien", sql.Bit, i === 0 ? 1 : 0)
        .query("INSERT INTO dbo.AnhSanPham (MaSanPham, DuongDan, LaAnhDaiDien) VALUES (@ma, @duongDan, @laDaiDien)");
    }
    duongDanBiXoa = cu.recordset.filter((a) => !idGiu.includes(a.MaAnh)).map((a) => a.DuongDan);

    await tx.commit();
  } catch (error) {
    if (tx) { try { await tx.rollback(); } catch {} }
    xoaFileMoi();
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error("Lỗi cập nhật sản phẩm:", error);
    if (error.number === 547) return res.status(400).json({ success: false, message: "Danh mục không tồn tại." });
    return res.status(500).json({ success: false, message: "Không thể lưu thay đổi." });
  }

  // Dọn file ảnh đã bị gỡ khỏi sản phẩm (sau khi commit; lỗi dọn file không làm hỏng việc lưu)
  try {
    const pool = await getPool();
    for (const dd of duongDanBiXoa) {
      if (!dd.startsWith("/uploads/san-pham/")) continue; // ảnh mẫu nằm ở frontend/public, không đụng
      const conDung = await pool.request().input("d", sql.NVarChar(1000), dd)
        .query("SELECT TOP (1) 1 AS x FROM dbo.AnhSanPham WHERE DuongDan = @d");
      if (!conDung.recordset.length) fs.unlink(nodePath.join(THU_MUC, nodePath.basename(dd)), () => {});
    }
  } catch (e) { console.error("Không dọn được file ảnh cũ:", e.message); }

  return res.json({ success: true, message: "Đã lưu thay đổi.", data: { MaSanPham: ma } });
}

const TRANG_THAI_BIEN_THE = ["Đang bán", "Ngừng bán"];
const SKU_HOP_LE = /^[A-Za-z0-9._-]{1,80}$/;

function tinhTrangTon(khaDung, mucCanhBao) {
  return khaDung <= 0 ? "Hết hàng" : khaDung <= mucCanhBao ? "Sắp hết" : "Còn hàng";
}

// Đọc và kiểm tra dữ liệu form biến thể; boQuaSku = true khi sửa (SKU không đổi)
function docBienThe(body, boQuaSku) {
  const text = (v, max) => { const s = String(v ?? "").trim(); return s ? s.slice(0, max) : null; };
  const rong = (v) => v === undefined || v === null || v === "";
  const du = {
    sku: String(body.sku || "").trim().toUpperCase(),
    chatLieu: text(body.chatLieu, 150), mauSac: text(body.mauSac, 100), kichThuoc: text(body.kichThuoc, 150),
    giaBan: Number(body.giaBan),
    giaNhap: rong(body.giaNhap) ? null : Number(body.giaNhap),
    mucCanhBao: rong(body.mucCanhBao) ? 5 : Number(body.mucCanhBao),
    trangThai: String(body.trangThai || "Đang bán").trim()
  };
  let loi = null;
  if (!boQuaSku && !SKU_HOP_LE.test(du.sku)) loi = "Mã SKU chỉ gồm chữ, số, - . _ (tối đa 80 ký tự, không khoảng trắng).";
  else if (!du.chatLieu && !du.mauSac && !du.kichThuoc) loi = "Nhập ít nhất một thuộc tính: chất liệu, màu sắc hoặc kích thước.";
  else if (!Number.isFinite(du.giaBan) || du.giaBan <= 0) loi = "Giá bán phải lớn hơn 0.";
  else if (du.giaNhap !== null && (!Number.isFinite(du.giaNhap) || du.giaNhap < 0)) loi = "Giá nhập tham chiếu không hợp lệ.";
  else if (!Number.isInteger(du.mucCanhBao) || du.mucCanhBao < 0 || du.mucCanhBao > 100000) loi = "Mức cảnh báo phải là số nguyên từ 0 trở lên.";
  else if (!TRANG_THAI_BIEN_THE.includes(du.trangThai)) loi = "Trạng thái bán không hợp lệ.";
  return { du, loi };
}

async function layBienThe(req, res) {
  const ma = String(req.params.maSanPham || "").trim();
  if (!ma || ma.length > 50) return res.status(400).json({ success: false, message: "Mã sản phẩm không hợp lệ." });
  try {
    const pool = await getPool();
    const tao = () => pool.request().input("ma", sql.VarChar(50), ma);
    const btReq = tao();
    const dsTt = DON_DANG_GIU_HANG.map((t, i) => { btReq.input(`tt${i}`, sql.NVarChar(40), t); return `@tt${i}`; });

    const [spRs, btRs] = await Promise.all([
      tao().query(`
        SELECT sp.MaSanPham, sp.TenSanPham, sp.TrangThai, dm.TenDanhMuc,
               COALESCE(sp.GiaCoBan, (SELECT MIN(GiaBan) FROM dbo.BienTheSanPham WHERE MaSanPham = sp.MaSanPham)) AS Gia,
               (SELECT TOP (1) a.DuongDan FROM dbo.AnhSanPham a WHERE a.MaSanPham = sp.MaSanPham
                ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC) AS DuongDanAnh
        FROM dbo.SanPham sp
        INNER JOIN dbo.DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
        WHERE sp.MaSanPham = @ma`),
      btReq.query(`
        SELECT b.MaBienThe, b.SKU, b.MauSac, b.ChatLieu, b.KichThuoc, b.GiaBan, b.GiaNhapThamChieu, b.TrangThai,
               ISNULL(t.SoLuongTon, 0) AS SoLuongTon, ISNULL(t.MucCanhBao, 5) AS MucCanhBao, ISNULL(g.DaGiu, 0) AS DaGiu
        FROM dbo.BienTheSanPham b
        LEFT JOIN dbo.TonKho t ON t.MaBienThe = b.MaBienThe
        OUTER APPLY (
          SELECT SUM(ct.SoLuong) AS DaGiu FROM dbo.CTDonHang ct
          INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
          WHERE ct.MaBienThe = b.MaBienThe AND dh.TrangThai IN (${dsTt.join(",")})
        ) g
        WHERE b.MaSanPham = @ma
        ORDER BY b.MaBienThe`)
    ]);
    if (!spRs.recordset.length) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });

    const bienThe = btRs.recordset.map((b) => {
      const khaDung = Math.max(b.SoLuongTon - b.DaGiu, 0);
      return { ...b, KhaDung: khaDung, TinhTrangTon: tinhTrangTon(khaDung, b.MucCanhBao) };
    });
    res.json({ success: true, data: { sanPham: spRs.recordset[0], bienThe } });
  } catch (error) {
    console.error("Lỗi lấy biến thể:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách biến thể." });
  }
}

async function themBienThe(req, res) {
  const ma = String(req.params.maSanPham || "").trim();
  if (!ma || ma.length > 50) return res.status(400).json({ success: false, message: "Mã sản phẩm không hợp lệ." });
  const { du, loi } = docBienThe(req.body || {}, false);
  if (loi) return res.status(400).json({ success: false, message: loi });

  let tx;
  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);
    await tx.begin();

    const tonTai = await new sql.Request(tx).input("ma", sql.VarChar(50), ma)
      .query("SELECT 1 AS x FROM dbo.SanPham WHERE MaSanPham = @ma");
    if (!tonTai.recordset.length) { await tx.rollback(); return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." }); }

    const bt = await new sql.Request(tx)
      .input("ma", sql.VarChar(50), ma)
      .input("sku", sql.VarChar(80), du.sku)
      .input("mau", sql.NVarChar(100), du.mauSac)
      .input("chatLieu", sql.NVarChar(150), du.chatLieu)
      .input("kichThuoc", sql.NVarChar(150), du.kichThuoc)
      .input("giaBan", sql.Decimal(18, 2), du.giaBan)
      .input("giaNhap", sql.Decimal(18, 2), du.giaNhap)
      .input("tt", sql.NVarChar(30), du.trangThai)
      .query(`
        INSERT INTO dbo.BienTheSanPham (MaSanPham, SKU, MauSac, ChatLieu, KichThuoc, GiaBan, GiaNhapThamChieu, TrangThai)
        OUTPUT INSERTED.MaBienThe
        VALUES (@ma, @sku, @mau, @chatLieu, @kichThuoc, @giaBan, @giaNhap, @tt)`);
    const maBienThe = bt.recordset[0].MaBienThe;

    // Tồn kho ban đầu luôn bằng 0: số lượng chỉ tăng qua Phiếu nhập
    await new sql.Request(tx)
      .input("id", sql.Int, maBienThe).input("canhBao", sql.Int, du.mucCanhBao)
      .query("INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon, MucCanhBao) VALUES (@id, 0, @canhBao)");

    await tx.commit();
    res.status(201).json({ success: true, message: "Đã thêm biến thể.", data: { MaBienThe: maBienThe, SKU: du.sku } });
  } catch (error) {
    if (tx) { try { await tx.rollback(); } catch {} }
    if (error.number === 2601 || error.number === 2627) return res.status(409).json({ success: false, message: "Mã SKU đã tồn tại." });
    if (error.number === 245 || error.number === 8114)
      console.error("Kiểu cột BienTheSanPham.MaSanPham chưa khớp SanPham.MaSanPham (cần VARCHAR(50)):", error.message);
    else console.error("Lỗi thêm biến thể:", error);
    res.status(500).json({ success: false, message: "Không thể thêm biến thể." });
  }
}

async function suaBienThe(req, res) {
  const id = Number(req.params.maBienThe);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Mã biến thể không hợp lệ." });
  const { du, loi } = docBienThe(req.body || {}, true);
  if (loi) return res.status(400).json({ success: false, message: loi });

  let tx;
  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);
    await tx.begin();
    const up = await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("mau", sql.NVarChar(100), du.mauSac)
      .input("chatLieu", sql.NVarChar(150), du.chatLieu)
      .input("kichThuoc", sql.NVarChar(150), du.kichThuoc)
      .input("giaBan", sql.Decimal(18, 2), du.giaBan)
      .input("giaNhap", sql.Decimal(18, 2), du.giaNhap)
      .input("tt", sql.NVarChar(30), du.trangThai)
      .query(`UPDATE dbo.BienTheSanPham
              SET MauSac = @mau, ChatLieu = @chatLieu, KichThuoc = @kichThuoc,
                  GiaBan = @giaBan, GiaNhapThamChieu = @giaNhap, TrangThai = @tt
              WHERE MaBienThe = @id`);
    if (!up.rowsAffected[0]) { await tx.rollback(); return res.status(404).json({ success: false, message: "Không tìm thấy biến thể." }); }

    await new sql.Request(tx).input("id", sql.Int, id).input("canhBao", sql.Int, du.mucCanhBao).query(`
      UPDATE dbo.TonKho SET MucCanhBao = @canhBao WHERE MaBienThe = @id;
      IF @@ROWCOUNT = 0 INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon, MucCanhBao) VALUES (@id, 0, @canhBao);`);
    await tx.commit();
    res.json({ success: true, message: "Đã lưu biến thể." });
  } catch (error) {
    if (tx) { try { await tx.rollback(); } catch {} }
    console.error("Lỗi sửa biến thể:", error.message);
    res.status(500).json({ success: false, message: "Không thể lưu biến thể." });
  }
}

async function doiTrangThaiBienThe(req, res) {
  const id = Number(req.params.maBienThe);
  const trangThai = String(req.body?.trangThai || "").trim();
  if (!Number.isInteger(id) || id <= 0 || !TRANG_THAI_BIEN_THE.includes(trangThai)) {
    return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ." });
  }
  try {
    const pool = await getPool();
    const r = await pool.request().input("id", sql.Int, id).input("tt", sql.NVarChar(30), trangThai)
      .query("UPDATE dbo.BienTheSanPham SET TrangThai = @tt WHERE MaBienThe = @id");
    if (!r.rowsAffected[0]) return res.status(404).json({ success: false, message: "Không tìm thấy biến thể." });
    res.json({ success: true, message: "Đã cập nhật trạng thái." });
  } catch (error) {
    console.error("Lỗi đổi trạng thái biến thể:", error.message);
    res.status(500).json({ success: false, message: "Không thể cập nhật trạng thái." });
  }
}

module.exports = { layDanhSachSanPham, themSanPham, layDanhMuc,
                   layChatLieu, layDanhSachQuanTri, doiTrangThai,
                   layChiTietSanPham, layDeChinhSua, capNhatSanPham,
                   layBienThe, themBienThe, suaBienThe, doiTrangThaiBienThe };
