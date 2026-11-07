import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, Info, ChevronLeft, ChevronRight } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import {
  getCategories, getMaterials, listProducts, setProductStatus, imageUrl
} from "../../services/productAdminService";
import "../../styles/danhSachSanPham.css";

const SO_DONG = 8;
const NHAN = { "Đang bán": "Đang kinh doanh", "Tạm ẩn": "Tạm ẩn", "Ngừng bán": "Ngừng kinh doanh" };
const LOP = { "Đang bán": "is-active", "Tạm ẩn": "is-hidden", "Ngừng bán": "is-stopped" };
const KHOANG_GIA = [
  ["", "Tất cả"], ["0-5000000", "Dưới 5.000.000 ₫"], ["5000000-10000000", "5–10 triệu ₫"],
  ["10000000-20000000", "10–20 triệu ₫"], ["20000000-30000000", "20–30 triệu ₫"], ["30000000-", "Trên 30 triệu ₫"]
];
const LOC_RONG = { maDanhMuc: "", trangThai: "", chatLieu: "", gia: "" };
const fmtGia = (n) => (n == null ? "—" : `${Number(n).toLocaleString("vi-VN")} ₫`);

export default function DanhSachSanPham({ user, mode }) {
  const navigate = useNavigate();
  const base = mode === "admin" ? "/admin" : "/quan-ly";

  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");                 // từ khóa đã "debounce"
  const [loc, setLoc] = useState(LOC_RONG);
  const [trang, setTrang] = useState(1);
  const [reload, setReload] = useState(0);
  const [kq, setKq] = useState({ data: [], total: 0, tongTatCa: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [danhMuc, setDanhMuc] = useState([]);
  const [chatLieu, setChatLieu] = useState([]);

  useEffect(() => {
    getCategories().then(setDanhMuc).catch(() => {});
    getMaterials().then(setChatLieu).catch(() => {});
  }, []);

  // Chờ người dùng ngừng gõ 400ms rồi mới gọi API
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setTrang(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let live = true; // bỏ kết quả của request cũ nếu người dùng đã đổi bộ lọc
    setLoading(true); setError("");
    const [giaTu, giaDen] = loc.gia ? loc.gia.split("-") : ["", ""];
    listProducts({ q, maDanhMuc: loc.maDanhMuc, trangThai: loc.trangThai, chatLieu: loc.chatLieu,
      giaTu, giaDen, trang, soDong: SO_DONG })
      .then((r) => { if (live) setKq(r); })
      .catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [q, loc, trang, reload]);

  const doiLoc = (name) => (e) => { setLoc((l) => ({ ...l, [name]: e.target.value })); setTrang(1); };
  function lamMoi() { setQInput(""); setQ(""); setLoc(LOC_RONG); setTrang(1); setReload((n) => n + 1); }

  async function doiTrangThai(sp, trangThai) {
    const hoi = trangThai === "Ngừng bán"
      ? `Ngừng kinh doanh "${sp.TenSanPham}"? Sản phẩm sẽ không còn hiển thị cho khách nhưng dữ liệu vẫn được giữ.`
      : `Kinh doanh lại "${sp.TenSanPham}"?`;
    if (!window.confirm(hoi)) return;
    try { await setProductStatus(sp.MaSanPham, trangThai); setReload((n) => n + 1); }
    catch (e) { setError(e.message); }
  }

  const tongTrang = Math.max(1, Math.ceil(kq.total / SO_DONG));
  const tu = kq.total === 0 ? 0 : (trang - 1) * SO_DONG + 1;
  const den = Math.min(trang * SO_DONG, kq.total);
  const chuaXayDung = "Sẽ triển khai ở màn hình tiếp theo";

  return <WorkspaceLayout user={user} mode={mode} activeTitle="Sản phẩm">
    <div className="workspace-breadcrumb">Quản trị / Sản phẩm / Quản lý sản phẩm</div>
    <div className="dsp-head">
      <div className="workspace-head"><h1>Quản lý sản phẩm</h1>
        <p>Quản lý thông tin, hình ảnh và trạng thái kinh doanh của {kq.tongTatCa} sản phẩm.</p></div>
      <button type="button" className="dsp-btn dsp-btn-dark" onClick={() => navigate(`${base}/san-pham/them`)}>
        <Plus size={15}/> Thêm sản phẩm</button>
    </div>

    <div className="dsp-search">
      <label className="dsp-field dsp-grow"><span>Tìm kiếm sản phẩm</span>
        <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm theo mã, tên hoặc danh mục..."/></label>
      <button type="button" className="dsp-btn dsp-btn-outline" onClick={lamMoi}><RefreshCw size={14}/> Làm mới</button>
    </div>

    <div className="dsp-filters">
      <label className="dsp-field"><span>Danh mục</span>
        <select value={loc.maDanhMuc} onChange={doiLoc("maDanhMuc")}>
          <option value="">Tất cả</option>
          {danhMuc.map((d) => <option key={d.MaDanhMuc} value={d.MaDanhMuc}>{d.TenDanhMuc}</option>)}
        </select></label>
      <label className="dsp-field"><span>Trạng thái</span>
        <select value={loc.trangThai} onChange={doiLoc("trangThai")}>
          <option value="">Tất cả</option>
          {Object.entries(NHAN).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select></label>
      <label className="dsp-field"><span>Chất liệu</span>
        <select value={loc.chatLieu} onChange={doiLoc("chatLieu")}>
          <option value="">Tất cả</option>
          {chatLieu.map((c) => <option key={c}>{c}</option>)}
        </select></label>
      <label className="dsp-field"><span>Khoảng giá</span>
        <select value={loc.gia} onChange={doiLoc("gia")}>
          {KHOANG_GIA.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select></label>
    </div>

    {error && <div className="dsp-alert" role="alert">{error}</div>}

    <div className={`workspace-table-scroll dsp-table ${loading ? "is-loading" : ""}`}>
      <table className="workspace-table">
        <thead><tr><th>Ảnh</th><th>Mã SP</th><th>Tên sản phẩm</th><th>Danh mục</th>
          <th>Giá cơ bản</th><th>Biến thể</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>
          {kq.data.map((sp) => <tr key={sp.MaSanPham}>
            <td><img className="dsp-thumb" src={imageUrl(sp.DuongDanAnh)} alt={sp.TenSanPham} loading="lazy"/></td>
            <td>{sp.MaSanPham}</td>
            <td>{sp.TenSanPham}</td>
            <td>{sp.TenDanhMuc}</td>
            <td>{fmtGia(sp.Gia)}</td>
            <td>{sp.SoBienThe}</td>
            <td><span className={`dsp-status ${LOP[sp.TrangThai] || ""}`}>{NHAN[sp.TrangThai] || sp.TrangThai}</span></td>
            <td><div className="dsp-actions">
              <button type="button" onClick={() => navigate(`${base}/san-pham/${encodeURIComponent(sp.MaSanPham)}`)}>Xem</button>
              {" "}· <button type="button" onClick={() => navigate(`${base}/san-pham/${encodeURIComponent(sp.MaSanPham)}/chinh-sua`)}>Chỉnh sửa</button>
              <br/>
              <button type="button" onClick={() => navigate(`${base}/san-pham/${encodeURIComponent(sp.MaSanPham)}/bien-the`)}>Biến thể</button> ·{" "}
              {sp.TrangThai === "Ngừng bán"
                ? <button type="button" onClick={() => doiTrangThai(sp, "Đang bán")}>Kinh doanh lại</button>
                : <button type="button" onClick={() => doiTrangThai(sp, "Ngừng bán")}>Ngừng bán</button>}
            </div></td>
          </tr>)}
          {!loading && kq.data.length === 0 && <tr><td colSpan={8} className="dsp-empty">Không có sản phẩm phù hợp với bộ lọc.</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="dsp-pager">
      <span>Hiển thị {tu}–{den} / {kq.total} sản phẩm</span>
      <div>
        <button type="button" className="dsp-btn dsp-btn-outline" disabled={trang <= 1} onClick={() => setTrang(trang - 1)} aria-label="Trang trước"><ChevronLeft size={14}/></button>
        <span className="dsp-page">Trang {trang} / {tongTrang}</span>
        <button type="button" className="dsp-btn dsp-btn-outline" disabled={trang >= tongTrang} onClick={() => setTrang(trang + 1)} aria-label="Trang sau"><ChevronRight size={14}/></button>
      </div>
    </div>

    <p className="dsp-note"><Info size={14}/> Ngừng kinh doanh thay cho xóa sản phẩm đã phát sinh đơn hàng. Thông tin và mã sản phẩm vẫn được lưu để tra cứu lịch sử.</p>
  </WorkspaceLayout>;
}
