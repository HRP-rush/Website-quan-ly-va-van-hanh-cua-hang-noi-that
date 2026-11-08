import React, { useState } from 'react';

export default function WarehouseReport() {
  const [inventory] = useState([
    { id: 1, tenSanPham: "Sofa gỗ sồi cao cấp", tonKho: 8, trangThai: "ConHang", danhMuc: "Phòng khách" },
    { id: 2, tenSanPham: "Bàn ăn thông minh mặt đá", tonKho: 3, trangThai: "SapHet", danhMuc: "Phòng ăn" },
    { id: 3, tenSanPham: "Tủ quần áo cánh kính", tonKho: 12, trangThai: "ConHang", danhMuc: "Phòng ngủ" },
    { id: 4, tenSanPham: "Giường ngủ bọc da cao cấp", tonKho: 2, trangThai: "SapHet", danhMuc: "Phòng ngủ" }
  ]);

  const [selectedOrderForDelivery] = useState({
    maDonHang: "DH1730009999",
    tenKhachHang: "Lê Nguyễn Anh Thư",
    diaChi: "127 Nguyễn Văn Đạo, TP.HCM",
    sdt: "0909123456",
    sanPham: "Sofa gỗ sồi cao cấp (SL: 1)"
  });

  const handlePrintDeliveryNote = () => {
    window.print(); // In phiếu giao hàng
  };

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '25px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Quản Lý Kho & Xuất Phiếu Giao Hàng</h2>

      {/* Phần 1: Báo cáo tồn kho & Cảnh báo hàng sắp hết */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={{ marginBottom: '15px', color: '#007bff' }}>Báo Cáo Tồn Kho & Cảnh Báo Hàng Sắp Hết</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f2f2f2' }}>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>STT</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Tên sản phẩm nội thất</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Danh mục</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Tồn kho</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item, index) => (
              <tr key={item.id}>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.tenSanPham}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.danhMuc}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{item.tonKho}</td>
                <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    color: '#fff', 
                    background: item.trangThai === 'ConHang' ? '#28a745' : '#d9534f',
                    fontSize: '13px'
                  }}>
                    {item.trangThai === 'ConHang' ? 'Còn hàng' : '⚠️ Sắp hết hàng'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phần 2: Xuất phiếu giao hàng */}
      <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '6px', border: '1px solid #eee' }}>
        <h3 style={{ marginBottom: '15px', color: '#28a745' }}>Xuất Phiếu Giao Hàng Cho Đơn Hàng</h3>
        <div style={{ lineHeight: '1.6', marginBottom: '20px' }}>
          <p><strong>Mã đơn hàng:</strong> {selectedOrderForDelivery.maDonHang}</p>
          <p><strong>Khách hàng nhận:</strong> {selectedOrderForDelivery.tenKhachHang}</p>
          <p><strong>Số điện thoại:</strong> {selectedOrderForDelivery.sdt}</p>
          <p><strong>Địa chỉ giao hàng:</strong> {selectedOrderForDelivery.diaChi}</p>
          <p><strong>Sản phẩm vận chuyển:</strong> {selectedOrderForDelivery.sanPham}</p>
        </div>
        <button 
          onClick={handlePrintDeliveryNote}
          style={{ padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          In Phiếu Giao Hàng / Xuất PDF
        </button>
      </div>
    </div>
  );
}