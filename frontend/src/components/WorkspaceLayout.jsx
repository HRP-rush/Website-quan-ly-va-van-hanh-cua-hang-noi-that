import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Layers3, Sofa, Boxes, Warehouse, ClipboardList,
  Truck, UsersRound, UserRound, MessageSquare, BarChart3, Settings,
  Package, PackagePlus, History, Bell, Search, LogOut, Menu, X
} from "lucide-react";
import { logout } from "../services/authService";
import "../styles/workspace.css";

const icons = {
  overview: LayoutDashboard, category: Layers3, products: Sofa,
  variants: Boxes, inventory: Warehouse, receipts: PackagePlus,
  suppliers: Package, orders: ClipboardList, delivery: Truck,
  customers: UsersRound, employees: UserRound, reviews: MessageSquare,
  reports: BarChart3, settings: Settings, history: History
};

const staffNav = [
  { title: "Tổng quan", icon: "overview", path: "" },
  { title: "Đơn hàng", icon: "orders", path: "" },
  { title: "Giao hàng", icon: "delivery" },
  { title: "Tồn kho", icon: "inventory", path: "/ton-kho" },
  { title: "Nhập kho", icon: "receipts" },
  { title: "Lịch sử kho", icon: "history" }
];
const managementNav = [
  { group: "TỔNG QUAN", items: [{ title: "Tổng quan", icon: "overview", path: "" }] },
  { group: "SẢN PHẨM", items: [
    { title: "Danh mục", icon: "category", path: "/danh-muc" },
    { title: "Sản phẩm", icon: "products", path: "/san-pham" },
    { title: "Biến thể sản phẩm", icon: "variants" }
  ] },
  { group: "KHO & CUNG ỨNG", items: [
    { title: "Kho hàng", icon: "inventory", path: "/kho-hang" },
    { title: "Phiếu nhập", icon: "receipts", path: "/phieu-nhap" },
    { title: "Nhà cung cấp", icon: "suppliers", path: "/nha-cung-cap" }
  ] },
  { group: "BÁN HÀNG", items: [
    { title: "Đơn hàng", icon: "orders" },
    { title: "Giao hàng", icon: "delivery" }
  ] },
  { group: "CON NGƯỜI", items: [
    { title: "Khách hàng", icon: "customers" },
    { title: "Nhân viên", icon: "employees" },
    { title: "Phản hồi", icon: "reviews" }
  ] },
  { group: "QUẢN TRỊ", items: [
    { title: "Thống kê & báo cáo", icon: "reports" },
    { title: "Cài đặt tài khoản", icon: "settings" }
  ] }
];

function NavItem({ item, active, base, onClose }) {
  const Icon = icons[item.icon] || LayoutDashboard;
  const navigate = useNavigate();
  const enabled = item.path != undefined; // Nếu chưa có path, tạm thời chưa triển khai màn hình
  return <button type="button" className={`workspace-nav-item ${active ? "is-active" : ""}`}
    disabled={!enabled} title={enabled ? item.title : "Sẽ triển khai ở màn hình tiếp theo"}
    onClick={() => { if (enabled) navigate(base + item.path); onClose(); }}>
    <Icon size={17}/><span>{item.title}</span>
  </button>;
}

export default function WorkspaceLayout({ user, mode, activeTitle = "Tổng quan", children }) {
  const navigate = useNavigate();
  const base = mode === "employee" ? "/nhan-vien" : mode === "admin" ? "/admin" : "/quan-ly";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isStaff = mode === "employee";
  async function handleLogout() {
    try { await logout(); navigate("/dang-nhap", { replace: true }); }
    catch (error) { window.alert(error.message); }
  }
  return <div className="workspace">
    <button className="workspace-mobile-menu" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Mở menu">
      {sidebarOpen ? <X size={22}/> : <Menu size={22}/>}
    </button>
    <aside className={`workspace-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="workspace-brand"><span>MỘC AN</span><small>INTERIOR</small></div>
      <div className="workspace-side-caption">{isStaff ? "CỔNG NHÂN VIÊN" : "CỔNG QUẢN TRỊ"}</div>
      <nav aria-label="Điều hướng khu vực làm việc">
        {isStaff ? staffNav.map(item => <NavItem item={item} key={item.title} active={item.title === activeTitle} base={base} onClose={() => setSidebarOpen(false)}/>)
          : managementNav.map(group => <div className="workspace-nav-group" key={group.group}>
              <p>{group.group}</p>{group.items.map(item => 
                <NavItem
                  item={item}
                  key={item.title}
                  active={item.title === activeTitle}
                  base={base}
                  onClose={() => setSidebarOpen(false)}
                />
                )}
            </div>)}
        <button className="workspace-nav-item" disabled title="Hồ sơ được triển khai trong giai đoạn kế tiếp">
          <UserRound size={17}/> <span>Tài khoản của tôi</span>
        </button>
        <button className="workspace-nav-item" type="button" onClick={handleLogout}>
          <LogOut size={17}/><span>Đăng xuất</span>
        </button>
      </nav>
      <p className="workspace-side-bottom">MỘC AN INTERIOR<br/>{isStaff ? "Vận hành cửa hàng" : "Quản trị cửa hàng"} • 2026</p>
    </aside>
    <div className="workspace-right">
      <header className="workspace-topbar">
        <div className="workspace-search"><Search size={19}/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm đơn hàng, sản phẩm, mã SKU..." aria-label="Nhập từ khóa tìm kiếm"/>
          {search && <span className="workspace-search-notice">Tìm kiếm sẽ được kết nối API sau</span>}
        </div>
        <div className="workspace-top-actions">
          <span className="workspace-bell" aria-label="Thông báo chưa được kết nối"><Bell size={19}/></span>
          <div className="workspace-account"><strong>{user.HoTen || user.Email}</strong><span>{user.TenVaiTro}</span></div>
        </div>
      </header>
      <main className="workspace-main">{children}</main>
    </div>
  </div>;
}
