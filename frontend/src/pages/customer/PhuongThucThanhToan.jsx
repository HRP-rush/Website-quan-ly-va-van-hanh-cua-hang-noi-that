import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CreditCard, Info, WalletCards } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CheckoutFooter, CheckoutHeader, CheckoutSteps, CheckoutSummary } from "../../components/CheckoutParts";
import { getCart } from "../../services/cartService";
import {
  getDeliveryInformation,
  getSavedPaymentMethod,
  savePaymentMethod
} from "../../services/checkoutService";
import "../../styles/checkout.css";

const methods = [
  {
    id: "cod",
    title: "Thanh toán khi nhận hàng (COD)",
    description: "Thanh toán khi bạn nhận và kiểm tra sản phẩm.",
    icon: WalletCards,
    note: "Bạn chưa cần thanh toán trước. Nhân viên sẽ xác nhận lịch giao hàng với bạn."
  },
  {
    id: "bank_transfer",
    title: "Chuyển khoản ngân hàng",
    description: "Thông tin chuyển khoản sẽ được nhân viên xác nhận sau khi đặt hàng.",
    icon: Building2,
    note: "Chưa kết nối đối soát chuyển khoản tự động; đơn hàng được ghi nhận ở trạng thái chờ thanh toán."
  },
  {
    id: "online",
    title: "Thanh toán trực tuyến",
    description: "Thanh toán trực tuyến an toàn qua cổng thanh toán.",
    icon: CreditCard,
    note: "Cổng VNPay/MoMo chưa được kết nối. Chưa phát sinh giao dịch trực tuyến ở bước này."
  }
];

export default function PhuongThucThanhToan() {
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [method, setMethod] = useState(() => getSavedPaymentMethod() || "cod");

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const information = getDeliveryInformation();
        if (!information) {
          navigate("/thanh-toan/giao-hang", { replace: true });
          return;
        }
        setDelivery(information);
        const cartItems = await getCart();
        if (active) {
          setItems(cartItems);
          if (!cartItems.length) setError("Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi thanh toán.");
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  function continueToConfirmation(event) {
    event.preventDefault();
    if (!items.length) {
      setError("Giỏ hàng đang trống. Vui lòng quay lại chọn sản phẩm.");
      return;
    }
    savePaymentMethod(method);
    navigate("/thanh-toan/xac-nhan");
  }

  const selectedMethod = methods.find((item) => item.id === method) || methods[0];

  return (
    <div className="checkout-page">
      <CheckoutHeader />
      <main className="checkout-main">
        <nav className="checkout-breadcrumb" aria-label="Điều hướng">
          <Link to="/">Trang chủ</Link><span>/</span><Link to="/gio-hang">Giỏ hàng</Link><span>/</span><span>Thanh toán</span>
        </nav>
        <div className="checkout-title">
          <h1>Hoàn thiện tổ ấm của bạn</h1>
          <p>Lựa chọn phương thức thanh toán phù hợp với bạn.</p>
        </div>
        <CheckoutSteps active={2} />

        <div className="checkout-layout">
          <section className="checkout-content">
            {delivery && (
              <div className="checkout-recipient-strip">
                <div>
                  <strong>Giao đến {delivery.hoTen} · {delivery.soDienThoai}</strong>
                  <span>{delivery.diaChiGiao}</span>
                </div>
                <Link to="/thanh-toan/giao-hang">Thay đổi</Link>
              </div>
            )}

            <h2 className="checkout-section-title">Phương thức thanh toán</h2>
            <form onSubmit={continueToConfirmation}>
              <div className="payment-method-list" role="radiogroup" aria-label="Chọn phương thức thanh toán">
                {methods.map((option) => {
                  const Icon = option.icon;
                  const isSelected = method === option.id;
                  return (
                    <label className={`payment-method${isSelected ? " payment-method-selected" : ""}`} key={option.id}>
                      <input
                        type="radio"
                        name="phuongThucThanhToan"
                        value={option.id}
                        checked={isSelected}
                        onChange={() => setMethod(option.id)}
                      />
                      <span className="payment-method-radio" aria-hidden="true" />
                      <span className="payment-method-copy">
                        <strong>{option.title}</strong>
                        <small>{option.description}</small>
                      </span>
                      <Icon className="payment-method-icon" size={19} />
                    </label>
                  );
                })}
              </div>
              <div className={`checkout-payment-note${method === "cod" ? "" : " checkout-payment-note-warning"}`}>
                <Info size={15} />
                <span>{selectedMethod.note}</span>
              </div>
              {error && <p className="checkout-error" role="alert">{error}</p>}

              <div className="checkout-actions">
                <Link to="/thanh-toan/giao-hang" className="checkout-back">
                  <ArrowLeft size={14} /> Thông tin giao hàng
                </Link>
                <button className="checkout-button" type="submit" disabled={loading || !items.length}>
                  Kiểm tra đơn hàng <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </section>
          <CheckoutSummary items={items} loading={loading} />
        </div>
      </main>
      <CheckoutFooter />
    </div>
  );
}
