import { useEffect, useState } from "react";
import Icon from "../../components/Icons.jsx";
import "../../styles/checkout.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

async function checkStockAvailability(items) {
  const response = await fetch(`${API_BASE_URL}/api/v1/gio-hang/kiem-tra-ton-kho`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
      })),
    }),
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể kiểm tra tồn kho. Vui lòng thử lại.");
  }

  return result;
}

async function submitOrder({ maNguoiDung, items, recipient, address, paymentMethod }) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/don-hang/tao-moi`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maNguoiDung,
        items: items.map((item) => ({
          sku: item.sku,
          quantity: item.quantity,
        })),
        tenNguoiNhan: recipient.recipientName,
        soDienThoai: recipient.phone,
        diaChiGiao: address,
        phuongThuc: paymentMethod,
      }),
    },
  );
  const result = await response.json();

  if (!response.ok || !result.success) {
    const error = new Error(result.message || "Không thể tạo đơn hàng. Vui lòng thử lại.");
    error.status = response.status;
    error.data = result;
    throw error;
  }

  return result.data;
}

function Checkout({
  items,
  subtotal,
  shipping,
  onBack,
  maNguoiDung,
  onViewOrder,
  onOrderCreated,
}) {
  const [step, setStep] = useState(1);
  const [recipient, setRecipient] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [failedOrder, setFailedOrder] = useState(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
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
  const paymentMethodName = {
    COD: "Thanh toán khi nhận hàng (COD)",
    BANK_TRANSFER: "Chuyển khoản ngân hàng",
    ONLINE: "Thanh toán trực tuyến",
  }[paymentMethod];

  useEffect(() => {
    const controller = new AbortController();

    async function loadProvinces() {
      setIsLoadingProvinces(true);
      setLocationError("");
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/dia-chi/tinh-thanh`, {
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
          `${API_BASE_URL}/api/v1/dia-chi/tinh-thanh/${selectedProvince}/phuong-xa`,
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
    setStep(2);
  }

  function handlePaymentContinue() {
    setConfirmationNotice("");
    setStep(3);
  }

  async function handleConfirmOrder() {
    setConfirmationNotice("");
    if (!Number.isSafeInteger(Number(maNguoiDung)) || Number(maNguoiDung) < 1) {
      setConfirmationNotice(
        "Chưa xác định được mã người dùng. Đơn hàng chưa được tạo; vui lòng đăng nhập hoặc cung cấp mã người dùng hợp lệ.",
      );
      return;
    }

    setIsProcessingOrder(true);
    try {
      setFailedOrder(null);
      const data = await submitOrder({
        maNguoiDung: Number(maNguoiDung),
        items,
        recipient,
        address: [recipient.address, wardName, provinceName].filter(Boolean).join(", "),
        paymentMethod,
      });
      const createdAt = new Date(data.ngayDat);
      const imageBySku = new Map(items.map((item) => [item.sku, item]));
      const confirmedOrderData = {
        number: `MA-${data.maDon}`,
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
        items: data.chiTiet.map((item) => ({
          ...item,
          image: imageBySku.get(item.sku)?.image ?? "",
          imageAlt: imageBySku.get(item.sku)?.imageAlt ?? item.tenSanPham,
        })),
        tienHang: data.tienHang,
        phiGiaoHang: data.phiGiaoHang,
        tongThanhToan: data.tongThanhToan,
        recipient,
        address: [recipient.address, wardName, provinceName].filter(Boolean).join(", "),
        paymentMethod,
        paymentMethodName,
        status: "Chờ xác nhận",
      };
      setConfirmedOrder(confirmedOrderData);
      onOrderCreated();
    } catch (error) {
      if (error.status === 409 && error.data?.sanPhamKhongDuHang?.length) {
        setFailedOrder({ items: error.data.sanPhamKhongDuHang });
        return;
      }
      console.error("Lỗi tạo đơn hàng:", error);
      setConfirmationNotice(
        error.message || "Không thể tạo đơn hàng. Vui lòng thử lại.",
      );
    } finally {
      setIsProcessingOrder(false);
    }
  }

  async function handleRetryStockCheck() {
    setIsProcessingOrder(true);
    try {
      const result = await checkStockAvailability(items);
      if (!result.duHang) {
        setFailedOrder({ items: result.sanPhamKhongDuHang });
        return;
      }

      setFailedOrder(null);
      setConfirmationNotice("");
    } catch (error) {
      console.error("Lỗi kiểm tra lại tồn kho:", error);
      setFailedOrder((current) => ({
        ...current,
        error:
          error.message || "Không thể kiểm tra tồn kho. Vui lòng thử lại.",
      }));
    } finally {
      setIsProcessingOrder(false);
    }
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
    <main className={`checkout-page${confirmedOrder ? " checkout-page-success" : ""}${failedOrder ? " checkout-page-failure" : ""}`}>
      {failedOrder ? (
        <section className="order-failure" aria-labelledby="order-failure-title">
          <div className="order-failure-icon" aria-hidden="true">
            <Icon name="warning" size={27} />
          </div>
          <p className="order-success-eyebrow">MỘC AN INTERIOR</p>
          <h1 id="order-failure-title">Đặt hàng không thành công</h1>
          <p className="order-failure-intro">
            Rất tiếc, một số sản phẩm hiện không đủ tồn kho. Đơn hàng chưa được
            tạo và bạn chưa bị tính phí.
          </p>

          <section className="order-failure-card">
            <h2>Sản phẩm không đủ tồn kho</h2>
            <ul className="order-failure-items">
              {failedOrder.items.map((item) => (
                <li key={item.sku}>
                  <div>
                    <strong>{item.tenSanPham}</strong>
                    <span>SKU: {item.sku}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="order-failure-total">
              <span>Tổng đơn hàng</span>
              <strong>{formatCurrency(subtotal + shipping)}</strong>
            </div>
          </section>

          {failedOrder.error && (
            <p className="order-failure-error" role="alert">
              {failedOrder.error}
            </p>
          )}
          <div className="order-success-actions">
            <button
              className="checkout-continue"
              disabled={isProcessingOrder}
              onClick={handleRetryStockCheck}
              type="button"
            >
              {isProcessingOrder ? "Đang kiểm tra..." : "Thử lại"}
            </button>
            <button
              className="order-success-continue"
              onClick={onBack}
              type="button"
            >
              Quay lại giỏ hàng
            </button>
          </div>
        </section>
      ) : confirmedOrder ? (
        <section className="order-success" aria-labelledby="order-success-title">
          <div className="order-success-icon" aria-hidden="true">
            <Icon name="check" size={28} />
          </div>
          <p className="order-success-eyebrow">MỘT KHỞI ĐẦU CHO TỔ ẤM MỚI</p>
          <h1 id="order-success-title">Đặt hàng thành công!</h1>
          <p className="order-success-thanks">
            Cảm ơn bạn đã lựa chọn MỘC AN INTERIOR.
          </p>
          <p className="order-success-intro">
            Đơn hàng đã được lưu thành công vào hệ thống. Mộc An sẽ liên hệ để
            xác nhận và sắp xếp lịch giao phù hợp với bạn.
          </p>
          <section className="order-success-card" id="success-order-details">
            <div className="order-success-card-heading">
              <div>
                <strong>{confirmedOrder.number}</strong>
                <span>
                  Ngày đặt hàng:{" "}
                  {confirmedOrder.createdAt.toLocaleDateString("vi-VN")}
                </span>
              </div>
              <span className="order-success-status">Chờ xác nhận</span>
            </div>

            <div className="order-success-card-content">
              <section className="order-success-products">
                <h2>Những lựa chọn của bạn</h2>
                {confirmedOrder.items.map((item) => (
                  <article className="order-success-product" key={item.sku}>
                    <img src={item.image} alt={item.imageAlt} />
                    <div>
                      <h3>{item.tenSanPham}</h3>
                      <p>{item.cauHinh} · SKU: {item.sku}</p>
                      <strong>
                        {formatCurrency(item.giaBan)} × {item.soLuong}
                      </strong>
                    </div>
                  </article>
                ))}
                <p className="order-success-delivery">
                  Giao đến: {recipient?.recipientName} · {recipient?.phone}
                  <br />
                  {wardName}, {provinceName}
                  <br />
                  {recipient?.address}
                  {recipient?.email && (
                    <>
                      <br />
                      Email: {recipient.email}
                    </>
                  )}
                </p>
              </section>

              <section className="order-success-payment">
                <div className="checkout-summary-row">
                  <span>
                    Tạm tính ({confirmedOrder.items.reduce(
                      (total, item) => total + item.soLuong,
                      0,
                    )} sản phẩm)
                  </span>
                  <span>{formatCurrency(confirmedOrder.tienHang)}</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Phí giao hàng &amp; lắp đặt</span>
                  <span>{formatCurrency(confirmedOrder.phiGiaoHang)}</span>
                </div>
                <div className="checkout-summary-row">
                  <span>Giảm giá</span>
                  <span>0 ₫</span>
                </div>
                <div className="checkout-summary-total">
                  <span>Tổng thanh toán</span>
                  <strong>{formatCurrency(confirmedOrder.tongThanhToan)}</strong>
                </div>
                <p className="checkout-tax-note">
                  Đã bao gồm VAT. Không phát sinh chi phí khi nhận hàng.
                </p>
                <div className="order-success-payment-method">
                  <strong>{paymentMethodName}</strong>
                  <span>
                    {paymentMethod === "COD"
                      ? "Chưa thanh toán · Không cần chuyển khoản trước."
                      : "Phương thức thanh toán đang ở chế độ mô phỏng."}
                  </span>
                </div>
              </section>
            </div>
          </section>

          <ol className="order-success-steps">
            <li>
              <Icon name="clipboard" size={20} />
              <span>
                <strong>Xác nhận đơn hàng</strong>
                <small>Mộc An sẽ gọi trong giờ làm việc.</small>
              </span>
            </li>
            <li>
              <Icon name="package" size={20} />
              <span>
                <strong>Chuẩn bị cẩn thận</strong>
                <small>Kiểm tra sản phẩm trước khi giao.</small>
              </span>
            </li>
            <li>
              <Icon name="truck" size={20} />
              <span>
                <strong>Giao hàng &amp; lắp đặt</strong>
                <small>Dự kiến trong 3–5 ngày làm việc.</small>
              </span>
            </li>
          </ol>

          <div className="order-success-actions">
            <button
              className="checkout-continue"
              onClick={() => onViewOrder(confirmedOrder)}
              type="button"
            >
              Xem đơn hàng
            </button>
            <a
              className="order-success-continue"
              href="#products"
            >
              Tiếp tục mua sắm
            </a>
          </div>
          <p className="order-success-support">
            Cần hỗ trợ? Gọi 1900 6868 hoặc gửi email đến hello@mocan.vn.
          </p>
        </section>
      ) : (
        <>
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
            : step === 2
              ? "Lựa chọn phương thức thanh toán phù hợp với bạn."
              : "Kiểm tra thông tin lần cuối trước khi gửi đơn hàng đến Mộc An."}
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
        <li
          className={step > 2 ? "is-complete" : step === 2 ? "is-current" : ""}
          aria-current={step === 2 ? "step" : undefined}
        >
          <span>{step > 2 ? "✓" : "2"}</span>
          {step === 2 ? <strong>Thanh toán</strong> : <span>Thanh toán</span>}
        </li>
        <li className={step === 3 ? "is-current" : ""} aria-current={step === 3 ? "step" : undefined}>
          <span>3</span>
          {step === 3 ? <strong>Xác nhận đơn hàng</strong> : <span>Xác nhận đơn hàng</span>}
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
              <label htmlFor="recipient-name">Họ Và Tên *</label>
              <input
                autoComplete="name"
                id="recipient-name"
                name="recipientName"
                placeholder="Họ Và Tên"
                defaultValue={recipient?.recipientName ?? ""}
                required
              />
            </div>
            <div className="checkout-fields-row">
              <div className="checkout-field">
                <label htmlFor="recipient-phone">Số Điện Thoại *</label>
                <input
                  autoComplete="tel"
                  id="recipient-phone"
                  name="phone"
                  placeholder="Số Điện Thoại"
                  defaultValue={recipient?.phone ?? ""}
                  inputMode="numeric"
                  onChange={(event) => {
                    event.target.value = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                  }}
                  pattern="0(3[2-9]|5[25689]|7[06789]|8[1-9]|9[0-9])[0-9]{7}"
                  required
                  type="tel"
                  title="Nhập số di động Việt Nam 10 chữ số với đầu số được cấp: 032–039, 052, 055, 056, 058, 059, 070, 076–079, 081–089 hoặc 090–099."
                />
              </div>
              <div className="checkout-field">
                <label htmlFor="recipient-email">Email *</label>
                <input
                  autoComplete="email"
                  id="recipient-email"
                  name="email"
                  placeholder="Email"
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
        ) : step === 2 ? (
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
          </section>
        ) : (
          <section className="checkout-form checkout-confirmation">
            <section className="confirmation-section">
              <div className="confirmation-section-heading">
                <h2>Thông tin giao hàng</h2>
                <button
                  className="checkout-edit-recipient"
                  onClick={() => setStep(1)}
                  type="button"
                >
                  Chỉnh sửa
                </button>
              </div>
              <strong className="confirmation-recipient-name">
                {recipient?.recipientName} · {recipient?.phone}
              </strong>
              {recipient?.email && (
                <p className="confirmation-email">{recipient.email}</p>
              )}
              <p className="confirmation-address">
                {recipient?.address}, {wardName}, {provinceName}
              </p>
              {recipient?.deliveryNote && (
                <p className="confirmation-delivery-note">
                  Ghi chú: {recipient.deliveryNote}
                </p>
              )}
            </section>

            <section className="confirmation-section">
              <h2>Sản phẩm trong đơn ({itemCount})</h2>
              <div className="confirmation-products">
                {items.map((item) => (
                  <article className="confirmation-product" key={item.id}>
                    <img src={item.image} alt={item.imageAlt} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.material} / {item.dimensions}</p>
                      <small>SKU: {item.sku}</small>
                      <strong>
                        {formatCurrency(item.price)} × {item.quantity}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
              <p className="confirmation-stock-note">
                Tồn kho, phân loại và số lượng sẽ được kiểm tra lại trước khi
                xác nhận đặt hàng.
              </p>
            </section>

            <section className="confirmation-section confirmation-payment">
              <div className="confirmation-section-heading">
                <h2>{paymentMethodName}</h2>
                <button
                  className="checkout-edit-recipient"
                  onClick={() => setStep(2)}
                  type="button"
                >
                  Chỉnh sửa
                </button>
              </div>
              <p>
                {paymentMethod === "COD"
                  ? `Thanh toán ${formatCurrency(subtotal + shipping)} khi nhận sản phẩm.`
                  : "Phương thức này đang ở chế độ mô phỏng; chưa phát sinh giao dịch."}
              </p>
            </section>

            <p className="confirmation-stock-warning">
              <Icon name="info" size={16} />
              <span>
                Tồn kho từng SKU phải được kiểm tra lại trước khi đặt. Nếu
                không đủ hàng, đơn sẽ không được tạo và bạn cần điều chỉnh giỏ
                hàng.
              </span>
            </p>

            <label className="confirmation-terms">
              <input
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  setConfirmationNotice("");
                }}
                type="checkbox"
              />
              <span>
                Tôi đã đọc và đồng ý với Điều khoản mua hàng, Chính sách giao
                hàng và Chính sách bảo mật của MỘC AN INTERIOR.
              </span>
            </label>

            <div className="checkout-actions">
              <button
                className="checkout-back"
                onClick={() => setStep(2)}
                type="button"
              >
                <Icon name="arrowLeft" size={15} />
                Phương thức thanh toán
              </button>
              <button
                className="checkout-continue"
                disabled={!acceptedTerms || isProcessingOrder}
                onClick={handleConfirmOrder}
                type="button"
              >
                {isProcessingOrder
                  ? "Đang tạo đơn hàng..."
                  : "Xác nhận đặt hàng"}
              </button>
            </div>
            {confirmationNotice && (
              <p className="checkout-form-status" role="status">
                {confirmationNotice}
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
          {step === 3 && (
            <section className="after-order">
              <h2>Sau khi đặt hàng</h2>
              <ol>
                <li>Nhận mã đơn và email xác nhận.</li>
                <li>Mộc An liên hệ xác nhận thông tin.</li>
                <li>Chuẩn bị, giao hàng và lắp đặt.</li>
              </ol>
            </section>
          )}
        </aside>
      </div>
        </>
      )}
    </main>
  );
}

export default Checkout;
