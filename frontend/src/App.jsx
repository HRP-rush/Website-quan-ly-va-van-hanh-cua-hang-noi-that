import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/customer/Home";
import Login from "./pages/customer/Login";
import Register from "./pages/customer/Register";
import RoleGate from "./components/RoleGate";
import EmployeeDashboard from "./pages/employee/EmployeeDashboard";
import ManagementDashboard from "./pages/management/ManagementDashboard";

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
      <Route path="/tai-khoan" element={<RoleGate allow={["Khách hàng"]}>
        {() => <Navigate to="/" replace/>}</RoleGate>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  </BrowserRouter>;
}
