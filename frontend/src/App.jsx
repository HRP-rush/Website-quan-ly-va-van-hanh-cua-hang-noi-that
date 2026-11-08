import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/customer/Home";
import Login from "./pages/customer/Login";
import Register from "./pages/customer/Register";
import RoleGate from "./components/RoleGate";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import ManagementDashboard from "./pages/management/ManagementDashboard";
import ThemSanPham from "./pages/management/themSanPham";
import DanhSachSanPham from "./pages/management/DanhSachSanPham";
import ChiTietSanPham from "./pages/management/ChiTietSanPham";
import ChinhSuaSanPham from "./pages/management/ChinhSuaSanPham";
import BienTheSanPham from "./pages/management/BienTheSanPham";
import QuanLyTonKho from "./pages/management/QuanLyTonKho";
import ChiTietTonKho from "./pages/management/ChiTietTonKho";
import Catalog from "./pages/customer/Catalog";
import ProductDetail from "./pages/customer/ProductDetail";
import DanhSachPhieuNhap from "./pages/management/DanhSachPhieuNhap";

export default function App() {
  return <BrowserRouter>
    <Routes>
      {/* Trang chủ mở cho mọi khách, kể cả chưa đăng nhập */}
      <Route path="/" element={<Home/>}/>
      <Route path="/san-pham" element={<Catalog/>}/>
      <Route path="/san-pham/:maSanPham" element={<ProductDetail/>}/>
      <Route path="/dang-nhap" element={<Login/>}/>
      <Route path="/dang-ky" element={<Register/>}/>
      {/* Route được bảo vệ; Backend cũng phải kiểm tra quyền ở API nghiệp vụ. */}
      <Route path="/nhan-vien" element={<RoleGate allow={["Nhân viên"]}>
        {(user) => <EmployeeDashboard user={user}/>}</RoleGate>}/>
      <Route path="/quan-ly" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <ManagementDashboard user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin" element={<RoleGate allow={["Admin"]}>
        {(user) => <ManagementDashboard user={user} mode="admin"/>}</RoleGate>}/>
      {/* Trang hồ sơ CUS-15 sẽ được xây dựng sau; tạm về trang chủ nếu có phiên khách */}
      <Route path="/tai-khoan" element={<RoleGate allow={["Khách hàng"]}>
        {() => <Navigate to="/" replace/>}</RoleGate>}/>
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
      <Route path="/quan-ly/phieu-nhap" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <DanhSachPhieuNhap user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin/phieu-nhap" element={<RoleGate allow={["Admin"]}>
        {(user) => <DanhSachPhieuNhap user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </BrowserRouter>;
}
