import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, getRolePath } from "../services/authService";

export default function RoleGate({ allow, children }) {
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
  if (!state.user) return <Navigate to="/dang-nhap" replace />;
  if (!allow.includes(state.user.TenVaiTro)) {
    return <Navigate to={getRolePath(state.user.TenVaiTro)} replace />;
  }
  return children(state.user);
}
