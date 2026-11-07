import Icon from "./Icons.jsx";

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function OrderSummary({ itemCount, subtotal, shipping, onCheckout }) {
  return (
    <aside className="order-column" aria-label="Tóm tắt đơn hàng">
      <section className="order-summary">
        <h2>Đơn hàng của bạn</h2>
        <div className="summary-row">
          <span>Tạm tính ({itemCount} sản phẩm)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="summary-row">
          <span>Phí giao hàng &amp; lắp đặt</span>
          <span>{formatCurrency(shipping)}</span>
        </div>
        <div className="summary-row">
          <span>Giảm giá</span>
          <span>0 ₫</span>
        </div>
        <div className="summary-total">
          <span>Tổng thanh toán</span>
          <strong>{formatCurrency(subtotal + shipping)}</strong>
        </div>
        <p className="tax-note">
          Đã bao gồm VAT. Không phát sinh chi phí khi nhận hàng.
        </p>
        <button className="checkout-button" type="button" onClick={onCheckout}>
          Tiến hành thanh toán
        </button>
        <p className="secure-note">
          <Icon name="shield" size={15} />
          Bảo mật thông tin · Hỗ trợ 1900 6868
        </p>
      </section>
      <p className="delivery-note">
        <Icon name="truck" size={18} />
        <span>
          Giao hàng và lắp đặt tận nơi. Đội ngũ sẽ liên hệ trước khi đến.
        </span>
      </p>
    </aside>
  );
}

export default OrderSummary;
