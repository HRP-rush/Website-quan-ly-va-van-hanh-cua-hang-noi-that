 HEAD
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import toàn bộ các trang chức năng trong dự án
import Checkout from './pages/customer/Checkout';
import PaymentReturn from './pages/customer/PaymentReturn';
import Invoice from './pages/customer/Invoice';
import ProductReview from './pages/customer/ProductReview';
import ManageReviews from './pages/customer/ManageReviews';
import SalesReport from './pages/customer/SalesReport';
import WarehouseReport from './pages/customer/WarehouseReport';

export default function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', background: '#f4f6f8', paddingBottom: '40px', fontFamily: 'Arial, sans-serif' }}>
        {/* Thanh điều hướng (Navbar) tổng hợp toàn bộ các module */}
        <nav style={{ background: '#343a40', color: '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Mộc An Interior</h2>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Thanh Toán</Link>
            <Link to="/invoice" style={{ color: '#fff', textDecoration: 'none' }}>Hóa Đơn</Link>
            <Link to="/danh-gia" style={{ color: '#fff', textDecoration: 'none' }}>Đánh Giá</Link>
            <Link to="/quan-ly-phan-hoi" style={{ color: '#fff', textDecoration: 'none' }}>Quản Lý Phản Hồi</Link>
            <Link to="/bao-cao" style={{ color: '#fff', textDecoration: 'none' }}>Báo Cáo Doanh Thu</Link>
            <Link to="/kho-hang" style={{ color: '#fff', textDecoration: 'none' }}>Kho Hàng & Giao Hàng</Link>
          </div>
        </nav>

        {/* Khung định tuyến chứa các Route */}
        <div style={{ padding: '20px' }}>
          <Routes>
            {/* Nhóm 9: Đơn hàng, giao hàng và thanh toán */}
            <Route path="/" element={<Checkout />} />
            <Route path="/payment-return" element={<PaymentReturn />} />
            <Route path="/invoice" element={<Invoice />} />

            {/* Nhóm 10: Phản hồi, báo cáo, đánh giá và quản lý kho */}
            <Route path="/danh-gia" element={<ProductReview />} />
            <Route path="/quan-ly-phan-hoi" element={<ManageReviews />} />
            <Route path="/bao-cao" element={<SalesReport />} />
            <Route path="/kho-hang" element={<WarehouseReport />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

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
import Cart from "./pages/customer/Cart";
import ThongTinGiaoHang from "./pages/customer/ThongTinGiaoHang";
import PhuongThucThanhToan from "./pages/customer/PhuongThucThanhToan";
import XacNhanDonHang from "./pages/customer/XacNhanDonHang";
import ThanhToanThanhCong from "./pages/customer/ThanhToanThanhCong";
import TheoDoiDonHang, { DanhSachDonHang } from "./pages/customer/TheoDoiDonHang";

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
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </BrowserRouter>;
}

