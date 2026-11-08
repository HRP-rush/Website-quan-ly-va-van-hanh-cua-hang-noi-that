import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // State thông tin giao hàng và đơn hàng
  const [donHangData, setDonHangData] = useState({
    maKhachHang: 1,
    tongTien: 5500000,
    thongTinGiaoHang: {
      diaChi: "127 Nguyễn Văn Đạo, TP.HCM",
      sdt: "0909123456"
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDonHangData(prev => ({
      ...prev,
      thongTinGiaoHang: {
        ...prev.thongTinGiaoHang,
        [name]: value
      }
    }));
  };

  const handlePaymentSubmit = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/don-hang/tao-don-hang', {
        ...donHangData,
        phuongThucThanhToan: paymentMethod // 'COD', 'VNPay' hoặc 'MoMo'
      });

      if (response.data.success) {
        if (paymentMethod === 'COD') {
          alert(`Đặt hàng thành công! Mã đơn hàng của bạn là: ${response.data.maDonHang}`);
          navigate('/');
        } else if ((paymentMethod === 'VNPay' || paymentMethod === 'MoMo') && response.data.paymentUrl) {
          // Chuyển hướng sang cổng thanh toán trực tuyến tương ứng
          window.location.href = response.data.paymentUrl;
        }
      } else {
        alert("Không thể tạo đơn hàng!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối đến server khi đặt hàng!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '40px auto', padding: '30px', border: '1px solid #ddd', borderRadius: '10px', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '25px', color: '#333' }}>Thanh Toán Đơn Hàng - Mộc An Interior</h2>
      
      {/* Thông tin tổng tiền */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '6px', borderLeft: '4px solid #28a745' }}>
        <p style={{ margin: '5px 0' }}><strong>Tổng thanh toán:</strong> <span style={{ color: '#d9534f', fontSize: '18px' }}>{donHangData.tongTien.toLocaleString('vi-VN')} VNĐ</span></p>
      </div>

      {/* Form thông tin giao hàng */}
      <div style={{ marginBottom: '20px' }}>
        <h4>Thông tin giao hàng:</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <input 
            type="text" 
            name="diaChi" 
            placeholder="Địa chỉ giao hàng chi tiết" 
            value={donHangData.thongTinGiaoHang.diaChi} 
            onChange={handleInputChange}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            type="text" 
            name="sdt" 
            placeholder="Số điện thoại liên hệ" 
            value={donHangData.thongTinGiaoHang.sdt} 
            onChange={handleInputChange}
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </div>

      {/* Danh sách phương thức thanh toán */}
      <h4>Chọn phương thức thanh toán:</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '15px 0', padding: '15px', border: '1px solid #eee', borderRadius: '6px' }}>
        
        {/* 1. Thanh toán khi nhận hàng (COD) */}
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="radio" 
            name="payment" 
            value="COD" 
            checked={paymentMethod === 'COD'} 
            onChange={(e) => setPaymentMethod(e.target.value)} 
          />
          <span>Thanh toán khi nhận hàng (COD)</span>
        </label>
        
        {/* 2. Cổng VNPay */}
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="radio" 
            name="payment" 
            value="VNPay" 
            checked={paymentMethod === 'VNPay'} 
            onChange={(e) => setPaymentMethod(e.target.value)} 
          />
          <span>Thanh toán trực tuyến qua cổng VNPay (ATM / QR Code)</span>
        </label>

        {/* 3. Ví điện tử MoMo */}
        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="radio" 
            name="payment" 
            value="MoMo" 
            checked={paymentMethod === 'MoMo'} 
            onChange={(e) => setPaymentMethod(e.target.value)} 
          />
          <span>Ví điện tử MoMo (Quét mã QR / Ứng dụng MoMo)</span>
        </label>
      </div>

      {/* Nút xác nhận */}
      <button 
        onClick={handlePaymentSubmit} 
        disabled={loading}
        style={{ width: '100%', padding: '14px', background: loading ? '#ccc' : '#28a745', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? "Đang xử lý đơn hàng..." : "Xác Nhận Đặt Hàng Ngay"}
      </button>
    </div>
  );
}