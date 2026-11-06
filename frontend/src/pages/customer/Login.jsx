
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { login, getRolePath } from "../../services/authService";
import "../../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ghiNho, setGhiNho] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !matKhau) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    try {
      setLoading(true);

      const user = await login(email.trim(), matKhau, ghiNho);

      navigate(getRolePath(user.TenVaiTro), {
        replace: true
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header onSearch={() => {}} onCategoryChange={() => {}} />

      <main className="login-page">
        <div className="container login-layout">
          <div className="login-image">
            <img
              src="/images/hero.jpg"
              alt="Không gian phòng khách Mộc An"
            />
          </div>

          <div className="login-content">
            <p className="eyebrow">KHÔNG GIAN RIÊNG CỦA BẠN</p>

            <h1>Chào mừng trở lại</h1>

            <p className="login-description">
              Đăng nhập để theo dõi đơn hàng và chăm chút tổ ấm.
            </p>
            
            {successMessage && (
            <div className="login-success" role="status">
                ✓ {successMessage}
            </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">
                  Email hoặc tên đăng nhập *
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">
                  Mật khẩu *
                </label>

                <div className="password-field">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={matKhau}
                    onChange={(e) => setMatKhau(e.target.value)}
                    autoComplete="current-password"
                    required
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword
                      ? <EyeOff size={19} />
                      : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <div className="login-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={ghiNho}
                    onChange={(e) => setGhiNho(e.target.checked)}
                  />
                  Ghi nhớ đăng nhập
                </label>

                <a href="/quen-mat-khau">
                  Quên mật khẩu?
                </a>
              </div>

              {error && (
                <div className="login-error" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>

              <p className="login-register">
                Chưa có tài khoản?{" "}
                <Link to="/dang-ky">Đăng ký ngay</Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
