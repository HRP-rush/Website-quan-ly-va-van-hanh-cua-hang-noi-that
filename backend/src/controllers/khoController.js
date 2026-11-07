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

module.exports = { layTonKho };
