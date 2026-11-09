import { useEffect, useMemo, useState } from 'react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { layBaoCao, taiExcelDoanhThu } from '../../services/baoCaoService';
import '../../styles/thongKeBaoCao.css';

const formatMoney = value => `${Math.round(Number(value) || 0).toLocaleString('vi-VN')} đ`;
const shortMoney = value => `${(Number(value || 0) / 1_000_000).toLocaleString('vi-VN',{maximumFractionDigits:1})} triệu đ`;
const iso = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const shift = days => { const date = new Date(); date.setHours(12,0,0,0); date.setDate(date.getDate()-days); return iso(date); };
const dateLabel = str => { const [y,m,d] = str.split('-'); return `${d}/${m}/${y}`; };
const shortDate = str => { const [,m,d] = str.split('-'); return `${d}/${m}`; };
const addDay = str => {const [y,m,d] = str.split('-').map(Number); const date = new Date(y,m-1,d,12); date.setDate(date.getDate()+1); return iso(date);};
function groupKey(day, group) {
  if (group === 'thang') return day.slice(0,7);
  if (group === 'tuan') {const [y,m,d]=day.split('-').map(Number);const dt=new Date(y,m-1,d,12);dt.setDate(dt.getDate()-((dt.getDay()+6)%7));return iso(dt);}
  return day;
}
function groupLabel(key, group) {return group==='thang'?`${key.slice(5,7)}/${key.slice(0,4)}`:group==='tuan'?`Tuần ${shortDate(key)}`:shortDate(key);}
function grouped(data, from, to, group, dateKey, valueKey) {
  const totals = new Map(); for (let day=from;day<=to;day=addDay(day)) totals.set(groupKey(day,group),0);
  for(const row of data||[]) {const key=groupKey(String(row[dateKey]).slice(0,10),group);totals.set(key,(totals.get(key)||0)+Number(row[valueKey]||0));}
  return [...totals].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,value])=>({key,label:groupLabel(key,group),value}));
}
function Graph({data, kind='line', unit=''}) {
  const width=660,height=252,left=45,right=14,top=16,bottom=40;
  const max=Math.max(1,...data.map(x=>x.value))*1.15;
  const x=i=>left+(data.length===1?(width-left-right)/2:i*(width-left-right)/Math.max(1,data.length-1));
  const y=v=>height-bottom-(v/max)*(height-top-bottom);
  const points=data.map((d,i)=>`${x(i)},${y(d.value)}`).join(' ');
  const ticks=[0,1,2,3,4];
  if(!data.length)return <div className="bcr-empty">Không có dữ liệu.</div>;
  return <div className="bcr-chart-scroll"><svg className="bcr-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={kind==='line'?'Biểu đồ doanh thu':'Biểu đồ số đơn đặt'}>
    {ticks.map(i=><g key={i}><line x1={left} x2={width-right} y1={y(max*i/4)} y2={y(max*i/4)} stroke="#e9e1d9"/><text x={left-7} y={y(max*i/4)+3} textAnchor="end" fontSize="10" fill="#968d83">{unit==='triệu'?((max*i/4)/1e6).toFixed(1):Math.round(max*i/4)}</text></g>)}
    {kind==='line' ? <><polyline points={points} stroke="#a97d56" strokeWidth="2.5" fill="none" strokeLinejoin="round"/>{data.length===1&&<circle cx={x(0)} cy={y(data[0].value)} r="4" fill="#a97d56"/>}</> : data.map((d,i)=> <rect key={d.key} x={x(i)-Math.min(22,(width-left-right)/data.length*.35)} y={y(d.value)} width={Math.min(44,(width-left-right)/data.length*.7)} height={Math.max(0,height-bottom-y(d.value))} rx="3" fill="#a97d56"><title>{d.label}: {d.value}</title></rect>)}
    {data.map((d,i)=> (data.length<=12 || i%(Math.ceil(data.length/9))===0 || i===data.length-1) && <text key={d.key} x={x(i)} y={height-13} fontSize="10" fill="#928981" textAnchor="middle">{d.label}</text>)}
  </svg></div>;
}
function Donut({rows}) {
  const colors=['#a87c55','#30362f','#62879a','#e1d8cd','#b5b0a8','#d9ac87'];
  const total=rows.reduce((sum,r)=>sum+Number(r.SoLuong),0);
  let current=0; const stops=rows.map((r,i)=>{const a=current;current+=Number(r.SoLuong)/Math.max(1,total)*100;return `${colors[i%colors.length]} ${a}% ${current}%`;});
  return <div className="bcr-donut-area"><div className="bcr-donut" style={{background:total?`conic-gradient(${stops.join(',')})`:'#ece7e0'}}><div><strong>{total}</strong><span>sản phẩm</span></div></div><div className="bcr-legend">{rows.length?rows.map((r,i)=><div key={r.MaDanhMuc}><i style={{background:colors[i%colors.length]}}/>{r.TenDanhMuc} • {Number(r.SoLuong)}</div>):<span>Chưa có sản phẩm bán ra.</span>}</div></div>;
}
function getImage(path){if(!path)return '';if(/^https?:\/\//i.test(path))return path;const base=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');return `${base}${path.startsWith('/')?'':'/'}${path}`;}
export default function ThongKeBaoCao({user}) {
  const [exportOpen,setExportOpen] = useState(false);
  const [exportPeriod,setExportPeriod] = useState('thang');
  const [exportDay,setExportDay] = useState(() => shift(0));
  const [exportWeek,setExportWeek] = useState(() => shift(0));
  const [exportMonth,setExportMonth] = useState(() => shift(0).slice(0,7));
  const [exportQuarter,setExportQuarter] = useState(() => String(Math.floor(new Date().getMonth()/3)+1));
  const [exportYear,setExportYear] = useState(() => String(new Date().getFullYear()));
  const [exportLoading,setExportLoading] = useState(false);
  const [exportError,setExportError] = useState('');
  const [preset,setPreset]=useState('7');
  const [from,setFrom]=useState(()=>shift(6)),[to,setTo]=useState(()=>shift(0));
  const [group,setGroup]=useState('ngay');
  const [applied,setApplied]=useState(()=>({tuNgay:shift(6),denNgay:shift(0),nhomTheo:'ngay'}));
  const [report,setReport]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;setLoading(true);setError('');layBaoCao(applied).then(data=>{if(active)setReport(data)}).catch(e=>{if(active){setError(e.message);setReport(null)}}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};},[applied]);
  function choosePreset(value){setPreset(value);if(value==='custom')return;const a=shift(value==='today'?0:Number(value)-1),b=shift(0);setFrom(a);setTo(b);setApplied({tuNgay:a,denNgay:b,nhomTheo:group});}
  function apply(e){e.preventDefault();if(!from||!to||from>to){setError('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.');return}const days=(new Date(to)-new Date(from))/86400000;if(days>366){setError('Chỉ hỗ trợ phạm vi tối đa 367 ngày.');return;}setError('');setApplied({tuNgay:from,denNgay:to,nhomTheo:group});}
  function getExportRange() {
    if (exportPeriod === 'ngay') return [exportDay, exportDay];
    if (exportPeriod === 'tuan') {
      const [y,m,d] = exportWeek.split('-').map(Number);
      const anchor = new Date(y,m-1,d,12);
      anchor.setDate(anchor.getDate()-((anchor.getDay()+6)%7));
      const first = iso(anchor); anchor.setDate(anchor.getDate()+6);
      return [first, iso(anchor)];
    }
    if (exportPeriod === 'thang') {
      const [y,m] = exportMonth.split('-').map(Number);
      return [`${exportMonth}-01`, iso(new Date(y,m,0,12))];
    }
    const year = Number(exportYear);
    if (exportPeriod === 'quy') {
      const quarter = Number(exportQuarter);
      const month = (quarter-1)*3;
      return [iso(new Date(year,month,1,12)), iso(new Date(year,month+3,0,12))];
    }
    return [`${year}-01-01`, `${year}-12-31`];
  }
  async function exportExcel() {
    setExportError('');
    const [tuNgay,denNgay] = getExportRange();
    if (!tuNgay || !denNgay) { setExportError('Vui lòng chọn kỳ báo cáo hợp lệ.'); return; }
    setExportLoading(true);
    try { await taiExcelDoanhThu({ tuNgay, denNgay, ky: exportPeriod }); setExportOpen(false); }
    catch (error) { setExportError(error.message); }
    finally { setExportLoading(false); }
  }
  const sales=useMemo(()=> report?grouped(report.doanhThuTheoNgay,applied.tuNgay,applied.denNgay,applied.nhomTheo,'Ngay','DoanhThu'):[],[report,applied]);
  const orders=useMemo(()=> report?grouped(report.donTheoNgay,applied.tuNgay,applied.denNgay,applied.nhomTheo,'Ngay','SoDon'):[],[report,applied]);
  const stats=report?.tongQuan||{};
  const best=report?.topSanPham||[];
  const bestMax=Math.max(1,...best.map(x=>Number(x.SoLuong)));
  return <WorkspaceLayout user={user} mode="manager" activeTitle="Thống kê & báo cáo"><div className="bcr">
    <div className="workspace-breadcrumb">Quản trị / Thống kê & báo cáo / Thống kê & báo cáo</div>
    <h1>Thống kê & báo cáo</h1><p className="bcr-sub">Đánh giá doanh thu, đơn hàng và hiệu quả sản phẩm theo khoảng thời gian.</p>
    <div className="bcr-presets">{[['today','Hôm nay'],['7','7 ngày'],['30','30 ngày'],['custom','Tùy chọn']].map(([key,label])=><button key={key} className={preset===key?'active':''} onClick={()=>choosePreset(key)}>{label}</button>)}<span>{dateLabel(applied.tuNgay)} – {dateLabel(applied.denNgay)} • Dữ liệu từ hệ thống</span></div>
    <form onSubmit={apply} className="bcr-form"><label>Từ ngày<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setPreset('custom')}} required/></label><label>Đến ngày<input type="date" value={to} onChange={e=>{setTo(e.target.value);setPreset('custom')}} required/></label><label>Nhóm theo<select value={group} onChange={e=>setGroup(e.target.value)}><option value="ngay">Ngày</option><option value="tuan">Tuần</option><option value="thang">Tháng</option></select></label><button type="submit">Áp dụng</button></form>
    <div className="bcr-export-bar"><div><strong>Xuất báo cáo doanh thu</strong><span>Tải bảng Excel chi tiết theo ngày, tuần, tháng, quý hoặc năm.</span></div><button type="button" onClick={()=>{setExportError('');setExportOpen(true)}}><span aria-hidden="true">⇩</span> Xuất báo cáo Excel</button></div>
    {exportOpen && <div className="bcr-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!exportLoading)setExportOpen(false)}}><div className="bcr-export-modal" role="dialog" aria-modal="true" aria-labelledby="bcr-export-title"><div className="bcr-modal-head"><h2 id="bcr-export-title">Xuất báo cáo doanh thu</h2><button type="button" aria-label="Đóng" onClick={()=>setExportOpen(false)} disabled={exportLoading}>×</button></div><p>Chọn kỳ thống kê để xuất báo cáo Excel theo mẫu MỘC AN INTERIOR.</p><label>Xuất theo<select value={exportPeriod} onChange={e=>setExportPeriod(e.target.value)}><option value="ngay">Ngày</option><option value="tuan">Tuần (thứ Hai – Chủ nhật)</option><option value="thang">Tháng</option><option value="quy">Quý</option><option value="nam">Năm</option></select></label>
    {exportPeriod==='ngay'&&<label>Chọn ngày<input type="date" value={exportDay} onChange={e=>setExportDay(e.target.value)}/></label>}
    {exportPeriod==='tuan'&&<label>Chọn một ngày trong tuần<input type="date" value={exportWeek} onChange={e=>setExportWeek(e.target.value)}/></label>}
    {exportPeriod==='thang'&&<label>Chọn tháng<input type="month" value={exportMonth} onChange={e=>setExportMonth(e.target.value)}/></label>}
    {['quy','nam'].includes(exportPeriod)&&<label>Năm<input type="number" min="2000" max="2100" value={exportYear} onChange={e=>setExportYear(e.target.value)}/></label>}
    {exportPeriod==='quy'&&<label>Quý<select value={exportQuarter} onChange={e=>setExportQuarter(e.target.value)}>{[1,2,3,4].map(q=><option key={q} value={String(q)}>Quý {q}</option>)}</select></label>}
    <div className="bcr-export-range">Khoảng thời gian: <strong>{dateLabel(getExportRange()[0])} – {dateLabel(getExportRange()[1])}</strong></div>
    {exportError&&<p className="bcr-error" role="alert">{exportError}</p>}<div className="bcr-modal-actions"><button type="button" onClick={()=>setExportOpen(false)} disabled={exportLoading}>Hủy</button><button type="button" className="primary" onClick={exportExcel} disabled={exportLoading}>{exportLoading?'Đang tạo Excel...':'Tải file Excel'}</button></div></div></div>}
    {error&&<p className="bcr-error" role="alert">{error}</p>}{loading&&<p className="bcr-status">Đang tải dữ liệu báo cáo...</p>}
    {!loading&&report&&<>
    <div className="bcr-kpis"><section><span>Doanh thu</span><strong>{shortMoney(stats.DoanhThu)}</strong><small>Đơn hoàn tất • Không gồm phí giao</small></section><section><span>Tổng số đơn hàng</span><strong>{Number(stats.TongDon||0).toLocaleString('vi-VN')}</strong><small>{stats.DonHoanTat||0} đơn hoàn tất trong kỳ</small></section><section><span>Sản phẩm đã bán</span><strong>{Number(stats.SoSanPham||0).toLocaleString('vi-VN')}</strong><small>Trong các đơn hoàn tất</small></section><section><span>Sản phẩm sắp hết hàng</span><strong>{String(stats.TongCanhBao||0).padStart(2,'0')} SKU</strong><small>{stats.TongSapHet||0} sắp hết • {stats.TongHet||0} hết hàng</small></section></div>
    <div className="bcr-grid bcr-main-grid"><section className="bcr-panel"><h2>Doanh thu theo thời gian</h2><p className="bcr-caption">Đơn vị: triệu đồng • Tổng {shortMoney(stats.DoanhThu)}</p><Graph data={sales} unit="triệu"/><small>Doanh thu ghi nhận theo thời điểm hoàn tất đơn hàng.</small></section><section className="bcr-panel"><h2>Phân bổ bán theo danh mục</h2><Donut rows={report.danhMuc||[]}/><small>Số lượng sản phẩm thuộc các đơn hoàn tất trong kỳ.</small></section></div>
    <div className="bcr-grid"><section className="bcr-panel"><h2>Số lượng đơn hàng</h2><p className="bcr-caption">{stats.TongDon||0} đơn đã tạo • Bao gồm mọi trạng thái</p><Graph data={orders} kind="bar"/><small>Đếm đơn theo ngày đặt hàng, không phụ thuộc trạng thái hiện tại.</small></section><section className="bcr-panel"><h2>5 sản phẩm bán chạy</h2><p className="bcr-caption">Theo số lượng bán ra từ đơn hoàn tất</p>{best.length?best.map(x=><div className="bcr-best" key={x.MaSanPham}><span title={x.TenSanPham}>{x.TenSanPham}</span><div className="bcr-track"><div style={{width:`${Number(x.SoLuong)/bestMax*100}%`}}/></div><strong>{x.SoLuong}</strong></div>):<div className="bcr-empty">Chưa có sản phẩm bán ra trong kỳ.</div>}</section></div>
    <div className="bcr-grid"><section className="bcr-panel"><h2>Cảnh báo tồn kho</h2>{report.canhBaoTon?.length?report.canhBaoTon.map(x=><div key={x.MaBienThe} className="bcr-alert"><div className="bcr-thumb">{x.DuongDanAnh?<img src={getImage(x.DuongDanAnh)} alt={x.TenSanPham}/>:<span>MỘC AN</span>}</div><div><strong>{x.TenSanPham} • {[x.ChatLieu,x.MauSac,x.KichThuoc].filter(Boolean).join(' / ')}</strong><p>{x.SKU}</p><span className="bcr-stock">{x.TinhTrang} • Khả dụng {x.KhaDung}</span></div></div>):<p className="bcr-empty">Không có SKU nào ở mức cảnh báo.</p>}<small>Cảnh báo tồn khả dụng hiện tại, không giới hạn theo ngày của báo cáo.</small></section><section className="bcr-panel"><h2>Doanh thu theo sản phẩm</h2><div className="bcr-table-wrap"><table className="bcr-table"><thead><tr><th>Sản phẩm</th><th>Đã bán</th><th>Doanh thu</th></tr></thead><tbody>{best.length?best.map(x=><tr key={x.MaSanPham}><td>{x.TenSanPham}</td><td>{x.SoLuong}</td><td>{formatMoney(x.DoanhThuGop)}</td></tr>):<tr><td colSpan="3">Chưa có sản phẩm bán ra.</td></tr>}</tbody></table></div><p className="bcr-total">Top 5: {best.reduce((s,x)=>s+Number(x.SoLuong),0)} sản phẩm • {formatMoney(best.reduce((s,x)=>s+Number(x.DoanhThuGop),0))}</p><small>Doanh thu theo sản phẩm tính theo giá bán tại thời điểm đặt, trước giảm giá đơn.</small></section></div>
    <p className="bcr-foot">Doanh thu tổng = tiền hàng trừ giảm giá của đơn hoàn tất, không gồm phí giao. Với đơn cũ thiếu lịch sử hoàn tất, hệ thống dùng ngày đặt làm mốc thay thế.</p>
    </>}
  </div></WorkspaceLayout>;
}
