import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ManageReviews() {
  const [reviews, setReviews] = useState([]);
  const [filterStar, setFilterStar] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [replyText, setReplyText] = useState({});

  useEffect(() => {
    // Dữ liệu mẫu minh họa
    setReviews([
      { id: 1, tenKhachHang: "Nguyễn Văn A", tenSanPham: "Sofa gỗ sồi cao cấp", soSao: 5, noiDung: "Sản phẩm rất đẹp và chắc chắn!", trangThai: "DaDuyet", phuiHoiAdmin: "", ngayTao: "2026-11-01" },
      { id: 2, tenKhachHang: "Trần Thị B", tenSanPham: "Bàn ăn thông minh", soSao: 3, noiDung: "Giao hàng hơi chậm một chút.", trangThai: "ChoDuyet", phuiHoiAdmin: "", ngayTao: "2026-11-05" },
      { id: 3, tenKhachHang: "Lê Văn C", tenSanPham: "Tủ quần áo cánh kính", soSao: 4, noiDung: "Tủ đẹp, đóng gói cẩn thận.", trangThai: "DaDuyet", phuiHoiAdmin: "", ngayTao: "2026-11-07" }
    ]);
  }, []);

  const handleApprove = (id) => {
    setReviews(reviews.map(item => item.id === id ? { ...item, trangThai: "DaDuyet" } : item));
    alert("Đã duyệt phản hồi hiển thị thành công!");
  };

  const handleReplySubmit = (id) => {
    const text = replyText[id];
    if (!text) return alert("Vui lòng nhập nội dung trả lời!");
    
    setReviews(reviews.map(item => item.id === id ? { ...item, phuiHoiAdmin: text } : item));
    alert("Đã gửi phản hồi thành công đến khách hàng!");
    setReplyText({ ...replyText, [id]: '' });
  };

  // Logic lọc kết hợp (Số sao & Thời gian)
  const filteredReviews = reviews.filter(item => {
    const matchStar = filterStar === 'all' || item.soSao === parseInt(filterStar);
    
    const reviewDate = new Date(item.ngayTao);
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;

    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);

    const matchFrom = !start || reviewDate >= start;
    const matchTo = !end || reviewDate <= end;

    return matchStar && matchFrom && matchTo;
  });

  return (
    <div style={{ maxWidth: '900px', margin: '30px auto', padding: '25px', background: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>Quản Lý Phản Hồi & Đánh Giá Khách Hàng</h2>

      {/* Thanh bộ lọc */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef', display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
        <div>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Số sao:</label>
          <select 
            value={filterStar} 
            onChange={(e) => setFilterStar(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="all">Tất cả số sao</option>
            <option value="5">5 Sao ⭐⭐⭐⭐⭐</option>
            <option value="4">4 Sao ⭐⭐⭐⭐</option>
            <option value="3">3 Sao ⭐⭐⭐</option>
            <option value="2">2 Sao ⭐⭐</option>
            <option value="1">1 Sao ⭐</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Từ ngày:</label>
          <input 
            type="date" 
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '7px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 'bold', marginRight: '8px' }}>Đến ngày:</label>
          <input 
            type="date" 
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '7px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        {(filterStar !== 'all' || fromDate || toDate) && (
          <button 
            onClick={() => { setFilterStar('all'); setFromDate(''); setToDate(''); }}
            style={{ padding: '8px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Danh sách phản hồi */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredReviews.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#777', padding: '20px' }}>Không tìm thấy phản hồi nào phù hợp với bộ lọc.</p>
        ) : (
          filteredReviews.map((review) => (
            <div key={review.id} style={{ padding: '15px', border: '1px solid #eee', borderRadius: '6px', background: '#fdfdfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span><strong>Khách hàng:</strong> {review.tenKhachHang} | <strong>Sản phẩm:</strong> {review.tenSanPham}</span>
                <span style={{ color: '#888', fontSize: '14px' }}>Ngày: {review.ngayTao}</span>
              </div>
              <p style={{ margin: '5px 0' }}><strong>Đánh giá:</strong> {'⭐'.repeat(review.soSao)} ({review.soSao}/5 sao)</p>
              <p style={{ margin: '8px 0', color: '#555' }}><strong>Nội dung:</strong> {review.noiDung}</p>
              <p style={{ margin: '5px 0' }}><strong>Trạng thái:</strong> <span style={{ color: review.trangThai === 'DaDuyet' ? '#28a745' : '#d9534f' }}>{review.trangThai === 'DaDuyet' ? 'Đã duyệt hiển thị' : 'Chờ duyệt'}</span></p>

              {review.phuiHoiAdmin && (
                <div style={{ marginTop: '10px', padding: '10px', background: '#f1f1f1', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '14px' }}><strong>Phản hồi từ Mộc An Interior:</strong> {review.phuiHoiAdmin}</p>
                </div>
              )}

              <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                {review.trangThai === 'ChoDuyet' && (
                  <button 
                    onClick={() => handleApprove(review.id)}
                    style={{ padding: '6px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Duyệt hiển thị
                  </button>
                )}
              </div>

              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Nhập câu trả lời/phản hồi khách hàng..." 
                  value={replyText[review.id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [review.id]: e.target.value })}
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button 
                  onClick={() => handleReplySubmit(review.id)}
                  style={{ padding: '8px 15px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Trả lời
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}