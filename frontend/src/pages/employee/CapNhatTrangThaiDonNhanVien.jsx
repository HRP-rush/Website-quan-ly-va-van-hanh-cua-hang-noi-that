import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getEmployeeOrder, updateOrderStatus } from "../../services/orderService";
import { NhanTrangThai } from "./QuanLyDonHang";
import "../../styles/donHangNhanVien.css";
const steps=["Chờ xác nhận","Đã xác nhận","Đang chuẩn bị","Đang giao","Hoàn tất"];
export default function CapNhatTrangThaiDonNhanVien({user}) {
 const {id}=useParams(),navigate=useNavigate();
 const [order,setOrder]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[modal,setModal]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{let active=true;getEmployeeOrder(id).then(x=>{if(active)setOrder(x);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id]);
 const current=steps.indexOf(order?.TrangThai),next=steps[current+1];
 async function save(){setBusy(true);setError("");try{await updateOrderStatus(id,next);const updated=await getEmployeeOrder(id);setOrder(updated);setNotice(`Đã cập nhật đơn hàng sang “${next}”.`);setModal(false);}catch(e){setError(e.message);setModal(false);}finally{setBusy(false);}}
 return <WorkspaceLayout user={user} mode="employee" activeTitle="Đơn hàng"><section className="nvd">
  <div className="workspace-breadcrumb">Vận hành / Đơn hàng / Cập nhật trạng thái đơn hàng</div><h1>Cập nhật trạng thái đơn hàng</h1><p className="nvd-sub">Chỉ được chuyển sang bước tiếp theo trong quy trình xử lý.</p>
  {loading?<p>Đang tải đơn hàng...</p>:order?<>
   <article className="nvd-card nvd-process"><h2>Quy trình xử lý được phép</h2><div className="nvd-steps">{steps.map((s,i)=><div key={s} className={`nvd-step ${i===current?"active":""} ${i<current?"done":""}`}><small>Bước {i+1}</small><strong>{s}</strong></div>)}</div><p className="nvd-muted">Chỉ được chuyển sang bước kế tiếp. Hoàn tất đơn hàng chỉ sau khi giao hàng thành công.</p></article>
   <article className="nvd-card nvd-update-form"><h2>Đơn #{order.MaDonHienThi}</h2><div className="nvd-field"><span>Trạng thái hiện tại</span><div className="nvd-readonly"><NhanTrangThai value={order.TrangThai}/></div></div><div className="nvd-field"><span>Trạng thái tiếp theo được phép</span><div className="nvd-readonly">{next||"Không còn bước xử lý tiếp theo"}</div></div>
    {order.TrangThai==="Chờ xác nhận"?<p className="nvd-muted">Đơn chưa xác nhận cần kiểm tra tồn kho trong trang Chi tiết đơn hàng.</p>:next?<p className="nvd-muted">Kiểm tra thực tế trước khi ghi nhận chuyển trạng thái. Không thể bỏ qua bước trung gian.</p>:<p className="nvd-muted">Đơn hàng đã đóng, không thể thay đổi trạng thái.</p>}
    <div className="nvd-foot-actions"><button className="nvd-outline" onClick={()=>navigate(`/nhan-vien/don-hang/${id}`)}>Xem chi tiết đơn</button>{next&&order.TrangThai!=="Chờ xác nhận"&&<button type="button" className="nvd-primary" onClick={()=>setModal(true)}>Lưu trạng thái</button>}</div>
   </article>{notice&&<p role="status" className="nvd-success">{notice}</p>}
   {modal&&<div className="nvd-overlay" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setModal(false);}}><div className="nvd-modal" role="dialog" aria-modal="true" aria-label="Xác nhận chuyển trạng thái"><button className="nvd-modal-close" disabled={busy} onClick={()=>setModal(false)} aria-label="Đóng"><X size={18}/></button><h2>Xác nhận cập nhật?</h2><p>Chuyển đơn <strong>{order.MaDonHienThi}</strong> từ <strong>{order.TrangThai}</strong> sang <strong>{next}</strong>?</p>{next==="Hoàn tất"&&<p className="nvd-error">Chỉ xác nhận khi đã giao thành công. Bước này sẽ trừ tồn kho và không thể thực hiện lại.</p>}<div className="nvd-modal-actions"><button className="nvd-outline" disabled={busy} onClick={()=>setModal(false)}>Quay lại</button><button className="nvd-primary" disabled={busy} onClick={save}>{busy?"Đang lưu...":"Xác nhận"}</button></div></div></div>}
  </>:<p className="nvd-error">{error||"Không tìm thấy đơn hàng."}</p>}
  {error&&order&&<p className="nvd-error" role="alert">{error}</p>}
 </section></WorkspaceLayout>;
}
