import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import formatPrice from "../utils/formatPrice";

export function CheckoutHeader() {
  return (
    <header className="checkout-header">
      <div className="checkout-header-inner">
        <Link to="/" className="checkout-brand" aria-label="Mộc An Interior">
          <span>MỘC AN</span>
          <small>INTERIOR</small>
        </Link>
        <span className="checkout-header-security">
          <LockKeyhole size={13} />
          Thanh toán an tâm · Hỗ trợ 1900 6868
        </span>
      </div>
    </header>
  );
}

export function CheckoutFooter() {
  return (
    <footer className="checkout-footer">
      <div>
        <span>© 2026 MỘC AN INTERIOR. Nuôi giữ một không gian.</span>
        <span>Bảo mật thông tin · Điều khoản mua hàng</span>
      </div>
    </footer>
  );
}

export function CheckoutSteps({ active }) {
  const steps = ["Thông tin giao hàng", "Thanh toán", "Xác nhận đơn hàng"];
  return (
    <ol className="checkout-steps" aria-label="Các bước thanh toán">
      {steps.map((step, index) => {
        const number = index + 1;
        const complete = number < active;
        return (
          <li
            className={`checkout-step${number === active ? " checkout-step-active" : ""}${complete ? " checkout-step-complete" : ""}`}
            key={step}
            aria-current={number === active ? "step" : undefined}
          >
            <span>{complete ? <Check size={12} /> : number}</span>
            <strong>{step}</strong>
          </li>
        );
      })}
    </ol>
  );
}

export function CheckoutSummary({ items, loading, shipping = 300000 }) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.GiaBan || item.price || 0) * Number(item.SoLuong || 0),
    0
  );
  const total = subtotal + (items.length ? shipping : 0);

  return (
    <aside className="checkout-summary">
      <h2>Đơn hàng của bạn</h2>
      {loading ? (
        <p className="checkout-muted">Đang tải sản phẩm...</p>
      ) : items.length === 0 ? (
        <p className="checkout-muted">Giỏ hàng chưa có sản phẩm.</p>
      ) : (
        <div className="checkout-summary-products">
          {items.map((item) => (
            <article className="checkout-summary-product" key={item.MaCTGio || item.SKU}>
              <div className="checkout-summary-image">
                <img
                  src={item.image || "/images/placeholder-product.jpg"}
                  alt=""
                  onError={(event) => {
                    event.currentTarget.src = "/images/placeholder-product.jpg";
                  }}
                />
                <span>{item.SoLuong}</span>
              </div>
              <div className="checkout-summary-product-info">
                <strong>{item.TenSanPham}</strong>
                <small>{[item.MauSac, item.KichThuoc].filter(Boolean).join(" / ") || item.SKU}</small>
                <span>{formatPrice(item.GiaBan || item.price)} × {item.SoLuong}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="checkout-summary-divider" />
      <div className="checkout-summary-row">
        <span>Tạm tính ({items.length} sản phẩm)</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div className="checkout-summary-row">
        <span>Phí giao hàng & lắp đặt</span>
        <span>{formatPrice(items.length ? shipping : 0)}</span>
      </div>
      <div className="checkout-summary-row">
        <span>Giảm giá</span>
        <span>{formatPrice(0)}</span>
      </div>
      <div className="checkout-summary-total">
        <span>Tổng thanh toán</span>
        <strong>{formatPrice(total)}</strong>
      </div>
      <p className="checkout-summary-tax">Đã bao gồm VAT. Phí giao hàng được tính theo đơn.</p>
      <p className="checkout-summary-security">
        <ShieldCheck size={14} />
        Bảo mật thông tin · Hỗ trợ 1900 6868
      </p>
    </aside>
  );
}
