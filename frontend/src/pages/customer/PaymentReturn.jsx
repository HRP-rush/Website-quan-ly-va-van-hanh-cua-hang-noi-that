import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function PaymentReturn() {
  const [status, setStatus] = useState('Đang xử lý kết quả giao dịch...');
  const [success, setSuccess] = useState(false);
  const [orderInfo, setOrderInfo] = useState({
    maDonHang: '',
    soTien: '',
    maGiaoDich: ''
  });
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    
    // Lấy các tham số trả về từ VNPay / Cổng thanh toán
    const vnp_ResponseCode = queryParams.get('vnp_ResponseCode');
    const vnp_TxnRef = queryParams.get('vnp_TxnRef');
    const vnp_Amount = queryParams.get('vnp_Amount');
    const vnp_TransactionNo = queryParams.get('vnp_TransactionNo');

    // Cập nhật thông tin đơn hàng nếu có
    if (vnp_TxnRef) {
      setOrderInfo({
        maDonHang: vnp_TxnRef,
        soTien: vnp_Amount ? (parseInt(vnp_Amount) / 100).toLocaleString('vi-VN') : 'N/A',
        maGiaoDich: vnp_TransactionNo || 'N/A'
      });
    }

    // Kiểm tra mã phản hồi của VNPay ('00' là thành công)
    if (vnp_ResponseCode === '00') {
      setSuccess(true);
      setStatus('Giao dịch thanh toán trực tuyến thành công!');
    } else if (vnp_ResponseCode) {
      setSuccess(false);
      setStatus(`Giao dịch thất bại hoặc đã bị hủy. (Mã lỗi: ${vnp_ResponseCode})`);
    } else {
      // Trường hợp không có mã lỗi từ URL (hoặc test trực tiếp)
      setSuccess(true);
      setStatus('Xác nhận thông tin giao dịch hoàn tất.');
    }
  }, [location]);

  return (
    <div style={{ 
      maxWidth: '550px', 
      margin: '60px auto', 
      padding: '35px', 
      textAlign: 'center', 
      border: '1px solid #ddd', 
      borderRadius: '10px', 
      background: '#fff',
      boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
    }}>
      <h2 style={{ color: success ? '#28a745' : '#d9534f', marginBottom: '20px' }}>
        {success ? "Thanh Toán Thành Công" : "Thanh Toán Thất Bại"}
      </h2>
      
      <p style={{ fontSize: '16px', color: '#555', marginBottom: '25px' }}>
        {status}
      </p>

      {/* Hiển thị chi tiết đơn hàng nếu có */}
      {orderInfo.maDonHang && (
        <div style={{ 
          textAlign: 'left', 
          background: '#f9f9f9', 
          padding: '15px 20px', 
          borderRadius: '6px', 
          marginBottom: '25px',
          border: '1px solid #eee'
        }}>
          <p style={{ margin: '8px 0' }}><strong>Mã đơn hàng:</strong> {orderInfo.maDonHang}</p>
          <p style={{ margin: '8px 0' }}><strong>Mã giao dịch:</strong> {orderInfo.maGiaoDich}</p>
          <p style={{ margin: '8px 0' }}><strong>Số tiền:</strong> <span style={{ color: '#d9534f', fontWeight: 'bold' }}>{orderInfo.soTien} VNĐ</span></p>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button 
          onClick={() => navigate('/')}
          style={{ 
            padding: '12px 25px', 
            background: '#007bff', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '6px', 
            fontSize: '15px', 
            fontWeight: 'bold',
            cursor: 'pointer' 
          }}
        >
          Về Trang Chủ
        </button>
      </div>
    </div>
  );
}