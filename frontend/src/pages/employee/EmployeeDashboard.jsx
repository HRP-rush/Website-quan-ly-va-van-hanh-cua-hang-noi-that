import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";

const sampleOrders = [
  { code: "MA-20261102-001", name: "Nguyễn Minh Anh", date: "02/11/2026", money: "23.400.000 đ", status: "Chờ xác nhận" },
  { code: "MA-20261102-002", name: "Lê Thảo Vy", date: "02/11/2026", money: "13.100.000 đ", status: "Chờ xác nhận" },
  { code: "MA-20261101-006", name: "Phạm Gia Huy", date: "01/11/2026", money: "8.200.000 đ", status: "Đang chuẩn bị" }
];
const stats = [
  { title: "Đơn chờ xác nhận", amount: "08", info: "3 đơn mới hôm nay" },
  { title: "Đơn đang chuẩn bị", amount: "05", info: "Cần bàn giao đúng hẹn" },
  { title: "Đơn đang giao", amount: "06", info: "2 đơn dự kiến giao hôm nay" },
  { title: "Phiếu nhập gần đây", amount: "03", info: "Trong 7 ngày gần nhất" }
];
export default function EmployeeDashboard({ user }) {
  const greeting = useMemo(() => (user.HoTen || user.Email).trim().split(/\s+/).slice(-2).join(" "), [user]);
  return <WorkspaceLayout user={user} mode="employee">
    <div className="workspace-breadcrumb">Vận hành / Tổng quan / Tổng quan công việc</div>
    <div className="workspace-head"><h1>Tổng quan công việc</h1>
      <p>Chào {greeting}, cùng bắt đầu một ngày làm việc chỉn chu.</p></div>
    <p className="workspace-demo-note">Dữ liệu minh họa từ Figma EMP-01, chưa kết nối API đơn hàng và kho.</p>
    <div className="workspace-kpi-grid">{stats.map(x => <section className="workspace-kpi" key={x.title}>
      <p>{x.title}</p><strong>{x.amount}</strong><small>{x.info}</small></section>)}</div>
    <div className="workspace-quick-actions">
      <button disabled title="Sẽ nối đến EMP-03">Xử lý đơn hàng</button>
      <button disabled title="Sẽ nối đến EMP-07">Tạo phiếu nhập</button>
      <button disabled title="Sẽ nối đến EMP-06">Kiểm tra tồn kho</button>
    </div>
    <section className="workspace-panel"><h2>Đơn hàng cần xử lý</h2>
      <div className="workspace-table-scroll"><table className="workspace-table">
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{sampleOrders.map(x => <tr key={x.code}>
          <td>{x.code}</td><td>{x.name}</td><td>{x.date}</td><td>{x.money}</td>
          <td><span className="workspace-status">{x.status}</span></td>
          <td><span className="workspace-muted">Xem sau <ArrowRight size={13}/></span></td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <div className="workspace-two-col">
      <section className="workspace-panel"><h2>Sản phẩm sắp hết hàng</h2>
        <div className="workspace-low-stock"><div className="workspace-product-thumb">MỘC AN</div>
        <div><strong>Sofa LUNA • Linen Xám / 220 cm</strong><p>LUNA-LINEN-XAM-220</p>
          <span className="workspace-stock-alert">Sắp hết • Khả dụng 2</span></div></div>
        <div className="workspace-low-stock-caption">LUNA-DA-NAU-240 • Hết hàng (0)</div>
        <small>Ngưỡng cảnh báo: tồn khả dụng ≤ 3. Không gồm SKU còn 12 sản phẩm.</small>
      </section>
      <section className="workspace-panel"><h2>Hoạt động gần đây</h2>
        <div className="workspace-timeline"><p><time>09:42</time> Có đơn hàng mới MA-20261102-001.</p>
          <p><time>09:15</time> GH-20261101-003 bắt đầu giao hàng.</p>
          <p><time>08:30</time> Phiếu nhập PN-003 đã được ghi nhận.</p></div>
      </section>
    </div>
  </WorkspaceLayout>;
}
