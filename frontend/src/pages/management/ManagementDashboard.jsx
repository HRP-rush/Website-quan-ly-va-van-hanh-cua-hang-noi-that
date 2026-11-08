import { useState } from "react";
import WorkspaceLayout from "../../components/WorkspaceLayout";

const sampleOrders = [
  { code: "MA-20261102-001", name: "Nguyễn Minh Anh", date: "02/11/2026", money: "23.400.000 đ", status: "Chờ xác nhận" },
  { code: "MA-20261102-002", name: "Lê Thảo Vy", date: "02/11/2026", money: "13.100.000 đ", status: "Chờ xác nhận" },
  { code: "MA-20261101-006", name: "Phạm Gia Huy", date: "01/11/2026", money: "8.200.000 đ", status: "Đang chuẩn bị" }
];
const popular = [
  ["Sofa LUNA", 4], ["Bàn trà NORDIC", 3], ["Bàn ăn EIRA", 2],
  ["Ghế ăn MIRA", 2], ["Kệ TV LINEA", 1]
];
const chartPoints = [23.1, 23.1, 0, 32.8, 27, 17, 4.9];
const chartMax = 40;
const fmt = (n) => `${Math.round((n/chartMax)*100)}%`;

function RevenueChart() {
  const W=650, H=230, margin={left:34,right:12,top:16,bottom:30};
  const x = (i) => margin.left + i*(W-margin.left-margin.right)/(chartPoints.length-1);
  const y = (v) => H-margin.bottom - v/chartMax*(H-margin.top-margin.bottom);
  const points=chartPoints.map((v,i)=>`${x(i)},${y(v)}`).join(" ");
  return <svg className="workspace-chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Biểu đồ doanh thu minh họa trong 7 ngày">
    {[0,10,20,30,40].map(n => <g key={n}>
      <line x1={margin.left} x2={W-margin.right} y1={y(n)} y2={y(n)} stroke="#e8dfd4"/>
      <text x={2} y={y(n)+4} fill="#9a938b" fontSize="11">{n}</text>
    </g>)}
    <polyline points={points} fill="none" stroke="#a57a52" strokeWidth="2.5" strokeLinejoin="round"/>
    {['27/10','28/10','29/10','30/10','31/10','01/11','02/11'].map((d,i)=><text key={d} x={x(i)} y={H-8} textAnchor="middle" fontSize="10" fill="#888079">{d}</text>)}
  </svg>;
}
export default function ManagementDashboard({ user, mode }) {
  const [period, setPeriod] = useState("7 ngày");
  return <WorkspaceLayout user={user} mode={mode}>
    <div className="workspace-breadcrumb">Quản trị / Tổng quan / Tổng quan kinh doanh</div>
    <div className="workspace-head"><h1>Tổng quan kinh doanh</h1>
      <p>Theo dõi tình hình hoạt động của cửa hàng.</p></div>
    <div className="workspace-filters">{["Hôm nay", "7 ngày", "30 ngày"].map(p=><button key={p}
      className={period===p ? "selected" : ""} onClick={()=>setPeriod(p)}>{p}</button>)}
      <span>27/10–02/11/2026 • Dữ liệu minh họa (bộ lọc chỉ thay đổi lựa chọn)</span></div>
    <div className="workspace-kpi-grid">
      {[{title:"Doanh thu",amount:"126,6 triệu đ",info:"Đơn hoàn tất • không gồm phí giao"},
        {title:"Tổng số đơn hàng",amount:"24",info:"6 hoàn tất / 18 đang xử lý"},
        {title:"Sản phẩm đã bán",amount:"12",info:"Từ 6 đơn hoàn tất"},
        {title:"Sản phẩm sắp hết hàng",amount:"02 SKU",info:"1 sắp hết • 1 hết hàng"}].map(x=><section className="workspace-kpi" key={x.title}>
          <p>{x.title}</p><strong>{x.amount}</strong><small>{x.info}</small></section>)}
    </div>
    <div className="workspace-two-col workspace-chart-panels">
      <section className="workspace-panel"><h2>Doanh thu theo thời gian</h2>
        <p className="workspace-subcaption">Đơn vị: triệu đồng • Tổng 126,6</p><RevenueChart/>
        <small>23,1 · 23,1 · 0 · 32,8 · 27 · 17 · 4,9 triệu đ • Dữ liệu minh họa</small>
      </section>
      <section className="workspace-panel"><h2>Phân bổ trạng thái đơn</h2>
        <div className="workspace-donut-wrap"><div className="workspace-donut"><span>24<small>đơn</small></span></div>
          <div className="workspace-legend"><p><i style={{background:'#a57a52'}}/> Chờ xác nhận • 8</p>
            <p><i style={{background:'#31352f'}}/> Đang chuẩn bị • 4</p>
            <p><i style={{background:'#4e829e'}}/> Đang giao • 6</p>
            <p><i style={{background:'#e8e2da'}}/> Hoàn tất • 6</p></div></div>
        <small>Dữ liệu minh họa • 27/10–02/11/2026</small>
      </section>
    </div>
    <div className="workspace-two-col">
      <section className="workspace-panel"><h2>5 sản phẩm bán chạy</h2>
        <small>Số lượng đã bán • 12 sản phẩm / 6 đơn hoàn tất</small>
        <div className="workspace-bestsellers">{popular.map(([name,count])=><div key={name} className="workspace-best-row">
          <span>{name}</span><div className="workspace-progress"><div style={{width:fmt(count*10)}}/></div><strong>{count}</strong>
        </div>)}</div>
      </section>
      <section className="workspace-panel"><h2>Cảnh báo tồn kho</h2>
        <div className="workspace-low-stock"><div className="workspace-product-thumb">MỘC AN</div>
          <div><strong>LUNA • Linen Xám / 220 cm</strong><p>LUNA-LINEN-XAM-220</p>
          <span className="workspace-stock-alert">Sắp hết • Khả dụng 2</span></div></div>
        <div className="workspace-low-stock-caption">LUNA-DA-NAU-240 • Hết hàng (0)</div>
        <small>Ngưỡng cảnh báo ≤ 3. LUNA Linen Kem còn 12, không nằm trong cảnh báo.</small>
      </section>
    </div>
    <section className="workspace-panel workspace-wide"><h2>Đơn hàng gần đây</h2>
      <div className="workspace-table-scroll"><table className="workspace-table">
        <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>{sampleOrders.map(x=><tr key={x.code}><td>{x.code}</td><td>{x.name}</td><td>{x.date}</td><td>{x.money}</td>
          <td><span className="workspace-status">{x.status}</span></td><td><span className="workspace-muted">Chi tiết sẽ triển khai</span></td></tr>)}</tbody>
      </table></div><small>MA-20261102-001: 1 LUNA + 1 NORDIC = 23.100.000 đ + phí 300.000 đ = 23.400.000 đ • COD</small>
    </section>
    <section className="workspace-panel workspace-wide"><h2>Phiếu nhập gần đây</h2>
      <div className="workspace-receipts"><p>PN-003 • 02/11/2026<br/><span>Xưởng nội thất An Phú</span></p>
        <p>PN-002 • 30/10/2026<br/><span>Công ty Gỗ Việt</span></p>
        <p>PN-001 • 28/10/2026<br/><span>Xưởng Mộc Bình An</span></p></div>
    </section>
    <small className="workspace-footnote">Dữ liệu minh họa từ Figma ADM-01; không phản ánh dữ liệu thực của SQL Server.</small>
  </WorkspaceLayout>;
}
