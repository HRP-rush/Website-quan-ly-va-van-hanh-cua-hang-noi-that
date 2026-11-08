import { useEffect, useState } from 'react';
import { Package, X } from 'lucide-react';
import WorkspaceLayout from '../../components/WorkspaceLayout';
import { getEmployeeDeliveries, getEmployeeDelivery, startEmployeeDelivery, succeedEmployeeDelivery, failEmployeeDelivery } from '../../services/orderService';
import formatPrice from '../../utils/formatPrice';
import '../../styles/giaoHangNhanVien.css';

const api=(import.meta.env.VITE_API_URL||'http://localhost:5000').replace(/\/$/,'');
const photo=path=>/^https?:\/\//i.test(path)?path:`${api}/${String(path||'').replace(/^\//,'')}`;
const date=value=>value?new Date(value).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'}):'—';
const states=['Chờ giao','Đang giao','Giao thành công','Giao không thành công'];
const State=({value})=><span className={`nvgh-state ${value==='Giao thành công'?'ok':value==='Giao không thành công'?'bad':'pending'}`}>{value}</span>;
function Popup({mode,record,reason,setReason,onClose,onSubmit,busy,error}){
 useEffect(()=>{const handle=e=>{if(e.key==='Escape'&&!busy)onClose()};document.addEventListener('keydown',handle);return()=>document.removeEventListener('keydown',handle)},[onClose,busy]);
 const failed=mode==='fail';
 return <div className="nvgh-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}><section className="nvgh-modal" role="dialog" aria-modal="true" aria-labelledby="nvgh-modal-title">
  <button type="button" className="nvgh-close" aria-label="Đóng" disabled={busy} onClick={onClose}><X size={19}/></button>
  <h2 id="nvgh-modal-title">{failed?'Báo giao không thành công?':'Xác nhận giao thành công?'}</h2>
  <p className="nvgh-muted">{failed?'Ghi lại lý do để tổ chức giao lại. Đơn hàng chưa hoàn tất và không trừ tồn kho.':'Chỉ xác nhận sau khi đã bàn giao sản phẩm cho người nhận. Thao tác sẽ hoàn tất đơn và xuất kho.'}</p>
  <p>{record.MaGiaoHangHienThi} • {record.MaDonHienThi} • {record.TenNguoiNhan}</p>
  {failed&&<label className="nvgh-field">Lý do giao không thành công *<textarea rows={4} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Không liên hệ được người nhận..."/></label>}
  {error&&<p className="nvgh-error" role="alert">{error}</p>}
  <div className="nvgh-actions"><button className="nvgh-outline" disabled={busy} onClick={onClose}>Quay lại</button><button className="nvgh-primary" disabled={busy||(failed&&reason.trim().length<5)} onClick={onSubmit}>{busy?'Đang xử lý...':failed?'Xác nhận kết quả':'Xác nhận thành công'}</button></div>
 </section></div>
}
export default function QuanLyGiaoHangNhanVien({user}){
 const [filters,setFilters]=useState({q:'',trangThai:'',tuNgay:'',denNgay:''}),[applied,setApplied]=useState({});
 const [rows,setRows]=useState([]),[selected,setSelected]=useState(null),[detail,setDetail]=useState(null);
 const [loading,setLoading]=useState(true),[loadingDetail,setLoadingDetail]=useState(false),[busy,setBusy]=useState(false);
 const [popup,setPopup]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[popupError,setPopupError]=useState(''),[message,setMessage]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);getEmployeeDeliveries(applied).then(x=>{if(active)setRows(x||[])}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[applied,revision]);
 useEffect(()=>{if(selected===null){setDetail(null);return;}let active=true;setLoadingDetail(true);getEmployeeDelivery(selected).then(x=>{if(active)setDetail(x)}).catch(e=>{if(active){setDetail(null);setError(e.message)}}).finally(()=>{if(active)setLoadingDetail(false)});return()=>{active=false}},[selected,revision]);
 const updateFilter=(name,value)=>setFilters(f=>({...f,[name]:value}));
 const open=mode=>{setReason('');setPopupError('');setPopup(mode)};
 const refresh=()=>setRevision(v=>v+1);
 async function start(){setBusy(true);setError('');setMessage('');try{await startEmployeeDelivery(detail.MaGiaoHang);setMessage('Đã bắt đầu giao hàng.');refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function save(){setBusy(true);setPopupError('');try{if(popup==='success')await succeedEmployeeDelivery(detail.MaGiaoHang);else await failEmployeeDelivery(detail.MaGiaoHang,reason.trim());setMessage(popup==='success'?'Giao thành công, đơn hàng đã hoàn tất và xuất kho.':'Đã ghi nhận giao không thành công.');setPopup('');refresh()}catch(e){setPopupError(e.message)}finally{setBusy(false)}}
 return <WorkspaceLayout user={user} mode="employee" activeTitle="Giao hàng"><section className="nvgh">
  <div className="workspace-breadcrumb">Vận hành / Giao hàng / Quản lý giao hàng</div>
  <h1>Quản lý giao hàng</h1><p className="nvgh-sub">Theo dõi bàn giao và ghi nhận kết quả giao hàng. Đơn chờ xác nhận chưa có mã giao hàng.</p>
  <form className="nvgh-filters" onSubmit={e=>{e.preventDefault();setApplied(filters);setSelected(null);setError('')}}>
   <label className="nvgh-field">Mã giao hàng / mã đơn / số điện thoại<input value={filters.q} placeholder="Tìm kiếm..." onChange={e=>updateFilter('q',e.target.value)}/></label>
   <label className="nvgh-field">Trạng thái giao hàng<select value={filters.trangThai} onChange={e=>updateFilter('trangThai',e.target.value)}><option value="">Tất cả</option>{states.map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="nvgh-field">Ngày cập nhật<div className="nvgh-dates"><input type="date" aria-label="Từ ngày" value={filters.tuNgay} onChange={e=>updateFilter('tuNgay',e.target.value)}/><span>–</span><input type="date" aria-label="Đến ngày" value={filters.denNgay} onChange={e=>updateFilter('denNgay',e.target.value)}/></div></label>
   <button className="nvgh-primary" type="submit">Lọc</button>
  </form>
  {error&&<p className="nvgh-error" role="alert">{error}</p>}{message&&<p className="nvgh-success" role="status">{message}</p>}
  <div className="nvgh-table-wrapper"><table className="nvgh-table"><thead><tr><th>Mã giao hàng / Mã đơn</th><th>Người nhận</th><th>Số điện thoại</th><th>Địa chỉ</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>
  {loading?<tr><td colSpan={6} className="nvgh-empty">Đang tải...</td></tr>:rows.length===0?<tr><td colSpan={6} className="nvgh-empty">Không có giao hàng phù hợp.</td></tr>:rows.map(row=><tr key={row.MaGiaoHang} className={selected===row.MaGiaoHang?'selected':''}>
   <td><button type="button" className="nvgh-link" onClick={()=>{setSelected(row.MaGiaoHang);setMessage('')}}>{row.MaGiaoHangHienThi}</button><small>{row.MaDonHienThi}</small></td><td>{row.TenNguoiNhan}</td><td>{row.SDTNhan}</td><td className="nvgh-address">{row.DiaChiGiao}</td><td><State value={row.TrangThaiGiao}/></td><td>{date(row.NgayCapNhat)}</td>
  </tr>)}</tbody></table></div>
  {selected!==null&&<div className="nvgh-content"><article className="nvgh-card">
   {loadingDetail?<p>Đang tải chi tiết...</p>:detail?<><h2>{detail.MaGiaoHangHienThi}</h2><State value={detail.TrangThaiGiao}/><p><strong>Đơn {detail.MaDonHienThi}</strong></p><p>{detail.TenNguoiNhan} • {detail.SDTNhan}</p><p className="nvgh-muted">{detail.DiaChiGiao}</p>
    <div className="nvgh-products">{(detail.items||[]).map((item,i)=><div className="nvgh-product" key={`${item.SKU}-${i}`}><div className="nvgh-photo">{item.DuongDanAnh?<img src={photo(item.DuongDanAnh)} alt={item.TenSanPham}/>:<Package size={25}/>}</div><div><strong>{item.TenSanPham} × {item.SoLuong}</strong><small>{item.SKU}</small><small>{item.CauHinh}</small></div></div>)}</div>
    <p>Thanh toán: {detail.PhuongThuc||'—'} • {formatPrice(detail.TongThanhToan)}</p>{detail.LyDoThatBai&&<p className="nvgh-error">Lý do giao thất bại: {detail.LyDoThatBai}</p>}
   </>:<p>Không có chi tiết.</p>}
  </article>{detail&&!loadingDetail&&<article className="nvgh-card"><h2>Cập nhật kết quả</h2>
  {detail.TrangThaiGiao==='Đang giao'&&detail.TrangThaiDon==='Đang giao'?<><button className="nvgh-primary nvgh-wide" onClick={()=>open('success')}>Xác nhận giao thành công</button><button className="nvgh-outline nvgh-wide" onClick={()=>open('fail')}>Báo giao không thành công</button><p className="nvgh-muted">Kết quả chỉ được ghi nhận sau khi nhân viên xác nhận.</p></>:['Chờ giao','Giao không thành công'].includes(detail.TrangThaiGiao)&&['Đang chuẩn bị','Đang giao'].includes(detail.TrangThaiDon)?<><p className="nvgh-muted">{detail.TrangThaiGiao==='Chờ giao'?'Chỉ khả dụng khi đơn đã chuẩn bị xong.':'Đơn chưa hoàn tất, có thể tổ chức giao lại.'}</p><button className="nvgh-primary nvgh-wide" disabled={busy} onClick={start}>{busy?'Đang xử lý...':detail.TrangThaiGiao==='Chờ giao'?'Bắt đầu giao hàng':'Giao lại'}</button></>:<p className="nvgh-muted">Phiếu giao đã kết thúc hoặc đơn chưa sẵn sàng. Không có thao tác cập nhật.</p>}
  </article>}</div>}
  {popup&&detail&&<Popup mode={popup} record={detail} reason={reason} setReason={setReason} onClose={()=>{if(!busy)setPopup('')}} onSubmit={save} busy={busy} error={popupError}/>}
 </section></WorkspaceLayout>
}
