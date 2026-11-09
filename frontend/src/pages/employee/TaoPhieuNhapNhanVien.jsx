import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, X } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getEmployeeReceiptForm, getEmployeeReceipt, saveEmployeeReceipt } from "../../services/nhapKhoService";
import "../../styles/taoPhieuNhap.css";
import "../../styles/taoPhieuNhapNhanVien.css";

const NHAP = "Nháp"; // trùng backend/src/config/phieuNhap.js
const pad = (n) => String(n).padStart(2, "0");
const homNay = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtTien = (n) => `${Number(n || 0).toLocaleString("vi-VN")} ₫`;
const fmtSo = (s) => (s ? Number(s).toLocaleString("vi-VN") : "");
const uid = () => crypto.randomUUID();
const dongMoi = () => ({ id: uid(), maBienThe: "", soLuong: "", donGia: "" });

function Field({ label, error, hint, children }) {
  return <label className="tp-field">
    <span>{label}</span>{children}
    {error ? <small className="tp-error">{error}</small> : hint && <small className="tp-hint">{hint}</small>}
  </label>;
}
function Khung({ user, mode, children }) {
  return <WorkspaceLayout user={user} mode={mode} activeTitle="Nhập kho">{children}</WorkspaceLayout>;
}

export default function TaoPhieuNhapNhanVien({ user }) {
  const mode = "employee";
  const { maPhieuNhap } = useParams();            // có giá trị = đang "Tiếp tục lập" một phiếu nháp
  const navigate = useNavigate();
  const base = "/nhan-vien";
  const veDanhSach = `${base}/nhap-kho`;

  const [tai, setTai] = useState(null);           // { nhaCungCap, bienThe, nguoiLap }
  const [loadErr, setLoadErr] = useState("");
  const [maPhieu, setMaPhieu] = useState("");
  const [nguoiLap, setNguoiLap] = useState("");
  const [form, setForm] = useState({ maNCC: "", ngayNhap: homNay(), ghiChu: "" });
  const [dong, setDong] = useState([dongMoi()]);
  const [errors, setErrors] = useState({ dong: {} });
  const [daSua, setDaSua] = useState(false);
  const [xacNhan, setXacNhan] = useState(false);  // hộp thoại "Xác nhận nhập kho?"
  const [dangGui, setDangGui] = useState(false);
  const [loiGui, setLoiGui] = useState("");

  useEffect(() => {
    let live = true;
    Promise.all([getEmployeeReceiptForm(), maPhieuNhap ? getEmployeeReceipt(maPhieuNhap) : null]).then(([t, p]) => {
      if (!live) return;
      setTai(t); setNguoiLap(t.nguoiLap);
      if (p) {
        if (p.phieu.TrangThai !== NHAP) { setLoadErr("Phiếu đã ghi nhận chỉ được xem, không thể sửa."); return; }
        setMaPhieu(p.phieu.MaPhieu); setNguoiLap(p.phieu.NguoiLap);
        setForm({ maNCC: String(p.phieu.MaNCC), ngayNhap: p.phieu.NgayNhap, ghiChu: p.phieu.GhiChu || "" });
        setDong(p.dong.length ? p.dong.map((d) => ({ id: uid(), maBienThe: d.MaBienThe, soLuong: String(d.SoLuong), donGia: String(Math.round(d.DonGiaNhap)) })) : [dongMoi()]);
      }
    }).catch((e) => live && setLoadErr(e.message));
    return () => { live = false; };
  }, [maPhieuNhap]);

  // Pop-up chỉ xuất hiện sau khi nhân viên kiểm tra và xác nhận biểu mẫu.
  useEffect(() => {
    if (!xacNhan) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !dangGui) setXacNhan(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [xacNhan, dangGui]);

  // Cảnh báo khi đóng tab lúc còn thay đổi chưa lưu
  useEffect(() => {
    if (!daSua) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [daSua]);

  const bt = useMemo(() => new Map((tai?.bienThe || []).map((b) => [b.MaBienThe, b])), [tai]);
  const tenNCC = (tai?.nhaCungCap || []).find((n) => String(n.MaNCC) === form.maNCC)?.TenNCC || "";
  const tong = useMemo(() => ({
    tien: dong.reduce((s, r) => s + (Number(r.soLuong) || 0) * (Number(r.donGia) || 0), 0),
    sku: new Set(dong.map((r) => r.maBienThe).filter(Boolean)).size,
    sp: dong.reduce((s, r) => s + (Number(r.soLuong) || 0), 0)
  }), [dong]);

  const doiForm = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setDaSua(true); setErrors((er) => ({ ...er, [k]: undefined })); };
  function doiDong(id, vaVao) {
    setDong((ds) => ds.map((r) => (r.id === id ? { ...r, ...vaVao } : r)));
    setDaSua(true);
    setErrors((er) => ({ ...er, dong: { ...er.dong, [id]: undefined } }));
  }
  function chonSku(r, ma) {
    const b = bt.get(ma);
    // Điền sẵn đơn giá từ "giá nhập tham chiếu" của SKU nếu dòng chưa có giá
    doiDong(r.id, { maBienThe: ma, ...(b?.GiaNhapThamChieu && !r.donGia ? { donGia: String(Math.round(b.GiaNhapThamChieu)) } : {}) });
  }
  const xoaDong = (id) => { setDong((ds) => (ds.length > 1 ? ds.filter((r) => r.id !== id) : [dongMoi()])); setDaSua(true); };

  function kiemTra() {
    const er = { dong: {} };
    if (!form.maNCC) er.maNCC = "Chọn nhà cung cấp.";
    if (!form.ngayNhap) er.ngayNhap = "Chọn ngày nhập.";
    else if (form.ngayNhap > homNay()) er.ngayNhap = "Ngày nhập không được ở tương lai.";
    const thay = new Set();
    dong.forEach((r) => {
      const e = {};
      if (!r.maBienThe) e.sku = "Chọn SKU.";
      else if (thay.has(r.maBienThe)) e.sku = "SKU đã có trong phiếu.";
      if (r.maBienThe) thay.add(r.maBienThe);
      if (!Number.isInteger(Number(r.soLuong)) || Number(r.soLuong) < 1) e.sl = "Số lượng phải là số nguyên lớn hơn 0.";
      if (!(Number(r.donGia) > 0)) e.gia = "Đơn giá nhập phải lớn hơn 0.";
      if (Object.keys(e).length) er.dong[r.id] = e;
    });
    setErrors(er);
    const loi = er.maNCC || er.ngayNhap || Object.keys(er.dong).length;
    if (loi) setTimeout(() => document.querySelector(".tp-error")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    return !loi;
  }

  const [idDaLuu, setIdDaLuu] = useState(maPhieuNhap || null);
  const [thanhCong, setThanhCong] = useState("");
  const [thongBao, setThongBao] = useState("");
  // Chỉ tạo mới một lần. Sau khi lưu có id, ghi nhận bằng PUT để không tạo thêm phiếu.
  async function gui(ghiNhan) {
    if (dangGui || !kiemTra()) return;
    setLoiGui(""); setThongBao(""); setDangGui(true);
    const id = idDaLuu || maPhieuNhap;
    try {
      const r = await saveEmployeeReceipt(id, {
        ...form, ghiNhan,
        dong: dong.map((d) => ({ maBienThe: d.maBienThe, soLuong: d.soLuong, donGia: d.donGia }))
      });
      const nextId = r.data.MaPhieuNhap;
      setIdDaLuu(nextId); setMaPhieu(r.data.MaPhieu); setDaSua(false);
      if (ghiNhan) {
        setThanhCong(`Đã ghi nhận ${r.data.MaPhieu}. Tồn kho đã được cập nhật.`);
        setXacNhan(false);
      } else {
        setThongBao(`Đã lưu bản nháp ${r.data.MaPhieu}. Tồn kho chưa thay đổi.`);
        // Giữ URL có id để có thể tiếp tục nếu người dùng tải lại trang.
        navigate(`${base}/nhap-kho/${nextId}`, { replace: true });
      }
    } catch (e) {
      setLoiGui(e.message);
      // Nếu kết nối gián đoạn khi tạo mới: không tự gửi lại để tránh tạo phiếu trùng.
      if (!id) setLoiGui(`${e.message} Nếu mạng bị ngắt sau khi gửi, hãy kiểm tra phiếu nhập trên hệ thống trước khi tạo lại.`);
    } finally { setDangGui(false); }
  }
  const luuNhap = () => gui(false);
  const moXacNhan = () => { if (kiemTra() && !thanhCong) { setLoiGui(""); setThongBao(""); setXacNhan(true); } };
  function huy() {
    if (daSua && !window.confirm("Hủy phiếu đang lập? Các thay đổi chưa lưu sẽ mất.")) return;
    navigate(veDanhSach);
  }

  const kh = { user, mode };
  if (loadErr) return <Khung {...kh}>
    <div className="tp-alert" role="alert">{loadErr}</div>
    <button type="button" className="tp-btn tp-btn-outline" onClick={() => navigate(veDanhSach)}>Quay lại danh sách</button>
  </Khung>;
  if (!tai) return <Khung {...kh}><p className="tp-hint">Đang tải biểu mẫu...</p></Khung>;

  const daChon = new Set(dong.map((r) => r.maBienThe).filter(Boolean));
  const coLoi = Object.keys(errors.dong || {}).length > 0 || errors.maNCC || errors.ngayNhap;

  return <Khung {...kh}>
    <div className="workspace-breadcrumb">Vận hành / <Link to={veDanhSach}>Nhập kho</Link> / {maPhieuNhap ? "Tiếp tục lập phiếu" : "Tạo phiếu nhập"}</div>
    <div className="workspace-head"><h1>{maPhieuNhap ? "Tiếp tục lập phiếu nhập" : "Tạo phiếu nhập kho"}</h1><p>Phiếu nhập {maPhieu || "mới"} • Tồn kho chưa được cập nhật cho đến khi ghi nhận</p></div>

    <div className="tp-top">
      <section className="workspace-panel">
        <h2>Thông tin phiếu nhập</h2>
        <div className="tp-grid">
          <Field label="Mã phiếu (tự sinh)"><input value={maPhieu || "Tự sinh khi lưu"} disabled readOnly/></Field>
          <Field label="Ngày nhập *" error={errors.ngayNhap}>
            <input type="date" value={form.ngayNhap} max={homNay()} onChange={doiForm("ngayNhap")}/></Field>
          <Field label="Nhà cung cấp *" error={errors.maNCC}>
            <select value={form.maNCC} onChange={doiForm("maNCC")}>
              <option value="">Chọn nhà cung cấp</option>
              {tai.nhaCungCap.map((n) => <option key={n.MaNCC} value={n.MaNCC}>{n.TenNCC}</option>)}</select></Field>
          <Field label="Người lập"><input value={nguoiLap} disabled readOnly/></Field>
        </div>
        <Field label="Ghi chú"><textarea rows={4} value={form.ghiChu} maxLength={500} onChange={doiForm("ghiChu")}
          placeholder="Ví dụ: Nhập bổ sung hàng, kiểm tra bề mặt và số lượng khi nhận."/></Field>
      </section>

      <aside className="workspace-panel">
        <span className="tp-badge">Chờ ghi nhận</span>
        <h2>Kiểm tra trước khi lưu</h2>
        <ol className="tp-steps">
          <li>Chọn đúng nhà cung cấp.</li><li>Đối chiếu SKU, số lượng và giá nhập.</li>
          <li>Xác nhận phiếu để ghi nhận biến động.</li></ol>
        <p className="tp-info">Đơn giá nhập là giá vốn; không thay đổi giá bán hay giá của đơn đã đặt.</p>
      </aside>
    </div>

    <section className="workspace-panel">
      <h2>Sản phẩm nhập kho</h2>
      {dong.map((r, i) => {
        const b = bt.get(r.maBienThe);
        const e = errors.dong?.[r.id] || {};
        const thanhTien = (Number(r.soLuong) || 0) * (Number(r.donGia) || 0);
        return <div className="tp-row" key={r.id}>
          <p className="tp-rowlabel">{b ? `${b.TenSanPham} • ${[b.ChatLieu, b.MauSac].filter(Boolean).join(" ") || b.SKU}` : `Sản phẩm ${i + 1}`}</p>
          <div className="tp-rowgrid">
            <Field label="Sản phẩm / SKU *" error={e.sku}>
              <select value={r.maBienThe} onChange={(ev) => chonSku(r, ev.target.value)}>
                <option value="">Chọn SKU</option>
                {tai.bienThe.map((x) => <option key={x.MaBienThe} value={x.MaBienThe} disabled={daChon.has(x.MaBienThe) && x.MaBienThe !== r.maBienThe}>
                  {x.SKU} — {x.TenSanPham}{x.TrangThai !== "Đang bán" ? " (ngừng bán)" : ""}</option>)}</select></Field>
            <Field label="Số lượng *" error={e.sl}>
              <input inputMode="numeric" value={r.soLuong} onChange={(ev) => doiDong(r.id, { soLuong: ev.target.value.replace(/\D/g, "").slice(0, 7) })}/></Field>
            <Field label="Đơn giá nhập *" error={e.gia}>
              <input inputMode="numeric" value={fmtSo(r.donGia)} placeholder="₫" onChange={(ev) => doiDong(r.id, { donGia: ev.target.value.replace(/\D/g, "").slice(0, 11) })}/></Field>
            <Field label="Thành tiền"><input value={fmtTien(thanhTien)} disabled readOnly/></Field>
            <button type="button" className="tp-btn tp-btn-outline tp-xoa" onClick={() => xoaDong(r.id)}>Xóa</button>
          </div>
        </div>;
      })}
      <button type="button" className="tp-btn tp-btn-outline" onClick={() => { setDong((ds) => [...ds, dongMoi()]); setDaSua(true); }}
        disabled={dong.length >= 50}><Plus size={14}/> Thêm sản phẩm</button>

      <div className="tp-total">
        <span>Tổng giá trị nhập • {tong.sku} SKU • {tong.sp} sản phẩm</span>
        <strong>{fmtTien(tong.tien)}</strong>
      </div>
      {coLoi && <p className="tp-alert" role="alert">Vui lòng kiểm tra các ô báo lỗi. Đơn giá nhập phải lớn hơn 0, chọn nhà cung cấp và ít nhất một SKU, không thêm trùng SKU.</p>}
      <div className="tp-actions">
        <button type="button" className="tp-btn tp-btn-outline" onClick={huy} disabled={dangGui}>Hủy</button>
        <button type="button" className="tp-btn tp-btn-outline" onClick={luuNhap} disabled={dangGui || !!thanhCong}>{dangGui && !xacNhan ? "Đang lưu..." : "Lưu phiếu nhập"}</button>
        <button type="button" className="tp-btn tp-btn-dark" onClick={moXacNhan} disabled={dangGui || !!thanhCong}>Kiểm tra và xác nhận</button>
      </div>
    </section>

    {(thanhCong || thongBao) && <p className="tp-success" role="status">{thanhCong || thongBao}</p>}
    {loiGui && !xacNhan && <p className="tp-alert" role="alert">{loiGui}</p>}
    {xacNhan && (
      <div className="tp-overlay" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !dangGui) setXacNhan(false);
      }}>
        <section className="tp-dialog tp-employee-dialog" role="dialog" aria-modal="true" aria-labelledby="tp-confirm-title" aria-describedby="tp-confirm-desc">
          <button type="button" className="tp-close" onClick={() => setXacNhan(false)} disabled={dangGui} aria-label="Đóng xác nhận"><X size={16}/></button>
          <h2 id="tp-confirm-title">Xác nhận nhập kho?</h2>
          <p id="tp-confirm-desc">Số lượng tồn kho của các SKU trong phiếu sẽ được cập nhật sau khi phiếu nhập được ghi nhận thành công.</p>
          <p className="tp-dlg-sum">{maPhieu || "Phiếu mới"} • {tenNCC || "Chưa chọn nhà cung cấp"} • {fmtTien(tong.tien)}</p>
          {loiGui && <p className="tp-alert" role="alert">{loiGui}</p>}
          <div className="tp-actions">
            <button type="button" className="tp-btn tp-btn-outline" onClick={() => setXacNhan(false)} disabled={dangGui}>Quay lại</button>
            <button type="button" className="tp-btn tp-btn-dark" onClick={() => gui(true)} disabled={dangGui || !!thanhCong}>{dangGui ? "Đang ghi nhận..." : "Xác nhận nhập kho"}</button>
          </div>
        </section>
      </div>
    )}
  </Khung>;
}
