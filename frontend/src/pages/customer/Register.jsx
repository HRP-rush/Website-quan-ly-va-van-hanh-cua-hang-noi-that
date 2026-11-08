
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { registerCustomer } from "../../services/authService";

import "../../styles/register.css";

const initialForm = {
  hoTen: "",
  email: "",
  soDienThoai: "",
  matKhau: "",
  xacNhanMatKhau: "",
  dongY: false
};

export default function Register() {
    const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [serverError, setServerError] = useState("");

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: ""
    }));

    setServerError("");
  }

  function validate() {
    const newErrors = {};

    const name = form.hoTen.trim();
    const email = form.email.trim();
    const phone = form.soDienThoai.trim();
    const password = form.matKhau;

    if (!name) {
      newErrors.hoTen = "Vui lòng nhập họ và tên.";
    } else if (name.length < 2 || name.length > 150) {
      newErrors.hoTen = "Họ tên phải có từ 2 đến 150 ký tự.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Vui lòng nhập email.";
    } else if (
      email.length > 254 ||
      !emailRegex.test(email) ||
      !/^[\x00-\x7F]+$/.test(email)
    ) {
      newErrors.email = "Email không đúng định dạng.";
    }

    if (!phone) {
      newErrors.soDienThoai = "Vui lòng nhập số điện thoại.";
    } else if (!/^0[0-9]{9,10}$/.test(phone)) {
      newErrors.soDienThoai = "Số điện thoại không hợp lệ.";
    }

    if (!password) {
      newErrors.matKhau = "Vui lòng nhập mật khẩu.";
    } else if (
      password.length < 8 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      new TextEncoder().encode(password).length > 72
    ) {
      newErrors.matKhau =
        "Cần ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số; tối đa 72 byte.";
    }

    if (!form.xacNhanMatKhau) {
      newErrors.xacNhanMatKhau =
        "Vui lòng xác nhận mật khẩu.";
    } else if (form.xacNhanMatKhau !== password) {
      newErrors.xacNhanMatKhau =
        "Mật khẩu xác nhận không khớp.";
    }

    if (!form.dongY) {
      newErrors.dongY =
        "Vui lòng đồng ý với điều khoản sử dụng.";
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setSuccess("");
    setServerError("");

    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {   
        await registerCustomer({
        hoTen: form.hoTen.trim(),
        email: form.email.trim().toLowerCase(),
        soDienThoai: form.soDienThoai.trim(),
        matKhau: form.matKhau
        });

    // Xóa dữ liệu biểu mẫu sau khi thành công
    setForm(initialForm);

    // Chuyển đến trang đăng nhập
    navigate("/dang-nhap", {
    replace: true,
    state: {
        message: "Đăng ký tài khoản thành công! Vui lòng đăng nhập."
    }
    });

    } catch (error) {
      setServerError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        onSearch={() => {}}
        onCategoryChange={() => {}}
      />

      <main className="register-page">
        <div className="container register-layout">

          {/* CỘT TRÁI */}
          <section className="register-brand-panel">
            <div className="register-image">
              <img
                src="/images/register.jpg"
                alt="Không gian phòng khách Mộc An"
              />
            </div>

            <div className="register-brand-content">
              <p className="eyebrow">
                NHỮNG ĐIỀU GIẢN DỊ, BỀN LÂU
              </p>

              <h2>Một tổ ấm mang dấu ấn riêng</h2>

              <p>
                Mộc An đồng hành cùng bạn từ lựa chọn
                đầu tiên đến từng khoảnh khắc ở nhà.
              </p>
            </div>
          </section>

          {/* CỘT PHẢI */}
          <section className="register-form-panel">
            <p className="eyebrow">
              CHÀO BẠN ĐẾN VỚI MỘC AN
            </p>

            <h1>Tạo tài khoản</h1>

            <p className="register-description">
              Lưu những lựa chọn yêu thích, theo dõi hành trình
              đơn hàng.
            </p>

            <form
              className="register-form"
              onSubmit={handleSubmit}
              noValidate
            >

              {/* HỌ VÀ TÊN */}
              <div className="register-field">
                <label htmlFor="reg-hoTen">
                  Họ và tên <span>*</span>
                </label>

                <input
                  id="reg-hoTen"
                  name="hoTen"
                  type="text"
                  placeholder="Nhập họ và tên của bạn"
                  value={form.hoTen}
                  onChange={updateField}
                  autoComplete="name"
                  aria-invalid={Boolean(errors.hoTen)}
                />

                {errors.hoTen && (
                  <p className="register-field-error">
                    {errors.hoTen}
                  </p>
                )}
              </div>

              {/* EMAIL */}
              <div className="register-field">
                <label htmlFor="reg-email">
                  Email <span>*</span>
                </label>

                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  placeholder="Nhập địa chỉ email"
                  value={form.email}
                  onChange={updateField}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                />

                {errors.email && (
                  <p className="register-field-error">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* SỐ ĐIỆN THOẠI */}
              <div className="register-field">
                <label htmlFor="reg-phone">
                  Số điện thoại <span>*</span>
                </label>

                <input
                  id="reg-phone"
                  name="soDienThoai"
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  value={form.soDienThoai}
                  onChange={updateField}
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.soDienThoai)}
                />

                {errors.soDienThoai && (
                  <p className="register-field-error">
                    {errors.soDienThoai}
                  </p>
                )}
              </div>

              {/* MẬT KHẨU */}
              <div className="register-field">
                <label htmlFor="reg-password">
                  Mật khẩu <span>*</span>
                </label>

                <div className="register-password-input">
                  <input
                    id="reg-password"
                    name="matKhau"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={form.matKhau}
                    onChange={updateField}
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.matKhau)}
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? "Ẩn mật khẩu"
                        : "Hiện mật khẩu"
                    }
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword
                      ? <EyeOff size={19} />
                      : <Eye size={19} />}
                  </button>
                </div>

                <p className="register-hint">
                  Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
                </p>

                {errors.matKhau && (
                  <p className="register-field-error">
                    {errors.matKhau}
                  </p>
                )}
              </div>

              {/* XÁC NHẬN MẬT KHẨU */}
              <div className="register-field">
                <label htmlFor="reg-confirm">
                  Xác nhận mật khẩu <span>*</span>
                </label>

                <div className="register-password-input">
                  <input
                    id="reg-confirm"
                    name="xacNhanMatKhau"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={form.xacNhanMatKhau}
                    onChange={updateField}
                    autoComplete="new-password"
                    aria-invalid={Boolean(
                      errors.xacNhanMatKhau
                    )}
                  />

                  <button
                    type="button"
                    aria-label={
                      showConfirm
                        ? "Ẩn xác nhận mật khẩu"
                        : "Hiện xác nhận mật khẩu"
                    }
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm
                      ? <EyeOff size={19} />
                      : <Eye size={19} />}
                  </button>
                </div>

                {errors.xacNhanMatKhau && (
                  <p className="register-field-error">
                    {errors.xacNhanMatKhau}
                  </p>
                )}
              </div>

              {/* ĐIỀU KHOẢN */}
              <div className="register-terms">
                <label>
                  <input
                    type="checkbox"
                    name="dongY"
                    checked={form.dongY}
                    onChange={updateField}
                  />
                  <span>
                    Tôi đồng ý với Điều khoản sử dụng và
                    Chính sách bảo mật.
                  </span>
                </label>

                {errors.dongY && (
                  <p className="register-field-error">
                    {errors.dongY}
                  </p>
                )}
              </div>

              {/* THÔNG BÁO LỖI */}
              {serverError && (
                <div className="register-alert register-alert-error"
                     role="alert">
                  {serverError}
                </div>
              )}

              {/* THÔNG BÁO THÀNH CÔNG */}
              {success && (
                <div className="register-alert register-alert-success"
                     role="status">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>{success}</strong>
                    <p>
                      Tài khoản Khách hàng đã được tạo.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="register-submit"
                disabled={loading}
              >
                {loading
                  ? "Đang tạo tài khoản..."
                  : "Tạo tài khoản"}
              </button>

              <p className="register-login">
                Đăng ký dành cho khách hàng. Đã có tài khoản?{" "}
                <Link to="/dang-nhap">Đăng nhập</Link>
              </p>

            </form>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
