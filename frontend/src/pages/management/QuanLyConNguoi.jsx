import {useEffect,useRef,useState} from "react";
import {Plus,Info} from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import {PeopleModal,PeopleField,PeopleKpis,PeoplePager} from "../../components/PeopleUI";
import {peopleRequest,dateText,personCode} from "../../services/peopleService";

function Invitation({value}){
 const ref=useRef(null),[copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(value.url);setCopied(true);}catch{ref.current.focus();ref.current.select();}}
 return <div className="pp-invitation"><h3>Liên kết thiết lập mật khẩu</h3><p>Tài khoản đang chờ người nhận tự đặt mật khẩu. Liên kết dùng một lần, hết hạn sau 24 giờ. Hệ thống chưa gửi email.</p><input ref={ref} readOnly value={value.url} aria-label="Liên kết thiết lập mật khẩu"/><button type="button" className="pp-btn" onClick={copy}>{copied?"Đã sao chép":"Sao chép liên kết"}</button><small>Hết hạn: {new Date(value.hanSuDung).toLocaleString("vi-VN")}</small></div>;
}
function AccountForm({group,item,close,saved}){
 const [form,setForm]=useState({hoTen:item?.HoTen||"",email:item?.Email||"",soDienThoai:item?.SoDienThoai||"",diaChi:item?.DiaChi||"",vaiTro:item?.TenVaiTro||"Nhân viên"});
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[invitation,setInvitation]=useState(null);const lock=useRef(false);
 const set=name=>e=>setForm(f=>({...f,[name]:e.target.value}));
 async function submit(e){e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError("");try{const r=await peopleRequest(`/con-nguoi/tai-khoan/${group}${item?`/${item.MaNguoiDung}`:""}`,item?"PUT":"POST",form);saved(r.message);if(item)close();else setInvitation(r.data);}catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}}
 return <PeopleModal title={item?"Chỉnh sửa tài khoản":group==="khach-hang"?"Thêm tài khoản khách hàng":"Thêm tài khoản nội bộ"} close={close} busy={busy}>
  {invitation?<><Invitation value={invitation}/><div className="pp-actions"><button className="pp-btn pp-primary" onClick={close}>Đã lưu liên kết</button></div></>:<form onSubmit={submit}>
   <p className="pp-muted">{item?personCode(item):"Người nhận sẽ tự thiết lập mật khẩu qua liên kết một lần."}</p>
   {error&&<p className="pp-error" role="alert">{error}</p>}
   <fieldset disabled={busy} className="pp-fields">
    <PeopleField label="Họ và tên *"><input required minLength={2} maxLength={150} value={form.hoTen} onChange={set("hoTen")}/></PeopleField>
    <PeopleField label="Email đăng nhập *"><input type="email" required maxLength={254} value={form.email} onChange={set("email")}/></PeopleField>
    <PeopleField label="Số điện thoại"><input type="tel" maxLength={20} value={form.soDienThoai} onChange={set("soDienThoai")}/></PeopleField>
    <PeopleField label="Địa chỉ"><textarea rows={2} maxLength={500} value={form.diaChi} onChange={set("diaChi")}/></PeopleField>
    {group==="nhan-vien"&&<PeopleField label="Vai trò *"><select value={form.vaiTro} onChange={set("vaiTro")}><option>Nhân viên</option><option>Quản lý</option></select></PeopleField>}
    <div className="pp-actions"><button type="button" className="pp-btn" onClick={close}>Hủy</button><button className="pp-btn pp-primary">{busy?"Đang lưu...":item?"Lưu thay đổi":"Tạo tài khoản"}</button></div>
   </fieldset>
  </form>}
 </PeopleModal>;
}
function AccountDetail({group,id,close}){
 const [value,setValue]=useState(null),[error,setError]=useState("");
 useEffect(()=>{let live=true;peopleRequest(`/con-nguoi/tai-khoan/${group}/${id}`).then(r=>live&&setValue(r.data)).catch(e=>live&&setError(e.message));return()=>{live=false;};},[group,id]);
 return <PeopleModal title="Thông tin tài khoản" close={close}>{error?<p className="pp-error" role="alert">{error}</p>:!value?<p>Đang tải...</p>:<>
  <span className="pp-badge">{value.user.TrangThai}</span><h3 className="pp-detail-name">{value.user.HoTen}</h3><p className="pp-muted">{personCode(value.user)} • {value.user.TenVaiTro}</p>
  <dl className="pp-details"><dt>Email</dt><dd>{value.user.Email}</dd><dt>Điện thoại</dt><dd>{value.user.SoDienThoai||"—"}</dd><dt>Địa chỉ</dt><dd>{value.user.DiaChi||"—"}</dd><dt>Ngày tạo</dt><dd>{dateText(value.user.NgayTao)}</dd>{value.user.LyDoKhoa&&<><dt>Lý do khóa</dt><dd>{value.user.LyDoKhoa}</dd></>}</dl>
  {group==="khach-hang"&&<><h3>Đơn hàng gần đây</h3>{value.orders.length?<div className="pp-scroll"><table className="pp-table"><thead><tr><th>Mã đơn</th><th>Trạng thái</th><th>Tổng tiền</th></tr></thead><tbody>{value.orders.map(o=><tr key={o.MaDon}><td>#{o.MaDon}</td><td>{o.TrangThai}</td><td>{Number(o.TongThanhToan).toLocaleString("vi-VN")} ₫</td></tr>)}</tbody></table></div>:<p className="pp-muted">Chưa có đơn hàng.</p>}</>}
 </>}</PeopleModal>;
}
function StatusForm({group,item,close,saved}){
 const active=!["Hoạt động","Chờ thiết lập"].includes(item.TrangThai);const [reason,setReason]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError("");try{const r=await peopleRequest(`/con-nguoi/tai-khoan/${group}/${item.MaNguoiDung}/trang-thai`,"PATCH",{hoatDong:active,lyDo:reason});saved(r.message);close();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <PeopleModal title={active?"Kích hoạt tài khoản?":"Khóa / vô hiệu hóa tài khoản?"} close={close} busy={busy}><p>{item.HoTen} • {item.Email}</p><p className="pp-muted">Hồ sơ và lịch sử đơn hàng được giữ nguyên.</p><form onSubmit={submit}>{error&&<p className="pp-error" role="alert">{error}</p>}{!active&&<PeopleField label="Lý do *"><textarea required minLength={2} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} rows={3}/></PeopleField>}<div className="pp-actions"><button type="button" className="pp-btn" onClick={close} disabled={busy}>Quay lại</button><button className="pp-btn pp-primary" disabled={busy}>{busy?"Đang xử lý...":"Xác nhận"}</button></div></form></PeopleModal>;
}
export default function QuanLyConNguoi({user,mode="manager",group="khach-hang"}){
 const customer=group==="khach-hang",title=customer?"Khách hàng":"Nhân viên";
 const [q,setQ]=useState(""),[status,setStatus]=useState(""),[role,setRole]=useState(""),[days,setDays]=useState(""),[page,setPage]=useState(1),[reload,setReload]=useState(0);
 const [result,setResult]=useState({data:[],total:0,stats:{}}),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[modal,setModal]=useState(null),[invitation,setInvitation]=useState(null),[working,setWorking]=useState(false);
 useEffect(()=>{const controller=new AbortController();const timer=setTimeout(async()=>{setLoading(true);setError("");try{const r=await peopleRequest(`/con-nguoi/tai-khoan/${group}?${new URLSearchParams({q,trangThai:status,vaiTro:role,ngay:days,trang:page})}`,"GET",undefined,controller.signal);if(controller.signal.aborted)return;const last=Math.max(1,Math.ceil(r.total/10));if(page>last){setPage(last);return;}setResult(r);}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setLoading(false);}},300);return()=>{clearTimeout(timer);controller.abort();};},[group,q,status,role,days,page,reload]);
 function saved(message){setNotice(message);setLoading(true);setReload(n=>n+1);}
 async function invite(item){if(working||!window.confirm(`Tạo liên kết thiết lập lại cho ${item.HoTen}? Tài khoản sẽ chờ thiết lập và liên kết cũ bị vô hiệu.`))return;setWorking(true);setError("");try{const r=await peopleRequest(`/con-nguoi/tai-khoan/${group}/${item.MaNguoiDung}/lien-ket`,"POST",{});setInvitation(r.data);saved(r.message);}catch(e){setError(e.message);}finally{setWorking(false);}}
 const st=result.stats;
 return <WorkspaceLayout user={user} mode={mode} activeTitle={title}><div className="pp-page">
  <p className="workspace-breadcrumb">Quản trị / {title} / Quản lý tài khoản</p>
  <div className="pp-heading"><div className="workspace-head"><h1>{customer?"Quản lý khách hàng":"Quản lý tài khoản nhân viên"}</h1><p>{customer?"Tra cứu hồ sơ, lịch sử mua hàng và trạng thái đăng nhập của khách hàng.":"Cấp tài khoản Nhân viên, Quản lý và quản lý quyền truy cập nội bộ."}</p></div><button className="pp-btn pp-primary" onClick={()=>setModal({type:"create"})}><Plus size={15}/>{customer?"Thêm khách hàng":"Thêm tài khoản"}</button></div>
  <PeopleKpis items={[[customer?"Khách hàng":"Tài khoản nội bộ",st.Tong||0,"Hồ sơ được lưu trong hệ thống"],["Đang hoạt động",st.HoatDong||0,"Được phép đăng nhập"],[customer?"Đã khóa":"Vô hiệu hóa",st.BiKhoa||0,`${st.ChoThietLap||0} tài khoản chờ thiết lập mật khẩu`]]}/>
  {notice&&<p className="pp-success" role="status">{notice}</p>}
  <div className="pp-filters"><PeopleField label="Tìm kiếm"><input value={q} maxLength={150} onChange={e=>{setQ(e.target.value);setPage(1);}} placeholder="Tìm mã số, tên, email, số điện thoại..."/></PeopleField>
   {customer?<PeopleField label="Ngày tạo"><select value={days} onChange={e=>{setDays(e.target.value);setPage(1);}}><option value="">Tất cả</option><option value="7">7 ngày gần đây</option><option value="30">30 ngày gần đây</option></select></PeopleField>:<PeopleField label="Vai trò"><select value={role} onChange={e=>{setRole(e.target.value);setPage(1);}}><option value="">Tất cả</option><option>Nhân viên</option><option>Quản lý</option></select></PeopleField>}
   <PeopleField label="Trạng thái"><select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Tất cả</option><option>Hoạt động</option><option>Chờ thiết lập</option><option>{customer?"Đã khóa":"Vô hiệu hóa"}</option></select></PeopleField></div>
  {error&&<p className="pp-error" role="alert">{error} <button className="pp-link" onClick={()=>setReload(n=>n+1)}>Thử lại</button></p>}
  <div className="pp-scroll" aria-busy={loading}><table className="pp-table"><thead><tr><th>Mã {customer?"KH":"NV"}</th><th>Họ tên</th><th>Email</th><th>Điện thoại</th><th>{customer?"Ngày tạo":"Vai trò"}</th>{customer&&<th>Số đơn</th>}<th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
   {loading?<tr><td colSpan={customer?8:7} className="pp-empty">Đang tải...</td></tr>:error?<tr><td colSpan={customer?8:7} className="pp-empty">Chưa tải được dữ liệu. Vui lòng thử lại.</td></tr>:!result.data.length?<tr><td colSpan={customer?8:7} className="pp-empty">Chưa có tài khoản phù hợp.</td></tr>:result.data.map(p=><tr key={p.MaNguoiDung}><td>{personCode(p)}</td><td>{p.HoTen}</td><td>{p.Email}</td><td>{p.SoDienThoai||"—"}</td><td>{customer?dateText(p.NgayTao):p.TenVaiTro}</td>{customer&&<td>{p.SoDon}</td>}<td><span className={`pp-badge ${p.TrangThai==="Hoạt động"?"is-active":p.TrangThai==="Chờ thiết lập"?"is-waiting":""}`}>{p.TrangThai}</span></td><td><div className="pp-row-actions"><button onClick={()=>setModal({type:"view",item:p})}>Xem</button>{p.MaNguoiDung===user.MaNguoiDung?<span> · Đang đăng nhập</span>:<><span> · </span><button onClick={()=>setModal({type:"edit",item:p})}>Sửa</button><br/>{(p.DaThietLapMatKhau||p.TrangThai==="Chờ thiết lập")&&<><button onClick={()=>setModal({type:"status",item:p})}>{["Hoạt động","Chờ thiết lập"].includes(p.TrangThai)?customer?"Khóa":"Vô hiệu hóa":"Kích hoạt"}</button><span> · </span></>}<button disabled={working} onClick={()=>invite(p)}>Liên kết thiết lập</button></>}</div></td></tr>)}
  </tbody></table></div>
  <PeoplePager page={page} total={result.total} busy={loading} onPage={setPage}/>
  <p className="pp-info"><Info size={16}/>Tài khoản bị khóa không thể đăng nhập; hồ sơ và đơn hàng vẫn được giữ. Tài khoản mới cần thiết lập mật khẩu qua liên kết một lần.</p>
 </div>
 {modal&&(["create","edit"].includes(modal.type)?<AccountForm group={group} item={modal.item} close={()=>setModal(null)} saved={saved}/>:modal.type==="view"?<AccountDetail group={group} id={modal.item.MaNguoiDung} close={()=>setModal(null)}/>:<StatusForm group={group} item={modal.item} close={()=>setModal(null)} saved={saved}/>)}
 {invitation&&<PeopleModal title="Thiết lập tài khoản" close={()=>setInvitation(null)}><Invitation value={invitation}/></PeopleModal>}
 </WorkspaceLayout>;
}
