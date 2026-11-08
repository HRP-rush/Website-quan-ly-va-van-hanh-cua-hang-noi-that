import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Info,
  LockKeyhole
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CheckoutFooter, CheckoutHeader, CheckoutSteps, CheckoutSummary } from "../../components/CheckoutParts";
import { checkCartStock, getCart } from "../../services/cartService";
import formatPrice from "../../utils/formatPrice";
import {
  createOrder,
  getDeliveryInformation,
  getSavedPaymentMethod
} from "../../services/checkoutService";
import "../../styles/checkout.css";

const paymentNames = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
  online: "Thanh toán trực tuyến"
};

export default function XacNhanDonHang() {
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [method, setMethod] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agreement, setAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const information = getDeliveryInformation();
        const savedMethod = getSavedPaymentMethod();
        if (!information) {
          navigate("/thanh-toan/giao-hang", { replace: true });
          return;
        }
        if (!paymentNames[savedMethod]) {
          navigate("/thanh-toan/phuong-thuc", { replace: true });
          return;
        }
        setDelivery(information);
        setMethod(savedMethod);
        const cartItems = await getCart();
        const checkedItems = await Promise.all(cartItems.map(async (item) => {
          try {
            const stock = await checkCartStock(item.MaBienThe);
            return { ...item, stock, stockCheckError: "" };
          } catch (stockError) {
            return { ...item, stock: null, stockCheckError: stockError.message };
          }
        }));
        if (active) {
          setItems(checkedItems);
          if (!checkedItems.length) setError("Giỏ hàng đang trống. Vui lòng quay lại chọn sản phẩm.");
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

  const stockUnavailable = items.some((item) =>
    item.stockCheckError ||
    item.stock?.TinhTrangKho !== "Còn hàng" ||
    Number(item.SoLuong) > Number(item.stock?.SoLuongKhaDung)
  );

  async function submitOrder(event) {
    event.preventDefault();
    setError("");
    setLoginRequired(false);
    if (!agreement) {
      setError("Vui lòng xác nhận đã đọc và đồng ý với các điều khoản mua hàng.");
      return;
    }
    if (!items.length || stockUnavailable) {
      setError("Tồn kho đã thay đổi hoặc chưa thể kiểm tra. Vui lòng kiểm tra giỏ hàng trước khi đặt.");
      return;
    }

    setSubmitting(true);
    try {
      const completedOrder = await createOrder(method, items);
      navigate("/thanh-toan/thanh-cong", { state: { order: completedOrder } });
    } catch (orderError) {
      setError(orderError.message);
      setLoginRequired(orderError.status === 401);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-page">
      <CheckoutHeader />
      <main className="checkout-main">
        <nav className="checkout-breadcrumb" aria-label="Điều hướng">
          <Link to="/">Trang chủ</Link><span>/</span><Link to="/gio-hang">Giỏ hàng</Link><span>/</span><span>Xác nhận đơn hàng</span>
        </nav>
        <div className="checkout-title">
          <h1>Hoàn thiện tổ ấm của bạn</h1>
          <p>Kiểm tra thông tin lần cuối trước khi gửi đơn hàng đến Mộc An.</p>
        </div>
        <CheckoutSteps active={3} />

        <div className="checkout-layout checkout-confirm-layout">
          <section className="checkout-content">
            <div className="checkout-section-heading">
              <h2 className="checkout-section-title">Thông tin giao hàng</h2>
              <Link to="/thanh-toan/giao-hang">Chỉnh sửa</Link>
            </div>
            {delivery && (
              <div className="confirm-recipient">
                <strong>{delivery.hoTen} · {delivery.soDienThoai}</strong>
                <span>{delivery.email}</span>
                <p>{delivery.diaChiGiao}</p>
                {delivery.ghiChu && <small>Ghi chú: {delivery.ghiChu}</small>}
              </div>
            )}

            <div className="checkout-divider" />
            <h2 className="checkout-section-title">Sản phẩm trong đơn ({items.length})</h2>
            {loading ? (
              <p className="checkout-muted">Đang kiểm tra giỏ hàng...</p>
            ) : (
              <div className="confirm-product-list">
                {items.map((item) => (
                  <article className="confirm-product" key={item.MaCTGio || item.SKU}>
                    <img
                      src={item.image || "/images/placeholder-product.jpg"}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.src = "/images/placeholder-product.jpg";
                      }}
                    />
                    <div className="confirm-product-info">
                      <strong>{item.TenSanPham}</strong>
                      <small>{[item.MauSac, item.ChatLieu, item.KichThuoc].filter(Boolean).join(" / ") || item.SKU}</small>
                      <span>Mã SKU: {item.SKU || item.MaBienThe}</span>
                      <span>{formatPrice(item.GiaBan || item.price)} × {item.SoLuong}</span>
                    </div>
                    {item.stock && (
                      <span className={`confirm-stock${stockUnavailable ? " confirm-stock-warning" : ""}`}>
                        {item.stock.TinhTrangKho === "Còn hàng" && Number(item.SoLuong) <= Number(item.stock.SoLuongKhaDung)
                          ? "Còn hàng"
                          : "Cần kiểm tra"}
                      </span>
                    )}
                  </article>
                ))}
              </div>
            )}

            <div className="checkout-divider" />
            <div className="checkout-section-heading">
              <h2 className="checkout-section-title">Phương thức thanh toán</h2>
              <Link to="/thanh-toan/phuong-thuc">Chỉnh sửa</Link>
            </div>
            <div className="confirm-payment">
              <CreditCard size={18} />
              <div>
                <strong>{paymentNames[method] || "Chưa chọn phương thức"}</strong>
                <span>{method === "cod" ? "Thanh toán khi nhận hàng." : "Đơn hàng được ghi nhận chờ thanh toán; hiện chưa phát sinh giao dịch trực tuyến."}</span>
              </div>
            </div>
            <div className="checkout-payment-note checkout-payment-note-warning">
              <AlertTriangle size={15} />
              <span>Tồn kho từng SKU sẽ được kiểm tra lại trong lúc tạo đơn. Nếu không đủ hàng, đơn sẽ không được tạo.</span>
            </div>

            {error && (
              <p className="checkout-error" role="alert">
                <Info size={15} />
                <span>{error} {loginRequired && <Link to="/dang-nhap">Đăng nhập</Link>}</span>
              </p>
            )}

            <form onSubmit={submitOrder}>
              <label className="checkout-agreement">
                <input
                  type="checkbox"
                  checked={agreement}
                  onChange={(event) => setAgreement(event.target.checked)}
                />
                <span>
                  Tôi đã đọc và đồng ý với Điều khoản mua hàng, Chính sách giao hàng và
                  Chính sách bảo mật của MỘC AN INTERIOR.
                </span>
              </label>
              <div className="checkout-actions">
                <Link to="/thanh-toan/phuong-thuc" className="checkout-back">
                  <ArrowLeft size={14} /> Phương thức thanh toán
                </Link>
                <button
                  className="checkout-button"
                  type="submit"
                  disabled={loading || submitting || !agreement || !items.length || stockUnavailable}
                >
                  {submitting ? "Đang tạo đơn..." : "Xác nhận đặt hàng"}
                  {!submitting && <ArrowRight size={14} />}
                </button>
              </div>
            </form>
            <p className="checkout-secure-note"><LockKeyhole size={12} /> Thông tin được bảo mật trong quá trình xử lý đơn hàng.</p>
          </section>
          <CheckoutSummary items={items} loading={loading} />
        </div>
      </main>
      <CheckoutFooter />
    </div>
  );
}
