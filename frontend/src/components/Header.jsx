import { useEffect, useState } from "react";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import AccountMenu from "./AccountMenu";
import { getCart } from "../services/cartService";

export default function Header({ onSearch, onCategoryChange }) {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;
    const updateCount = (event) => {
      if (typeof event.detail?.count === "number") setCartCount(event.detail.count);
    };
    window.addEventListener("mocan-cart-change", updateCount);
    getCart().then((items) => {
      if (active) setCartCount(items.reduce((sum, item) => sum + Number(item.SoLuong || 0), 0));
    }).catch(() => {
      if (active) setCartCount(0);
    });
    return () => {
      active = false;
      window.removeEventListener("mocan-cart-change", updateCount);
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    const value = keyword.trim();
    if (typeof onSearch === "function") {
      onSearch(value);
    } else {
      navigate(`/san-pham?q=${encodeURIComponent(value)}`);
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  return (
    <header className="site-header">
      <div className="announcement">
        Miễn phí tư vấn lựa chọn nội thất phù hợp với không gian sống của bạn
      </div>

      <div className="header-main container">
        <Link to="/" className="brand" aria-label="Mộc An Interior">
          <span className="brand-name">MỘC AN</span>
          <span className="brand-subtitle">INTERIOR</span>
        </Link>

        <form className="header-search" onSubmit={handleSearch}>
          <Search size={18} strokeWidth={1.5} />
          <input
            type="search"
            placeholder="Tìm sản phẩm cho ngôi nhà bạn"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Tìm kiếm sản phẩm"
          />
          <button type="submit" aria-label="Tìm kiếm"><Search size={16} /></button>
        </form>

        <div className="header-actions">
          <AccountMenu />
          <Link
            to="/gio-hang"
            className="header-action"
            aria-label={`Mở giỏ hàng, ${cartCount} sản phẩm`}
          >
            <ShoppingBag size={19} strokeWidth={1.5} />
            <span>Giỏ hàng{cartCount > 0 ? ` (${cartCount})` : ""}</span>
          </Link>
        </div>

        <button
          className="mobile-menu-toggle"
          type="button"
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <Navbar
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
        onCategoryChange={onCategoryChange}
      />
    </header>
  );
}
