
export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="/" className="footer-logo">
              MỘC AN
            </a>

            <p>
              Nội thất tinh giản. Giá trị bền lâu.
              Đồng hành cùng bạn tạo nên một tổ ấm
              mang dấu ấn riêng.
            </p>

            <div className="footer-social">
              <span>Instagram</span>
              <span>/</span>
              <span>Facebook</span>
              <span>/</span>
              <span>Pinterest</span>
            </div>
          </div>

          <div className="footer-column">
            <h4>Khám phá</h4>
            <a href="#categories">Phòng khách</a>
            <a href="#categories">Phòng ngủ</a>
            <a href="#categories">Phòng ăn</a>
            <a href="#products">Bộ sưu tập</a>
          </div>

          <div className="footer-column">
            <h4>Hỗ trợ khách hàng</h4>
            <a href="#consultation">Hướng dẫn mua hàng</a>
            <a href="#consultation">Giao hàng & lắp đặt</a>
            <a href="#consultation">Chính sách bảo hành</a>
            <a href="#consultation">Đổi trả & hoàn tiền</a>
          </div>

          <div className="footer-column">
            <h4>Kết nối với Mộc An</h4>
            <p>Hotline: [Số điện thoại cửa hàng]</p>
            <p>Email: [Email cửa hàng]</p>
            <p>Thứ 2 – Chủ nhật: 09:00 – 18:00</p>
            <p>[Địa chỉ cửa hàng]</p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 MỘC AN INTERIOR</span>

          <div>
            <span>Bảo mật</span>
            <span className="footer-separator">•</span>
            <span>Điều khoản sử dụng</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
