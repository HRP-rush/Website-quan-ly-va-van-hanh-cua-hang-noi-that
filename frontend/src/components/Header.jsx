
import { useState } from "react";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import Navbar from "./Navbar";
import AccountMenu from "./AccountMenu";

export default function Header({ onSearch, onCategoryChange }) {
  const [keyword, setKeyword] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    onSearch(keyword.trim());

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  return (
    <header className="site-header">
      <div className="announcement">
        Miễn phí tư vấn lựa chọn nội thất phù hợp với không gian sống của bạn
      </div>

      <div className="header-main container">
        <a href="/" className="brand" aria-label="Mộc An Interior">
          <span className="brand-name">MỘC AN</span>
          <span className="brand-subtitle">INTERIOR</span>
        </a>

        <form className="header-search" onSubmit={handleSearch}>
          <Search size={18} strokeWidth={1.5} />
          <input
            type="search"
            placeholder="Tìm sản phẩm cho ngôi nhà bạn"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            aria-label="Tìm kiếm sản phẩm"
          />
          <button type="submit" aria-label="Tìm kiếm">
            <Search size={16} />
          </button>
        </form>

        <div className="header-actions">
          <AccountMenu />
          
          <a href="/gio-hang" className="header-action">
            <ShoppingBag size={19} strokeWidth={1.5} />
            <span>Giỏ hàng</span>
          </a>
        </div>


        <button
          className="mobile-menu-toggle"
          aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(!mobileOpen)}
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
