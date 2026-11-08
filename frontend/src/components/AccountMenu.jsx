
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  UserRound,
  ChevronDown,
  LogIn,
  UserPlus,
  CircleUserRound,
  LayoutDashboard,
  LogOut
} from "lucide-react";

import {
  getCurrentUser,
  getRolePath,
  logout
} from "../services/authService";

import "../styles/accountMenu.css";

export default function AccountMenu() {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const menuRef = useRef(null);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((data) => {
        if (active) setUser(data);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleLogout() {
    setError("");

    try {
      await logout();
      setUser(null);
      setOpen(false);
      navigate("/dang-nhap", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="account-menu" ref={menuRef}>
      <button
        type="button"
        className="account-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <UserRound size={19} strokeWidth={1.5} />

        <span>
          {user?.HoTen || "Tài khoản"}
        </span>

        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="account-dropdown">
          {loading ? (
            <p className="account-dropdown-message">
              Đang kiểm tra tài khoản...
            </p>
          ) : !user ? (
            <>
              <p className="account-dropdown-heading">
                Chào mừng đến với Mộc An
              </p>

              <Link
                to="/dang-nhap"
                className="account-dropdown-item"
                onClick={closeMenu}
              >
                <LogIn size={17} />
                Đăng nhập
              </Link>

              <Link
                to="/dang-ky"
                className="account-dropdown-item"
                onClick={closeMenu}
              >
                <UserPlus size={17} />
                Đăng ký tài khoản
              </Link>
            </>
          ) : (
            <>
              <div className="account-dropdown-user">
                <strong>{user.HoTen || user.Email}</strong>
                <span>{user.TenVaiTro}</span>
              </div>

              <Link
                to="/tai-khoan"
                className="account-dropdown-item"
                onClick={closeMenu}
              >
                <CircleUserRound size={17} />
                Thông tin cá nhân
              </Link>

              <Link
                to={getRolePath(user.TenVaiTro)}
                className="account-dropdown-item"
                onClick={closeMenu}
              >
                <LayoutDashboard size={17} />
                Trang làm việc
              </Link>

              <button
                type="button"
                className="account-dropdown-item account-logout"
                onClick={handleLogout}
              >
                <LogOut size={17} />
                Đăng xuất
              </button>
            </>
          )}

          {error && (
            <p className="account-dropdown-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
