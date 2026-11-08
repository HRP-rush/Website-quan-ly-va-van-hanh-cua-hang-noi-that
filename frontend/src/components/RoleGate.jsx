import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getCurrentUser, getRolePath } from "../services/authService";

export default function RoleGate({ allow, children }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, user: null, error: "" });
  useEffect(() => {
    let live = true;
    getCurrentUser().then((user) => {
      if (live) setState({ loading: false, user, error: "" });
    }).catch((err) => {
      if (live) setState({ loading: false, user: null, error: err.message });
    });
    return () => { live = false; };
  }, []);
  if (state.loading) return <div className="role-loading">Đang xác thực tài khoản...</div>;
  if (state.error) return <div className="role-loading" role="alert">{state.error}. Vui lòng tải lại trang.</div>;
  if (!state.user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/dang-nhap" replace state={{ from, message: "Vui lòng đăng nhập để tiếp tục thanh toán." }} />;
  }
  if (!allow.includes(state.user.TenVaiTro)) {
    return <Navigate to={getRolePath(state.user.TenVaiTro)} replace />;
  }
  return children(state.user);
}
