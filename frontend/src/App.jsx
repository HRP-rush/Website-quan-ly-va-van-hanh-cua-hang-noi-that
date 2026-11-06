
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate
} from "react-router-dom";

import Home from "./pages/customer/Home";
import Login from "./pages/customer/Login";

import {
  getCurrentUser,
  getRolePath,
  logout
} from "./services/authService";

// Trang kiểm tra đăng nhập và phân quyền tạm thời
function RoleLanding({ requiredRole }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => {
        if (active) setUser(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (user === undefined) {
    return (
      <p style={{ padding: 40 }}>
        Đang kiểm tra tài khoản...
      </p>
    );
  }

  if (!user) {
    return <Navigate to="/dang-nhap" replace />;
  }

  if (user.TenVaiTro !== requiredRole) {
    return (
      <Navigate
        to={getRolePath(user.TenVaiTro)}
        replace
      />
    );
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/dang-nhap", { replace: true });
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "80px auto",
        padding: 24,
        fontFamily: "Arial"
      }}
    >
      <h1>Đăng nhập thành công!</h1>

      <p>
        Họ tên: {user.HoTen || "Chưa cập nhật"}
      </p>

      <p>Email: {user.Email}</p>

      <p>Vai trò: {user.TenVaiTro}</p>

      <p>
        Trang dành cho {requiredRole} sẽ được
        xây dựng ở giai đoạn tiếp theo.
      </p>

      <button onClick={handleLogout}>
        Đăng xuất
      </button>
    </main>
  );
}

// Component App chính - chỉ khai báo một lần
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang chủ */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Đăng nhập chung */}
        <Route
          path="/dang-nhap"
          element={<Login />}
        />

        {/* Trang Admin */}
        <Route
          path="/admin"
          element={<RoleLanding requiredRole="Admin" />}
        />

        {/* Trang quản lý */}
        <Route
          path="/quan-ly"
          element={<RoleLanding requiredRole="Quản lý" />}
        />

        {/* Trang nhân viên */}
        <Route
          path="/nhan-vien"
          element={<RoleLanding requiredRole="Nhân viên" />}
        />

        {/* Trang khách hàng */}
        <Route
          path="/tai-khoan"
          element={<RoleLanding requiredRole="Khách hàng" />}
        />

        {/* Đường dẫn không tồn tại */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
