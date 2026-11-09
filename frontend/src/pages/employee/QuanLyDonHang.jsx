import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getEmployeeOrders } from "../../services/orderService";
import formatPrice from "../../utils/formatPrice";
import "../../styles/donHangNhanVien.css";

const trangThais = ["Chờ xác nhận", "Đã xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn tất", "Đã hủy"];
const ngay = value => value ? new Date(value).toLocaleDateString("vi-VN") : "—";
export function NhanTrangThai({ value }) {
  return <span className={`nvd-status ${value === "Hoàn tất" ? "success" : value === "Đã hủy" ? "danger" : value === "Chờ xác nhận" ? "pending" : ""}`}>{value || "—"}</span>;
}
export default function QuanLyDonHang({user}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState({trangThai:"", tuNgay:"", denNgay:"", thanhToan:"", gia:""});
  const [applied, setApplied] = useState({});
  const [trang, setTrang] = useState(1);
  const [result, setResult] = useState({danhSach:[],tong:0,soDong:6});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);setError("");
    getEmployeeOrders({...applied, trang}).then(data=>{if(active)setResult(data);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[applied,trang,reload]);
  const tong = Number(result.tong)||0;
  const size = Number(result.soDong)||6;
  const pages = Math.max(1, Math.ceil(tong/size));
  const ds = result.danhSach || [];
  const submit = e => {e.preventDefault(); setTrang(1);setApplied({...filter,q:q.trim()});};
  return <WorkspaceLayout user={user} mode="employee" activeTitle="Đơn hàng"><section className="nvd">
    <div className="workspace-breadcrumb">Vận hành / Đơn hàng / Quản lý đơn hàng</div>
    <h1>Quản lý đơn hàng</h1><p className="nvd-sub">Tra cứu và xử lý các đơn hàng trong phạm vi được phân quyền.</p>
    <form onSubmit={submit} className="nvd-search-form">
      <label className="nvd-field"><span>Tìm kiếm đơn hàng</span><input placeholder="Tìm theo mã đơn, tên khách hàng hoặc số điện thoại..." value={q} onChange={e=>setQ(e.target.value)}/></label>
      <div className="nvd-filters">
        <label className="nvd-field"><span>Trạng thái</span><select value={filter.trangThai} onChange={e=>setFilter({...filter,trangThai:e.target.value})}><option value="">Tất cả</option>{trangThais.map(t=><option key={t}>{t}</option>)}</select></label>
        <label className="nvd-field"><span>Ngày đặt</span><div className="nvd-dates"><input type="date" aria-label="Từ ngày" value={filter.tuNgay} onChange={e=>setFilter({...filter,tuNgay:e.target.value})}/><span>–</span><input type="date" aria-label="Đến ngày" value={filter.denNgay} onChange={e=>setFilter({...filter,denNgay:e.target.value})}/></div></label>
        <label className="nvd-field"><span>Thanh toán</span><select value={filter.thanhToan} onChange={e=>setFilter({...filter,thanhToan:e.target.value})}><option value="">Tất cả</option><option>Chờ thanh toán</option><option>Đã thanh toán</option></select></label>
        <label className="nvd-field"><span>Khoảng giá trị</span><select value={filter.gia} onChange={e=>setFilter({...filter,gia:e.target.value})}><option value="">Tất cả</option><option value="duoi10">Dưới 10 triệu ₫</option><option value="10den30">10 – 30 triệu ₫</option><option value="tren30">Trên 30 triệu ₫</option></select></label>
      </div><div className="nvd-filter-actions"><span>{tong} đơn hàng • Sắp xếp theo ngày đặt mới nhất</span><div><button type="button" className="nvd-text-button" onClick={()=>{setQ("");setFilter({trangThai:"",tuNgay:"",denNgay:"",thanhToan:"",gia:""});setApplied({});setTrang(1);setReload(x=>x+1);}}>Xóa bộ lọc</button><button className="nvd-outline" type="submit">Áp dụng bộ lọc</button></div></div>
    </form>
    {error && <div className="nvd-error" role="alert">{error} <button type="button" onClick={()=>setReload(x=>x+1)}>Thử lại</button></div>}
    <div className="nvd-table-wrap"><table className="nvd-table"><thead><tr><th><input type="checkbox" disabled aria-label="Chọn tất cả (chưa hỗ trợ thao tác hàng loạt)"/></th><th>Mã đơn</th><th>Khách hàng</th><th>Ngày đặt</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái đơn</th><th>Thao tác</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={8} className="nvd-center">Đang tải danh sách...</td></tr> : ds.length === 0 ? <tr><td colSpan={8} className="nvd-center">Không có đơn hàng phù hợp với bộ lọc.</td></tr> : ds.map(d=><tr key={d.MaDon}><td><input type="checkbox" disabled aria-label={`Đơn ${d.MaDonHienThi}`}/></td><td>{d.MaDonHienThi}</td><td>{d.TenNguoiNhan}<small>{d.SDTNhan}</small></td><td>{ngay(d.NgayDat)}</td><td>{formatPrice(d.TongThanhToan)}</td><td>{d.PhuongThucThanhToan?.includes("COD")?"COD":d.PhuongThucThanhToan || "—"}<small>{d.TrangThaiThanhToan||"—"}</small></td><td><NhanTrangThai value={d.TrangThai}/></td><td><button className="nvd-link" onClick={()=>navigate(`/nhan-vien/don-hang/${d.MaDon}`)} type="button">{d.TrangThai === "Chờ xác nhận" ? "Xử lý đơn →" : "Xem chi tiết →"}</button></td></tr>)}
    </tbody></table></div>
    <div className="nvd-pager"><span>Hiển thị {tong ? (trang-1)*size+1 : 0}–{Math.min(trang*size,tong)} / {tong} kết quả</span><div><button type="button" disabled={trang===1||loading} onClick={()=>setTrang(x=>x-1)} aria-label="Trang trước"><ChevronLeft size={16}/></button>{Array.from({length:Math.min(5,pages)},(_,i)=>Math.max(1,Math.min(trang-2,pages-4))+i).map(n=><button type="button" key={n} onClick={()=>setTrang(n)} disabled={loading} className={trang===n?"current":""}>{n}</button>)}<button type="button" disabled={trang>=pages||loading} onClick={()=>setTrang(x=>x+1)} aria-label="Trang sau"><ChevronRight size={16}/></button></div></div>
    </section></WorkspaceLayout>;
}
