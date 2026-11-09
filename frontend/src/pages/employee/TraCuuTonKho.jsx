import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Info, Package } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { listEmployeeStock, listEmployeeStockCategories } from "../../services/khoService";
import "../../styles/traCuuTonKho.css";

const SO_DONG = 10;
const nhom = { "Còn hàng": "available", "Sắp hết": "low", "Hết hàng": "empty" };
const formatSo = (value) => String(Number(value) || 0).padStart(2, "0");
const API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

function anhSanPham(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API}${path.startsWith("/") ? "" : "/"}${path}`;
}

function Anh({ path, ten }) {
  const [loi, setLoi] = useState(false);
  useEffect(() => setLoi(false), [path]);
  return path && !loi
    ? <img src={anhSanPham(path)} alt={ten} loading="lazy" onError={() => setLoi(true)}/>
    : <span className="nvtk-placeholder"><Package size={22}/></span>;
}

export default function TraCuuTonKho({ user }) {
  const [nhap, setNhap] = useState("");
  const [q, setQ] = useState("");
  const [danhMuc, setDanhMuc] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [trang, setTrang] = useState(1);
  const [danhSachDanhMuc, setDanhSachDanhMuc] = useState([]);
  const [ketQua, setKetQua] = useState({ data: [], total: 0, tongQuan: {} });
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState("");

  useEffect(() => {
    listEmployeeStockCategories().then(setDanhSachDanhMuc).catch(() => {});
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { setQ(nhap.trim()); setTrang(1); }, 350);
    return () => clearTimeout(timer);
  }, [nhap]);
  useEffect(() => {
    let active = true;
    setDangTai(true);
    setLoi("");
    listEmployeeStock({ q, maDanhMuc: danhMuc, tinhTrang: trangThai, trang, soDong: SO_DONG })
      .then((result) => { if (active) setKetQua(result); })
      .catch((error) => { if (active) setLoi(error.message); })
      .finally(() => { if (active) setDangTai(false); });
    return () => { active = false; };
  }, [q, danhMuc, trangThai, trang]);

  const data = ketQua.data || [];
  const tong = Number(ketQua.total) || 0;
  const kpi = ketQua.tongQuan || {};
  const tongTrang = Math.max(1, Math.ceil(tong / SO_DONG));
  const tu = tong === 0 ? 0 : (trang - 1) * SO_DONG + 1;
  const den = Math.min(trang * SO_DONG, tong);
  const chuyenTrang = (page) => setTrang(Math.min(tongTrang, Math.max(1, page)));

  return <WorkspaceLayout user={user} mode="employee" activeTitle="Tồn kho">
    <section className="nvtk">
      <div className="workspace-breadcrumb">Vận hành / Tồn kho / Tra cứu tồn kho</div>
      <div className="nvtk-heading"><h1>Tra cứu tồn kho</h1><p>Tồn kho theo từng SKU • Chỉ xem và tra cứu, không điều chỉnh tồn trực tiếp</p></div>
      <div className="nvtk-filters">
        <label><span>Sản phẩm / SKU</span><input value={nhap} onChange={(event) => setNhap(event.target.value)} placeholder="Nhập tên sản phẩm hoặc SKU..."/></label>
        <label><span>Danh mục</span><select value={danhMuc} onChange={(event) => { setDanhMuc(event.target.value); setTrang(1); }}><option value="">Tất cả</option>{danhSachDanhMuc.map((item) => <option value={item.MaDanhMuc} key={item.MaDanhMuc}>{item.TenDanhMuc}</option>)}</select></label>
        <label><span>Tình trạng tồn</span><select value={trangThai} onChange={(event) => { setTrangThai(event.target.value); setTrang(1); }}><option value="">Tất cả</option><option>Còn hàng</option><option>Sắp hết</option><option>Hết hàng</option></select></label>
      </div>
      <div className="nvtk-kpis">
        {[["SKU đang xem", kpi.Tong], ["Còn hàng", kpi.ConHang], ["Sắp hết", kpi.SapHet], ["Hết hàng", kpi.HetHang]].map(([label, count]) => <div key={label} className="nvtk-kpi"><span>{label}</span><strong>{formatSo(count)}</strong></div>)}
      </div>
      <div className="nvtk-info"><Info size={16}/> <span>Tồn khả dụng = Tồn hiện tại − Số lượng đã giữ. Sắp hết: từ 1 đến ngưỡng cảnh báo của SKU; Hết hàng: không thể bán.</span></div>
      {loi && <div className="nvtk-error" role="alert">{loi} Vui lòng tải lại trang để thử lại.</div>}
      <div className="nvtk-table-wrap"><table className="nvtk-table"><thead><tr><th>Ảnh</th><th>Sản phẩm</th><th>SKU</th><th>Chất liệu</th><th>Màu</th><th>Kích thước (cm)</th><th>Tồn hiện tại</th><th>Đã giữ</th><th>Khả dụng</th><th>Trạng thái</th></tr></thead><tbody>
        {dangTai ? <tr><td colSpan={10} className="nvtk-no-data">Đang tải dữ liệu tồn kho...</td></tr> : data.length === 0 ? <tr><td colSpan={10} className="nvtk-no-data">Không tìm thấy SKU phù hợp.</td></tr> : data.map((item) => <tr key={item.MaBienThe}>
          <td><div className="nvtk-image"><Anh path={item.DuongDanAnh} ten={item.TenSanPham}/></div></td>
          <td>{item.TenSanPham}</td><td className="nvtk-sku">{item.SKU}</td><td>{item.ChatLieu || "—"}</td><td>{item.MauSac || "—"}</td><td>{item.KichThuoc || "—"}</td><td>{item.SoLuongTon}</td><td>{item.DaGiu}</td><td><strong className={`nvtk-quantity ${nhom[item.TinhTrang] || ""}`}>{item.KhaDung}</strong></td><td><span className={`nvtk-status ${nhom[item.TinhTrang] || ""}`}>{item.TinhTrang}</span></td>
        </tr>)}
      </tbody></table></div>
      <p className="nvtk-photo-note">Ảnh đại diện dòng sản phẩm. Màu sắc, chất liệu và kích thước được xác định theo mã SKU ở mỗi dòng.</p>
      <div className="nvtk-pager"><span>Hiển thị {tu}–{den} / {tong} kết quả</span><div className="nvtk-pages"><button type="button" aria-label="Trang trước" disabled={trang <= 1 || dangTai} onClick={() => chuyenTrang(trang - 1)}><ChevronLeft size={15}/></button>{Array.from({ length: Math.min(tongTrang, 5) }, (_, index) => { const start = Math.max(1, Math.min(trang - 2, tongTrang - 4)); const so = start + index; return <button key={so} type="button" className={so === trang ? "selected" : ""} disabled={dangTai} onClick={() => chuyenTrang(so)}>{so}</button>; })}<button type="button" aria-label="Trang sau" disabled={trang >= tongTrang || dangTai} onClick={() => chuyenTrang(trang + 1)}><ChevronRight size={15}/></button></div></div>
      <div className="nvtk-cards">{data.map((item) => <article key={item.MaBienThe} className="nvtk-card"><h2>{[item.TenSanPham, item.ChatLieu, item.MauSac].filter(Boolean).join(" · ")}</h2><span className={`nvtk-status ${nhom[item.TinhTrang] || ""}`}>{item.TinhTrang}</span><p>{item.SoLuongTon} hiện tại − {item.DaGiu} đã giữ = <strong>{item.KhaDung}</strong> khả dụng</p></article>)}</div>
    </section>
  </WorkspaceLayout>;
}
