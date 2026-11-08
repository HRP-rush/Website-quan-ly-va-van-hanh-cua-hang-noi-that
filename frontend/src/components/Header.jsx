import Icon from "./Icons.jsx";

const categories = [
  "Phòng khách",
  "Phòng ngủ",
  "Phòng ăn",
  "Bộ sưu tập",
  "Về chúng tôi",
];

function Header({ itemCount, variant = "store" }) {
  if (variant === "checkout") {
    return (
      <header className="site-header checkout-header">
        <div className="header-main">
          <a className="brand" href="#home" aria-label="Mộc An - Trang chủ">
            <span>MỘC AN</span>
            <small>INTERIOR</small>
          </a>
          <div className="checkout-header-actions">
            <Icon name="shield" size={13} />
            <span>Thanh toán an tâm · Hỗ trợ 1900 6868</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="site-header">
      <div className="announcement">
        Miễn phí vận chuyển cho nội thất phù hợp với không gian của bạn
      </div>
      <div className="header-main">
        <a className="brand" href="#home" aria-label="Mộc An - Trang chủ">
          <span>MỘC AN</span>
          <small>INTERIOR</small>
        </a>
        <label className="search-field">
          <Icon name="search" size={16} />
          <input
            type="search"
            aria-label="Tìm sản phẩm"
            placeholder="Tìm sản phẩm cho ngôi nhà bạn"
          />
        </label>
        <div className="header-actions">
          <a href="#account">
            <Icon name="user" />
            <span>Tài khoản</span>
          </a>
          <a href="#cart" aria-current="page">
            <Icon name="bag" />
            <span>Giỏ hàng ({itemCount})</span>
          </a>
        </div>
      </div>
      <nav className="main-nav" aria-label="Danh mục chính">
        <a href="#home">Trang chủ</a>
        <a href="#products">Sản phẩm</a>
        {categories.map((category) => (
          <a href={`#${category}`} key={category}>
            {category}
          </a>
        ))}
        <a className="nav-help" href="#help">
          Tư vấn không gian <span aria-hidden="true">↗</span>
        </a>
      </nav>
    </header>
  );
}

export default Header;
