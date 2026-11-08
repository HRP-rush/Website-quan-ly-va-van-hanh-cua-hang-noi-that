import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, X, Package } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getEmployeeOrder, checkEmployeeOrderStock, updateOrderStatus } from "../../services/orderService";
import formatPrice from "../../utils/formatPrice";
import { NhanTrangThai } from "./QuanLyDonHang";
import "../../styles/donHangNhanVien.css";
const api = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const photo = path => !path ? "" : /^https?:\/\//.test(path) ? path : `${api}${path.startsWith("/")?"":"/"}${path}`;
const dateTime = value => value ? new Date(value).toLocaleString("vi-VN",{dateStyle:"short",timeStyle:"short"}) : "—";
function Modal({children,onClose}) {useEffect(()=>{const onKey=e=>{if(e.key==="Escape")onClose();};document.addEventListener("keydown",onKey);return()=>document.removeEventListener("keydown",onKey);},[onClose]);return <div className="nvd-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="nvd-modal" role="dialog" aria-modal="true" aria-label="Xác nhận đơn hàng"><button className="nvd-modal-close" type="button" onClick={onClose} aria-label="Đóng"><X size={19}/></button>{children}</div></div>}
export default function ChiTietDonHangNhanVien({user}){
 const {id}=useParams();const navigate=useNavigate();
 const [order,setOrder]=useState(null),[stock,setStock]=useState(null),[modal,setModal]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(""),[message,setMessage]=useState("");
 useEffect(()=>{let active=true;setLoading(true);getEmployeeOrder(id).then(d=>{if(active)setOrder(d);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id]);
 async function check(){setError("");setStock(null);setBusy(true);try{const data=await checkEmployeeOrderStock(id);setStock(data);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function openModal(){setError("");setModal(true);setStock(null);await check();}
 async function confirm(){if(!stock?.duHang)return;setBusy(true);setError("");try{await updateOrderStatus(id,"Đã xác nhận");setModal(false);setMessage("Đơn hàng đã được xác nhận thành công.");setOrder(await getEmployeeOrder(id));}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(loading)return <WorkspaceLayout user={user} mode="employee" activeTitle="Đơn hàng"><p>Đang tải chi tiết đơn hàng...</p></WorkspaceLayout>;
 if(!order)return <WorkspaceLayout user={user} mode="employee" activeTitle="Đơn hàng"><p role="alert">{error||"Không tìm thấy đơn hàng."}</p><button className="nvd-outline" onClick={()=>navigate('/nhan-vien/don-hang')}>Quay lại</button></WorkspaceLayout>;
 const canConfirm=order.TrangThai==="Chờ xác nhận";
 return <WorkspaceLayout user={user} mode="employee" activeTitle="Đơn hàng"><section className="nvd">
  <div className="workspace-breadcrumb">Vận hành / Đơn hàng / Chi tiết đơn hàng #{order.MaDonHienThi}</div>
  <h1>Chi tiết đơn hàng <span>#{order.MaDonHienThi}</span></h1><p className="nvd-sub">Đặt ngày {dateTime(order.NgayDat)} • Đơn hiện tại {order.TrangThai.toLowerCase()}</p>
  <div className="nvd-order-status"><NhanTrangThai value={order.TrangThai}/><span>Phụ trách: {user.HoTen}</span></div>
  <div className="nvd-detail-grid"><div className="nvd-stack">
   <article className="nvd-card"><h2>Sản phẩm đã đặt</h2>{(order.items||[]).map((item,i)=><div className="nvd-product" key={`${item.SKU}-${i}`}><div className="nvd-product-photo">{item.DuongDanAnh?<img src={photo(item.DuongDanAnh)} alt={item.TenSanPham}/>:<Package size={26}/>}</div><div><strong>{item.TenSanPham}</strong><p>{item.CauHinh||""}</p><small>SKU: {item.SKU}</small><div>{formatPrice(item.GiaBan)} × {item.SoLuong}</div></div></div>)}<p className="nvd-muted">Đơn giá mua được lưu tại thời điểm đặt hàng. Không thay đổi theo giá bán hiện tại.</p></article>
   <article className="nvd-card"><h2>Thông tin giao hàng</h2><p><strong>{order.TenNguoiNhan} • {order.SDTNhan}</strong></p><p className="nvd-muted">{order.Email||""}</p><p>{order.DiaChiGiao}</p><p className="nvd-muted">Thông tin giao nhận theo đơn hàng đã được lưu.</p></article>
  </div><div className="nvd-stack">
   <article className="nvd-card nvd-total"><h2>Đơn hàng của bạn</h2><div><span>Tạm tính</span><span>{formatPrice(order.TienHang)}</span></div><div><span>Phí giao hàng & lắp đặt</span><span>{formatPrice(order.PhiGiao)}</span></div><div><span>Giảm giá</span><span>{formatPrice(order.GiamGia||0)}</span></div><div className="nvd-total-main"><strong>Tổng cộng</strong><strong>{formatPrice(order.TongThanhToan)}</strong></div><p className="nvd-muted">Giá trị đơn hàng tại thời điểm khách đặt.</p></article>
   <article className="nvd-card"><h2>Thanh toán</h2><p><strong>{order.PhuongThucThanhToan||"—"}</strong></p><p><span className="nvd-chip">{order.TrangThaiThanhToan||"—"}</span></p></article>
   <article className="nvd-card"><h2>Lịch sử xử lý</h2>{(order.lichSu||[]).map((x,i)=><p key={i}>{dateTime(x.ThoiDiem)} — {x.TrangThaiMoi}<br/><small className="nvd-muted">{x.NguoiThucHien}</small></p>)}</article>
  </div></div>
  {canConfirm?<div className="nvd-foot-actions"><button type="button" className="nvd-primary" onClick={openModal}>Xác nhận đơn hàng</button></div>:<div className="nvd-foot-actions"><button className="nvd-outline" onClick={()=>navigate('/nhan-vien/don-hang')}>Quay lại danh sách</button>{order.TrangThai!=="Hoàn tất"&&order.TrangThai!=="Đã hủy"&&<button className="nvd-primary" onClick={()=>navigate(`/nhan-vien/don-hang/${id}/cap-nhat`)}>Cập nhật trạng thái</button>}</div>}
  {message&&<div className="nvd-success" role="status"><CheckCircle2 size={17}/>{message}<button type="button" className="nvd-link" onClick={()=>navigate(`/nhan-vien/don-hang/${id}/cap-nhat`)}>Tiếp tục xử lý →</button></div>}
  {error&&!modal&&<div className="nvd-error" role="alert">{error}</div>}
  {modal&&<Modal onClose={()=>{if(!busy)setModal(false);}}><h2>Xác nhận đơn hàng?</h2><p className="nvd-muted">Hệ thống kiểm tra lại tồn kho trước khi xác nhận.</p><div className="nvd-modal-order">Đơn {order.MaDonHienThi} • {formatPrice(order.TongThanhToan)} • {order.PhuongThucThanhToan||"—"}</div>{busy&&!stock?<p>Đang kiểm tra tồn kho...</p>:stock&&<><div className="nvd-table-wrap"><table className="nvd-table nvd-stock-table"><thead><tr><th>Sản phẩm / SKU</th><th>Số lượng đặt</th><th>Tồn khả dụng</th><th>Kết quả</th></tr></thead><tbody>{stock.items.map(item=><tr key={item.MaBienThe}><td>{item.TenSanPham}<small>{item.SKU}</small></td><td>{item.SoLuongDat}</td><td>{item.KhaDung}</td><td>{item.DuHang?"Đủ hàng":"Thiếu hàng"}</td></tr>)}</tbody></table></div><p className={stock.duHang?"nvd-success":"nvd-error"}>{stock.duHang?"Tất cả sản phẩm đủ hàng. Tồn kho được kiểm tra lại khi xác nhận.":"Không đủ hàng. Chưa thể xác nhận đơn hàng."}</p></>}{error&&<p className="nvd-error" role="alert">{error}</p>}<div className="nvd-modal-actions"><button className="nvd-outline" type="button" disabled={busy} onClick={()=>setModal(false)}>Quay lại</button><button className="nvd-primary" type="button" disabled={busy||!stock?.duHang} onClick={confirm}>{busy?"Đang xử lý...":"Xác nhận"}</button></div></Modal>}
 </section></WorkspaceLayout>;
}
