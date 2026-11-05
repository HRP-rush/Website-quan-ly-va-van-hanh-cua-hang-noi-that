
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
  function selectCategory(category) {
    onCategoryChange(category);
    closeMobile();

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth"
    });
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
              <a
                key={item.label}
                href={item.href}
                className="nav-link"
                onClick={closeMobile}
              >
                {item.label}
              </a>
            )
          )}
        </div>

        <a href="#consultation" className="navbar-consult">
          Tư vấn không gian ↗
        </a>
      </div>
    </nav>
  );
}
