const { sql, getPool } = require('../config/db');

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
function money(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function displayDate(s) { return s.split('-').reverse().join('/'); }

async function xuatDoanhThuExcel(req, res) {
  const tuNgay = String(req.query.tuNgay || '');
  const denNgay = String(req.query.denNgay || '');
  const ky = String(req.query.ky || 'ngay');
  if (!validDate(tuNgay) || !validDate(denNgay) || !['ngay', 'tuan', 'thang', 'quy', 'nam'].includes(ky)) {
    return res.status(400).json({ success: false, message: 'Kỳ xuất báo cáo không hợp lệ.' });
  }
  const start = new Date(`${tuNgay}T00:00:00Z`), end = new Date(`${denNgay}T00:00:00Z`);
  if (start > end || (end - start) / 86400000 > 366) {
    return res.status(400).json({ success: false, message: 'Khoảng xuất báo cáo không được vượt quá 367 ngày.' });
  }
  try {
    const ExcelJS = require('exceljs');
    const pool = await getPool();
    const rows = (await pool.request()
      .input('tuNgay', sql.Date, tuNgay)
      .input('denNgay', sql.Date, denNgay)
      .query(`
        SELECT dh.MaDon, dh.TienHang, dh.GiamGia, ct.MaCTDon,
          ct.SKUSnapshot AS MaHang, ct.TenSanPhamSnapshot AS TenSanPham,
          ct.CauHinhSnapshot AS MoTa, ct.GiaBanSnapshot AS Gia,
          ct.SoLuong, ct.ThanhTien AS ThanhTien
        FROM dbo.DonHang dh
        OUTER APPLY (
          SELECT MAX(ls.ThoiDiem) AS NgayHoanThanh
          FROM dbo.LichSuTrangThaiDon ls
          WHERE ls.MaDon = dh.MaDon AND ls.TrangThaiMoi = N'Hoàn tất'
        ) ht
        INNER JOIN dbo.CTDonHang ct ON ct.MaDon = dh.MaDon
        WHERE dh.TrangThai = N'Hoàn tất'
          AND COALESCE(ht.NgayHoanThanh, dh.NgayDat) >= @tuNgay
          AND COALESCE(ht.NgayHoanThanh, dh.NgayDat) < DATEADD(DAY, 1, @denNgay)
        ORDER BY dh.MaDon, ct.MaCTDon
      `)).recordset;
    if (rows.length > 30000) {
      return res.status(413).json({ success: false, message: 'Báo cáo quá lớn (trên 30.000 dòng). Hãy chọn kỳ nhỏ hơn.' });
    }

    // Chia giảm giá đơn theo tỷ trọng dòng; phần làm tròn dồn vào dòng cuối mỗi đơn.
    const groups = new Map();
    for (const row of rows) {
      const key = String(row.MaDon);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    const details = [];
    for (const parts of groups.values()) {
      const order = parts[0];
      const totalDiscount = Math.max(0, money(order.GiamGia));
      const base = Number(order.TienHang) || parts.reduce((s, x) => s + Number(x.ThanhTien), 0);
      let assigned = 0;
      parts.forEach((part, i) => {
        const amount = money(part.ThanhTien);
        const discount = i === parts.length - 1 ? money(totalDiscount - assigned)
          : money(base > 0 ? totalDiscount * amount / base : 0);
        assigned = money(assigned + discount);
        details.push({ ...part, amount, discount, net: money(amount - discount) });
      });
    }
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MỘC AN INTERIOR';
    workbook.created = new Date();
    workbook.calcProperties.fullCalcOnLoad = true;
    const ws = workbook.addWorksheet('Doanh thu', { views: [{ state: 'frozen', ySplit: 8 }] });
    ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    ws.columns = [
      { key: 'sku', width: 24 }, { key: 'name', width: 29 }, { key: 'desc', width: 35 },
      { key: 'price', width: 18 }, { key: 'qty', width: 13 }, { key: 'amount', width: 20 },
      { key: 'rate', width: 14 }, { key: 'discount', width: 20 }, { key: 'net', width: 22 }
    ];
    ws.mergeCells('A1:I2');
    ws.getCell('A1').value = 'BÁO CÁO DOANH THU';
    ws.getCell('A1').font = { name: 'Cambria', size: 21, bold: true, color: { argb: 'FF30362F' } };
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(1).height = 25; ws.getRow(2).height = 22;
    ws.mergeCells('A3:I3');
    ws.getCell('A3').value = `Kỳ báo cáo: ${displayDate(tuNgay)} – ${displayDate(denNgay)}  |  Chỉ tính đơn hoàn tất; không gồm phí giao hàng`;
    ws.getCell('A3').font = { italic: true, color: { argb: 'FF81796F' }, size: 10 };
    ws.getCell('A5').value = 'Người xuất báo cáo';
    ws.getCell('B5').value = req.user?.HoTen || 'Quản lý';
    ws.getCell('D5').value = 'Ngày xuất';
    ws.getCell('E5').value = new Date();
    ws.getCell('E5').numFmt = 'dd/mm/yyyy hh:mm';
    ws.mergeCells('G5:H5'); ws.getCell('G5').value = 'TỔNG DOANH THU';
    ws.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF30362F' } };
    ws.getCell('G5').font = { color: { argb: 'FFFFFFFF' }, bold: true };
    ws.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };
    const finalRow = 8 + details.length;
    ws.getCell('I5').value = { formula: details.length ? `SUM(I9:I${finalRow})` : '0', result: money(details.reduce((s, row) => s + row.net, 0)) };
    ws.getCell('I5').font = { bold: true, size: 15, color: { argb: 'FF30362F' } };
    ws.getCell('I5').numFmt = '#,##0 "₫"';
    ws.getRow(5).height = 30;
    ws.mergeCells('A7:I7');
    ws.getCell('A7').value = 'Chi tiết sản phẩm bán ra theo các đơn đã hoàn tất';
    ws.getCell('A7').font = { italic: true, color: { argb: 'FF977756' } };
    const headers = ['Mã hàng / SKU','Tên sản phẩm','Mô tả sản phẩm','Giá','Số lượng','Tổng','Giảm giá (%)','Tổng giảm','Thực thu'];
    const header = ws.getRow(8); header.values = headers; header.height = 27;
    for (let c = 1; c <= 9; c++) {
      const cell = header.getCell(c);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF88705B' } };
      cell.alignment = { vertical: 'middle', wrapText: true };
    }
    for (let i = 0; i < details.length; i++) {
      const d = details[i], rowIndex = 9 + i;
      const r = ws.getRow(rowIndex);
      r.values = [d.MaHang, d.TenSanPham, d.MoTa, money(d.Gia), Number(d.SoLuong),
        { formula: `D${rowIndex}*E${rowIndex}`, result: d.amount },
        { formula: `IFERROR(H${rowIndex}/F${rowIndex},0)`, result: d.amount ? d.discount / d.amount : 0 },
        d.discount, { formula: `F${rowIndex}-H${rowIndex}`, result: d.net }];
      r.height = 23;
      for (let c = 1; c <= 9; c++) {
        const cell = r.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 ? 'FFF5F1EC' : 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle' };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE4D8CC' } } };
      }
      for (const c of [4,6,8,9]) r.getCell(c).numFmt = '#,##0 "₫"';
      r.getCell(7).numFmt = '0.00%';
      r.getCell(5).alignment = { horizontal: 'center' };
    }
    const sumRow = 9 + details.length;
    ws.mergeCells(`A${sumRow}:D${sumRow}`);
    ws.getCell(`A${sumRow}`).value = 'TỔNG CỘNG';
    ws.getCell(`E${sumRow}`).value = { formula: details.length ? `SUM(E9:E${finalRow})` : '0', result: details.reduce((s, d) => s + Number(d.SoLuong), 0) };
    for (const [col, field] of [['F','amount'], ['H','discount'], ['I','net']]) {
      ws.getCell(`${col}${sumRow}`).value = { formula: details.length ? `SUM(${col}9:${col}${finalRow})` : '0', result: money(details.reduce((s, d) => s + d[field], 0)) };
      ws.getCell(`${col}${sumRow}`).numFmt = '#,##0 "₫"';
    }
    for (let c = 1; c <= 9; c++) {
      const cell = ws.getRow(sumRow).getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECE5DB' } };
      cell.font = { bold: true, color: { argb: 'FF30362F' } };
    }
    ws.getRow(sumRow).height = 28;
    ws.autoFilter = { from: 'A8', to: `I${Math.max(8, finalRow)}` };
    const filename = `Bao-cao-doanh-thu_${ky}_${tuNgay}_${denNgay}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Lỗi xuất báo cáo doanh thu:', err);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'Không thể xuất báo cáo Excel. Kiểm tra thư viện exceljs và cấu trúc SQL Server.' });
    else res.destroy(err);
  }
}
module.exports = { xuatDoanhThuExcel };
