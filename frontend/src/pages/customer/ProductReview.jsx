import React, { useState } from 'react';
import axios from 'axios';

export default function ProductReview({ maSanPham, maKhachHang }) {
  const [soSao, setSoSao] = useState(5);
  const [noiDung, setNoiDung] = useState('');
  const [hinhAnh, setHinhAnh] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!noiDung.trim()) {
      alert("Vui lòng nhập nội dung đánh giá!");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/danh-gia/tao', {
        maSanPham: maSanPham || 1,
        maKhachHang: maKhachHang || 1,
        soSao,
        noiDung,
        hinhAnh
      });

      if (response.data.success) {
        alert("Gửi đánh giá sản phẩm thành công!");
        setNoiDung('');
        setHinhAnh('');
        setSoSao(5);
      } else {
        alert("Không thể gửi đánh giá. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối đến server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '30px auto', padding: '25px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>Đánh Giá Sản Phẩm & Gửi Phản Hồi</h3>
      
      <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Chọn số sao */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Chất lượng sản phẩm (Số sao):</label>
          <select 
            value={soSao} 
            onChange={(e) => setSoSao(parseInt(e.target.value))}
            style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="5">⭐⭐⭐⭐⭐ (Tuyệt vời)</option>
            <option value="4">⭐⭐⭐⭐ (Hài lòng)</option>
            <option value="3">⭐⭐⭐ (Bình thường)</option>
            <option value="2">⭐⭐ (Không hài lòng)</option>
            <option value="1">⭐ (Rất tệ)</option>
          </select>
        </div>

        {/* Nội dung đánh giá / phản hồi */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nội dung đánh giá:</label>
          <textarea 
            rows="4"
            placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm nội thất này nhé..." 
            value={noiDung}
            onChange={(e) => setNoiDung(e.target.value)}
            style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc', resize: 'vertical' }}
          />
        </div>

        {/* Đính kèm hình ảnh */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Đính kèm hình ảnh (URL hình ảnh):</label>
          <input 
            type="text" 
            placeholder="Dán đường dẫn hình ảnh thực tế..." 
            value={hinhAnh}
            onChange={(e) => setHinhAnh(e.target.value)}
            style={{ padding: '8px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        {/* Nút gửi */}
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '12px', background: loading ? '#ccc' : '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? "Đang gửi..." : "Gửi Đánh Giá"}
        </button>
      </form>
    </div>
  );
}