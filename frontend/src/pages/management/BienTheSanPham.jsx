import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Info, AlertTriangle, ChevronLeft, ChevronRight, X } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getVariants, createVariant, updateVariant, setVariantStatus, imageUrl } from "../../services/productAdminService";
import "../../styles/bienTheSanPham.css";

const SO_DONG = 10;
const NHAN_SP = { "Đang bán": "Đang kinh doanh", "Tạm ẩn": "Tạm ẩn", "Ngừng bán": "Ngừng kinh doanh" };
const LOP_SP = { "Đang bán": "ok", "Tạm ẩn": "low", "Ngừng bán": "stopped" };
const LOP_TON = { "Còn hàng": "ok", "Sắp hết": "low", "Hết hàng": "out" };
const fmtGia = (n) => (n == null || n === "" ? "—" : `${Number(n).toLocaleString("vi-VN")} ₫`);
const fmtSo = (s) => (s ? Number(s).toLocaleString("vi-VN") : "");

// Gợi ý mã SKU: LUNA-LINEN-KEM-220 (mã SP bỏ "SP-", chất liệu, màu, số đầu của kích thước)
const slug = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/[^A-Z0-9]+/g, "");
const goiYSku = (maSP, f) => [String(maSP).replace(/^SP-/i, ""), slug(f.chatLieu), slug(f.mauSac),
  (String(f.kichThuoc).match(/\d+/) || [""])[0]].filter(Boolean).join("-");

function Khung({ user, mode, ten, children }) {
  return <WorkspaceLayout user={user} mode={mode} activeTitle="Biến thể sản phẩm">
    <div className="workspace-breadcrumb">Quản trị / Biến thể sản phẩm{ten ? ` / Biến thể sản phẩm – ${ten}` : ""}</div>
    {children}
  </WorkspaceLayout>;
}

/* ---------- Form nhỏ (pop-up) thêm / sửa biến thể ---------- */
function FormBienThe({ mode, bt, sanPham, onClose, onSaved }) {
  const them = mode === "them";
  const [f, setF] = useState(() => ({
    sku: bt?.SKU || "", chatLieu: bt?.ChatLieu || "", mauSac: bt?.MauSac || "", kichThuoc: bt?.KichThuoc || "",
    giaBan: bt ? String(Math.round(bt.GiaBan)) : sanPham.Gia ? String(Math.round(sanPham.Gia)) : "",
    giaNhap: bt?.GiaNhapThamChieu == null ? "" : String(Math.round(bt.GiaNhapThamChieu)),
    mucCanhBao: String(bt?.MucCanhBao ?? 5), trangThai: bt?.TrangThai || "Đang bán"
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const skuTuSua = useRef(false);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
    const khoa = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = khoa; window.removeEventListener("keydown", esc); };
  }, [onClose, saving]);

  // Khi thêm: tự gợi ý SKU theo thuộc tính cho tới khi người dùng tự gõ SKU
  useEffect(() => {
    if (them && !skuTuSua.current) setF((x) => ({ ...x, sku: goiYSku(sanPham.MaSanPham, x) }));
  }, [them, sanPham.MaSanPham, f.chatLieu, f.mauSac, f.kichThuoc]);

  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setErrors((er) => ({ ...er, [k]: undefined })); };
  const soThuan = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value.replace(/\D/g, "").slice(0, 12) })); setErrors((er) => ({ ...er, [k]: undefined })); };

  function validate() {
    const er = {};
    if (them && !/^[A-Za-z0-9._-]{1,80}$/.test(f.sku.trim())) er.sku = "Chỉ dùng chữ, số, - . _ và không có khoảng trắng.";
    if (!f.chatLieu.trim() && !f.mauSac.trim() && !f.kichThuoc.trim()) er.chatLieu = "Nhập ít nhất chất liệu, màu sắc hoặc kích thước.";
    if (!(Number(f.giaBan) > 0)) er.giaBan = "Giá bán phải lớn hơn 0.";
    if (f.mucCanhBao === "" || Number(f.mucCanhBao) < 0) er.mucCanhBao = "Nhập số từ 0 trở lên.";
    setErrors(er);
    return Object.keys(er).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setSaving(true);
    try {
      const body = { ...f, sku: f.sku.trim() };
      if (them) { const r = await createVariant(sanPham.MaSanPham, body); onSaved(`Đã thêm biến thể ${r.data.SKU}.`); }
      else { await updateVariant(bt.MaBienThe, body); onSaved(`Đã lưu biến thể ${bt.SKU}.`); }
    } catch (err) { setServerError(err.message); setSaving(false); }
  }

  return <div className="bt-overlay" onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
    <form className="bt-modal" role="dialog" aria-modal="true" aria-labelledby="bt-modal-title" onSubmit={submit} noValidate>
      <header>
        <div>
          <h2 id="bt-modal-title">{them ? "Thêm biến thể" : "Sửa biến thể"}</h2>
          <p>{sanPham.TenSanPham} • {sanPham.MaSanPham}</p>
        </div>
        <button type="button" className="bt-close" onClick={onClose} disabled={saving} aria-label="Đóng"><X size={18}/></button>
      </header>

      <div className="bt-grid">
        <label className="bt-field bt-span2"><span>Chất liệu</span>
          <input ref={firstRef} value={f.chatLieu} onChange={set("chatLieu")} maxLength={150} placeholder="Linen"/></label>
        <label className="bt-field"><span>Màu sắc</span>
          <input value={f.mauSac} onChange={set("mauSac")} maxLength={100} placeholder="Kem"/></label>
        <label className="bt-field"><span>Kích thước (cm)</span>
          <input value={f.kichThuoc} onChange={set("kichThuoc")} maxLength={150} placeholder="220 × 90 × 80"/></label>
        {errors.chatLieu && <small className="bt-error bt-span2">{errors.chatLieu}</small>}

        <label className="bt-field bt-span2"><span>Mã SKU *</span>
          <input value={f.sku} disabled={!them} maxLength={80}
            onChange={(e) => { skuTuSua.current = true; set("sku")(e); }} placeholder="LUNA-LINEN-KEM-220"/>
          {errors.sku ? <small className="bt-error">{errors.sku}</small>
            : <small className="bt-hint">{them ? "Duy nhất toàn hệ thống. Tự gợi ý theo thuộc tính, bạn có thể sửa." : "Mã SKU không thể đổi vì đơn hàng cũ tham chiếu theo mã này."}</small>}
        </label>

        <label className="bt-field"><span>Giá bán (₫) *</span>
          <input inputMode="numeric" value={fmtSo(f.giaBan)} onChange={soThuan("giaBan")}/>
          {errors.giaBan && <small className="bt-error">{errors.giaBan}</small>}</label>
        <label className="bt-field"><span>Giá nhập tham chiếu (₫)</span>
          <input inputMode="numeric" value={fmtSo(f.giaNhap)} onChange={soThuan("giaNhap")}/></label>

        <label className="bt-field"><span>Mức cảnh báo sắp hết</span>
          <input inputMode="numeric" value={f.mucCanhBao} onChange={soThuan("mucCanhBao")}/>
          {errors.mucCanhBao ? <small className="bt-error">{errors.mucCanhBao}</small> : <small className="bt-hint">Khả dụng ≤ mức này thì hiện "Sắp hết".</small>}</label>
        <label className="bt-field"><span>Trạng thái bán</span>
          <select value={f.trangThai} onChange={set("trangThai")}>
            <option value="Đang bán">Đang bán</option><option value="Ngừng bán">Ngừng bán</option></select></label>
      </div>

      <p className="bt-note"><Info size={13}/> Tồn kho ban đầu là 0. Số lượng chỉ tăng khi nhập hàng qua Phiếu nhập.</p>
      {serverError && <div className="bt-alert" role="alert">{serverError}</div>}

      <footer>
        <button type="button" className="bt-btn bt-btn-outline" onClick={onClose} disabled={saving}>Hủy</button>
        <button type="submit" className="bt-btn bt-btn-dark" disabled={saving}>{saving ? "Đang lưu..." : them ? "Thêm biến thể" : "Lưu thay đổi"}</button>
      </footer>
    </form>
  </div>;
}

/* ---------- Trang ---------- */
export default function BienTheSanPham({ user, mode }) {
  const { maSanPham } = useParams();
  const navigate = useNavigate();
  const base = mode === "admin" ? "/admin" : "/quan-ly";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [flash, setFlash] = useState("");
  const [modal, setModal] = useState(null);       // null | { mode: "them" } | { mode: "sua", bt }
  const [q, setQ] = useState("");
  const [fBan, setFBan] = useState("");
  const [fTon, setFTon] = useState("");
  const [trang, setTrang] = useState(1);

  useEffect(() => {
    let live = true;
    getVariants(maSanPham).then((r) => { if (live) { setData(r); setError(""); } })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [maSanPham, reload]);

  useEffect(() => { if (!flash) return; const t = setTimeout(() => setFlash(""), 4000); return () => clearTimeout(t); }, [flash]);

  const ds = data?.bienThe || [];
  const tong = useMemo(() => ({
    ton: ds.reduce((s, b) => s + b.SoLuongTon, 0), giu: ds.reduce((s, b) => s + b.DaGiu, 0),
    khaDung: ds.reduce((s, b) => s + b.KhaDung, 0)
  }), [ds]);

  const loc = useMemo(() => {
    const k = q.trim().toLowerCase();
    return ds.filter((b) =>
      (!k || [b.SKU, b.ChatLieu, b.MauSac].some((x) => String(x || "").toLowerCase().includes(k))) &&
      (!fBan || b.TrangThai === fBan) && (!fTon || b.TinhTrangTon === fTon));
  }, [ds, q, fBan, fTon]);
  const tongTrang = Math.max(1, Math.ceil(loc.length / SO_DONG));
  const trangHt = Math.min(trang, tongTrang);
  const hien = loc.slice((trangHt - 1) * SO_DONG, trangHt * SO_DONG);
  const tu = loc.length ? (trangHt - 1) * SO_DONG + 1 : 0;
  const den = Math.min(trangHt * SO_DONG, loc.length);

  const canhBao = ds.filter((b) => b.TrangThai === "Đang bán" && b.TinhTrangTon !== "Còn hàng");

  async function doiTrangThai(b, trangThai) {
    const hoi = trangThai === "Ngừng bán"
      ? `Ngừng bán SKU ${b.SKU}? Khách sẽ không đặt được SKU này, đơn hàng cũ vẫn được giữ nguyên.`
      : `Bán lại SKU ${b.SKU}?`;
    if (!window.confirm(hoi)) return;
    try { await setVariantStatus(b.MaBienThe, trangThai); setReload((n) => n + 1); setFlash(`Đã cập nhật ${b.SKU}.`); }
    catch (e) { setError(e.message); }
  }
  const daLuu = (msg) => { setModal(null); setFlash(msg); setReload((n) => n + 1); };
  const kh = { user, mode };

  if (!data) return <Khung {...kh}>
    {error ? <><div className="bt-alert" role="alert">{error}</div>
      <button type="button" className="bt-btn bt-btn-outline" onClick={() => navigate(`${base}/san-pham`)}>Quay lại danh sách sản phẩm</button></>
      : <p className="bt-muted">Đang tải biến thể...</p>}
  </Khung>;

  const sp = data.sanPham;
  const nguong = ds.length ? [...new Set(ds.map((b) => b.MucCanhBao))].sort((a, b) => a - b) : [5];
  return <Khung {...kh} ten={sp.TenSanPham}>
    <div className="bt-head">
      <div className="workspace-head"><h1>Biến thể sản phẩm – {sp.TenSanPham}</h1>
        <p>Mỗi SKU là một cấu hình bán hàng độc lập. {ds.length} biến thể • Mã sản phẩm {sp.MaSanPham}.</p></div>
      <button type="button" className="bt-btn bt-btn-dark" onClick={() => setModal({ mode: "them" })}><Plus size={15}/> Thêm biến thể</button>
    </div>

    {flash && <div className="bt-flash" role="status">{flash}</div>}
    {error && <div className="bt-alert" role="alert">{error}</div>}

    <section className="workspace-panel bt-summary">
      <img src={imageUrl(sp.DuongDanAnh)} alt={sp.TenSanPham}/>
      <div className="bt-summary-info">
        <Link to={`${base}/san-pham/${encodeURIComponent(sp.MaSanPham)}`} className="bt-name">{sp.TenSanPham}</Link>
        <p>{sp.TenDanhMuc} • Giá cơ bản {fmtGia(sp.Gia)}</p>
        <span className={`bt-chip ${LOP_SP[sp.TrangThai] || ""}`}>{NHAN_SP[sp.TrangThai] || sp.TrangThai}</span>
      </div>
      <div className="bt-summary-num"><small>Tồn hiện tại / Đã giữ / Khả dụng</small><strong>{tong.ton} / {tong.giu} / {tong.khaDung}</strong></div>
    </section>

    <div className="bt-filters">
      <label className="bt-field"><span>Tìm kiếm SKU</span>
        <input value={q} onChange={(e) => { setQ(e.target.value); setTrang(1); }} placeholder="Nhập mã SKU, chất liệu hoặc màu..."/></label>
      <label className="bt-field"><span>Trạng thái bán</span>
        <select value={fBan} onChange={(e) => { setFBan(e.target.value); setTrang(1); }}>
          <option value="">Tất cả trạng thái</option><option>Đang bán</option><option>Ngừng bán</option></select></label>
      <label className="bt-field"><span>Tình trạng tồn</span>
        <select value={fTon} onChange={(e) => { setFTon(e.target.value); setTrang(1); }}>
          <option value="">Tất cả</option><option>Còn hàng</option><option>Sắp hết</option><option>Hết hàng</option></select></label>
    </div>

    <div className="workspace-table-scroll bt-table">
      <table className="workspace-table">
        <thead><tr><th>Mã SKU</th><th>Chất liệu</th><th>Màu sắc</th><th>Kích thước (cm)</th><th>Giá bán</th><th>Khả dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>
          {hien.map((b) => <tr key={b.MaBienThe}>
            <td>{b.SKU}</td><td>{b.ChatLieu || "—"}</td><td>{b.MauSac || "—"}</td><td>{b.KichThuoc || "—"}</td>
            <td>{fmtGia(b.GiaBan)}</td>
            <td><strong className={`bt-avail ${LOP_TON[b.TinhTrangTon]}`}>{b.KhaDung}</strong></td>
            <td><span className={`bt-chip ${b.TrangThai === "Đang bán" ? "ok" : "stopped"}`}>{b.TrangThai}</span></td>
            <td className="bt-actions">
              <button type="button" onClick={() => setModal({ mode: "sua", bt: b })}>Sửa</button> ·{" "}
              {b.TrangThai === "Đang bán"
                ? <button type="button" onClick={() => doiTrangThai(b, "Ngừng bán")}>Ngừng bán</button>
                : <button type="button" onClick={() => doiTrangThai(b, "Đang bán")}>Bán lại</button>}
            </td>
          </tr>)}
          {hien.length === 0 && <tr><td colSpan={8} className="bt-empty">
            {ds.length === 0 ? "Sản phẩm chưa có biến thể nào. Bấm \"Thêm biến thể\" để tạo SKU đầu tiên." : "Không có biến thể phù hợp với bộ lọc."}</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="bt-pager">
      <span>Hiển thị {tu}–{den} / {loc.length} kết quả • {SO_DONG} dòng / trang</span>
      <div>
        <button type="button" className="bt-page" disabled={trangHt <= 1} onClick={() => setTrang(trangHt - 1)} aria-label="Trang trước"><ChevronLeft size={14}/></button>
        <span className="bt-page is-on">{trangHt}</span>
        <button type="button" className="bt-page" disabled={trangHt >= tongTrang} onClick={() => setTrang(trangHt + 1)} aria-label="Trang sau"><ChevronRight size={14}/></button>
      </div>
    </div>

    <p className="bt-info"><Info size={14}/> Tồn kho thuộc chính xác mã SKU. Không chỉnh sửa số lượng ở biểu mẫu biến thể. Khả dụng = Hiện tại − Đã giữ.</p>

    <section className="workspace-panel">
      <h2>Đối chiếu tồn kho theo SKU</h2>
      <div className="workspace-table-scroll">
        <table className="workspace-table">
          <thead><tr><th>SKU</th><th>Chất liệu / Màu</th><th>Kích thước (cm)</th><th>Hiện tại</th><th>Đã giữ</th><th>Khả dụng</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {ds.map((b) => <tr key={b.MaBienThe}>
              <td>{b.SKU}</td><td>{[b.ChatLieu, b.MauSac].filter(Boolean).join(" / ") || "—"}</td><td>{b.KichThuoc || "—"}</td>
              <td>{b.SoLuongTon}</td><td>{b.DaGiu}</td>
              <td><strong className={`bt-avail ${LOP_TON[b.TinhTrangTon]}`}>{b.KhaDung}</strong></td>
              <td><span className={`bt-chip ${LOP_TON[b.TinhTrangTon]}`}>{b.TinhTrangTon}</span></td>
            </tr>)}
            {ds.length === 0 && <tr><td colSpan={7} className="bt-empty">Chưa có dữ liệu tồn kho.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="bt-muted bt-foot">Ảnh sản phẩm chỉ mang tính đại diện. Màu, chất liệu và kích thước được xác định theo từng mã SKU. Ngưỡng sắp hết: ≤ {nguong.join(" / ")} (đặt riêng cho từng SKU).</p>
    </section>

    {canhBao.length > 0 && <p className="bt-warn"><AlertTriangle size={14}/> {canhBao.length} SKU đang bán nhưng {canhBao.every((b) => b.TinhTrangTon === "Hết hàng") ? "đã hết hàng" : "sắp hoặc đã hết hàng"}: {canhBao.map((b) => b.SKU).join(", ")}.</p>}
    <p className="bt-warn"><AlertTriangle size={14}/> Không xóa biến thể đã có đơn hàng lịch sử. Chọn "Ngừng bán" để giữ mã SKU và thông tin tham chiếu của đơn hàng cũ.</p>

    {modal && <FormBienThe mode={modal.mode} bt={modal.bt} sanPham={sp} onClose={() => setModal(null)} onSaved={daLuu}/>}
  </Khung>;
}
