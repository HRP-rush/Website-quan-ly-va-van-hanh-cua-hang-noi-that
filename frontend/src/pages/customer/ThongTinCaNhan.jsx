import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { peopleRequest } from "../../services/peopleService";
import "../../styles/thongTinCaNhan.css";

const toForm = (p) => ({
  hoTen: p.HoTen || "",
  email: p.Email || "",
  soDienThoai: p.SoDienThoai || "",
  diaChi: p.DiaChi || ""
});

export default function ThongTinCaNhan() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    peopleRequest(
      "/con-nguoi/toi",
      "GET",
      undefined,
      controller.signal
    )
      .then(({ data }) => {
        if (!controller.signal.aborted) {
          setProfile(data);
          setForm(toForm(data));
          setLoadError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setLoadError(e.message);
        }
      });

    return () => controller.abort();
  }, [reload]);

  function change(e) {
    setForm((old) => ({
      ...old,
      [e.target.name]: e.target.value
    }));
    setError("");
    setNotice("");
  }

  async function save(e) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const { data } = await peopleRequest(
        "/con-nguoi/toi",
        "PUT",
        form
      );

      setProfile(data);
      setForm(toForm(data));

      // Cập nhật tên trên menu sau khi lưu.
      window.dispatchEvent(
        new CustomEvent("mocan-profile-change", {
          detail: data
        })
      );

      setNotice("Đã cập nhật thông tin cá nhân thành công.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function cancelChanges() {
    setForm(toForm(profile));
    setError("");
    setNotice("");
  }

  const initials = (profile?.HoTen || "MA")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="customer-profile">
      <Header />

      <main className="customer-profile-main">
        <nav
          className="customer-profile-breadcrumb"
          aria-label="Đường dẫn"
        >
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <span>Tài khoản của tôi</span>
        </nav>

        <h1>Tài khoản của tôi</h1>
        <p className="customer-profile-intro">
          Quản lý thông tin để Mộc An phục vụ bạn tốt hơn.
        </p>

        {loadError ? (
          <div className="customer-profile-error" role="alert">
            {loadError}
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
            >
              Thử lại
            </button>
          </div>
        ) : !form ? (
          <p role="status">Đang tải thông tin cá nhân…</p>
        ) : (
          <div className="customer-profile-grid">
            <aside className="customer-profile-sidebar">
              <div className="customer-profile-avatar">
                {initials}
              </div>

              <strong>{profile.HoTen}</strong>
              <span>{profile.Email}</span>

              <nav aria-label="Tài khoản của tôi">
                <Link
                  to="/tai-khoan"
                  className="is-active"
                  aria-current="page"
                >
                  Thông tin cá nhân <span>›</span>
                </Link>

                <Link to="/tai-khoan/don-hang">
                  Đơn hàng của tôi <span>›</span>
                </Link>
              </nav>
            </aside>

            <section className="customer-profile-form">
              <h2>Thông tin cá nhân</h2>

              <form onSubmit={save}>
                <fieldset disabled={busy}>
                  <label htmlFor="profile-name">
                    Họ và tên *
                  </label>
                  <input
                    id="profile-name"
                    name="hoTen"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={150}
                    value={form.hoTen}
                    onChange={change}
                  />

                  <label htmlFor="profile-email">
                    Email *
                  </label>
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={change}
                    aria-describedby="profile-email-hint"
                  />
                  <small id="profile-email-hint">
                    Email này cũng là email đăng nhập của bạn.
                  </small>

                  <label htmlFor="profile-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="profile-phone"
                    name="soDienThoai"
                    type="tel"
                    autoComplete="tel"
                    maxLength={20}
                    value={form.soDienThoai}
                    onChange={change}
                  />

                  <label htmlFor="profile-address">
                    Địa chỉ
                  </label>
                  <textarea
                    id="profile-address"
                    name="diaChi"
                    autoComplete="street-address"
                    rows={3}
                    maxLength={500}
                    value={form.diaChi}
                    onChange={change}
                  />

                  <div className="customer-profile-actions">
                    <button
                      type="submit"
                      className="customer-profile-primary"
                    >
                      {busy ? "Đang lưu…" : "Lưu thay đổi"}
                    </button>

                    <button
                      type="button"
                      onClick={cancelChanges}
                    >
                      Hủy thay đổi
                    </button>
                  </div>
                </fieldset>

                {error && (
                  <p className="customer-profile-error" role="alert">
                    {error}
                  </p>
                )}

                {notice && (
                  <p
                    className="customer-profile-success"
                    role="status"
                  >
                    {notice}
                  </p>
                )}
              </form>
            </section>

            <aside className="customer-profile-help">
              <section>
                <h2>Đơn hàng của bạn</h2>
                <p>
                  Theo dõi trạng thái và xem lại các sản phẩm đã đặt.
                </p>
                <Link to="/tai-khoan/don-hang">
                  Đơn hàng của tôi →
                </Link>
              </section>

              <section>
                <h2>Cần hỗ trợ?</h2>
                <p>
                  Đội ngũ Mộc An luôn sẵn sàng hỗ trợ bạn về
                  đơn hàng và sản phẩm.
                </p>
                <a href="tel:19006868">1900 6868</a>
              </section>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}