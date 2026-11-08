const { sql, getPool } = require('../config/db');
const { DON_DANG_GIU_HANG } = require('../config/donHang');

// Ngày dùng định dạng YYYY-MM-DD; giới hạn phạm vi để tránh truy vấn báo cáo quá lớn.
function ngayHopLe(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(text || ''))) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

async function thongKeBaoCao(req, res) {
  const tuNgay = String(req.query.tuNgay || '');
  const denNgay = String(req.query.denNgay || '');
  const nhomTheo = String(req.query.nhomTheo || 'ngay');
  if (!ngayHopLe(tuNgay) || !ngayHopLe(denNgay) || !['ngay', 'tuan', 'thang'].includes(nhomTheo)) {
    return res.status(400).json({ success: false, message: 'Ngày hoặc cách nhóm dữ liệu không hợp lệ.' });
  }
  const from = new Date(`${tuNgay}T00:00:00Z`);
  const to = new Date(`${denNgay}T00:00:00Z`);
  if (from > to || (to - from) / 86400000 > 366) {
    return res.status(400).json({ success: false, message: 'Khoảng thời gian phải từ 1 đến 367 ngày.' });
  }
  try {
    const pool = await getPool();
    const rq = () => pool.request()
      .input('tuNgay', sql.Date, tuNgay)
      .input('denNgay', sql.Date, denNgay);
    // Ngày hoàn thành lấy từ lịch sử, chỉ dùng ngày đặt làm dự phòng cho dữ liệu cũ thiếu lịch sử.
    const donHoanThanh = `
      FROM dbo.DonHang dh
      OUTER APPLY (
        SELECT MAX(ls.ThoiDiem) AS NgayHoanThanh
        FROM dbo.LichSuTrangThaiDon ls
        WHERE ls.MaDon = dh.MaDon AND ls.TrangThaiMoi = N'Hoàn tất'
      ) ht
      WHERE dh.TrangThai = N'Hoàn tất'
        AND COALESCE(ht.NgayHoanThanh, dh.NgayDat) >= @tuNgay
        AND COALESCE(ht.NgayHoanThanh, dh.NgayDat) < DATEADD(DAY, 1, @denNgay)`;
    const giu = DON_DANG_GIU_HANG.map((_, i) => `@giu${i}`).join(',');
    const rqKho = () => {
      const r = pool.request();
      DON_DANG_GIU_HANG.forEach((v, i) => r.input(`giu${i}`, sql.NVarChar(40), v));
      return r;
    };
    const [kpi, donTheoNgay, doanhThuTheoNgay, danhMuc, top, canhBao] = await Promise.all([
      rq().query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.DonHang WHERE NgayDat >= @tuNgay AND NgayDat < DATEADD(DAY, 1, @denNgay)) AS TongDon,
          (SELECT COUNT(*) FROM dbo.DonHang WHERE NgayDat >= @tuNgay AND NgayDat < DATEADD(DAY, 1, @denNgay) AND TrangThai = N'Hoàn tất') AS HoanTatTheoNgayDat,
          (SELECT COUNT(*) ${donHoanThanh}) AS DonHoanTat,
          (SELECT ISNULL(SUM(dh.TienHang - dh.GiamGia), 0) ${donHoanThanh}) AS DoanhThu,
          (SELECT ISNULL(SUM(ct.SoLuong), 0) FROM dbo.CTDonHang ct JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon
            OUTER APPLY (SELECT MAX(ls.ThoiDiem) AS NgayHoanThanh FROM dbo.LichSuTrangThaiDon ls WHERE ls.MaDon=dh.MaDon AND ls.TrangThaiMoi=N'Hoàn tất') ht
            WHERE dh.TrangThai=N'Hoàn tất' AND COALESCE(ht.NgayHoanThanh,dh.NgayDat)>=@tuNgay AND COALESCE(ht.NgayHoanThanh,dh.NgayDat)<DATEADD(DAY,1,@denNgay)) AS SoSanPham`),
      rq().query(`SELECT CONVERT(varchar(10), NgayDat, 23) AS Ngay, COUNT(*) AS SoDon
         FROM dbo.DonHang WHERE NgayDat>=@tuNgay AND NgayDat<DATEADD(DAY,1,@denNgay)
         GROUP BY CONVERT(varchar(10), NgayDat, 23) ORDER BY Ngay`),
      rq().query(`SELECT CONVERT(varchar(10), COALESCE(ht.NgayHoanThanh, dh.NgayDat), 23) AS Ngay,
        SUM(dh.TienHang - dh.GiamGia) AS DoanhThu
        ${donHoanThanh}
        GROUP BY CONVERT(varchar(10), COALESCE(ht.NgayHoanThanh, dh.NgayDat), 23) ORDER BY Ngay`),
      rq().query(`SELECT dm.MaDanhMuc, dm.TenDanhMuc, SUM(ct.SoLuong) AS SoLuong
        FROM dbo.CTDonHang ct JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon
        JOIN dbo.BienTheSanPham bt ON bt.MaBienThe=ct.MaBienThe JOIN dbo.SanPham sp ON sp.MaSanPham=bt.MaSanPham
        JOIN dbo.DanhMuc dm ON dm.MaDanhMuc=sp.MaDanhMuc
        OUTER APPLY (SELECT MAX(ls.ThoiDiem) AS NgayHoanThanh FROM dbo.LichSuTrangThaiDon ls WHERE ls.MaDon=dh.MaDon AND ls.TrangThaiMoi=N'Hoàn tất') ht
        WHERE dh.TrangThai=N'Hoàn tất' AND COALESCE(ht.NgayHoanThanh,dh.NgayDat)>=@tuNgay AND COALESCE(ht.NgayHoanThanh,dh.NgayDat)<DATEADD(DAY,1,@denNgay)
        GROUP BY dm.MaDanhMuc, dm.TenDanhMuc ORDER BY SoLuong DESC, dm.TenDanhMuc`),
      rq().query(`SELECT TOP (5) sp.MaSanPham, sp.TenSanPham, SUM(ct.SoLuong) AS SoLuong,
        SUM(ct.ThanhTien) AS DoanhThuGop
        FROM dbo.CTDonHang ct JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon
        JOIN dbo.BienTheSanPham bt ON bt.MaBienThe=ct.MaBienThe JOIN dbo.SanPham sp ON sp.MaSanPham=bt.MaSanPham
        OUTER APPLY (SELECT MAX(ls.ThoiDiem) AS NgayHoanThanh FROM dbo.LichSuTrangThaiDon ls WHERE ls.MaDon=dh.MaDon AND ls.TrangThaiMoi=N'Hoàn tất') ht
        WHERE dh.TrangThai=N'Hoàn tất' AND COALESCE(ht.NgayHoanThanh,dh.NgayDat)>=@tuNgay AND COALESCE(ht.NgayHoanThanh,dh.NgayDat)<DATEADD(DAY,1,@denNgay)
        GROUP BY sp.MaSanPham, sp.TenSanPham ORDER BY SoLuong DESC, DoanhThuGop DESC, sp.TenSanPham`),
      rqKho().query(`WITH Giu AS (
        SELECT ct.MaBienThe, SUM(ct.SoLuong) AS DaGiu
        FROM dbo.CTDonHang ct JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon
        WHERE dh.TrangThai IN (${giu}) GROUP BY ct.MaBienThe
      ), Ton AS (
        SELECT bt.MaBienThe, bt.SKU, sp.TenSanPham, bt.MauSac, bt.ChatLieu, bt.KichThuoc,
          ISNULL(t.SoLuongTon,0) AS SoLuongTon, ISNULL(g.DaGiu,0) AS DaGiu,
          ISNULL(t.MucCanhBao,5) AS MucCanhBao,
          CASE WHEN ISNULL(t.SoLuongTon,0)-ISNULL(g.DaGiu,0)>0 THEN ISNULL(t.SoLuongTon,0)-ISNULL(g.DaGiu,0) ELSE 0 END AS KhaDung,
          (SELECT TOP 1 a.DuongDan FROM dbo.AnhSanPham a WHERE a.MaSanPham=sp.MaSanPham ORDER BY a.LaAnhDaiDien DESC,a.MaAnh) AS DuongDanAnh
        FROM dbo.BienTheSanPham bt JOIN dbo.SanPham sp ON sp.MaSanPham=bt.MaSanPham
        LEFT JOIN dbo.TonKho t ON t.MaBienThe=bt.MaBienThe LEFT JOIN Giu g ON g.MaBienThe=bt.MaBienThe
        WHERE bt.TrangThai=N'Đang bán' AND sp.TrangThai=N'Đang bán'
      )
      SELECT TOP (8) *, CASE WHEN KhaDung=0 THEN N'Hết hàng' ELSE N'Sắp hết' END AS TinhTrang,
        (SELECT COUNT(*) FROM Ton WHERE KhaDung<=MucCanhBao) AS TongCanhBao,
        (SELECT COUNT(*) FROM Ton WHERE KhaDung=0) AS TongHet,
        (SELECT COUNT(*) FROM Ton WHERE KhaDung>0 AND KhaDung<=MucCanhBao) AS TongSapHet
      FROM Ton WHERE KhaDung<=MucCanhBao ORDER BY KhaDung ASC, SKU ASC`)
    ]);
    const alerts = canhBao.recordset;
    const totals = alerts.length
      ? { TongCanhBao: alerts[0].TongCanhBao, TongHet: alerts[0].TongHet, TongSapHet: alerts[0].TongSapHet }
      : { TongCanhBao: 0, TongHet: 0, TongSapHet: 0 };
    res.json({ success: true, data: {
      tuNgay, denNgay, nhomTheo, tongQuan: { ...kpi.recordset[0], TongCanhBao: totals.TongCanhBao, TongHet: totals.TongHet, TongSapHet: totals.TongSapHet },
      donTheoNgay: donTheoNgay.recordset, doanhThuTheoNgay: doanhThuTheoNgay.recordset,
      danhMuc: danhMuc.recordset, topSanPham: top.recordset, canhBaoTon: alerts.map(({TongCanhBao,TongHet,TongSapHet,...item})=>item)
    }});
  } catch (error) {
    console.error('Lỗi thống kê báo cáo:', error);
    res.status(500).json({ success: false, message: 'Không thể tải dữ liệu báo cáo. Vui lòng kiểm tra cấu trúc DB và nhật ký Backend.' });
  }
}
module.exports = { thongKeBaoCao };
