
import { Link, useLocation, useNavigate } from "react-router-dom";

const menus = [
  { label: "Trang chủ", href: "#home" },
  { label: "Sản phẩm", href: "#products" },
  { label: "Phòng khách", category: "Phòng khách" },
  { label: "Phòng ngủ", category: "Phòng ngủ" },
  { label: "Phòng ăn", category: "Phòng ăn" },
  { label: "Bộ sưu tập", href: "#inspiration" },
  { label: "Về chúng tôi", href: "#story" }
];

export default function Navbar({
  mobileOpen,
  closeMobile,
  onCategoryChange
}) {
  const navigate = useNavigate();
  const location = useLocation();

  function scrollToSection(section) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function selectSection(event, href) {
    event.preventDefault();
    closeMobile?.();
    const section = href.slice(1);
    navigate(`/${href}`);
    scrollToSection(section);
  }

  function selectCategory(category) {
    closeMobile?.();
    if (location.pathname === "/" && typeof onCategoryChange === "function") {
      onCategoryChange(category);
    } else {
      navigate(`/?danhMuc=${encodeURIComponent(category)}#products`);
    }
    scrollToSection("products");
  }

  return (
    <nav className={`navbar ${mobileOpen ? "navbar-open" : ""}`}>
      <div className="container navbar-inner">
        <div className="navbar-links">
          {menus.map((item) =>
            item.category ? (
              <button
                key={item.label}
                type="button"
                className="nav-link"
                onClick={() => selectCategory(item.category)}
              >
                {item.label}
              </button>
            ) : (
              <Link
                key={item.label}
                to={`/${item.href}`}
                className="nav-link"
                onClick={(event) => selectSection(event, item.href)}
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        <Link to="/#consultation" className="navbar-consult" onClick={(event) => selectSection(event, "#consultation")}>
          Tư vấn không gian ↗
        </Link>
      </div>
    </nav>
  );
}
