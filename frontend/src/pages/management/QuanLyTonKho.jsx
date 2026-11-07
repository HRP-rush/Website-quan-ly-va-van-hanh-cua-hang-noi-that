import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Info, ChevronLeft, ChevronRight } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getCategories } from "../../services/productAdminService";
import { listStock } from "../../services/khoService";
import "../../styles/tonKho.css";

const SO_DONG = 10;
const LOP = { "Còn hàng": "ok", "Sắp hết": "low", "Hết hàng": "out" };
const pad = (n) => String(n ?? 0).padStart(2, "0");
const luc = () => new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

function Khung({ user, mode, children }) {
  return <WorkspaceLayout user={user} mode={mode} activeTitle="Kho hàng">
    <div className="workspace-breadcrumb">Quản trị / Kho hàng / Quản lý tồn kho</div>
    {children}
  </WorkspaceLayout>;
}

export default function QuanLyTonKho({ user, mode }) {
  const navigate = useNavigate();
  const base = mode === "admin" ? "/admin" : "/quan-ly";
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [tinhTrang, setTinhTrang] = useState("");
  const [maDanhMuc, setMaDanhMuc] = useState("");
  const [trang, setTrang] = useState(1);
  const [kq, setKq] = useState({ data: [], total: 0, tongQuan: null, canhBao: [], tongCanhBao: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [danhMuc, setDanhMuc] = useState([]);
  const [capNhat, setCapNhat] = useState("");

  useEffect(() => { getCategories().then(setDanhMuc).catch(() => {}); }, []);

  // Chờ người dùng ngừng gõ 400ms rồi mới gọi API
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setTrang(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    listStock({ q, tinhTrang, maDanhMuc, trang, soDong: SO_DONG })
      .then((r) => { if (live) { setKq(r); setCapNhat(luc()); } })
      .catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [q, tinhTrang, maDanhMuc, trang]);

  const k = kq.tongQuan || {};
  const tongTrang = Math.max(1, Math.ceil(kq.total / SO_DONG));
  const tu = kq.total === 0 ? 0 : (trang - 1) * SO_DONG + 1;
  const den = Math.min(trang * SO_DONG, kq.total);
  const chuaCo = "Sẽ triển khai ở màn hình tiếp theo";

  const canhBao = kq.canhBao.map((c) => c.TinhTrang === "Hết hàng"
    ? `${c.SKU} đã hết hàng.`
    : `${c.SKU} đã xuống dưới ngưỡng cảnh báo. Khả dụng ${c.KhaDung} • Ngưỡng ${c.MucCanhBao}.`);
  const conLai = kq.tongCanhBao - kq.canhBao.length;

  return <Khung user={user} mode={mode}>
    <div className="tk-head">
      <div className="workspace-head"><h1>Quản lý tồn kho</h1>
        <p>Đối chiếu số lượng theo từng SKU. Khả dụng = Hiện tại − Đã giữ.</p></div>
      <button type="button" className="tk-btn" disabled title={chuaCo}>Xem lịch sử kho</button>
    </div>

    <div className="tk-kpis">
      {[["Tổng SKU", k.Tong, `${k.Tong ?? 0} cấu hình đang theo dõi`],
        ["SKU còn hàng", k.ConHang, "Khả dụng lớn hơn ngưỡng cảnh báo"],
        ["SKU sắp hết", k.SapHet, "Khả dụng từ 1 đến ngưỡng cảnh báo"],
        ["SKU hết hàng", k.HetHang, "Khả dụng bằng 0"]]
        .map(([nhan, so, ghiChu]) => <div className="workspace-panel tk-kpi" key={nhan}>
          <span>{nhan}</span><strong>{pad(so)}</strong><small>{ghiChu}</small></div>)}
    </div>

    <div className="tk-filters">
      <label className="tk-field"><span>Tìm kiếm</span>
        <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Nhập mã SKU hoặc tên sản phẩm..."/></label>
      <label className="tk-field"><span>Tình trạng tồn</span>
        <select value={tinhTrang} onChange={(e) => { setTinhTrang(e.target.value); setTrang(1); }}>
          <option value="">Tất cả</option><option>Còn hàng</option><option>Sắp hết</option><option>Hết hàng</option></select></label>
      <label className="tk-field"><span>Danh mục</span>
        <select value={maDanhMuc} onChange={(e) => { setMaDanhMuc(e.target.value); setTrang(1); }}>
          <option value="">Tất cả</option>
          {danhMuc.map((d) => <option key={d.MaDanhMuc} value={d.MaDanhMuc}>{d.TenDanhMuc}</option>)}</select></label>
    </div>

    {error && <div className="tk-alert" role="alert">{error}</div>}

    <div className={`workspace-table-scroll tk-table ${loading ? "is-loading" : ""}`}>
      <table className="workspace-table">
        <thead><tr><th>Mã SKU</th><th>Sản phẩm</th><th>Thuộc tính</th><th>Hiện tại</th><th>Đã giữ</th><th>Khả dụng</th><th>Cảnh báo</th><th>Thao tác</th></tr></thead>
        <tbody>
          {kq.data.map((r) => <tr key={r.MaBienThe}>
            <td>{r.SKU}{r.TrangThai !== "Đang bán" && <span className="tk-tag">Ngừng bán</span>}</td>
            <td>{r.TenSanPham}</td>
            <td><div>{[r.ChatLieu, r.MauSac].filter(Boolean).join(" / ") || "—"}</div><div className="tk-sub">{r.KichThuoc || "—"}</div></td>
            <td>{r.SoLuongTon}</td><td>{r.DaGiu}</td><td>{r.KhaDung}</td>
            <td><span className={`tk-chip ${LOP[r.TinhTrang]}`}>{r.TinhTrang}</span></td>
            <td className="tk-actions">
              <button type="button" onClick={() => navigate(`${base}/san-pham/${encodeURIComponent(r.MaSanPham)}/bien-the`)}>Chi tiết</button>
              {" "}· <span title={chuaCo}>Lịch sử</span>
            </td>
          </tr>)}
          {!loading && kq.data.length === 0 && <tr><td colSpan={8} className="tk-empty">
            {k.Tong === 0 ? "Chưa có SKU nào. Hãy thêm biến thể cho sản phẩm." : "Không có SKU phù hợp với bộ lọc."}</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="tk-pager">
      <span>Hiển thị {tu}–{den} / {kq.total} kết quả • {SO_DONG} dòng / trang</span>
      <div>
        <button type="button" className="tk-page" disabled={trang <= 1} onClick={() => setTrang(trang - 1)} aria-label="Trang trước"><ChevronLeft size={14}/></button>
        <span className="tk-page is-on">{trang}</span>
        <button type="button" className="tk-page" disabled={trang >= tongTrang} onClick={() => setTrang(trang + 1)} aria-label="Trang sau"><ChevronRight size={14}/></button>
      </div>
    </div>

    {canhBao.length > 0 && <p className="tk-warn"><AlertTriangle size={14}/>
      <span>{canhBao.join(" ")}{conLai > 0 ? ` Và ${conLai} SKU khác cần chú ý.` : ""}</span></p>}
    <p className="tk-info"><Info size={14}/> Không sửa trực tiếp số lượng tại danh sách. Nhập kho và xuất theo đơn được ghi nhận bằng giao dịch có tham chiếu. Tồn khả dụng không được âm.</p>
    <p className="tk-foot">MỘC AN INTERIOR{capNhat && ` • Cập nhật lúc ${capNhat}`}</p>
  </Khung>;
}
