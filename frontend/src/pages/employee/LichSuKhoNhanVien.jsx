import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Package } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { listEmployeeWarehouseHistory, getEmployeeWarehouseTransaction } from "../../services/khoService";
import "../../styles/lichSuKhoNhanVien.css";

const SO_DONG = 10;
const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const dateLocal = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
function hienNgay(value) {
  if (!value) return "—";
  const [d,t=""] = String(value).split("T");
  const [y,m,day] = d.split("-");
  return { ngay: `${day}/${m}/${y}`, gio: t.slice(0,5) };
}
function Modal({ giaoDich, onClose }) {
  const closeRef = useRef(null);
  useEffect(() => {
    const esc = (e) => { if(e.key === "Escape") onClose(); };
    document.addEventListener("keydown",esc);
    const old = document.body.style.overflow;
    document.body.style.overflow="hidden";
    closeRef.current?.focus();
    return () => { document.removeEventListener("keydown",esc); document.body.style.overflow=old; };
  },[onClose]);
  const thoiGian = giaoDich && hienNgay(giaoDich.ThoiGian);
  const duongDan = giaoDich?.DuongDanAnh;
  const anh = duongDan ? /^https?:\/\//i.test(duongDan) ? duongDan : `${API}${duongDan.startsWith("/") ? "" : "/"}${duongDan}` : null;
  return <div className="lsnv-overlay" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="lsnv-dialog" role="dialog" aria-modal="true" aria-labelledby="lsnv-detail-title" tabIndex={-1}>
      <div className="lsnv-dialog-top"><h2 id="lsnv-detail-title">Chi tiết giao dịch</h2><button ref={closeRef} type="button" aria-label="Đóng chi tiết" onClick={onClose}><X size={20}/></button></div>
      {giaoDich ? <>
        <p className="lsnv-detail-code">GD-{String(giaoDich.MaGiaoDich).padStart(5,"0")}</p>
        <span className="lsnv-badge">{giaoDich.LoaiGiaoDich}</span>
        <div className="lsnv-product">
          <div className="lsnv-thumb">{anh ? <img alt={giaoDich.TenSanPham} src={anh} onError={(e)=>{e.currentTarget.style.display="none";}}/> : <Package size={28}/>}</div>
          <div><strong>{giaoDich.TenSanPham}</strong><small>{giaoDich.SKU}</small></div>
        </div>
        <div className="lsnv-detail-lines">
          <p>Số lượng thay đổi: <strong className={giaoDich.SoLuongThayDoi > 0 ? "positive" : "negative"}>{giaoDich.SoLuongThayDoi > 0 ? "+" : ""}{giaoDich.SoLuongThayDoi}</strong></p>
          <p>Tham chiếu: {giaoDich.ThamChieu || "—"}</p>
          {giaoDich.TenNCC && <p>Nhà cung cấp: {giaoDich.TenNCC}</p>}
          <p>Thời gian: {thoiGian.ngay} • {thoiGian.gio}</p>
          <p>Người thực hiện: {giaoDich.NguoiThucHien}</p>
        </div>
        <div className="lsnv-detail-note">Ghi chú: {giaoDich.GhiChu || "Không có ghi chú."}</div>
      </> : <p>Đang tải chi tiết giao dịch...</p>}
    </div>
  </div>;
}
export default function LichSuKhoNhanVien({user}) {
  const today = dateLocal(new Date());
  const past = new Date(); past.setDate(past.getDate()-30);
  const [skuInput,setSkuInput] = useState("");
  const [sku,setSku] = useState("");
  const [loai,setLoai] = useState("");
  const [tuNgay,setTuNgay] = useState(dateLocal(past));
  const [denNgay,setDenNgay] = useState(today);
  const [thamChieuInput,setThamChieuInput] = useState("");
  const [thamChieu,setThamChieu] = useState("");
  const [trang,setTrang] = useState(1);
  const [ketQua,setKetQua] = useState({data:[],total:0});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [selected,setSelected] = useState(null);
  const [detail,setDetail] = useState(null);
  const [detailError,setDetailError] = useState("");
  useEffect(()=>{const t=setTimeout(()=>{setSku(skuInput.trim());setThamChieu(thamChieuInput.trim());setTrang(1);},350);return()=>clearTimeout(t);},[skuInput,thamChieuInput]);
  useEffect(()=>{
    let current=true;setLoading(true);setError("");
    listEmployeeWarehouseHistory({sku,loai,tuNgay,denNgay,thamChieu,trang,soDong:SO_DONG})
      .then(r=>{if(current)setKetQua(r);}).catch(e=>{if(current)setError(e.message);})
      .finally(()=>{if(current)setLoading(false);});
    return()=>{current=false;};
  },[sku,loai,tuNgay,denNgay,thamChieu,trang]);
  async function xemChiTiet(id) {
    setSelected(id);setDetail(null);setDetailError("");
    try {const result=await getEmployeeWarehouseTransaction(id);setDetail(old=>old===null ? result : old);}
    catch(e){setDetailError(e.message);}
  }
  function dongChiTiet() {setSelected(null);setDetail(null);setDetailError("");}
  const total=Number(ketQua.total)||0;
  const maxPage=Math.max(1,Math.ceil(total/SO_DONG));
  const start=total===0?0:(trang-1)*SO_DONG+1;
  const end=Math.min(trang*SO_DONG,total);
  return <WorkspaceLayout user={user} mode="employee" activeTitle="Lịch sử kho">
    <section className="lsnv">
      <div className="workspace-breadcrumb">Vận hành / Lịch sử kho / Lịch sử nhập/xuất kho</div>
      <h1>Lịch sử nhập/xuất kho</h1>
      <p className="lsnv-subtitle">Truy vết theo SKU và chứng từ. Không cung cấp thao tác điều chỉnh tồn cho vai trò nhân viên.</p>
      <div className="lsnv-filters">
        <label>SKU<input value={skuInput} onChange={e=>setSkuInput(e.target.value)} placeholder="Tìm SKU hoặc sản phẩm..."/></label>
        <label>Loại giao dịch<select value={loai} onChange={e=>{setLoai(e.target.value);setTrang(1);}}><option value="">Nhập / Xuất / Hoàn tồn</option><option>Nhập kho</option><option>Xuất kho</option><option>Hoàn tồn</option></select></label>
        <div className="lsnv-date-filter"><span>Khoảng thời gian</span><div><input aria-label="Từ ngày" title="Từ ngày" type="date" value={tuNgay} max={denNgay || undefined} onChange={e=>{setTuNgay(e.target.value);setTrang(1);}}/><span>–</span><input aria-label="Đến ngày" title="Đến ngày" type="date" value={denNgay} min={tuNgay || undefined} onChange={e=>{setDenNgay(e.target.value);setTrang(1);}}/></div></div>
        <label>Mã đơn / phiếu nhập<input value={thamChieuInput} onChange={e=>setThamChieuInput(e.target.value)} placeholder="Nhập mã tham chiếu..."/></label>
      </div>
      {error && <p className="lsnv-error" role="alert">{error}</p>}
      <div className="lsnv-table-wrap"><table><thead><tr><th>Thời gian</th><th>Mã giao dịch</th><th>SKU</th><th>Loại</th><th>Thay đổi</th><th>Tham chiếu</th><th>Người thực hiện</th><th>Ghi chú</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={8} className="lsnv-empty">Đang tải lịch sử kho...</td></tr> : (ketQua.data||[]).length===0 ? <tr><td colSpan={8} className="lsnv-empty">Không có giao dịch kho phù hợp với bộ lọc.</td></tr> : ketQua.data.map(g=>{
          const t=hienNgay(g.ThoiGian);
          return <tr key={g.MaGiaoDich}><td>{t.ngay}<br/>{t.gio}</td><td>GD-{String(g.MaGiaoDich).padStart(5,"0")}</td><td><button type="button" className="lsnv-sku-link" onClick={()=>xemChiTiet(g.MaGiaoDich)} title="Xem chi tiết giao dịch">{g.SKU}</button></td><td>{g.LoaiGiaoDich}</td><td className={g.SoLuongThayDoi>0?"positive":"negative"}>{g.SoLuongThayDoi>0?"+":""}{g.SoLuongThayDoi}</td><td>{g.ThamChieu||"—"}</td><td>{g.NguoiThucHien}</td><td className="lsnv-note">{g.GhiChu||"—"}</td></tr>;
        })}
      </tbody></table></div>
      <div className="lsnv-pager"><span>Hiển thị {start}–{end} / {total} kết quả</span><div className="lsnv-pages"><button disabled={trang<=1||loading} onClick={()=>setTrang(t=>t-1)} aria-label="Trang trước"><ChevronLeft size={14}/></button>{Array.from({length:Math.min(5,maxPage)},(_,i)=>{const n=Math.max(1,Math.min(trang-2,maxPage-4))+i;return <button key={n} disabled={loading} className={trang===n?"active":""} onClick={()=>setTrang(n)}>{n}</button>;})}<button disabled={trang>=maxPage||loading} onClick={()=>setTrang(t=>t+1)} aria-label="Trang tiếp"><ChevronRight size={14}/></button></div></div>
    </section>
    {selected!==null && (detailError ? <div className="lsnv-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)dongChiTiet();}}><div className="lsnv-dialog" role="alertdialog" aria-modal="true"><div className="lsnv-dialog-top"><h2>Chi tiết giao dịch</h2><button onClick={dongChiTiet} aria-label="Đóng"><X size={20}/></button></div><p className="lsnv-error">{detailError}</p></div></div> : <Modal giaoDich={detail} onClose={dongChiTiet}/>)}
  </WorkspaceLayout>;
}
