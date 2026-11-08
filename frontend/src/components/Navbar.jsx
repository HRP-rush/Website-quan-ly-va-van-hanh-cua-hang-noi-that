import { Link, useLocation, useNavigate } from "react-router-dom";

const menus = [
  { label: "Trang chủ", href: "/#home", section: "home" },
  { label: "Sản phẩm", href: "/san-pham" },
  { label: "Phòng khách", category: "Phòng khách" },
  { label: "Phòng ngủ", category: "Phòng ngủ" },
  { label: "Phòng ăn", category: "Phòng ăn" },
  { label: "Bộ sưu tập", href: "/#inspiration", section: "inspiration" },
  { label: "Về chúng tôi", href: "/#story", section: "story" }
];

export default function Navbar({ mobileOpen, closeMobile, onCategoryChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  function scrollToSection(section) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById(section)?.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function openSection(event, section) {
    event.preventDefault();
    closeMobile?.();
    navigate(`/#${section}`);
    scrollToSection(section);
  }

  function selectCategory(category) {
    closeMobile?.();
    if (["/", "/san-pham"].includes(location.pathname) && typeof onCategoryChange === "function") {
      onCategoryChange(category);
    } else {
      navigate(`/san-pham?danh-muc=${encodeURIComponent(category)}`);
    }
  }

  return (
    <nav className={`navbar ${mobileOpen ? "navbar-open" : ""}`}>
      <div className="container navbar-inner">
        <div className="navbar-links">
          {menus.map((item) => item.category ? (
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
              to={item.href}
              className="nav-link"
              onClick={item.section
                ? (event) => openSection(event, item.section)
                : closeMobile}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          to="/#consultation"
          className="navbar-consult"
          onClick={(event) => openSection(event, "consultation")}
        >
          Tư vấn không gian ↗
        </Link>
      </div>
    </nav>
  );
}
