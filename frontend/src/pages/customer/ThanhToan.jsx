import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Truck } from "lucide-react";

import {
  CheckoutHeader,
  CheckoutFooter,
  CheckoutSummary
} from "../../components/CheckoutParts";

import {
  getCart,
  getCartTotal
} from "../../services/cartService";

import {
  saveCompletedOrder
} from "../../services/checkoutService";

import "../../styles/checkout.css";
import "../../styles/thanhToanDonHang.css";

const API = (import.meta.env.VITE_API_URL || "")
  .replace(/\/$/, "");

export default function ThanhToan({ user }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    hoTen: user.HoTen || "",
    soDienThoai: user.SoDienThoai || "",
    email: user.Email || "",
    diaChiGiao: user.DiaChi || "",
    ghiChu: ""
  });

  const [items, setItems] = useState([]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  const [agreement, setAgreement] = useState(false);
  const [reload, setReload] = useState(0);

  const [requestId] = useState(() => crypto.randomUUID());

  const lock = useRef(false);
  const formRef = useRef(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      getCart(),
      getCartTotal()
    ])
      .then(([cart, total]) => {
        if (!active) return;

        setItems(cart);
        setQuote(total);
      })
      .catch(err => {
        if (active) setLoadError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reload]);

  const set = name => e => {
    setForm(f => ({
      ...f,
      [name]: e.target.value
    }));

    setErrors(er => ({
      ...er,
      [name]: ""
    }));
  };

  function refresh() {
    if (lock.current) return;

    setLoading(true);
    setLoadError("");
    setError("");
    setReload(n => n + 1);
  }

  async function submit(e) {
    e.preventDefault();

    if (lock.current) return;

    const info = {
      ...form,
      hoTen: form.hoTen.trim(),
      email: form.email.trim(),
      diaChiGiao: form.diaChiGiao.trim(),
      soDienThoai:
        form.soDienThoai.replace(/[\s.-]/g, "")
    };

    const er = {};

    if (
      info.hoTen.length < 2 ||
      info.hoTen.length > 150
    ) {
      er.hoTen = "Nhập họ tên từ 2 đến 150 ký tự.";
    }

    const phone =
      /^(?:0(?:2\d{8,9}|[35789]\d{8})|\+84(?:2\d{8,9}|[35789]\d{8}))$/;

    if (!phone.test(info.soDienThoai)) {
      er.soDienThoai = "Số điện thoại không hợp lệ.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email) ||
      info.email.length > 254
    ) {
      er.email = "Email không hợp lệ.";
    }

    if (
      info.diaChiGiao.length < 5 ||
      info.diaChiGiao.length > 500
    ) {
      er.diaChiGiao =
        "Nhập địa chỉ giao hàng đầy đủ (5–500 ký tự).";
    }

    if (info.ghiChu.length > 500) {
      er.ghiChu = "Ghi chú tối đa 500 ký tự.";
    }

    setErrors(er);
    setError("");

    if (Object.keys(er).length) {
      formRef.current
        .querySelector(`[name="${Object.keys(er)[0]}"]`)
        ?.focus();

      return;
    }

    if (!agreement) {
      setError(
        "Vui lòng đồng ý với điều khoản mua hàng."
      );
      return;
    }

    if (
      loading ||
      loadError ||
      !items.length ||
      !quote
    ) {
      setError(
        "Giỏ hàng chưa sẵn sàng để đặt hàng. Vui lòng kiểm tra lại."
      );
      return;
    }

    lock.current = true;
    setSaving(true);

    try {
      const response = await fetch(
        `${API}/api/v1/don-hang/tao-moi`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            thongTinGiaoNhan: info,
            phuongThucThanhToan: "cod",
            maYeuCau: requestId,
            tongDuKien: Number(quote.TongThanhToan)
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Không thể tạo đơn hàng."
        );
      }

      if (
        !result.data?.MaDon ||
        !Array.isArray(result.data.items)
      ) {
        throw new Error(
          "Chưa đọc được biên nhận. Vui lòng kiểm tra Đơn hàng của tôi."
        );
      }

      const images = new Map(
        items.map(item => [item.SKU, item.image])
      );

      const order = {
        ...result.data,
        items: result.data.items.map(item => ({
          ...item,
          image:
            images.get(item.SKU) ||
            "/images/placeholder-product.jpg"
        }))
      };

      try {
        saveCompletedOrder(order);
      } catch {
        // Vẫn chuyển biên nhận bằng router state.
      }

      window.dispatchEvent(
        new CustomEvent("mocan-cart-change", {
          detail: { count: 0 }
        })
      );

      navigate("/thanh-toan/thanh-cong", {
        replace: true,
        state: { order }
      });
    } catch (err) {
      setError(
        `${err.message} Nếu kết nối bị gián đoạn, kiểm tra Đơn hàng của tôi trước khi thử lại.`
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="checkout-page">
      <CheckoutHeader />

      <main className="checkout-main simple-checkout">
        <nav className="checkout-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/gio-hang">Giỏ hàng</Link>
          <span>/</span>
          <span>Thanh toán</span>
        </nav>

        <div className="checkout-title">
          <h1>Hoàn thiện tổ ấm của bạn</h1>
          <p>
            Nhập thông tin nhận hàng và kiểm tra đơn trước khi đặt.
          </p>
        </div>

        {loading ? (
          <p className="checkout-muted" role="status">
            Đang tải giỏ hàng...
          </p>
        ) : loadError ? (
          <div className="checkout-error" role="alert">
            {loadError}{" "}
            <button type="button" onClick={refresh}>
              Thử lại
            </button>
          </div>
        ) : !items.length ? (
          <div className="simple-checkout-empty">
            <h2>Giỏ hàng đang trống</h2>

            <Link
              to="/san-pham"
              className="checkout-button checkout-button-link"
            >
              Chọn sản phẩm
            </Link>

            <Link to="/tai-khoan/don-hang">
              Đơn hàng của tôi
            </Link>
          </div>
        ) : (
          <div className="checkout-layout">
            <section className="checkout-content">
              <form
                ref={formRef}
                onSubmit={submit}
                noValidate
              >
                <fieldset
                  className="simple-checkout-fields"
                  disabled={saving}
                >
                  <h2 className="checkout-section-title">
                    Thông tin giao hàng
                  </h2>

                  <div className="simple-checkout-row">
                    <label>
                      Họ tên người nhận *
                      <input
                        name="hoTen"
                        autoComplete="shipping name"
                        value={form.hoTen}
                        onChange={set("hoTen")}
                        maxLength={150}
                        aria-invalid={Boolean(errors.hoTen)}
                      />
                      {errors.hoTen && (
                        <small>{errors.hoTen}</small>
                      )}
                    </label>

                    <label>
                      Số điện thoại người nhận *
                      <input
                        name="soDienThoai"
                        type="tel"
                        autoComplete="shipping tel"
                        value={form.soDienThoai}
                        onChange={set("soDienThoai")}
                        maxLength={20}
                        aria-invalid={
                          Boolean(errors.soDienThoai)
                        }
                      />
                      {errors.soDienThoai && (
                        <small>{errors.soDienThoai}</small>
                      )}
                    </label>
                  </div>

                  <label>
                    Email *
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={set("email")}
                      maxLength={254}
                      aria-invalid={Boolean(errors.email)}
                    />
                    {errors.email && (
                      <small>{errors.email}</small>
                    )}
                  </label>

                  <label>
                    Địa chỉ giao hàng *
                    <textarea
                      name="diaChiGiao"
                      autoComplete="shipping street-address"
                      rows={3}
                      value={form.diaChiGiao}
                      onChange={set("diaChiGiao")}
                      maxLength={500}
                      placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố"
                      aria-invalid={
                        Boolean(errors.diaChiGiao)
                      }
                    />
                    {errors.diaChiGiao && (
                      <small>{errors.diaChiGiao}</small>
                    )}
                  </label>

                  <label>
                    Ghi chú giao hàng
                    <textarea
                      name="ghiChu"
                      rows={2}
                      value={form.ghiChu}
                      onChange={set("ghiChu")}
                      maxLength={500}
                    />
                    {errors.ghiChu && (
                      <small>{errors.ghiChu}</small>
                    )}
                  </label>

                  <div className="checkout-divider" />

                  <h2 className="checkout-section-title">
                    Phương thức thanh toán
                  </h2>

                  <div className="simple-checkout-cod">
                    <Truck size={22} />

                    <div>
                      <strong>
                        Thanh toán khi nhận hàng (COD)
                      </strong>
                      <p>
                        Bạn thanh toán khi nhận sản phẩm.
                        Đơn sẽ được gửi đến cửa hàng để xác nhận.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div
                      className="checkout-error"
                      role="alert"
                    >
                      {error}{" "}
                      <Link to="/tai-khoan/don-hang">
                        Đơn hàng của tôi
                      </Link>
                      {" "}·{" "}
                      <button
                        type="button"
                        onClick={refresh}
                      >
                        Cập nhật giỏ hàng
                      </button>
                    </div>
                  )}

                  <label className="checkout-agreement simple-checkout-agreement">
                    <input
                      type="checkbox"
                      checked={agreement}
                      onChange={e => {
                        setAgreement(e.target.checked);
                      }}
                    />

                    <span>
                      Tôi xác nhận thông tin nhận hàng và
                      đồng ý với điều khoản mua hàng.
                    </span>
                  </label>

                  <div className="checkout-actions">
                    <Link
                      to="/gio-hang"
                      className="checkout-back"
                    >
                      Quay lại giỏ hàng
                    </Link>

                    <button
                      type="submit"
                      className="checkout-button"
                      disabled={saving}
                    >
                      {saving
                        ? "Đang ghi nhận đơn..."
                        : "Xác nhận đặt hàng"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </fieldset>
              </form>
            </section>

            <CheckoutSummary
              items={items}
              loading={false}
              shipping={Number(quote?.PhiGiao || 0)}
            />
          </div>
        )}
      </main>

      <CheckoutFooter />
    </div>
  );
}