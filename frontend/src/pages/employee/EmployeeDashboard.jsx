import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ClipboardList, RefreshCw } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getOrdersByStatus, updateOrderStatus } from "../../services/orderService";
import formatPrice from "../../utils/formatPrice";

const statuses = ["Chờ xác nhận", "Đã xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn tất"];
const nextAction = {
  "Chờ xác nhận": "Xác nhận đơn",
  "Đã xác nhận": "Bắt đầu chuẩn bị",
  "Đang chuẩn bị": "Bàn giao vận chuyển",
  "Đang giao": "Xác nhận hoàn tất"
};

function formatDate(value) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export default function EmployeeDashboard({ user }) {
  const greeting = useMemo(() => (user.HoTen || user.Email).trim().split(/\s+/).slice(-2).join(" "), [user]);
  const [status, setStatus] = useState(statuses[0]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(0);
  const [error, setError] = useState("");

  const refreshOrders = useCallback(async (selectedStatus = status) => {
    setLoading(true);
    setError("");
    try { setOrders(await getOrdersByStatus(selectedStatus)); }
    catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { refreshOrders(status); }, [status, refreshOrders]);

  async function advanceOrder(order) {
    const nextStatus = statuses[statuses.indexOf(order.TrangThai) + 1];
    if (!nextStatus) return;
    setUpdating(order.MaDon);
    setError("");
    try {
      await updateOrderStatus(order.MaDon, nextStatus);
      await refreshOrders(status);
    } catch (updateError) { setError(updateError.message); }
    finally { setUpdating(0); }
  }

  const totalValue = orders.reduce((sum, order) => sum + Number(order.TongThanhToan || 0), 0);
  return <WorkspaceLayout user={user} mode="employee" activeTitle="Đơn hàng">
    <div className="workspace-breadcrumb">Vận hành / Đơn hàng / Theo dõi và xử lý</div>
    <div className="workspace-head"><h1>Đơn hàng cần xử lý</h1>
      <p>Chào {greeting}, cập nhật trạng thái để khách hàng theo dõi tiến trình đơn hàng.</p></div>
    <div className="workspace-kpi-grid workspace-order-kpis">
      <section className="workspace-kpi"><p>{status}</p><strong>{String(orders.length).padStart(2, "0")}</strong><small>Đơn hàng trong bộ lọc hiện tại</small></section>
      <section className="workspace-kpi"><p>Tổng giá trị đang xem</p><strong>{formatPrice(totalValue)}</strong><small>Tính trên danh sách đang lọc</small></section>
      <section className="workspace-kpi"><p>Luồng trạng thái</p><strong>05 bước</strong><small>Từ tiếp nhận đến hoàn tất</small></section>
      <section className="workspace-kpi"><p>Cập nhật dữ liệu</p><strong>Trực tiếp</strong><small>Lấy từ cơ sở dữ liệu đơn hàng</small></section>
    </div>
    <section className="workspace-panel" id="employee-orders">
      <div className="workspace-order-panel-head"><div><h2><ClipboardList size={21}/> Danh sách đơn hàng</h2><p>Chọn trạng thái để lọc đơn đang chờ nhân viên xử lý.</p></div>
        <button className="workspace-refresh" type="button" onClick={() => refreshOrders()} disabled={loading}><RefreshCw size={15}/> Làm mới</button></div>
      <div className="workspace-filters" aria-label="Lọc đơn theo trạng thái">
        {statuses.map((item) => <button type="button" className={status === item ? "selected" : ""} key={item} onClick={() => setStatus(item)}>{item}</button>)}
      </div>
      {error && <p className="workspace-order-error" role="alert">{error}</p>}
      <div className="workspace-table-scroll"><table className="workspace-table">
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan="7">Đang tải đơn hàng…</td></tr> : orders.length === 0 ? <tr><td colSpan="7">Không có đơn hàng ở trạng thái này.</td></tr> : orders.map((order) => <tr key={order.MaDon}>
          <td>{order.MaDonHienThi}</td><td>{order.TenNguoiNhan}<small className="workspace-order-phone">{order.SDTNhan}</small></td><td>{formatDate(order.NgayDat)}</td><td>{order.SoSanPham}</td><td>{formatPrice(order.TongThanhToan)}</td>
          <td><span className="workspace-status">{order.TrangThai}</span></td>
          <td><button className="workspace-order-action" type="button" disabled={!nextAction[order.TrangThai] || updating === order.MaDon} onClick={() => advanceOrder(order)}>
            {updating === order.MaDon ? "Đang lưu…" : nextAction[order.TrangThai] || "Đã hoàn tất"}<ArrowRight size={13}/>
          </button></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </WorkspaceLayout>;
}
