import React, { useState } from 'react';

export default function SalesReport() {
  const [timeRange, setTimeRange] = useState('thang');

  // Dữ liệu mẫu thống kê
  const reportData = {
    tongDoanhThu: 125000000,
    tongLoiNhuan: 45000000,
    donHangThanhCong: 32,
    sanPhamBanChay: [
      { id: 1, tenSanPham: "Sofa gỗ sồi cao cấp", soLuong: 15, doanhThu: 52500000 },
      { id: 2, tenSanPham: "Bàn ăn thông minh mặt đá", soLuong: 10, doanhThu: 35000000 },
      { id: 3, tenSanPham: "Tủ quần áo cánh kính", soLuong: 7, doanhThu: 37500000 }
    ]
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '25px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Báo Cáo Doanh Thu & Thống Kê - Mộc An Interior</h2>

      {/* Bộ lọc thời gian */}
      <div style={{ marginBottom: '25px', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold' }}>Xem thống kê theo:</label>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="ngay">Hôm nay</option>
          <option value="thang">Tháng này</option>
          <option value="nam">Năm nay</option>
        </select>
      </div>

      {/* Thẻ tổng quan (Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '6px', borderLeft: '5px solid #28a745' }}>
          <p style={{ margin: '0 0 8px 0', color: '#555' }}>Tổng Doanh Thu</p>
          <h3 style={{ margin: 0, color: '#28a745' }}>{reportData.tongDoanhThu.toLocaleString('vi-VN')} VNĐ</h3>
        </div>
        <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '6px', borderLeft: '5px solid #007bff' }}>
          <p style={{ margin: '0 0 8px 0', color: '#555' }}>Tổng Lợi Nhuận</p>
          <h3 style={{ margin: 0, color: '#007bff' }}>{reportData.tongLoiNhuan.toLocaleString('vi-VN')} VNĐ</h3>
        </div>
        <div style={{ padding: '20px', background: '#fff3e0', borderRadius: '6px', borderLeft: '5px solid #ff9800' }}>
          <p style={{ margin: '0 0 8px 0', color: '#555' }}>Đơn Hàng Thành Công</p>
          <h3 style={{ margin: 0, color: '#e65100' }}>{reportData.donHangThanhCong} đơn</h3>
        </div>
      </div>

      {/* Bảng sản phẩm bán chạy */}
      <h3 style={{ marginBottom: '15px', color: '#333' }}>Top Sản Phẩm Bán Chạy</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f2f2f2' }}>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>STT</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Tên sản phẩm nội thất</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Số lượng bán</th>
            <th style={{ border: '1px solid #ddd', padding: '10px' }}>Doanh thu</th>
          </tr>
        </thead>
        <tbody>
          {reportData.sanPhamBanChay.map((sp, index) => (
            <tr key={sp.id}>
              <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{index + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px' }}>{sp.tenSanPham}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{sp.soLuong}</td>
              <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'right' }}>{sp.doanhThu.toLocaleString('vi-VN')} VNĐ</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}