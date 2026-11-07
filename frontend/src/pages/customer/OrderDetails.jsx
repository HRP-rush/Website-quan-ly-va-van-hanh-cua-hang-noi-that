import Icon from "../../components/Icons.jsx";
import "../../styles/order-details.css";

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function OrderDetails({ order, onBack }) {
  const itemCount = order.items.reduce((total, item) => total + item.soLuong, 0);

  return (
    <main className="order-detail-page">
      <nav className="order-detail-breadcrumbs" aria-label="Điều hướng">
        <a href="#home">Trang chủ</a>
        <span>/</span>
        <button onClick={onBack} type="button">Đơn hàng</button>
        <span>/</span>
        <span>{order.number}</span>
      </nav>

      <header className="order-detail-heading">
        <div>
          <h1>Đơn hàng #{order.number}</h1>
          <p>
            Ngày đặt: {formatDate(order.createdAt)} · {formatTime(order.createdAt)} · {itemCount} sản phẩm
          </p>
        </div>
        <button className="order-detail-back-link" onClick={onBack} type="button">
          <Icon name="arrowLeft" size={14} />
          Quay lại đơn hàng thành công
        </button>
        <span className="order-detail-status">{order.status ?? "Chờ xác nhận"}</span>
      </header>

      <ol className="order-tracking" aria-label="Tiến trình đơn hàng">
        {[
          ["Đã đặt hàng", "Đơn hàng đã được ghi nhận"],
          ["Đã xác nhận", "Chờ xác nhận"],
          ["Đang chuẩn bị", "Chưa bắt đầu"],
          ["Đang giao", "Chưa bàn giao"],
          ["Hoàn tất", "Chưa hoàn tất"],
        ].map(([label, description], index) => (
          <li className={index === 0 ? "is-current" : ""} key={label}>
            <span className="order-tracking-marker">
              {index === 0 ? <Icon name="check" size={13} /> : index + 1}
            </span>
            <strong>{label}</strong>
            <small>
              {index === 0
                ? `${formatDate(order.createdAt)} · ${formatTime(order.createdAt)}`
                : description}
            </small>
          </li>
        ))}
      </ol>

      <p className="order-detail-notice">
        <Icon name="info" size={16} />
        Đơn hàng chưa được bàn giao cho đơn vị vận chuyển. Thông tin vận chuyển sẽ được cập nhật khi có.
      </p>

      <div className="order-detail-layout">
        <div className="order-detail-main">
          <section className="order-detail-products">
            <h2>Sản phẩm trong đơn ({itemCount})</h2>
            <ul>
              {order.items.map((item) => (
                <li className="order-detail-product" key={item.sku}>
                  <img src={item.image} alt={item.imageAlt} />
                  <div className="order-detail-product-info">
                    <h3>{item.tenSanPham}</h3>
                    <p>{item.cauHinh}</p>
                    <small>SKU: {item.sku}</small>
                    <strong>
                      {formatCurrency(item.giaBan)} × {item.soLuong}
                    </strong>
                  </div>
                  <strong className="order-detail-line-total">
                    {formatCurrency(item.thanhTien)}
                  </strong>
                </li>
              ))}
            </ul>
            <p className="order-detail-snapshot-note">
              Tên sản phẩm, phân loại, số lượng và giá được lưu tại thời điểm đặt hàng.
            </p>
          </section>

          <section className="order-detail-recipient">
            <h2>Thông tin giao hàng</h2>
            <strong>{order.recipient.recipientName} · {order.recipient.phone}</strong>
            {order.recipient.email && <p>{order.recipient.email}</p>}
            <p>{order.address}</p>
            {order.recipient.deliveryNote && (
              <p>Ghi chú: {order.recipient.deliveryNote}</p>
            )}
          </section>

          <section className="order-detail-history">
            <h2>Lịch sử trạng thái</h2>
            <div className="order-history-entry">
              <span className="order-history-dot" />
              <div>
                <strong>
                  {formatDate(order.createdAt)} · {formatTime(order.createdAt)} — Đã đặt hàng
                </strong>
                <p>Đơn hàng đã được tiếp nhận và đang chờ Mộc An xác nhận.</p>
              </div>
            </div>
          </section>

          <section className="order-shipping-card">
            <h2>Thông tin vận chuyển</h2>
            <p>Chưa có mã giao hàng. Đội ngũ sẽ liên hệ để xác nhận điều kiện giao hàng, lối vào và thời gian phù hợp.</p>
          </section>
        </div>

        <aside className="order-detail-sidebar">
          <section className="order-detail-summary">
            <h2>Đơn hàng của bạn</h2>
            <div><span>Tạm tính</span><strong>{formatCurrency(order.tienHang)}</strong></div>
            <div><span>Phí giao hàng &amp; lắp đặt</span><strong>{formatCurrency(order.phiGiaoHang)}</strong></div>
            <div><span>Giảm giá</span><strong>0 ₫</strong></div>
            <div className="order-detail-total"><span>Tổng cộng</span><strong>{formatCurrency(order.tongThanhToan)}</strong></div>
            <small>Đã bao gồm VAT. Không phát sinh chi phí khi nhận hàng.</small>
          </section>

          <section className="order-detail-payment">
            <h2>Phương thức thanh toán</h2>
            <strong>{order.paymentMethodName}</strong>
            <span className="order-detail-payment-status">
              {order.paymentMethod === "COD" ? "Chờ thanh toán" : "Đang chờ thanh toán"}
            </span>
            <p>
              {order.paymentMethod === "COD"
                ? `Thanh toán ${formatCurrency(order.tongThanhToan)} khi nhận sản phẩm.`
                : "Thông tin thanh toán sẽ được cập nhật sau khi kết nối cổng thanh toán."}
            </p>
          </section>

          <section className="order-detail-support">
            <h2>Chúng tôi luôn ở đây</h2>
            <p>Cần cập nhật thông tin giao hàng? Liên hệ Mộc An để được hỗ trợ.</p>
            <a href="tel:19006868">1900 6868</a>
            <span> · </span>
            <a href="mailto:hello@mocan.vn">hello@mocan.vn</a>
          </section>
        </aside>
      </div>
    </main>
  );
}

export default OrderDetails;
