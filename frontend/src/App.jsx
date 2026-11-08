import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/customer/Home";
import Login from "./pages/customer/Login";
import Register from "./pages/customer/Register";
import RoleGate from "./components/RoleGate";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import ManagementDashboard from "./pages/management/ManagementDashboard";
import ThemSanPham from "./pages/management/ThemSanPham";
import DanhSachSanPham from "./pages/management/DanhSachSanPham";
import ChiTietSanPham from "./pages/management/ChiTietSanPham";
import ChinhSuaSanPham from "./pages/management/ChinhSuaSanPham";
import BienTheSanPham from "./pages/management/BienTheSanPham";
import QuanLyTonKho from "./pages/management/QuanLyTonKho";
import ChiTietTonKho from "./pages/management/ChiTietTonKho";
import NhaCungCap from "./pages/management/NhaCungCap";
import Catalog from "./pages/customer/Catalog";
import ProductDetail from "./pages/customer/ProductDetail";
import Cart from "./pages/customer/Cart";
import ThongTinGiaoHang from "./pages/customer/ThongTinGiaoHang";
import PhuongThucThanhToan from "./pages/customer/PhuongThucThanhToan";
import XacNhanDonHang from "./pages/customer/XacNhanDonHang";
import ThanhToanThanhCong from "./pages/customer/ThanhToanThanhCong";
import TheoDoiDonHang, { DanhSachDonHang } from "./pages/customer/TheoDoiDonHang";
import QuanLyDanhMuc from "./pages/management/QuanLyDanhMuc";
import ThemDanhMuc from "./pages/management/ThemDanhMuc";
import DanhSachPhieuNhap from "./pages/management/DanhSachPhieuNhap";
import TaoPhieuNhap from "./pages/management/TaoPhieuNhap";

export default function App() {
  return <BrowserRouter>
    <Routes>
      {/* Trang chủ mở cho mọi khách, kể cả chưa đăng nhập */}
      <Route path="/" element={<Home/>}/>
      <Route path="/san-pham" element={<Catalog/>}/>
      <Route path="/san-pham/:maSanPham" element={<ProductDetail/>}/>
      <Route path="/gio-hang" element={<Cart/>}/>
      <Route path="/dang-nhap" element={<Login/>}/>
      <Route path="/dang-ky" element={<Register/>}/>
      <Route path="/thanh-toan/giao-hang" element={<RoleGate allow={["Khách hàng"]}>
        {() => <ThongTinGiaoHang/>}</RoleGate>}/>
      <Route path="/thanh-toan/phuong-thuc" element={<RoleGate allow={["Khách hàng"]}>
        {() => <PhuongThucThanhToan/>}</RoleGate>}/>
      <Route path="/thanh-toan/xac-nhan" element={<RoleGate allow={["Khách hàng"]}>
        {() => <XacNhanDonHang/>}</RoleGate>}/>
      <Route path="/thanh-toan/thanh-cong" element={<RoleGate allow={["Khách hàng"]}>
        {() => <ThanhToanThanhCong/>}</RoleGate>}/>
      {/* Route được bảo vệ; Backend cũng phải kiểm tra quyền ở API nghiệp vụ. */}
      <Route path="/nhan-vien" element={<RoleGate allow={["Nhân viên"]}>
        {(user) => <EmployeeDashboard user={user}/>}</RoleGate>}/>
      <Route path="/quan-ly" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <ManagementDashboard user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin" element={<RoleGate allow={["Admin"]}>
        {(user) => <ManagementDashboard user={user} mode="admin"/>}</RoleGate>}/>
      {/* Trang hồ sơ CUS-15 sẽ được xây dựng sau; tạm về trang chủ nếu có phiên khách */}
      <Route path="/tai-khoan" element={<RoleGate allow={["Khách hàng"]}>
        {() => <Navigate to="/tai-khoan/don-hang" replace/>}</RoleGate>}/>
      <Route path="/tai-khoan/don-hang" element={<RoleGate allow={["Khách hàng"]}>
        {(user) => <DanhSachDonHang user={user}/>}</RoleGate>}/>
      <Route path="/tai-khoan/don-hang/:id" element={<RoleGate allow={["Khách hàng"]}>
        {() => <TheoDoiDonHang/>}</RoleGate>}/>
      <Route path="/quan-ly/san-pham/them" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <ThemSanPham user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin-san-pham/them" element={<RoleGate allow={["Admin"]}>
        {(user) => <ThemSanPham user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/san-pham" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <DanhSachSanPham user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/san-pham" element={<RoleGate allow={["Admin"]}>
        {(user) => <DanhSachSanPham user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/san-pham/:maSanPham" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <ChiTietSanPham user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/san-pham/:maSanPham" element={<RoleGate allow={["Admin"]}>
        {(user) => <ChiTietSanPham user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/san-pham/:maSanPham/chinh-sua" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <ChinhSuaSanPham user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/san-pham/:maSanPham/chinh-sua" element={<RoleGate allow={["Admin"]}>
        {(user) => <ChinhSuaSanPham user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/san-pham/:maSanPham/bien-the" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <BienTheSanPham user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/san-pham/:maSanPham/bien-the" element={<RoleGate allow={["Admin"]}>
        {(user) => <BienTheSanPham user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/kho-hang" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <QuanLyTonKho user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/kho-hang" element={<RoleGate allow={["Admin"]}>
        {(user) => <QuanLyTonKho user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/kho-hang/:maBienThe" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <ChiTietTonKho user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/kho-hang/:maBienThe" element={<RoleGate allow={["Admin"]}>
        {(user) => <ChiTietTonKho user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/nha-cung-cap" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <NhaCungCap user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/nha-cung-cap" element={<RoleGate allow={["Admin"]}>
        {(user) => <NhaCungCap user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/danh-muc" element={<RoleGate allow={["Quản lý"]}>
        {(user) => (<QuanLyDanhMuc user={user} mode="manager"/>)}</RoleGate>}/>
      <Route path="/admin/danh-muc" element={<RoleGate allow={["Admin"]}>
        {(user) => (<QuanLyDanhMuc user={user} mode="admin"/>)}</RoleGate>}/>
        <Route path="/quan-ly/danh-muc/them" element={<RoleGate allow={["Quản lý"]}>
        {(user) => (<ThemDanhMuc user={user} mode="manager"/>)}</RoleGate>}/>
      <Route path="/quan-ly/danh-muc/:maDanhMuc/chinh-sua" element={<RoleGate allow={["Quản lý"]}>
        {(user) => (<ThemDanhMuc user={user} mode="manager"/>)}</RoleGate>}/>
      <Route path="/admin/danh-muc/them" element={<RoleGate allow={["Admin"]}>
        {(user) => (<ThemDanhMuc user={user} mode="admin"/>)}</RoleGate>}/>
      <Route path="/admin/danh-muc/:maDanhMuc/chinh-sua" element={<RoleGate allow={["Admin"]}>
        {(user) => (<ThemDanhMuc user={user}mode="admin"/>)}</RoleGate>}/>
      <Route path="/quan-ly/phieu-nhap" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <DanhSachPhieuNhap user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/phieu-nhap" element={<RoleGate allow={["Admin"]}>
        {(user) => <DanhSachPhieuNhap user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quan-ly/phieu-nhap/tao" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <TaoPhieuNhap user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/quan-ly/phieu-nhap/:maPhieuNhap/sua" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <TaoPhieuNhap user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/phieu-nhap/tao" element={<RoleGate allow={["Admin"]}>
        {(user) => <TaoPhieuNhap user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/admin/phieu-nhap/:maPhieuNhap/sua" element={<RoleGate allow={["Admin"]}>
        {(user) => <TaoPhieuNhap user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </BrowserRouter>;
}
