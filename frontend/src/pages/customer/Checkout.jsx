import { useEffect, useState } from "react";
import Icon from "../../components/Icons.jsx";
import "../../styles/checkout.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function Checkout({ items, subtotal, shipping, onBack }) {
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponNotice, setCouponNotice] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [retryLocations, setRetryLocations] = useState(0);
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const provinceName = provinces.find(
    (province) => String(province.code) === selectedProvince,
  )?.name;
  const wardName = wards.find(
    (ward) => String(ward.code) === selectedWard,
  )?.name;

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
    const formData = new FormData(event.currentTarget);
    setRecipient(Object.fromEntries(formData.entries()));
    setPaymentNotice("");
    setStep(2);
  }

  function handlePaymentContinue() {
    setPaymentNotice(
      "Phương thức đã chọn. Chức năng xác nhận đơn hàng và xử lý thanh toán chưa được kết nối.",
    );
  }

  function handleApplyCoupon(event) {
    event.preventDefault();
    setCouponNotice(
      couponCode.trim()
        ? "Mã ưu đãi chưa được kết nối. Đơn hàng hiện chưa áp dụng giảm giá."
        : "Vui lòng nhập mã ưu đãi.",
    );
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
        <p>
          {step === 1
            ? "Chia sẻ địa chỉ để Mộc An chuẩn bị hành trình đến nhà bạn."
            : "Lựa chọn phương thức thanh toán phù hợp với bạn."}
        </p>
      </div>

      <ol className="checkout-progress" aria-label="Các bước thanh toán">
        <li
          className={step === 1 ? "is-current" : "is-complete"}
          aria-current={step === 1 ? "step" : undefined}
        >
          <span>{step === 1 ? "1" : "✓"}</span>
          {step === 1 ? (
            <strong>Thông tin giao hàng</strong>
          ) : (
            <span>Thông tin giao hàng</span>
          )}
        </li>
        <li className={step === 2 ? "is-current" : ""} aria-current={step === 2 ? "step" : undefined}>
          <span>2</span>
          {step === 2 ? <strong>Thanh toán</strong> : <span>Thanh toán</span>}
        </li>
        <li>
          <span>3</span>
          <span>Xác nhận đơn hàng</span>
        </li>
      </ol>

      <div className="checkout-layout">
        {step === 1 ? (
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
                defaultValue={recipient?.recipientName ?? ""}
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
                  defaultValue={recipient?.phone ?? ""}
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
                  defaultValue={recipient?.email ?? ""}
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
                    const provinceCode = event.target.value;
                    setSelectedProvince(provinceCode);
                    setSelectedWard("");
                    setWards([]);
                    setLocationError("");
                    setIsLoadingWards(Boolean(provinceCode));
                    setRecipient((current) =>
                      current
                        ? { ...current, city: provinceCode, ward: "" }
                        : current,
                    );
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
                  onChange={(event) => {
                    const wardCode = event.target.value;
                    setSelectedWard(wardCode);
                    setRecipient((current) =>
                      current ? { ...current, ward: wardCode } : current,
                    );
                  }}
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
                defaultValue={recipient?.address ?? ""}
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
                defaultValue={recipient?.deliveryNote ?? ""}
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
        </form>
        ) : (
          <section className="checkout-form checkout-payment-step">
            <div className="checkout-recipient-card">
              <div>
                <strong>
                  Giao đến {recipient?.recipientName} · {recipient?.phone}
                </strong>
                <p>
                  {recipient?.address}, {wardName}, {provinceName}
                </p>
              </div>
              <button
                className="checkout-edit-recipient"
                onClick={() => setStep(1)}
                type="button"
              >
                Thay đổi
              </button>
            </div>

            <fieldset className="payment-methods">
              <legend>Phương thức thanh toán</legend>
              <label className={`payment-option ${paymentMethod === "COD" ? "is-selected" : ""}`}>
                <input
                  checked={paymentMethod === "COD"}
                  name="paymentMethod"
                  onChange={() => setPaymentMethod("COD")}
                  type="radio"
                  value="COD"
                />
                <span className="payment-option-copy">
                  <strong>Thanh toán khi nhận hàng (COD)</strong>
                  <small>
                    Thanh toán {formatCurrency(subtotal + shipping)} cho nhân
                    viên giao hàng.
                  </small>
                </span>
                <span className="payment-option-icon" aria-hidden="true">▣</span>
              </label>
              <label className={`payment-option ${paymentMethod === "BANK_TRANSFER" ? "is-selected" : ""}`}>
                <input
                  checked={paymentMethod === "BANK_TRANSFER"}
                  name="paymentMethod"
                  onChange={() => setPaymentMethod("BANK_TRANSFER")}
                  type="radio"
                  value="BANK_TRANSFER"
                />
                <span className="payment-option-copy">
                  <strong>Chuyển khoản ngân hàng</strong>
                  <small>Chỉ mô phỏng quy trình, không chuyển tiền thực tế.</small>
                  <span className="payment-coming-soon">Thanh toán mô phỏng</span>
                </span>
                <span className="payment-option-icon" aria-hidden="true">▤</span>
              </label>
              <label className={`payment-option ${paymentMethod === "ONLINE" ? "is-selected" : ""}`}>
                <input
                  checked={paymentMethod === "ONLINE"}
                  name="paymentMethod"
                  onChange={() => setPaymentMethod("ONLINE")}
                  type="radio"
                  value="ONLINE"
                />
                <span className="payment-option-copy">
                  <strong>Thanh toán trực tuyến</strong>
                  <small>Mở rộng cổng thanh toán, không thu tiền thật.</small>
                  <span className="payment-coming-soon">Thanh toán mô phỏng</span>
                </span>
                <span className="payment-option-icon" aria-hidden="true">▱</span>
              </label>
            </fieldset>

            <form className="checkout-coupon" onSubmit={handleApplyCoupon}>
              <label htmlFor="checkout-coupon-code">Mã ưu đãi</label>
              <span>Nhập mã nếu bạn có</span>
              <div>
                <input
                  id="checkout-coupon-code"
                  onChange={(event) => {
                    setCouponCode(event.target.value);
                    setCouponNotice("");
                  }}
                  placeholder="Mã giảm giá"
                  value={couponCode}
                />
                <button type="submit">Áp dụng</button>
              </div>
              <small>Chưa áp dụng ưu đãi. Giảm giá hiện tại: 0 ₫.</small>
              {couponNotice && <p role="status">{couponNotice}</p>}
            </form>

            <p className="checkout-info">
              <Icon name="info" size={16} />
              <span>
                Với COD, bạn thanh toán khi nhận hàng. Các phương thức trực
                tuyến hiện chỉ là giao diện mô phỏng.
              </span>
            </p>

            <div className="checkout-actions">
              <button
                className="checkout-back"
                onClick={() => setStep(1)}
                type="button"
              >
                <Icon name="arrowLeft" size={15} />
                Thông tin giao hàng
              </button>
              <button
                className="checkout-continue"
                onClick={handlePaymentContinue}
                type="button"
              >
                Kiểm tra đơn hàng <span aria-hidden="true">→</span>
              </button>
            </div>
            {paymentNotice && (
              <p className="checkout-form-status" role="status">
                {paymentNotice}
              </p>
            )}
          </section>
        )}

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
