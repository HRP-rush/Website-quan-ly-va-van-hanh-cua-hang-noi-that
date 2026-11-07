import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/customer/Home";
import Login from "./pages/customer/Login";
import Register from "./pages/customer/Register";
import RoleGate from "./components/RoleGate";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import ManagementDashboard from "./pages/management/ManagementDashboard";
import ThemSanPham from "./pages/management/themSanPham";
import ForgotPassword from './pages/customer/ForgotPassword';
import ResetPassword from './pages/customer/ResetPassword';
import AccountProfile from './pages/customer/AccountProfile';
import AccountManagement from './pages/management/AccountManagement';
import CategoryManagement from './pages/management/CategoryManagement';

export default function App() {
  return <BrowserRouter>
    <Routes>
      {/* Trang chủ mở cho mọi khách, kể cả chưa đăng nhập */}
      <Route path="/" element={<Home/>}/>
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
      <Route path="/quan-ly/san-pham/them" element={<RoleGate allow={["Quản lý"]}>
        {(user) => <ThemSanPham user={user} mode="manager"/>}</RoleGate>}/>
      <Route path="/admin-san-pham/them" element={<RoleGate allow={["Admin"]}>
        {(user) => <ThemSanPham user={user} mode="admin"/>}</RoleGate>}/>
      <Route path="/quen-mat-khau" element={<ForgotPassword/>}/>
      <Route path="/dat-lai-mat-khau" element={<ResetPassword/>}/>
      <Route path="/tai-khoan" element={<RoleGate allow={['Khách hàng']}>{()=><AccountProfile/>}</RoleGate>}/>
      <Route path="/ho-so" element={<RoleGate allow={['Admin','Quản lý','Nhân viên']}>{()=><AccountProfile/>}</RoleGate>}/>
      <Route path="/quan-tri/danh-muc" element={<RoleGate allow={['Admin','Quản lý']}>{u=><CategoryManagement user={u}/>}</RoleGate>}/>
      <Route path="/quan-tri/nhan-vien" element={<RoleGate allow={['Admin','Quản lý']}>{u=><AccountManagement user={u} type="staff"/>}</RoleGate>}/>
      <Route path="/quan-tri/khach-hang" element={<RoleGate allow={['Admin','Quản lý']}>{u=><AccountManagement user={u} type="customers"/>}</RoleGate>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </BrowserRouter>;
}
