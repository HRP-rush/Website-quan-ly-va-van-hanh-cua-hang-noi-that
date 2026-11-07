
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentUser } from "../services/authService";
import { Search, ShoppingBag, Menu, X } from "lucide-react";
import Navbar from "./Navbar";
import AccountMenu from "./AccountMenu";

export default function Header({ onSearch, onCategoryChange }) {
  const navigate=useNavigate(),location=useLocation();
  const [notice,setNotice]=useState("");
  const [keyword, setKeyword] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    if(typeof onSearch==="function") onSearch(keyword.trim());
    else navigate(`/san-pham?q=${encodeURIComponent(keyword.trim())}`);

    document.getElementById("products")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  async function handleCart(){
    setNotice('');
    try {const user=await getCurrentUser();
      if(!user){navigate('/dang-nhap',{state:{from:location.pathname+location.search,message:'Vui lòng đăng nhập để sử dụng giỏ hàng.'}});return;}
      setNotice(user.TenVaiTro==='Khách hàng'?'Giỏ hàng chưa triển khai trong giai đoạn này.':'Giỏ hàng chỉ dành cho tài khoản Khách hàng.');
    }catch(e){setNotice(e.message)}
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
          
          <button type="button" onClick={handleCart} className="header-action moc-header-cart">
            <ShoppingBag size={19} strokeWidth={1.5} />
            <span>Giỏ hàng</span>
          </button>
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

      {notice && <div className="moc-header-notice" role="status">{notice}</div>}
      <Navbar
        mobileOpen={mobileOpen}
        closeMobile={() => setMobileOpen(false)}
        onCategoryChange={onCategoryChange}
      />
    </header>
  );
}
