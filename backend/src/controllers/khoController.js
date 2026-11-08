const { sql, getPool } = require("../config/db");
const { DON_DANG_GIU_HANG } = require("../config/donHang");

const TINH_TRANG = ["Còn hàng", "Sắp hết", "Hết hàng"];

// Quản lý tồn kho: mỗi dòng là một SKU. Khả dụng = Hiện tại - Đã giữ (không âm).
// Tình trạng: Hết hàng (khả dụng = 0), Sắp hết (khả dụng <= mức cảnh báo của SKU), còn lại Còn hàng.
async function layTonKho(req, res) {
  try {
    const q = String(req.query.q || "").trim().slice(0, 100);
    const maDanhMuc = String(req.query.maDanhMuc || "").trim();
    const tinhTrang = String(req.query.tinhTrang || "").trim();
    const trang = Math.max(1, parseInt(req.query.trang, 10) || 1);
    const soDong = Math.min(50, Math.max(1, parseInt(req.query.soDong, 10) || 10));
    if (tinhTrang && !TINH_TRANG.includes(tinhTrang)) {
      return res.status(400).json({ success: false, message: "Tình trạng tồn không hợp lệ." });
    }

    const pool = await getPool();
    const dsTt = DON_DANG_GIU_HANG.map((_, i) => `@tt${i}`).join(",");
    const nguon = `
      FROM dbo.BienTheSanPham AS b
      INNER JOIN dbo.SanPham AS sp ON sp.MaSanPham = b.MaSanPham
      INNER JOIN dbo.DanhMuc AS dm ON dm.MaDanhMuc = sp.MaDanhMuc
      LEFT JOIN dbo.TonKho AS t ON t.MaBienThe = b.MaBienThe
      OUTER APPLY (
        SELECT SUM(ct.SoLuong) AS DaGiu
        FROM dbo.CTDonHang AS ct
        INNER JOIN dbo.DonHang AS dh ON dh.MaDon = ct.MaDon
        WHERE ct.MaBienThe = b.MaBienThe AND dh.TrangThai IN (${dsTt})
      ) AS g
      CROSS APPLY (SELECT ISNULL(t.SoLuongTon, 0) AS Ton, ISNULL(g.DaGiu, 0) AS Giu, ISNULL(t.MucCanhBao, 5) AS Muc) AS x
      CROSS APPLY (SELECT CASE WHEN x.Ton - x.Giu > 0 THEN x.Ton - x.Giu ELSE 0 END AS KhaDung) AS k
      CROSS APPLY (SELECT CASE WHEN k.KhaDung <= 0 THEN N'Hết hàng'
                               WHEN k.KhaDung <= x.Muc THEN N'Sắp hết'
                               ELSE N'Còn hàng' END AS TinhTrang) AS s`;

    // Request chỉ có tham số trạng thái đơn (dùng cho thẻ tổng quan và cảnh báo, không lọc)
    const taoCoBan = () => {
      const r = pool.request();
      DON_DANG_GIU_HANG.forEach((t, i) => r.input(`tt${i}`, sql.NVarChar(40), t));
      return r;
    };

    // Điều kiện lọc: mọi giá trị đều đi qua tham số
    const dk = ["1=1"];
    const locThamSo = [];
    if (q) {
      dk.push(`(b.SKU LIKE @q ESCAPE '\\' OR sp.TenSanPham LIKE @q ESCAPE '\\')`);
      locThamSo.push(["q", sql.NVarChar(210), `%${q.replace(/[\\%_[]/g, "\\$&")}%`]);
    }
    if (maDanhMuc) { dk.push("sp.MaDanhMuc = @maDanhMuc"); locThamSo.push(["maDanhMuc", sql.VarChar(50), maDanhMuc]); }
    if (tinhTrang) { dk.push("s.TinhTrang = @tinhTrang"); locThamSo.push(["tinhTrang", sql.NVarChar(20), tinhTrang]); }
    const where = dk.join(" AND ");
    const taoLoc = () => { const r = taoCoBan(); locThamSo.forEach(([n, ty, v]) => r.input(n, ty, v)); return r; };

    const [ds, dem, kpi, cb] = await Promise.all([
      taoLoc().input("offset", sql.Int, (trang - 1) * soDong).input("soDong", sql.Int, soDong).query(`
        SELECT b.MaBienThe, b.SKU, b.ChatLieu, b.MauSac, b.KichThuoc, b.TrangThai,
               sp.MaSanPham, sp.TenSanPham, dm.TenDanhMuc,
               x.Ton AS SoLuongTon, x.Giu AS DaGiu, k.KhaDung, x.Muc AS MucCanhBao, s.TinhTrang
        ${nguon}
        WHERE ${where}
        ORDER BY sp.TenSanPham, b.SKU
        OFFSET @offset ROWS FETCH NEXT @soDong ROWS ONLY`),
      taoLoc().query(`SELECT COUNT(*) AS Tong ${nguon} WHERE ${where}`),
      taoCoBan().query(`
        SELECT COUNT(*) AS Tong,
               ISNULL(SUM(CASE WHEN s.TinhTrang = N'Còn hàng' THEN 1 ELSE 0 END), 0) AS ConHang,
               ISNULL(SUM(CASE WHEN s.TinhTrang = N'Sắp hết' THEN 1 ELSE 0 END), 0) AS SapHet,
               ISNULL(SUM(CASE WHEN s.TinhTrang = N'Hết hàng' THEN 1 ELSE 0 END), 0) AS HetHang
        ${nguon}`),
      // Cảnh báo chỉ tính SKU đang bán (SKU đã ngừng bán hết hàng không cần nhắc)
      taoCoBan().query(`
        SELECT TOP (5) b.SKU, k.KhaDung, x.Muc AS MucCanhBao, s.TinhTrang, COUNT(*) OVER() AS Tong
        ${nguon}
        WHERE b.TrangThai = N'Đang bán' AND s.TinhTrang <> N'Còn hàng'
        ORDER BY k.KhaDung, b.SKU`)
    ]);

    res.json({
      success: true,
      data: ds.recordset,
      total: dem.recordset[0].Tong,
      tongQuan: kpi.recordset[0],
      canhBao: cb.recordset.map(({ Tong, ...r }) => r),
      tongCanhBao: cb.recordset.length ? cb.recordset[0].Tong : 0,
      trang, soDong
    });
  } catch (error) {
    console.error("Lỗi lấy tồn kho:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy dữ liệu tồn kho." });
  }
}

const SKU_HOP_LE = /^[A-Za-z0-9._-]{1,80}$/;
// Mã hiển thị: MA-yyyyMMdd-nnn cho đơn hàng, PN-nnnn cho phiếu nhập
const MA_DON_SQL = `'MA-' + FORMAT(dh.NgayDat, 'yyyyMMdd') + '-' + RIGHT('000' + CAST(dh.MaDon AS VARCHAR(10)), 3)`;
const MA_PHIEU_SQL = (cot) => `'PN-' + RIGHT('0000' + CAST(${cot} AS VARCHAR(10)), 4)`;

async function layChiTietTonKho(req, res) {
  const ma = String(req.params.maBienThe || "").trim();
  if (!SKU_HOP_LE.test(ma)) return res.status(400).json({ success: false, message: "Mã SKU không hợp lệ." });
  try {
    const pool = await getPool();
    const dsTt = DON_DANG_GIU_HANG.map((_, i) => `@tt${i}`).join(",");
    const tao = () => {
      const r = pool.request().input("ma", sql.VarChar(80), ma);
      DON_DANG_GIU_HANG.forEach((t, i) => r.input(`tt${i}`, sql.NVarChar(40), t));
      return r;
    };

    const [dauRs, gdRs, giuRs, nhapRs] = await Promise.all([
      // 1) Thông tin SKU, tồn hiện tại, số đang giữ
      tao().query(`
        SELECT b.MaBienThe, b.SKU, b.ChatLieu, b.MauSac, b.KichThuoc, b.GiaBan, b.TrangThai,
               sp.MaSanPham, sp.TenSanPham, dm.TenDanhMuc,
               ISNULL(t.SoLuongTon, 0) AS Ton, ISNULL(t.MucCanhBao, 5) AS MucCanhBao,
               ISNULL((SELECT SUM(ct.SoLuong) FROM dbo.CTDonHang ct
                       INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
                       WHERE ct.MaBienThe = b.MaBienThe AND dh.TrangThai IN (${dsTt})), 0) AS Giu,
               (SELECT TOP (1) a.DuongDan FROM dbo.AnhSanPham a WHERE a.MaSanPham = sp.MaSanPham
                ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC) AS DuongDanAnh
        FROM dbo.BienTheSanPham b
        INNER JOIN dbo.SanPham sp ON sp.MaSanPham = b.MaSanPham
        INNER JOIN dbo.DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
        LEFT JOIN dbo.TonKho t ON t.MaBienThe = b.MaBienThe
        WHERE b.MaBienThe = @ma`),
      // 2) Giao dịch kho thật (nhập kho, xuất giao hàng...)
      tao().query(`
        SELECT g.MaCTDon, g.LoaiGiaoDich, g.SoLuongThayDoi, g.GhiChu, nd.HoTen AS NguoiThucHien,
               CONVERT(VARCHAR(19), g.NgayGiaoDich, 126) AS ThoiDiem,
               CASE WHEN dh.MaDon IS NOT NULL THEN ${MA_DON_SQL}
                    WHEN pn.MaPhieuNhap IS NOT NULL THEN ${MA_PHIEU_SQL("pn.MaPhieuNhap")} END AS ThamChieu
        FROM dbo.GiaoDichKho g
        LEFT JOIN dbo.NguoiDung nd ON nd.MaNguoiDung = g.MaNguoiDung
        LEFT JOIN dbo.CTDonHang ctd ON ctd.MaCTDon = g.MaCTDon
        LEFT JOIN dbo.DonHang dh ON dh.MaDon = ctd.MaDon
        LEFT JOIN dbo.CTPhieuNhap ctn ON ctn.MaCTNhap = g.MaCTNhap
        LEFT JOIN dbo.PhieuNhap pn ON pn.MaPhieuNhap = ctn.MaPhieuNhap
        WHERE g.MaBienThe = @ma
        ORDER BY g.NgayGiaoDich, g.MaGiaoDich`),
      // 3) Các dòng đơn hàng của SKU: lúc đặt (giữ hàng) và lúc rời khỏi trạng thái giữ hàng (nhả giữ)
      tao().query(`
        SELECT ct.MaCTDon, ct.SoLuong, ${MA_DON_SQL} AS ThamChieu,
               CONVERT(VARCHAR(19), dh.NgayDat, 126) AS NgayDat,
               CAST(CASE WHEN dh.TrangThai IN (${dsTt}) THEN 1 ELSE 0 END AS BIT) AS DangGiu,
               CONVERT(VARCHAR(19), (SELECT MIN(ls.ThoiDiem) FROM dbo.LichSuTrangThaiDon ls
                                     WHERE ls.MaDon = dh.MaDon AND ls.TrangThaiMoi NOT IN (${dsTt})), 126) AS ThoiDiemNha
        FROM dbo.CTDonHang ct
        INNER JOIN dbo.DonHang dh ON dh.MaDon = ct.MaDon
        WHERE ct.MaBienThe = @ma`),
      // 4) Phiếu nhập nháp có chứa SKU này (chưa làm đổi tồn kho)
      tao().query(`
        SELECT TOP (3) ${MA_PHIEU_SQL("pn.MaPhieuNhap")} AS Ma
        FROM dbo.CTPhieuNhap ct
        INNER JOIN dbo.PhieuNhap pn ON pn.MaPhieuNhap = ct.MaPhieuNhap
        WHERE ct.MaBienThe = @ma AND pn.TrangThai = N'Nháp'
        ORDER BY pn.MaPhieuNhap DESC`)
    ]);

    if (!dauRs.recordset.length) return res.status(404).json({ success: false, message: "Không tìm thấy SKU." });
    const d = dauRs.recordset[0];

    // ---- Dựng dòng thời gian: giữ hàng + giao dịch kho + nhả giữ ----
    const dongDon = new Map(giuRs.recordset.map((r) => [r.MaCTDon, r]));
    const daNha = new Set();
    const sk = [];

    for (const r of giuRs.recordset) {
      if (r.DangGiu || r.ThoiDiemNha) {
        sk.push({ t: r.NgayDat, uuTien: 0, loai: "Giữ cho đơn", dTon: 0, dGiu: r.SoLuong, thamChieu: r.ThamChieu, nguoi: "Hệ thống" });
      }
    }
    for (const g of gdRs.recordset) {
      let dGiu = 0;
      const dong = g.MaCTDon != null ? dongDon.get(g.MaCTDon) : null;
      // Xuất kho cho đơn: giao dịch này đồng thời nhả số lượng đang giữ của dòng đơn đó
      if (dong && !dong.DangGiu && dong.ThoiDiemNha && g.SoLuongThayDoi < 0 && !daNha.has(g.MaCTDon)) {
        dGiu = -Math.min(dong.SoLuong, -g.SoLuongThayDoi);
        daNha.add(g.MaCTDon);
      }
      sk.push({ t: g.ThoiDiem, uuTien: 1, loai: g.LoaiGiaoDich, dTon: g.SoLuongThayDoi, dGiu,
        thamChieu: g.ThamChieu || g.GhiChu || null, nguoi: g.NguoiThucHien || "Hệ thống" });
    }
    for (const r of giuRs.recordset) {
      if (!r.DangGiu && r.ThoiDiemNha && !daNha.has(r.MaCTDon)) {
        sk.push({ t: r.ThoiDiemNha, uuTien: 2, loai: "Nhả giữ hàng", dTon: 0, dGiu: -r.SoLuong, thamChieu: r.ThamChieu, nguoi: "Hệ thống" });
      }
    }
    sk.sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : a.uuTien - b.uuTien));

    // Tính "tồn sau giao dịch" ngược từ trạng thái HIỆN TẠI để luôn khớp với số đang có trong kho
    let ton = d.Ton, giu = d.Giu;
    const lichSu = [];
    for (let i = sk.length - 1; i >= 0; i--) {
      const { uuTien, ...e } = sk[i];
      lichSu.push({ ...e, ton, giu, khaDung: Math.max(ton - giu, 0) }); // trạng thái SAU sự kiện này; mới nhất xếp trước
      ton -= e.dTon; giu -= e.dGiu;
    }

    const khaDung = Math.max(d.Ton - d.Giu, 0);
    res.json({
      success: true,
      data: {
        bienThe: { ...d, KhaDung: khaDung,
          TinhTrang: khaDung <= 0 ? "Hết hàng" : khaDung <= d.MucCanhBao ? "Sắp hết" : "Còn hàng" },
        lichSu,
        // Khác 0 nghĩa là lịch sử giao dịch chưa đủ để giải thích toàn bộ số tồn hiện tại
        lechSo: ton !== 0 || giu !== 0,
        phieuNhapNhap: nhapRs.recordset.map((r) => r.Ma)
      }
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết tồn kho:", error.message);
    res.status(500).json({ success: false, message: "Không thể lấy chi tiết tồn kho." });
  }
}

module.exports = { layTonKho, layChiTietTonKho };
