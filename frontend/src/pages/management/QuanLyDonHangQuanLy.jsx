import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { getEmployeeOrders, getManagerOrderStats, getManagerStaff, assignManagerOrder } from '../../services/orderService';
import formatPrice from '../../utils/formatPrice';
import { NhanTrangThai } from '../employee/QuanLyDonHang';
import '../../styles/donHangNhanVien.css';
import '../../styles/donHangQuanLy.css';
const tabs=[['Tất cả đơn hàng',''],['Chờ xác nhận','Chờ xác nhận'],['Đang xử lý','active'],['Hoàn tất','Hoàn tất']];
const fmt=x=>x?new Date(x).toLocaleDateString('vi-VN'):'—';
const shortPay=x=>/COD/i.test(x||'')?'COD':/chuyển khoản/i.test(x||'')?'CK':x||'—';
const locked=x=>['Hoàn tất','Đã hủy'].includes(x);
export default function QuanLyDonHangQuanLy({user}){
 const navigate=useNavigate();
 const [tab,setTab]=useState(''),[q,setQ]=useState(''),[pay,setPay]=useState(''),[staffFilter,setStaffFilter]=useState('');
 const [applied,setApplied]=useState({}),[page,setPage]=useState(1),[reload,setReload]=useState(0);
 const [list,setList]=useState({danhSach:[],tong:0,soDong:10}),[staff,setStaff]=useState([]),[stats,setStats]=useState({});
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[modal,setModal]=useState(null),[assignee,setAssignee]=useState(''),[busy,setBusy]=useState(false),[modalError,setModalError]=useState('');
 useEffect(()=>{let live=true;Promise.all([getManagerStaff(),getManagerOrderStats()]).then(([people,values])=>{if(live){setStaff(people);setStats(values);}}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[reload]);
 useEffect(()=>{let live=true;setLoading(true);setError('');getEmployeeOrders({...applied,trang:page}).then(r=>{if(live)setList(r)}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[applied,page,reload]);
 const total=Number(list.tong)||0,size=Number(list.soDong)||10,pages=Math.max(1,Math.ceil(total/size));
 const apply=(nextTab=tab)=>{setTab(nextTab);setPage(1);setApplied({q:q.trim(),trangThai:nextTab==='active'?'':nextTab,thanhToan:pay,nhanVien:staffFilter,active:nextTab==='active'});};
 // active là nhóm các bước Đã xác nhận / Đang chuẩn bị / Đang giao; cần tính ở client nếu bộ lọc này được chọn.
 const open=row=>{setModal(row);setAssignee(row.MaNhanVienXuLy?String(row.MaNhanVienXuLy):'');setModalError('')};
 async function save(){if(!assignee)return setModalError('Vui lòng chọn nhân viên.');setBusy(true);setModalError('');try{await assignManagerOrder(modal.MaDon,Number(assignee));setModal(null);setReload(v=>v+1)}catch(e){setModalError(e.message)}finally{setBusy(false)}}
 const rows=list.danhSach||[];
 return <WorkspaceLayout user={user} mode="manager" activeTitle="Đơn hàng"><section className="mdo">
  <div className="workspace-breadcrumb">Quản trị / Đơn hàng / Quản lý đơn hàng</div><h1>Quản lý đơn hàng</h1><p className="mdo-sub">Theo dõi thanh toán, phân công nhân viên và lịch sử xử lý đơn hàng.</p>
  <div className="mdo-stats">{[['Chờ xác nhận','Cần kiểm tra tồn và thông tin'],['Đang chuẩn bị','Đã phân công nhân viên'],['Đang giao','Theo dõi tiến độ giao hàng'],['Hoàn tất','Đơn đã hoàn thành']].map(([name,sub])=><div className="mdo-stat" key={name}><span>{name}</span><strong>{String(stats[name]||0).padStart(2,'0')}</strong><small>{sub}</small></div>)}</div>
  <div className="mdo-tabs">{tabs.map(([name,value])=><button type="button" key={name} className={tab===value?'active':''} onClick={()=>apply(value)}>{name}</button>)}</div>
  <form className="mdo-filters" onSubmit={e=>{e.preventDefault();apply()}}><label>Tìm kiếm<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm mã đơn, khách hàng, SĐT..."/></label><label>Thanh toán<select value={pay} onChange={e=>setPay(e.target.value)}><option value="">Tất cả</option><option value="Đã thanh toán">Đã thanh toán</option><option value="Chờ thanh toán">Chờ thanh toán</option></select></label><label>Nhân viên xử lý<select value={staffFilter} onChange={e=>setStaffFilter(e.target.value)}><option value="">Tất cả</option><option value="-1">Chưa phân công</option>{staff.map(x=><option key={x.MaNguoiDung} value={x.MaNguoiDung}>{x.HoTen}</option>)}</select></label><button type="submit" className="mdo-apply">Áp dụng bộ lọc</button></form>
  {error&&<p className="nvd-error" role="alert">{error}</p>}
  <div className="mdo-table-wrap"><table className="mdo-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái đơn</th><th>Nhân viên xử lý</th><th>Thao tác</th></tr></thead><tbody>{loading?<tr><td colSpan="7">Đang tải đơn hàng...</td></tr>:rows.length===0?<tr><td colSpan="7">Không có đơn hàng phù hợp.</td></tr>:rows.map(row=><tr key={row.MaDon}><td>{row.MaDonHienThi}</td><td>{row.TenNguoiNhan}</td><td>{formatPrice(row.TongThanhToan)}</td><td>{shortPay(row.PhuongThucThanhToan)} • {row.TrangThaiThanhToan||'—'}</td><td><NhanTrangThai value={row.TrangThai}/></td><td>{row.NhanVienXuLy||'Chưa phân công'}</td><td><button className="mdo-link" type="button" onClick={()=>navigate(`/quan-ly/don-hang/${row.MaDon}`)}>Xem chi tiết</button>{!locked(row.TrangThai)&&<button type="button" className="mdo-link" onClick={()=>open(row)}>Phân công</button>}{locked(row.TrangThai)&&<button type="button" className="mdo-link" onClick={()=>navigate(`/quan-ly/don-hang/${row.MaDon}`)}>Xem lịch sử →</button>}</td></tr>)}</tbody></table></div>
  <div className="mdo-pager"><span>Hiển thị {total?(page-1)*size+1:0}–{Math.min(page*size,total)} / {total} kết quả • {size} đơn / trang</span><div><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={16}/></button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={16}/></button></div></div>
  {modal&&<div className="nvd-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setModal(null)}}><div className="nvd-modal" role="dialog" aria-modal="true" aria-labelledby="mdo-modal-title"><button className="nvd-modal-close" disabled={busy} aria-label="Đóng" onClick={()=>setModal(null)}><X size={19}/></button><h2 id="mdo-modal-title">Phân công xử lý đơn hàng</h2><p className="nvd-muted">Đơn {modal.MaDonHienThi} • {modal.TenNguoiNhan}</p><label className="mdo-assignee">Nhân viên xử lý<select value={assignee} onChange={e=>setAssignee(e.target.value)}><option value="">Chọn nhân viên</option>{staff.map(x=><option value={x.MaNguoiDung} key={x.MaNguoiDung}>{x.HoTen}</option>)}</select></label><p className="nvd-muted">Khi lưu, nhân viên được chọn có thể tiếp tục xử lý đơn hàng. Chỉ Quản lý được thay đổi phân công.</p>{modalError&&<p className="nvd-error" role="alert">{modalError}</p>}<div className="nvd-modal-actions"><button className="nvd-outline" disabled={busy} onClick={()=>setModal(null)}>Quay lại</button><button className="nvd-primary" disabled={busy||!assignee} onClick={save}>{busy?'Đang lưu...':'Lưu phân công'}</button></div></div></div>}
 </section></WorkspaceLayout>
}
