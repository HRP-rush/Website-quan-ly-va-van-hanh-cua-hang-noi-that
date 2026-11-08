import { ArrowRight, Check, ClipboardCheck, PackageCheck, Truck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { CheckoutFooter, CheckoutHeader } from "../../components/CheckoutParts";
import { getCompletedOrder } from "../../services/checkoutService";
import formatPrice from "../../utils/formatPrice";
import "../../styles/checkout.css";

const paymentNotes = {
  cod: "Chưa cần thanh toán trước. Bạn thanh toán khi nhận hàng.",
  bank_transfer: "Đơn hàng đang chờ xác nhận thông tin chuyển khoản từ Mộc An.",
  online: "Đơn hàng đã được ghi nhận. Cổng thanh toán trực tuyến chưa được kết nối nên chưa phát sinh giao dịch."
};

const paymentLabels = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
  online: "Thanh toán trực tuyến"
};

function formatOrderDate(value) {
  if (!value) return "Vừa đặt";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Vừa đặt";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "long", timeStyle: "short" }).format(parsedDate);
}

export default function ThanhToanThanhCong() {
  const location = useLocation();
  const [savedOrder] = useState(() => {
    if (location.state?.order) return { order: location.state.order, error: "" };
    try {
      return { order: getCompletedOrder(), error: "" };
    } catch (error) {
      return { order: null, error: error.message };
    }
  });
  const { order, error: loadError } = savedOrder;

  if (loadError) {
    return (
      <div className="checkout-page">
        <CheckoutHeader />
        <main className="checkout-main checkout-success-main">
          <p className="checkout-error" role="alert">{loadError}</p>
          <Link className="checkout-button checkout-button-link" to="/tai-khoan/don-hang">Kiểm tra đơn hàng</Link>
        </main>
        <CheckoutFooter />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="checkout-page">
        <CheckoutHeader />
        <main className="checkout-main checkout-success-main">
          <h1>Không tìm thấy biên nhận đơn hàng</h1>
          <p>Nếu bạn vừa đặt hàng, hãy kiểm tra lịch sử đơn hàng để xem thông tin mới nhất.</p>
          <Link className="checkout-button checkout-button-link" to="/tai-khoan/don-hang">Kiểm tra đơn hàng</Link>
        </main>
        <CheckoutFooter />
      </div>
    );
  }

  const info = order.thongTinGiaoNhan || {};
  const methodCode = Object.keys(paymentLabels).find((key) => order.PhuongThucThanhToan === paymentLabels[key]);
  const items = Array.isArray(order.items) ? order.items : [];
  const date = formatOrderDate(order.NgayDat);
  const orderLabel = order.MaDonHienThi || (order.MaDon ? `#${order.MaDon}` : "Đơn hàng");

  return (
    <div className="checkout-page">
      <CheckoutHeader />
      <main className="checkout-success-main">
        <div className="checkout-success-icon"><Check size={25} strokeWidth={1.5} /></div>
        <p className="checkout-success-eyebrow">MỘT KHỞI ĐẦU CHO TỔ ẤM MỚI</p>
        <h1>Đặt hàng thành công!</h1>
        <p className="checkout-success-lead">Cảm ơn bạn đã lựa chọn MỘC AN INTERIOR.</p>
        <p className="checkout-success-description">Thông tin đơn hàng đã được ghi nhận. Mộc An sẽ liên hệ để xác nhận và sắp xếp lịch giao phù hợp với bạn.</p>

        <section className="checkout-receipt" aria-label="Thông tin đơn hàng">
          <div className="checkout-receipt-header">
            <div>
              <strong>{orderLabel}</strong>
              <span>Ngày đặt hàng: {date}</span>
            </div>
            <span className="checkout-order-status">{order.TrangThaiDon || "Chờ xác nhận"}</span>
          </div>
          <div className="checkout-receipt-body">
            <div className="checkout-receipt-items">
              <h2>Những lựa chọn của bạn</h2>
              {items.map((item, index) => (
                <article className="confirm-product checkout-receipt-product" key={`${item.SKU}-${index}`}>
                  <img
                    className="checkout-receipt-product-placeholder"
                    src={item.image || "/images/placeholder-product.jpg"}
                    alt=""
                    onError={(event) => {
                      event.currentTarget.src = "/images/placeholder-product.jpg";
                    }}
                  />
                  <div className="confirm-product-info">
                  <strong>{item.TenSanPham || "Sản phẩm"}</strong>
                    <small>{[item.MauSac, item.ChatLieu, item.KichThuoc].filter(Boolean).join(" / ") || item.SKU}</small>
                    <span>{formatPrice(item.GiaBan)} × {item.SoLuong}</span>
                  </div>
                </article>
              ))}
              <div className="checkout-receipt-address">
                <strong>Giao đến: {info.hoTen} · {info.soDienThoai}</strong>
                <span>{info.diaChiGiao}</span>
              </div>
            </div>
            <div className="checkout-receipt-payment">
              <div className="checkout-summary-row"><span>Tạm tính</span><span>{formatPrice(order.TienHang)}</span></div>
              <div className="checkout-summary-row"><span>Phí giao hàng & lắp đặt</span><span>{formatPrice(order.PhiGiao)}</span></div>
              <div className="checkout-summary-row"><span>Giảm giá</span><span>{formatPrice(order.GiamGia)}</span></div>
              <div className="checkout-summary-total"><span>Tổng thanh toán</span><strong>{formatPrice(order.TongThanhToan)}</strong></div>
              <p className="checkout-summary-tax">Đã bao gồm VAT. Không thu tiền khi đặt hàng.</p>
              <div className="checkout-receipt-method">
                <strong>{order.PhuongThucThanhToan}</strong>
                <span>{paymentNotes[methodCode] || "Đơn hàng đang chờ xác nhận thanh toán."}</span>
                <small>Trạng thái: {order.TrangThaiThanhToan || "Chờ thanh toán"}</small>
              </div>
            </div>
          </div>
        </section>

        <div className="checkout-success-steps">
          <div><ClipboardCheck size={19} /><strong>Xác nhận đơn hàng</strong><span>Mộc An sẽ gọi trong giờ làm việc.</span></div>
          <div><PackageCheck size={19} /><strong>Chuẩn bị cẩn thận</strong><span>Kiểm tra sản phẩm trước khi giao.</span></div>
          <div><Truck size={19} /><strong>Giao hàng & lắp đặt</strong><span>Dự kiến trong 3–5 ngày làm việc.</span></div>
        </div>
        <div className="checkout-success-actions">
          <Link className="checkout-button checkout-button-link" to={order.MaDon ? `/tai-khoan/don-hang/${order.MaDon}` : "/tai-khoan/don-hang"}>Xem đơn hàng</Link>
          <Link className="checkout-button checkout-button-link checkout-button-secondary" to="/">Tiếp tục mua sắm <ArrowRight size={14} /></Link>
        </div>
        <p className="checkout-success-help">Cần hỗ trợ? Gọi 1900 6868 hoặc gửi email đến hello@mocan.vn.</p>
      </main>
      <CheckoutFooter />
    </div>
  );
}
