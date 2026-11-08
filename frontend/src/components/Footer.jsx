
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              MỘC AN
            </Link>

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
            <Link to="/?danhMuc=Ph%C3%B2ng%20kh%C3%A1ch#products">Phòng khách</Link>
            <Link to="/?danhMuc=Ph%C3%B2ng%20ng%E1%BB%A7#products">Phòng ngủ</Link>
            <Link to="/?danhMuc=Ph%C3%B2ng%20%C4%83n#products">Phòng ăn</Link>
            <Link to="/#inspiration">Bộ sưu tập</Link>
          </div>

          <div className="footer-column">
            <h4>Hỗ trợ khách hàng</h4>
            <Link to="/#consultation">Hướng dẫn mua hàng</Link>
            <Link to="/#consultation">Giao hàng & lắp đặt</Link>
            <Link to="/#consultation">Chính sách bảo hành</Link>
            <Link to="/#consultation">Đổi trả & hoàn tiền</Link>
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
