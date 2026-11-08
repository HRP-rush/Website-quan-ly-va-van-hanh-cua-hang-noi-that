const { sql, getPool } = require("../config/db");
const { TRANG_THAI_NHAP, TRANG_THAI_GHI_NHAN } = require("../config/phieuNhap");

const MA_PHIEU = `'PN-' + RIGHT('0000' + CAST(pn.MaPhieuNhap AS VARCHAR(10)), 4)`;
const DAU_THANG = `DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)`;
const THANG_NAY = `pn.NgayNhap >= ${DAU_THANG} AND pn.NgayNhap < DATEADD(MONTH, 1, ${DAU_THANG})`;
// Chỉ nhận các khoảng nằm trong danh sách này (SQL cố định, không ghép chuỗi từ người dùng)
const KHOANG_SQL = {
  homNay: "CAST(pn.NgayNhap AS DATE) = CAST(SYSDATETIME() AS DATE)",
  "7ngay": "CAST(pn.NgayNhap AS DATE) >= DATEADD(DAY, -6, CAST(SYSDATETIME() AS DATE))",
  thangNay: THANG_NAY,
  thangTruoc: `pn.NgayNhap >= DATEADD(MONTH, -1, ${DAU_THANG}) AND pn.NgayNhap < ${DAU_THANG}`
};

async function layDanhSachPhieuNhap(req, res) {
  try {
    const q = String(req.query.q || "").trim().slice(0, 100);
    const trangThai = String(req.query.trangThai || "").trim();
    const khoang = String(req.query.khoang || "").trim();
    const trang = Math.max(1, parseInt(req.query.trang, 10) || 1);
    const soDong = Math.min(50, Math.max(1, parseInt(req.query.soDong, 10) || 10));
    if (trangThai && ![TRANG_THAI_NHAP, TRANG_THAI_GHI_NHAN].includes(trangThai)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    if (khoang && !KHOANG_SQL[khoang]) {
      return res.status(400).json({ success: false, message: "Khoảng ngày không hợp lệ." });
    }

    const nguon = `
      FROM dbo.PhieuNhap AS pn
      INNER JOIN dbo.NhaCungCap AS ncc ON ncc.MaNCC = pn.MaNCC
      INNER JOIN dbo.NguoiDung AS nd ON nd.MaNguoiDung = pn.MaNguoiDung
      OUTER APPLY (
        SELECT COUNT(*) AS SoSku, ISNULL(SUM(ct.SoLuong * ct.DonGiaNhap), 0) AS TongTien
        FROM dbo.CTPhieuNhap AS ct WHERE ct.MaPhieuNhap = pn.MaPhieuNhap
      ) AS x`;

    const dk = ["1=1"];
    const thamSo = [];
    if (q) {
      dk.push(`(${MA_PHIEU} LIKE @q ESCAPE '\\' OR ncc.TenNCC LIKE @q ESCAPE '\\')`);
      thamSo.push(["q", sql.NVarChar(210), `%${q.replace(/[\\%_[]/g, "\\$&")}%`]);
    }
    if (trangThai) { dk.push("pn.TrangThai = @trangThai"); thamSo.push(["trangThai", sql.NVarChar(40), trangThai]); }
    if (khoang) dk.push(`(${KHOANG_SQL[khoang]})`);
    const where = dk.join(" AND ");

    const pool = await getPool();
    const tao = () => { const r = pool.request(); thamSo.forEach(([n, t, v]) => r.input(n, t, v)); return r; };

    const [ds, dem, kpi] = await Promise.all([
      tao().input("offset", sql.Int, (trang - 1) * soDong).input("soDong", sql.Int, soDong).query(`
        SELECT pn.MaPhieuNhap, ${MA_PHIEU} AS MaPhieu, ncc.TenNCC,
               FORMAT(pn.NgayNhap, 'dd/MM/yyyy') AS NgayNhap,
               COALESCE(nd.HoTen, nd.Email) AS NguoiLap,
               x.SoSku, x.TongTien, pn.TrangThai
        ${nguon}
        WHERE ${where}
        ORDER BY pn.NgayNhap DESC, pn.MaPhieuNhap DESC
        OFFSET @offset ROWS FETCH NEXT @soDong ROWS ONLY`),
      tao().query(`SELECT COUNT(*) AS Tong ${nguon} WHERE ${where}`),
      // 4 thẻ tổng quan đều tính theo THÁNG HIỆN TẠI, không phụ thuộc bộ lọc
      pool.request().input("nhap", sql.NVarChar(40), TRANG_THAI_NHAP).input("ghiNhan", sql.NVarChar(40), TRANG_THAI_GHI_NHAN).query(`
        SELECT COUNT(*) AS TrongThang,
               ISNULL(SUM(CASE WHEN pn.TrangThai = @ghiNhan THEN 1 ELSE 0 END), 0) AS DaGhiNhan,
               ISNULL(SUM(CASE WHEN pn.TrangThai = @nhap THEN 1 ELSE 0 END), 0) AS Nhap,
               ISNULL(SUM(CASE WHEN pn.TrangThai = @ghiNhan THEN x.TongTien ELSE 0 END), 0) AS GiaTriDaNhap,
               FORMAT(SYSDATETIME(), 'MM/yyyy') AS Thang
        ${nguon} WHERE ${THANG_NAY}`)
    ]);

    res.json({ success: true, data: ds.recordset, total: dem.recordset[0].Tong, tongQuan: kpi.recordset[0], trang, soDong });
  } catch (error) {
    console.error("Lỗi lấy danh sách phiếu nhập:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy danh sách phiếu nhập." });
  }
}

const maHienThi = (id) => `PN-${String(id).padStart(4, "0")}`;
const SKU_HOP_LE = /^[A-Za-z0-9._-]{1,80}$/;
const loiNghiepVu = (status, message) => Object.assign(new Error(message), { status });

const hopLeNgay = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
};
const homNay = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Đọc và kiểm tra dữ liệu phiếu gửi lên
function docPhieu(body) {
  const maNCC = Number(body.maNCC);
  const ngay = String(body.ngayNhap || "").trim();
  const ghiChu = String(body.ghiChu || "").trim().slice(0, 500) || null;
  const tho = Array.isArray(body.dong) ? body.dong : [];

  if (!Number.isInteger(maNCC) || maNCC <= 0) return { loi: "Chọn nhà cung cấp." };
  if (!hopLeNgay(ngay)) return { loi: "Ngày nhập không hợp lệ." };
  if (ngay > homNay()) return { loi: "Ngày nhập không được ở tương lai." };
  if (tho.length < 1 || tho.length > 50) return { loi: "Phiếu cần từ 1 đến 50 dòng sản phẩm." };

  const thay = new Set();
  const dong = [];
  for (const r of tho) {
    const ma = String(r?.maBienThe || "").trim();
    const sl = Number(r?.soLuong), gia = Number(r?.donGia);
    if (!SKU_HOP_LE.test(ma)) return { loi: "Chọn SKU cho mọi dòng." };
    if (thay.has(ma)) return { loi: `SKU ${ma} bị thêm trùng trong phiếu.` };
    thay.add(ma);
    if (!Number.isInteger(sl) || sl < 1 || sl > 1000000) return { loi: "Số lượng phải là số nguyên lớn hơn 0." };
    if (!Number.isFinite(gia) || gia <= 0 || gia > 1e10) return { loi: "Đơn giá nhập phải lớn hơn 0." };
    dong.push({ ma, sl, gia });
  }
  return { du: { maNCC, ngay, ghiChu, dong } };
}

// Dữ liệu cho biểu mẫu: nhà cung cấp, danh sách SKU, tên người lập
async function layKhoiTaoPhieu(req, res) {
  try {
    const pool = await getPool();
    const [ncc, bt, nd] = await Promise.all([
      pool.request().query("SELECT MaNCC, TenNCC FROM dbo.NhaCungCap ORDER BY TenNCC"),
      pool.request().query(`
        SELECT b.MaBienThe, b.SKU, b.ChatLieu, b.MauSac, b.KichThuoc, b.TrangThai, b.GiaNhapThamChieu, sp.TenSanPham
        FROM dbo.BienTheSanPham b INNER JOIN dbo.SanPham sp ON sp.MaSanPham = b.MaSanPham
        ORDER BY sp.TenSanPham, b.SKU`),
      pool.request().input("id", sql.Int, req.user.MaNguoiDung)
        .query("SELECT COALESCE(HoTen, Email) AS Ten FROM dbo.NguoiDung WHERE MaNguoiDung = @id")
    ]);
    res.json({ success: true, data: { nhaCungCap: ncc.recordset, bienThe: bt.recordset, nguoiLap: nd.recordset[0]?.Ten || "" } });
  } catch (error) {
    console.error("Lỗi khởi tạo phiếu nhập:", error.message);
    res.status(500).json({ success: false, message: "Không thể tải dữ liệu biểu mẫu." });
  }
}

// Lấy một phiếu để "Tiếp tục lập"
async function layPhieuNhap(req, res) {
  const id = Number(req.params.maPhieuNhap);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Mã phiếu không hợp lệ." });
  try {
    const pool = await getPool();
    const [h, d] = await Promise.all([
      pool.request().input("id", sql.Int, id).query(`
        SELECT pn.MaPhieuNhap, pn.MaNCC, pn.TrangThai, pn.GhiChu,
               CONVERT(VARCHAR(10), pn.NgayNhap, 23) AS NgayNhap, COALESCE(nd.HoTen, nd.Email) AS NguoiLap
        FROM dbo.PhieuNhap pn INNER JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = pn.MaNguoiDung
        WHERE pn.MaPhieuNhap = @id`),
      pool.request().input("id", sql.Int, id)
        .query("SELECT MaBienThe, SoLuong, DonGiaNhap FROM dbo.CTPhieuNhap WHERE MaPhieuNhap = @id ORDER BY MaCTNhap")
    ]);
    if (!h.recordset.length) return res.status(404).json({ success: false, message: "Không tìm thấy phiếu nhập." });
    res.json({ success: true, data: { phieu: { ...h.recordset[0], MaPhieu: maHienThi(id) }, dong: d.recordset } });
  } catch (error) {
    console.error("Lỗi lấy phiếu nhập:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy phiếu nhập." });
  }
}

// Ghi nhận phiếu: cộng tồn kho + ghi giao dịch kho + chuyển trạng thái. PHẢI chạy trong transaction của người gọi.
async function ghiNhanPhieu(tx, maPhieu, maNguoi) {
  // Chỉ chuyển được khi còn là Nháp -> bấm trùng 2 lần không cộng tồn 2 lần
  const khoa = await new sql.Request(tx)
    .input("id", sql.Int, maPhieu).input("nhap", sql.NVarChar(40), TRANG_THAI_NHAP).input("gn", sql.NVarChar(40), TRANG_THAI_GHI_NHAN)
    .query("UPDATE dbo.PhieuNhap SET TrangThai = @gn WHERE MaPhieuNhap = @id AND TrangThai = @nhap");
  if (!khoa.rowsAffected[0]) throw loiNghiepVu(409, "Phiếu đã được ghi nhận trước đó hoặc không còn ở trạng thái nháp.");

  const dong = await new sql.Request(tx).input("id", sql.Int, maPhieu)
    .query("SELECT MaCTNhap, MaBienThe, SoLuong FROM dbo.CTPhieuNhap WHERE MaPhieuNhap = @id");
  for (const d of dong.recordset) {
    await new sql.Request(tx)
      .input("ma", sql.VarChar(80), d.MaBienThe).input("sl", sql.Int, d.SoLuong)
      .input("ct", sql.Int, d.MaCTNhap).input("nguoi", sql.Int, maNguoi)
      .query(`
        UPDATE dbo.TonKho SET SoLuongTon = SoLuongTon + @sl WHERE MaBienThe = @ma;
        IF @@ROWCOUNT = 0 INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon, MucCanhBao) VALUES (@ma, @sl, 5);
        INSERT INTO dbo.GiaoDichKho (MaNguoiDung, MaCTNhap, MaBienThe, LoaiGiaoDich, SoLuongThayDoi)
        VALUES (@nguoi, @ct, @ma, N'Nhập kho', @sl);`);
  }
}

// Tạo mới (maCu = null) hoặc cập nhật phiếu nháp. body.ghiNhan = true thì ghi nhận luôn.
async function luuPhieu(req, res, maCu) {
  const { du, loi } = docPhieu(req.body || {});
  if (loi) return res.status(400).json({ success: false, message: loi });
  const ghiNhan = req.body.ghiNhan === true;

  let tx;
  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);
    await tx.begin();
    let maPhieu = maCu;

    if (maCu == null) {
      const r = await new sql.Request(tx)
        .input("nguoi", sql.Int, req.user.MaNguoiDung).input("ncc", sql.Int, du.maNCC)
        .input("ngay", sql.VarChar(10), du.ngay).input("ghiChu", sql.NVarChar(500), du.ghiChu)
        .input("tt", sql.NVarChar(40), TRANG_THAI_NHAP)
        .query(`INSERT INTO dbo.PhieuNhap (MaNguoiDung, MaNCC, NgayNhap, TrangThai, GhiChu)
                OUTPUT INSERTED.MaPhieuNhap
                VALUES (@nguoi, @ncc, CAST(@ngay AS DATETIME2(0)), @tt, @ghiChu)`);
      maPhieu = r.recordset[0].MaPhieuNhap;
    } else {
      const cur = await new sql.Request(tx).input("id", sql.Int, maCu)
        .query("SELECT TrangThai FROM dbo.PhieuNhap WITH (UPDLOCK, ROWLOCK) WHERE MaPhieuNhap = @id");
      if (!cur.recordset.length) throw loiNghiepVu(404, "Không tìm thấy phiếu nhập.");
      if (cur.recordset[0].TrangThai !== TRANG_THAI_NHAP) throw loiNghiepVu(409, "Phiếu đã ghi nhận chỉ được xem, không thể sửa.");
      await new sql.Request(tx).input("id", sql.Int, maCu).input("ncc", sql.Int, du.maNCC)
        .input("ngay", sql.VarChar(10), du.ngay).input("ghiChu", sql.NVarChar(500), du.ghiChu)
        .query("UPDATE dbo.PhieuNhap SET MaNCC = @ncc, NgayNhap = CAST(@ngay AS DATETIME2(0)), GhiChu = @ghiChu WHERE MaPhieuNhap = @id");
      await new sql.Request(tx).input("id", sql.Int, maCu).query("DELETE FROM dbo.CTPhieuNhap WHERE MaPhieuNhap = @id");
    }

    for (const d of du.dong) {
      await new sql.Request(tx)
        .input("id", sql.Int, maPhieu).input("ma", sql.VarChar(80), d.ma)
        .input("sl", sql.Int, d.sl).input("gia", sql.Decimal(18, 2), d.gia)
        .query("INSERT INTO dbo.CTPhieuNhap (MaPhieuNhap, MaBienThe, SoLuong, DonGiaNhap) VALUES (@id, @ma, @sl, @gia)");
    }
    if (ghiNhan) await ghiNhanPhieu(tx, maPhieu, req.user.MaNguoiDung);

    await tx.commit();
    res.status(maCu == null ? 201 : 200).json({
      success: true, message: ghiNhan ? "Đã ghi nhận phiếu nhập." : "Đã lưu bản nháp.",
      data: { MaPhieuNhap: maPhieu, MaPhieu: maHienThi(maPhieu), TrangThai: ghiNhan ? TRANG_THAI_GHI_NHAN : TRANG_THAI_NHAP }
    });
  } catch (error) {
    if (tx) { try { await tx.rollback(); } catch {} }
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    if (error.number === 547) return res.status(400).json({ success: false, message: "Nhà cung cấp hoặc SKU không tồn tại." });
    if (error.number === 245 || error.number === 8114)
      console.error("Kiểu cột MaBienThe chưa khớp giữa BienTheSanPham / CTPhieuNhap / TonKho / GiaoDichKho (cần VARCHAR(80)):", error.message);
    else console.error("Lỗi lưu phiếu nhập:", error);
    res.status(500).json({ success: false, message: "Không thể lưu phiếu nhập." });
  }
}

const taoPhieuNhap = (req, res) => luuPhieu(req, res, null);
function capNhatPhieuNhap(req, res) {
  const id = Number(req.params.maPhieuNhap);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Mã phiếu không hợp lệ." });
  return luuPhieu(req, res, id);
}

module.exports = { layDanhSachPhieuNhap, layKhoiTaoPhieu, layPhieuNhap, taoPhieuNhap, capNhatPhieuNhap };
