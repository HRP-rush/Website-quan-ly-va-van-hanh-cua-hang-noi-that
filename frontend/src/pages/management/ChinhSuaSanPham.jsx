import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight, Check, Info } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getCategories, getProductForEdit, updateProduct, imageUrl } from "../../services/productAdminService";
import "../../styles/themSanPham.css";
import "../../styles/chinhSuaSanPham.css";

const STEPS = [
  ["thong-tin-co-ban", "1. Thông tin cơ bản"], ["gia-trang-thai", "2. Giá & trạng thái"],
  ["hinh-anh", "3. Hình ảnh"], ["thong-tin-san-pham", "4. Thông tin sản phẩm"], ["bien-the", "5. Biến thể"]
];
const PHONG_CACH = ["Japandi", "Tối giản", "Bắc Âu", "Hiện đại", "Cổ điển"];
const NHAN = { "Đang bán": "Đang kinh doanh", "Tạm ẩn": "Tạm ẩn", "Ngừng bán": "Ngừng kinh doanh" };
const GHI_CHU = {
  "Đang bán": "Đang hiển thị trên cửa hàng.",
  "Tạm ẩn": "Sản phẩm đang bị ẩn khỏi cửa hàng.",
  "Ngừng bán": "Ngừng kinh doanh: không hiển thị cho khách, dữ liệu vẫn được giữ."
};
const MAX_BO_SUNG = 8, MAX_MB = 5, KIEU_ANH = ["image/jpeg", "image/png", "image/webp"];
const fmtGia = (s) => (s ? Number(s).toLocaleString("vi-VN") : "");
const tenFile = (p) => decodeURIComponent(String(p).split("/").pop());

function Field({ label, required, hint, error, children }) {
  return <label className="sp-field">
    <span className="sp-label">{label}{required && " *"}</span>
    {children}
    {error ? <small className="sp-error">{error}</small> : hint && <small className="sp-hint">{hint}</small>}
  </label>;
}

function Khung({ user, mode, base, ma, children }) {
  return <WorkspaceLayout user={user} mode={mode} activeTitle="Sản phẩm">
    <div className="workspace-breadcrumb">Quản trị / <Link to={`${base}/san-pham`}>Sản phẩm</Link> / Chỉnh sửa sản phẩm</div>
    {children}
  </WorkspaceLayout>;
}

export default function ChinhSuaSanPham({ user, mode }) {
  const { maSanPham } = useParams();
  const navigate = useNavigate();
  const base = mode === "admin" ? "/admin" : "/quan-ly";
  const veChiTiet = `${base}/san-pham/${encodeURIComponent(maSanPham)}`;

  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState(null);               // dòng phụ đề + thông tin biến thể
  const [form, setForm] = useState(null);
  const [anhChinh, setAnhChinh] = useState(null);       // { key, url, name, id? | file? }
  const [anhBoSung, setAnhBoSung] = useState([]);
  const [goc, setGoc] = useState("");                   // ảnh chụp trạng thái ban đầu để biết có sửa gì chưa
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([getProductForEdit(maSanPham), getCategories()]).then(([r, dm]) => {
      if (!live) return;
      const sp = r.sanPham;
      const f = {
        tenSanPham: sp.TenSanPham, maDanhMuc: String(sp.MaDanhMuc), moTaNgan: sp.MoTaNgan || "", moTa: sp.MoTa || "",
        giaCoBan: sp.GiaCoBan == null ? "" : String(Math.round(sp.GiaCoBan)), trangThai: sp.TrangThai,
        phongCach: sp.PhongCach || "", chatLieuChinh: sp.ChatLieuChinh || "",
        huongDanBaoQuan: sp.HuongDanBaoQuan || "", thongSoKyThuat: sp.ThongSoKyThuat || ""
      };
      const items = r.anh.map((a) => ({ key: `a${a.MaAnh}`, id: a.MaAnh, url: imageUrl(a.DuongDan), name: tenFile(a.DuongDan) }));
      setForm(f); setAnhChinh(items[0] || null); setAnhBoSung(items.slice(1));
      setGoc(JSON.stringify({ f, anh: items.map((i) => i.key) }));
      setMeta({ ten: sp.TenSanPham, ma: sp.MaSanPham, capNhatLuc: sp.CapNhatLuc, chuaTungSua: !!sp.ChuaTungSua,
        nguoi: sp.NguoiCapNhat, soBienThe: r.bienThe.SoBienThe, khaDung: r.bienThe.KhaDung });
      setCategories(dm); setLoaded(true);
    }).catch((e) => live && setServerError(e.message));
    return () => { live = false; };
  }, [maSanPham]);

  // Giải phóng URL tạm của ảnh mới khi rời trang
  const dangGiu = useRef([]);
  dangGiu.current = [anhChinh, ...anhBoSung];
  useEffect(() => () => dangGiu.current.forEach((a) => a?.file && URL.revokeObjectURL(a.url)), []);

  const hienTai = useMemo(() => form ? JSON.stringify({ f: form, anh: [anhChinh, ...anhBoSung].filter(Boolean).map((a) => a.key) }) : "", [form, anhChinh, anhBoSung]);
  const daSua = loaded && hienTai !== goc;

  // Cảnh báo khi đóng tab/tải lại lúc còn thay đổi chưa lưu
  useEffect(() => {
    if (!daSua) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [daSua]);

  const set = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    setErrors((er) => ({ ...er, [name]: undefined }));
  };

  function pickFile(file) {
    if (!file) return null;
    if (!KIEU_ANH.includes(file.type)) { setServerError("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP."); return null; }
    if (file.size > MAX_MB * 1024 * 1024) { setServerError(`Mỗi ảnh tối đa ${MAX_MB} MB.`); return null; }
    setServerError("");
    return { key: crypto.randomUUID(), file, url: URL.createObjectURL(file), name: file.name };
  }
  const thuHoi = (a) => a?.file && URL.revokeObjectURL(a.url);
  function onMainChange(e) {
    const p = pickFile(e.target.files[0]);
    if (p) { thuHoi(anhChinh); setAnhChinh(p); } // ảnh chính cũ bị thay thế, sẽ bị gỡ khỏi sản phẩm khi lưu
    e.target.value = "";
  }
  function onExtraChange(e) {
    const room = MAX_BO_SUNG - anhBoSung.length;
    const added = [...e.target.files].slice(0, room).map(pickFile).filter(Boolean);
    setAnhBoSung((l) => [...l, ...added]);
    e.target.value = "";
  }
  function moveExtra(i, dir) {
    setAnhBoSung((l) => {
      const j = i + dir; if (j < 0 || j >= l.length) return l;
      const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c;
    });
  }
  function removeExtra(key) {
    setAnhBoSung((l) => { thuHoi(l.find((a) => a.key === key)); return l.filter((a) => a.key !== key); });
  }

  function validate() {
    const er = {};
    if (!form.tenSanPham.trim()) er.tenSanPham = "Nhập tên sản phẩm.";
    if (!form.maDanhMuc) er.maDanhMuc = "Chọn danh mục.";
    if (!(Number(form.giaCoBan) > 0)) er.giaCoBan = "Giá phải lớn hơn 0.";
    setErrors(er);
    return Object.keys(er).length === 0;
  }

  async function handleSave() {
    setServerError("");
    if (!validate()) { document.querySelector(".sp-error")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setSaving(true);
    try {
      const anh = [anhChinh, ...anhBoSung].filter(Boolean);
      await updateProduct(maSanPham, { ...form, tenSanPham: form.tenSanPham.trim() },
        anh.map((a) => (a.file ? "moi" : a.id)), anh.filter((a) => a.file).map((a) => a.file));
      setGoc(hienTai);                         // để không bị hỏi "chưa lưu" khi chuyển trang
      navigate(veChiTiet, { replace: true });
    } catch (e) { setServerError(e.message); }
    finally { setSaving(false); }
  }

  function huy() {
    if (daSua && !window.confirm("Hủy mọi thay đổi chưa lưu?")) return;
    navigate(veChiTiet);
  }

  const tongAnh = (anhChinh ? 1 : 0) + anhBoSung.length;
  const checklist = form ? [
    [form.tenSanPham.trim() && form.maDanhMuc, "Thông tin cơ bản đầy đủ"],
    [Number(form.giaCoBan) > 0, "Giá bán hợp lệ"],
    [tongAnh > 0, `${tongAnh} ảnh đã sắp xếp`]
  ] : [];
  const goTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const kh = { user, mode, base };

  if (!loaded) return <Khung {...kh}>
    {serverError ? <div className="sp-alert" role="alert">{serverError}</div> : <p className="sp-hint">Đang tải dữ liệu sản phẩm...</p>}
  </Khung>;

  return <Khung {...kh}>
    <div className="workspace-head"><h1>Chỉnh sửa sản phẩm</h1>
      <p>{meta.ten} • {meta.ma} • {meta.chuaTungSua ? "Tạo lúc" : "Cập nhật gần nhất:"} {meta.capNhatLuc}{meta.nguoi && !meta.chuaTungSua ? ` bởi ${meta.nguoi}` : ""}</p></div>

    <nav className="sp-steps" aria-label="Các bước">
      {STEPS.map(([id, label]) => <button type="button" key={id} onClick={() => goTo(id)}>{label}</button>)}
    </nav>
    <div className="cs-banner"><Info size={15}/> Thay đổi giá hoặc tên sản phẩm không làm thay đổi thông tin các đơn hàng đã đặt trước đó.</div>
    {serverError && <div className="sp-alert" role="alert">{serverError}</div>}

    <div className="sp-layout">
      <div className="sp-col">
        <section className="workspace-panel" id="thong-tin-co-ban">
          <h2>Thông tin cơ bản</h2>
          <Field label="Tên sản phẩm" required error={errors.tenSanPham}>
            <input value={form.tenSanPham} onChange={set("tenSanPham")} maxLength={250}/>
          </Field>
          <div className="sp-row">
            <Field label="Mã sản phẩm" required hint="Mã sản phẩm là khóa lưu lịch sử đơn hàng nên không thể đổi.">
              <input value={meta.ma} disabled readOnly/>
            </Field>
            <Field label="Danh mục" required error={errors.maDanhMuc}>
              <select value={form.maDanhMuc} onChange={set("maDanhMuc")}>
                <option value="">Chọn danh mục</option>
                {categories.map((c) => <option key={c.MaDanhMuc} value={c.MaDanhMuc}>{c.TenDanhMuc}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Mô tả ngắn"><textarea rows={3} value={form.moTaNgan} onChange={set("moTaNgan")} maxLength={500}/></Field>
          <Field label="Mô tả chi tiết"><textarea rows={7} value={form.moTa} onChange={set("moTa")}/></Field>
        </section>

        <section className="workspace-panel" id="hinh-anh">
          <h2>Hình ảnh sản phẩm</h2>
          <div className="sp-main-image">
            <div className="sp-main-preview">
              {anhChinh ? <img src={anhChinh.url} alt="Ảnh chính"/> : <span>Chưa có ảnh chính</span>}
            </div>
            <div>
              <span className="sp-badge">Ảnh chính</span>
              <p className="sp-filename">{anhChinh?.name || "—"}</p>
              <small className="sp-hint">JPG, PNG, WEBP • Tối đa {MAX_MB} MB/ảnh. Khuyên nghị 1600 × 1600 px.</small>
              <label className="sp-btn sp-btn-outline">
                {anhChinh ? "Thay ảnh chính" : "Chọn ảnh chính"}
                <input type="file" accept={KIEU_ANH.join(",")} hidden onChange={onMainChange}/>
              </label>
            </div>
          </div>

          <h3 className="sp-subtitle">Ảnh bổ sung • Sắp xếp thứ tự hiển thị</h3>
          <div className="sp-gallery">
            {anhBoSung.map((a, i) => <figure key={a.key}>
              <img src={a.url} alt={`Ảnh ${i + 2}`}/>
              <figcaption>
                <span>Ảnh {i + 2}</span>
                <button type="button" onClick={() => moveExtra(i, -1)} disabled={i === 0} aria-label="Chuyển lên trước"><ChevronLeft size={14}/></button>
                <button type="button" onClick={() => moveExtra(i, 1)} disabled={i === anhBoSung.length - 1} aria-label="Chuyển ra sau"><ChevronRight size={14}/></button>
                <button type="button" onClick={() => removeExtra(a.key)}>Xóa</button>
              </figcaption>
            </figure>)}
          </div>
          {anhBoSung.length < MAX_BO_SUNG && <label className="sp-dropzone">
            <span><Plus size={15}/> Tải thêm hình ảnh</span>
            <small>Chọn ảnh từ máy tính • Tối đa {MAX_BO_SUNG} ảnh bổ sung</small>
            <input type="file" accept={KIEU_ANH.join(",")} multiple hidden onChange={onExtraChange}/>
          </label>}
        </section>

        <section className="workspace-panel" id="thong-tin-san-pham">
          <h2>Thông tin sản phẩm</h2>
          <div className="sp-row">
            <Field label="Phong cách">
              <select value={form.phongCach} onChange={set("phongCach")}>
                <option value="">Chọn phong cách</option>
                {/* giữ được cả giá trị cũ không nằm trong danh sách mẫu */}
                {[...new Set([...PHONG_CACH, form.phongCach].filter(Boolean))].map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Chất liệu chính"><input value={form.chatLieuChinh} onChange={set("chatLieuChinh")} maxLength={150}/></Field>
          </div>
          <Field label="Hướng dẫn bảo quản"><textarea rows={3} value={form.huongDanBaoQuan} onChange={set("huongDanBaoQuan")}/></Field>
          <Field label="Thông số kỹ thuật"><textarea rows={3} value={form.thongSoKyThuat} onChange={set("thongSoKyThuat")}/></Field>
        </section>
      </div>

      <aside className="sp-col">
        <section className="workspace-panel" id="gia-trang-thai">
          <h2>Giá và trạng thái</h2>
          <Field label="Giá cơ bản (₫)" required error={errors.giaCoBan} hint="Giá phải lớn hơn 0. Giá SKU có thể khác giá cơ bản.">
            <input inputMode="numeric" value={fmtGia(form.giaCoBan)}
              onChange={(e) => { setForm((f) => ({ ...f, giaCoBan: e.target.value.replace(/\D/g, "").slice(0, 12) })); setErrors((er) => ({ ...er, giaCoBan: undefined })); }}/>
          </Field>
          <Field label="Trạng thái kinh doanh" required hint={GHI_CHU[form.trangThai]}>
            <select value={form.trangThai} onChange={set("trangThai")}>
              {Object.entries(NHAN).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Field>
        </section>

        <section className="workspace-panel" id="bien-the">
          <h2>Biến thể sản phẩm</h2>
          <p className="sp-hint">{meta.soBienThe} biến thể đã tạo. Tồn kho được theo dõi riêng theo từng SKU.</p>
          <button type="button" className="sp-btn sp-btn-outline" disabled title="Sẽ triển khai ở màn hình tiếp theo">Quản lý biến thể</button>
          <div><span className="cs-chip">{meta.khaDung} sản phẩm khả dụng</span></div>
        </section>

        <section className="workspace-panel">
          <h2>Kiểm tra trước khi lưu</h2>
          <ul className="sp-checklist">
            {checklist.map(([ok, text]) => <li key={text} className={ok ? "ok" : ""}><Check size={13}/> {text}</li>)}
          </ul>
          <small className="sp-hint">Dấu * là trường bắt buộc. Nội dung chỉ được cập nhật khi chọn lưu.</small>
        </section>
      </aside>
    </div>

    <footer className="sp-footer">
      <span className={daSua ? "cs-dirty" : ""}>{daSua ? "Đã chỉnh sửa • Chưa lưu thay đổi" : "Chưa có thay đổi nào"}</span>
      <div>
        <button type="button" className="sp-btn sp-btn-outline" onClick={huy} disabled={saving}>Hủy thay đổi</button>
        <button type="button" className="sp-btn sp-btn-dark" onClick={handleSave} disabled={saving || !daSua}>
          {saving ? "Đang lưu..." : "Lưu thay đổi"}
        </button>
      </div>
    </footer>
  </Khung>;
}
