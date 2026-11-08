import React from 'react';

export default function Invoice({ orderData }) {
  const handlePrint = () => {
    window.print(); // Kích hoạt tính năng in ấn của trình duyệt
  };

  const defaultOrder = orderData || {
    maDonHang: "DH1730000000",
    ngayTao: "2026-11-08",
    tenKhachHang: "Nguyễn Văn A",
    diaChi: "127 Nguyễn Văn Đạo, TP.HCM",
    sdt: "0909123456",
    tongTien: 5500000,
    phuongThuc: "COD"
  };

  return (
    <div style={{ maxWidth: '700px', margin: '30px auto', padding: '40px', background: '#fff', border: '1px solid #eee', fontFamily: 'Times New Roman, serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2>MỘC AN INTERIOR</h2>
        <p>Hệ thống Quản lý và Vận hành Nội thất</p>
        <h3>HÓA ĐƠN BÁN HÀNG</h3>
        <p>Mã đơn: <strong>{defaultOrder.maDonHang}</strong> - Ngày: {defaultOrder.ngayTao}</p>
      </div>

      <div style={{ marginBottom: '20px', lineHeight: '1.6' }}>
        <p><strong>Khách hàng:</strong> {defaultOrder.tenKhachHang}</p>
        <p><strong>Số điện thoại:</strong> {defaultOrder.sdt}</p>
        <p><strong>Địa chỉ giao:</strong> {defaultOrder.diaChi}</p>
        <p><strong>Phương thức thanh toán:</strong> {defaultOrder.phuongThuc}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#f2f2f2' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>STT</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Tên sản phẩm</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>SL</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>1</td>
            <td style={{ border: '1px solid #ddd', padding: '8px' }}>Ghế sofa gỗ sồi cao cấp</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>1</td>
            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{defaultOrder.tongTien.toLocaleString('vi-VN')} VNĐ</td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: 'right', fontSize: '18px', marginBottom: '30px' }}>
        <p><strong>Tổng cộng: <span style={{ color: '#d9534f' }}>{defaultOrder.tongTien.toLocaleString('vi-VN')} VNĐ</span></strong></p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={handlePrint}
          style={{ padding: '10px 25px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer' }}
        >
          In Hóa Đơn / Xuất PDF
        </button>
      </div>
    </div>
  );
}

