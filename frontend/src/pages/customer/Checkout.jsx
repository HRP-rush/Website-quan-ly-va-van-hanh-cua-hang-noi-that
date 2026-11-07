import { useEffect, useState } from "react";
import Icon from "../../components/Icons.jsx";
import "../../styles/checkout.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function Checkout({ items, subtotal, shipping, onBack }) {
  const [submitted, setSubmitted] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [retryLocations, setRetryLocations] = useState(0);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProvinces() {
      setIsLoadingProvinces(true);
      setLocationError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/dia-chi/tinh-thanh`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải tỉnh, thành.");
        }
        setProvinces(result.data);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Lỗi tải tỉnh, thành:", error);
          setLocationError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingProvinces(false);
        }
      }
    }

    loadProvinces();
    return () => controller.abort();
  }, [retryLocations]);

  useEffect(() => {
    if (!selectedProvince) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadWards() {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/dia-chi/tinh-thanh/${selectedProvince}/phuong-xa`,
          { signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể tải phường, xã.");
        }
        setWards(result.data);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Lỗi tải phường, xã:", error);
          setLocationError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingWards(false);
        }
      }
    }

    loadWards();
    return () => controller.abort();
  }, [selectedProvince, retryLocations]);

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="checkout-page">
      <div className="breadcrumbs">
        <a href="#home">Trang chủ</a>
        <span>/</span>
        <a
          href="#cart"
          onClick={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          Giỏ hàng
        </a>
        <span>/</span>
        <span>Thanh toán</span>
      </div>

      <div className="checkout-heading">
        <h1>Hoàn thiện tổ ấm của bạn</h1>
        <p>Chia sẻ địa chỉ để Mộc An chuẩn bị hành trình đến nhà bạn.</p>
      </div>

      <ol className="checkout-progress" aria-label="Các bước thanh toán">
        <li className="is-current" aria-current="step">
          <span>1</span>
          <strong>Thông tin giao hàng</strong>
        </li>
        <li>
          <span>2</span>
          <span>Thanh toán</span>
        </li>
        <li>
          <span>3</span>
          <span>Xác nhận đơn hàng</span>
        </li>
      </ol>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <section className="checkout-form-section">
            <div className="checkout-section-heading">
              <h2>Thông tin người nhận</h2>
              <span>* Thông tin bắt buộc</span>
            </div>
            <div className="checkout-field">
              <label htmlFor="recipient-name">Họ và tên *</label>
              <input
                autoComplete="name"
                id="recipient-name"
                name="recipientName"
                placeholder="Nguyễn Minh Anh"
                required
              />
            </div>
            <div className="checkout-fields-row">
              <div className="checkout-field">
                <label htmlFor="recipient-phone">Số điện thoại *</label>
                <input
                  autoComplete="tel"
                  id="recipient-phone"
                  name="phone"
                  placeholder="090 123 4567"
                  required
                  type="tel"
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="recipient-email">Email *</label>
                <input
                  autoComplete="email"
                  id="recipient-email"
                  name="email"
                  placeholder="minh.anh@example.com"
                  required
                  type="email"
                />
              </div>
            </div>
          </section>

          <section className="checkout-form-section address-section">
            <div className="checkout-section-heading">
              <h2>Địa chỉ giao hàng</h2>
            </div>
            <div className="checkout-fields-row">
              <div className="checkout-field">
                <label htmlFor="recipient-city">Tỉnh / Thành phố *</label>
                <select
                  autoComplete="address-level1"
                  onChange={(event) => {
                    setSelectedProvince(event.target.value);
                    setSelectedWard("");
                    setWards([]);
                    setLocationError("");
                    setIsLoadingWards(Boolean(event.target.value));
                  }}
                  value={selectedProvince}
                  id="recipient-city"
                  name="city"
                  disabled={isLoadingProvinces || provinces.length === 0}
                  required
                >
                  <option value="" disabled>
                    {isLoadingProvinces ? "Đang tải tỉnh, thành..." : "Chọn tỉnh / thành phố"}
                  </option>
                  {provinces.map((province) => (
                    <option key={province.code} value={province.code}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="checkout-field">
                <label htmlFor="recipient-ward">Phường / Xã *</label>
                <select
                  autoComplete="address-level2"
                  onChange={(event) => setSelectedWard(event.target.value)}
                  value={selectedWard}
                  id="recipient-ward"
                  name="ward"
                  disabled={!selectedProvince || isLoadingWards || wards.length === 0}
                  required
                >
                  <option value="" disabled>
                    {isLoadingWards ? "Đang tải phường, xã..." : "Chọn phường / xã"}
                  </option>
                  {wards.map((ward) => (
                    <option key={ward.code} value={ward.code}>
                      {ward.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {locationError && (
              <p className="checkout-location-error" role="alert">
                {locationError}
                <button
                  onClick={() => {
                    setLocationError("");
                    setIsLoadingProvinces(true);
                    setIsLoadingWards(Boolean(selectedProvince));
                    setRetryLocations((attempt) => attempt + 1);
                  }}
                  type="button"
                >
                  Thử tải lại
                </button>
              </p>
            )}
            <div className="checkout-field">
              <label htmlFor="recipient-address">Địa chỉ chi tiết *</label>
              <input
                autoComplete="street-address"
                id="recipient-address"
                name="address"
                placeholder="Căn hộ, số nhà, tên đường..."
                required
              />
              <small>Địa chỉ này dùng cho giao hàng thực tế.</small>
            </div>
            <div className="checkout-field">
              <label htmlFor="delivery-note">
                Ghi chú giao hàng <span>(không bắt buộc)</span>
              </label>
              <textarea
                id="delivery-note"
                name="deliveryNote"
                placeholder="Ví dụ: Vui lòng gọi trước khi giao hàng."
                rows="3"
              />
            </div>
          </section>

          <p className="checkout-info">
            <Icon name="info" size={16} />
            <span>
              Nội thất có kích thước lớn. Mộc An sẽ gọi trước để xác nhận lối vào,
              thang máy và thời gian giao hàng. Vui lòng bảo đảm thông tin liên hệ
              chính xác.
            </span>
          </p>

          <div className="checkout-actions">
            <button className="checkout-back" onClick={onBack} type="button">
              <Icon name="arrowLeft" size={15} />
              Quay lại giỏ hàng
            </button>
            <button className="checkout-continue" type="submit">
              Tiếp tục đến thanh toán <span aria-hidden="true">→</span>
            </button>
          </div>
          {submitted && (
            <p className="checkout-form-status" role="status">
              Thông tin đã hợp lệ trên biểu mẫu. Hiện chưa có dịch vụ xử lý đơn
              hàng, nên chưa thể chuyển sang thanh toán.
            </p>
          )}
        </form>

        <aside className="checkout-order" aria-label="Đơn hàng của bạn">
          <h2>Đơn hàng của bạn</h2>
          <div className="checkout-products">
            {items.map((item) => (
              <article className="checkout-product" key={item.id}>
                <img src={item.image} alt={item.imageAlt} />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.material} / {item.dimensions}</p>
                  <span>{formatCurrency(item.price)} × {item.quantity}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="checkout-summary-row">
            <span>Tạm tính ({itemCount} sản phẩm)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="checkout-summary-row">
            <span>Phí giao hàng &amp; lắp đặt</span>
            <span>{formatCurrency(shipping)}</span>
          </div>
          <div className="checkout-summary-row">
            <span>Giảm giá</span>
            <span>0 ₫</span>
          </div>
          <div className="checkout-summary-total">
            <span>Tổng thanh toán</span>
            <strong>{formatCurrency(subtotal + shipping)}</strong>
          </div>
          <p className="checkout-tax-note">
            Đã bao gồm VAT. Không phát sinh chi phí khi nhận hàng.
          </p>
          <p className="checkout-secure-note">
            <Icon name="shield" size={15} />
            Bảo mật thông tin · Hỗ trợ 1900 6868
          </p>
        </aside>
      </div>
    </main>
  );
}

export default Checkout;
