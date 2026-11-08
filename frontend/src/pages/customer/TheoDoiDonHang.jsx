import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, ChevronRight, Clock3, PackageCheck, Truck } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getMyOrders, trackOrder } from "../../services/orderService";
import formatPrice from "../../utils/formatPrice";
import "../../styles/orderTracking.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const statusSteps = ["Chờ xác nhận", "Đã xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn tất"];

function formatDate(value, withTime = true) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", withTime
    ? { dateStyle: "short", timeStyle: "short" }
    : { dateStyle: "short" }).format(new Date(value));
}

const historyFilters = ["Tất cả", "Chờ xác nhận", "Đang xử lý", "Đang giao", "Hoàn tất", "Đã hủy"];

function belongsToFilter(order, filter) {
  if (filter === "Tất cả") return true;
  if (filter === "Đang xử lý") return ["Đã xác nhận", "Đang chuẩn bị"].includes(order.TrangThai);
  return order.TrangThai === filter;
}

function imageUrl(path) {
  if (!path) return "/images/placeholder-product.jpg";
  return /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
}

function OrderCard({ order }) {
  const paymentCode = order.PhuongThucThanhToan?.includes("COD") ? "COD" : order.PhuongThucThanhToan;
  const statusStyle = order.TrangThai === "Hoàn tất" ? "is-success" : order.TrangThai === "Đã hủy" ? "is-cancelled" : "";
  return <article className="history-order-card">
    <header><div><strong>#{order.MaDonHienThi}</strong><span>Ngày đặt: {formatDate(order.NgayDat, false)}</span></div><span className={`tracking-status-pill ${statusStyle}`}>{order.TrangThai}</span></header>
    <div className="history-order-products">{order.items.map((item, index) => <div className="history-order-product" key={`${item.SKU}-${index}`}>
      <img src={imageUrl(item.DuongDanAnh)} alt="" onError={(event) => { event.currentTarget.src = "/images/placeholder-product.jpg"; }}/>
      <div><strong>{item.TenSanPham}</strong><span>{item.CauHinh || item.SKU}</span><small>SKU: {item.SKU}</small><span>{formatPrice(item.GiaBan)} × {item.SoLuong}</span></div>
    </div>)}</div>
    <footer><div><span>{paymentCode} · {order.TrangThaiThanhToan || "Chờ thanh toán"}</span><strong>Tổng tiền: {formatPrice(order.TongThanhToan)}</strong></div><Link to={`/tai-khoan/don-hang/${order.MaDon}`}>Xem chi tiết <ChevronRight size={15}/></Link></footer>
  </article>;
}

export function DanhSachDonHang({ user }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("Tất cả");
  const [state, setState] = useState({ loading: true, error: "" });
  useEffect(() => {
    let active = true;
    getMyOrders().then((data) => {
      if (active) { setOrders(data); setState({ loading: false, error: "" }); }
    }).catch((error) => {
      if (active) setState({ loading: false, error: error.message });
    });
    return () => { active = false; };
  }, []);
  const visibleOrders = orders.filter((order) => belongsToFilter(order, filter));
  const initials = (user?.HoTen || "MA").split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();

  return <div className="order-tracking-page"><Header />
    <main className="tracking-main">
      <nav className="tracking-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><span>Đơn hàng của tôi</span></nav>
      <h1>Đơn hàng của tôi</h1>
      <p className="tracking-intro">Theo dõi từng lựa chọn trên hành trình về nhà.</p>
      <div className="history-layout">
        <aside className="history-profile"><div className="history-avatar">{initials}</div><strong>{user?.HoTen || "Khách hàng"}</strong><span>{user?.Email}</span>
          <nav aria-label="Tài khoản của tôi"><Link className="is-active" to="/tai-khoan/don-hang">Đơn hàng của tôi <ChevronRight size={15}/></Link></nav>
        </aside>
        <section className="history-results">
          <div className="history-filter-tabs" role="tablist" aria-label="Lọc đơn hàng">
            {historyFilters.map((item) => <button type="button" role="tab" aria-selected={filter === item} className={filter === item ? "is-active" : ""} key={item} onClick={() => setFilter(item)}>{item}{item === "Tất cả" ? ` (${orders.length})` : item === "Chờ xác nhận" || item === "Hoàn tất" || item === "Đã hủy" ? ` (${orders.filter((order) => belongsToFilter(order, item)).length})` : ""}</button>)}
          </div>
          {state.loading ? <p className="tracking-feedback">Đang tải đơn hàng…</p> : state.error ? <p className="tracking-feedback tracking-error" role="alert">{state.error}</p>
            : visibleOrders.length ? <><div className="history-order-list">{visibleOrders.map((order) => <OrderCard key={order.MaDon} order={order}/>)}</div><p className="history-result-count">Bạn đã xem tất cả {visibleOrders.length} đơn hàng.</p></>
              : <section className="tracking-empty"><PackageCheck size={28}/><h2>{orders.length ? "Không có đơn hàng phù hợp" : "Bạn chưa có đơn hàng"}</h2><p>{orders.length ? "Thử chọn một trạng thái khác để xem đơn hàng." : "Các đơn hàng đã đặt sẽ xuất hiện tại đây."}</p>{!orders.length && <Link to="/" className="tracking-primary">Khám phá sản phẩm</Link>}</section>}
        </section>
      </div>
    </main><Footer/>
  </div>;
}

export default function TheoDoiDonHang() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });
  useEffect(() => {
    let active = true;
    trackOrder(id).then((data) => {
      if (active) { setOrder(data); setState({ loading: false, error: "" }); }
    }).catch((error) => {
      if (active) setState({ loading: false, error: error.message });
    });
    return () => { active = false; };
  }, [id]);

  if (state.loading) return <div className="order-tracking-page"><Header/><main className="tracking-main"><p className="tracking-feedback">Đang tải thông tin đơn hàng…</p></main><Footer/></div>;
  if (state.error) return <div className="order-tracking-page"><Header/><main className="tracking-main"><p className="tracking-error" role="alert">{state.error}</p><Link to="/tai-khoan/don-hang" className="tracking-back">Quay lại đơn hàng của tôi</Link></main><Footer/></div>;

  const activeStep = statusSteps.indexOf(order.TrangThai);
  const currentHistory = order.lichSu?.at(-1);
  const isDelivered = activeStep >= 3;
  return <div className="order-tracking-page"><Header/>
    <main className="tracking-main">
      <nav className="tracking-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><Link to="/tai-khoan/don-hang">Đơn hàng của tôi</Link><span>/</span><span>{order.MaDonHienThi}</span></nav>
      <div className="tracking-order-heading"><div><h1>Đơn hàng #{order.MaDonHienThi}</h1><p>Ngày đặt: {formatDate(order.NgayDat)} · {order.items.length} sản phẩm</p></div><span className="tracking-status-pill">{order.TrangThai}</span></div>
      <ol className="tracking-progress" aria-label="Tiến trình đơn hàng">
        {statusSteps.map((step, index) => <li key={step} className={index <= activeStep ? "is-complete" : ""}>
          <span className="tracking-progress-marker">{index < activeStep ? <Check size={15}/> : index === activeStep ? <Clock3 size={14}/> : index + 1}</span>
          <strong>{step}</strong>
          <small>{index < activeStep ? formatDate(order.lichSu?.find((entry) => entry.TrangThaiMoi === step)?.ThoiDiem) : index === activeStep ? formatDate(currentHistory?.ThoiDiem) : "Chưa bắt đầu"}</small>
        </li>)}
      </ol>
      <div className="tracking-info-banner"><Truck size={18}/><span>{isDelivered ? "Đơn hàng đã được bàn giao cho đơn vị vận chuyển. Thông tin giao hàng sẽ được cập nhật khi có." : "Đơn hàng chưa được bàn giao để giao. Thông tin vận chuyển sẽ được cập nhật khi có."}</span></div>

      <div className="tracking-content-grid">
        <div className="tracking-main-column">
          <section className="tracking-section"><h2>Sản phẩm trong đơn ({order.items.length})</h2>
            {order.items.map((item, index) => <article className="tracking-product" key={`${item.SKU}-${index}`}>
              <img src={item.DuongDanAnh ? (/^https?:\/\//i.test(item.DuongDanAnh) ? item.DuongDanAnh : `${API_URL}${item.DuongDanAnh}`) : "/images/placeholder-product.jpg"} alt="" onError={(event) => { event.currentTarget.src = "/images/placeholder-product.jpg"; }}/>
              <div><strong>{item.TenSanPham}</strong><span>{item.CauHinh || item.SKU}</span><small>SKU: {item.SKU}</small><span>{formatPrice(item.GiaBan)} × {item.SoLuong}</span></div>
            </article>)}
          </section>
          <section className="tracking-section"><h2>Thông tin giao hàng</h2><strong>{order.TenNguoiNhan} · {order.SDTNhan}</strong><p>{order.DiaChiGiao}</p></section>
          <section className="tracking-section"><h2>Lịch sử trạng thái</h2>
            {order.lichSu.length ? <ol className="tracking-history">{[...order.lichSu].reverse().map((entry, index) => <li key={`${entry.ThoiDiem}-${index}`}><strong>{formatDate(entry.ThoiDiem)} — {entry.TrangThaiMoi}</strong><span>{entry.TrangThaiCu ? `Trạng thái trước đó: ${entry.TrangThaiCu}` : "Đơn hàng đã được tiếp nhận và đang chờ xác nhận."}</span></li>)}</ol> : <p>Chưa có cập nhật trạng thái.</p>}
          </section>
          <section className="tracking-shipping"><h2>Thông tin vận chuyển</h2><p>{isDelivered ? "Đơn hàng đang được chuẩn bị bàn giao cho đơn vị vận chuyển." : "Chưa có mã giao hàng. Đội ngũ sẽ liên hệ để xác nhận điều kiện giao hàng, lối vào và thời gian phù hợp."}</p></section>
        </div>
        <aside className="tracking-aside">
          <section className="tracking-summary"><h2>Đơn hàng của bạn</h2><div><span>Tạm tính</span><span>{formatPrice(order.TienHang)}</span></div><div><span>Phí giao hàng & lắp đặt</span><span>{formatPrice(order.PhiGiao)}</span></div><div><span>Giảm giá</span><span>{formatPrice(order.GiamGia)}</span></div><strong><span>Tổng cộng</span><span>{formatPrice(order.TongThanhToan)}</span></strong><small>Đã bao gồm VAT. Không phát sinh phí khi nhận hàng.</small></section>
          <section className="tracking-side-card"><h2>Phương thức thanh toán</h2><strong>{order.PhuongThucThanhToan}</strong><span className="tracking-status-pill">{order.TrangThaiThanhToan}</span><p>Thanh toán {formatPrice(order.TongThanhToan)} theo phương thức đã chọn.</p></section>
          <section className="tracking-side-card"><h2>Chúng tôi luôn ở đây</h2><p>Cần cập nhật thông tin giao hàng? Liên hệ Mộc An và cung cấp mã đơn.</p><a href="tel:19006868">1900 6868</a><span> · </span><a href="mailto:hello@mocan.vn">hello@mocan.vn</a></section>
        </aside>
      </div>
      <Link to="/tai-khoan/don-hang" className="tracking-back">‹ Đơn hàng của tôi</Link>
    </main><Footer/>
  </div>;
}
