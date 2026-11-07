const footerGroups = [
  {
    title: "Khám phá",
    links: ["Phòng khách", "Phòng ngủ", "Phòng ăn", "Bộ sưu tập"],
  },
  {
    title: "Hỗ trợ khách hàng",
    links: [
      "Hướng dẫn mua hàng",
      "Giao hàng & lắp đặt",
      "Chính sách bảo hành",
      "Đổi trả & hoàn tiền",
    ],
  },
  {
    title: "Kết nối với Mộc An",
    links: ["1900 6868", "hello@mocan.vn", "Thứ 2 - Thứ 7: 9:00 - 18:00", "28 Nguyễn Cơ Thạch, TP.HCM"],
  },
];

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <a className="brand brand-light" href="#home">
            <span>MỘC AN</span>
            <small>INTERIOR</small>
          </a>
          <p>
            Nội thất tinh giản, giữ gìn bản sắc. Đồng hành cùng bạn tạo nên một
            tổ ấm mang dấu ấn riêng.
          </p>
          <div className="social-links">
            <a href="#instagram">Instagram</a>
            <span>/</span>
            <a href="#facebook">Facebook</a>
            <span>/</span>
            <a href="#pinterest">Pinterest</a>
          </div>
        </div>
        {footerGroups.map((group) => (
          <div className="footer-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.links.map((link) => (
              <a href={`#${link}`} key={link}>{link}</a>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-bottom">
        <span>© 2026 MỘC AN INTERIOR</span>
        <div>
          <a href="#privacy">Bảo mật</a>
          <span>·</span>
          <a href="#terms">Điều khoản sử dụng</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
