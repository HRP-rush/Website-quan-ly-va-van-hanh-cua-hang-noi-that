import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { imageUrl } from "../../services/productAdminService";
import { getStockDetail } from "../../services/khoService";
import "../../styles/chiTietTonKho.css";

const SO_DONG = 10;
const LOP = { "Còn hàng": "ok", "Sắp hết": "low", "Hết hàng": "out" };
const fmtGia = (n) => `${Number(n).toLocaleString("vi-VN")} ₫`;
// ISO "2026-11-02T09:12:00" -> "02/11/2026 09:12" (cắt chuỗi, không qua múi giờ)
const fmtNgay = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}`;
const thang = (iso) => `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const thayDoi = (e) => e.dTon !== 0 ? `${e.dTon > 0 ? "+" : ""}${e.dTon}` : `Giữ ${e.dGiu > 0 ? "+" : ""}${e.dGiu}`;

function Khung({ user, mode, children }) {
  return <WorkspaceLayout user={user} mode={mode} activeTitle="Kho hàng">
    <div className="workspace-breadcrumb">Quản trị / Kho hàng / Chi tiết tồn kho</div>
    {children}
  </WorkspaceLayout>;
}

export default function ChiTietTonKho({ user, mode }) {
  const { maBienThe } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const base = mode === "admin" ? "/admin" : "/quan-ly";
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [loai, setLoai] = useState("");
  const [thangLoc, setThangLoc] = useState("");
  const [trang, setTrang] = useState(1);

  useEffect(() => {
    let live = true;
    setD(null); setError("");
    getStockDetail(maBienThe).then((r) => { if (live) setD(r); }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [maBienThe]);

  // Bấm "Lịch sử" ở danh sách kho: mở trang và cuộn tới bảng lịch sử
  useEffect(() => {
    if (d && hash === "#lich-su") document.getElementById("lich-su")?.scrollIntoView({ behavior: "smooth" });
  }, [d, hash]);

  const dsLoai = useMemo(() => [...new Set((d?.lichSu || []).map((e) => e.loai))], [d]);
  const dsThang = useMemo(() => [...new Set((d?.lichSu || []).map((e) => thang(e.t)))]
    .sort((a, b) => (a.slice(3) + a.slice(0, 2) < b.slice(3) + b.slice(0, 2) ? 1 : -1)), [d]);

  const loc = useMemo(() => {
    const k = q.trim().toLowerCase();
    return (d?.lichSu || []).filter((e) =>
      (!k || String(e.thamChieu || "").toLowerCase().includes(k)) &&
      (!loai || e.loai === loai) && (!thangLoc || thang(e.t) === thangLoc));
  }, [d, q, loai, thangLoc]);
  const tongTrang = Math.max(1, Math.ceil(loc.length / SO_DONG));
  const trangHt = Math.min(trang, tongTrang);
  const hien = loc.slice((trangHt - 1) * SO_DONG, trangHt * SO_DONG);
  const tu = loc.length ? (trangHt - 1) * SO_DONG + 1 : 0;
  const den = Math.min(trangHt * SO_DONG, loc.length);
  const veKho = () => navigate(`${base}/kho-hang`);
  const kh = { user, mode };

  if (error) return <Khung {...kh}>
    <div className="ctk-alert" role="alert">{error}</div>
    <button type="button" className="ctk-btn ctk-btn-outline" onClick={veKho}>Quay lại kho</button>
  </Khung>;
  if (!d) return <Khung {...kh}><p className="ctk-muted">Đang tải chi tiết tồn kho...</p></Khung>;

  const b = d.bienThe;
  const gm = d.lichSu[0];
  const dongGanNhat = !gm ? "Chưa có giao dịch nào cho SKU này."
    : `${fmtNgay(gm.t).replace(" ", " • ")} — ` + (
      gm.loai === "Giữ cho đơn" ? `Đã giữ ${gm.dGiu} ${b.TenSanPham} cho đơn ${gm.thamChieu}.`
      : gm.loai === "Nhả giữ hàng" ? `Đã nhả giữ ${-gm.dGiu} ${b.TenSanPham} của đơn ${gm.thamChieu}.`
      : `${gm.loai}: ${gm.dTon > 0 ? "+" : ""}${gm.dTon} ${b.TenSanPham}${gm.thamChieu ? `, tham chiếu ${gm.thamChieu}` : ""}.`);

  return <Khung {...kh}>
    <div className="ctk-head">
      <div className="workspace-head"><h1>Chi tiết tồn kho</h1>
        <p>{b.SKU} • Kho trung tâm • Lịch sử có thể đối chiếu.</p></div>
      <button type="button" className="ctk-btn ctk-btn-dark" onClick={veKho}><ArrowLeft size={14}/> Quay lại kho</button>
    </div>

    <section className="workspace-panel ctk-summary">
      <img src={imageUrl(b.DuongDanAnh)} alt={b.TenSanPham}/>
      <div className="ctk-summary-info">
        <Link to={`${base}/san-pham/${encodeURIComponent(b.MaSanPham)}/bien-the`} className="ctk-name">{b.TenSanPham}</Link>
        <p className="ctk-sku">{b.SKU}</p>
        <p className="ctk-attr">{[[b.ChatLieu, b.MauSac].filter(Boolean).join(" / "), b.KichThuoc && `${b.KichThuoc} cm`, fmtGia(b.GiaBan)].filter(Boolean).join(" • ")}</p>
        <span className={`ctk-chip ${LOP[b.TinhTrang]}`}>{b.TinhTrang}</span>
        {b.TrangThai !== "Đang bán" && <span className="ctk-chip stopped">Ngừng bán</span>}
      </div>
      <p className="ctk-side">Ảnh đại diện của sản phẩm.<br/>Thuộc tính theo mã SKU.</p>
    </section>

    <div className="ctk-kpis">
      {[["Tồn hiện tại", b.Ton, "Số lượng thực tế tại kho"],
        ["Số lượng đã giữ", b.Giu, "Đã giữ cho đơn đang xử lý"],
        ["Tồn khả dụng", b.KhaDung, `${b.Ton} − ${b.Giu} = ${b.KhaDung}`],
        ["Ngưỡng cảnh báo", b.MucCanhBao, `Cảnh báo khi khả dụng ≤ ${b.MucCanhBao}`]]
        .map(([nhan, so, ghiChu]) => <div className="workspace-panel ctk-kpi" key={nhan}>
          <span>{nhan}</span><strong>{so}</strong><small>{ghiChu}</small></div>)}
    </div>

    <div className="ctk-filters" id="lich-su">
      <label className="ctk-field"><span>Tìm kiếm</span>
        <input value={q} onChange={(e) => { setQ(e.target.value); setTrang(1); }} placeholder="Tìm theo mã tham chiếu..."/></label>
      <label className="ctk-field"><span>Loại giao dịch</span>
        <select value={loai} onChange={(e) => { setLoai(e.target.value); setTrang(1); }}>
          <option value="">Tất cả</option>{dsLoai.map((l) => <option key={l}>{l}</option>)}</select></label>
      <label className="ctk-field"><span>Khoảng thời gian</span>
        <select value={thangLoc} onChange={(e) => { setThangLoc(e.target.value); setTrang(1); }}>
          <option value="">Tất cả thời gian</option>{dsThang.map((t) => <option key={t} value={t}>Tháng {t}</option>)}</select></label>
    </div>

    <div className="workspace-table-scroll ctk-table">
      <table className="workspace-table">
        <thead><tr><th>Ngày</th><th>Loại giao dịch</th><th>Thay đổi</th><th>Tồn sau giao dịch</th><th>Tham chiếu</th><th>Người thực hiện</th></tr></thead>
        <tbody>
          {hien.map((e, i) => <tr key={`${e.t}-${e.loai}-${e.thamChieu}-${i}`}>
            <td>{fmtNgay(e.t)}</td><td>{e.loai}</td><td>{thayDoi(e)}</td>
            <td>{e.ton} / {e.giu} / {e.khaDung}</td><td>{e.thamChieu || "—"}</td><td>{e.nguoi}</td>
          </tr>)}
          {hien.length === 0 && <tr><td colSpan={6} className="ctk-empty">
            {d.lichSu.length === 0 ? "SKU này chưa có giao dịch nào." : "Không có giao dịch phù hợp với bộ lọc."}</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="ctk-pager">
      <span>Hiển thị {tu}–{den} / {loc.length} kết quả • {SO_DONG} dòng / trang</span>
      <div>
        <button type="button" className="ctk-page" disabled={trangHt <= 1} onClick={() => setTrang(trangHt - 1)} aria-label="Trang trước">‹</button>
        <span className="ctk-page is-on">{trangHt}</span>
        <button type="button" className="ctk-page" disabled={trangHt >= tongTrang} onClick={() => setTrang(trangHt + 1)} aria-label="Trang sau">›</button>
      </div>
    </div>

    <p className="ctk-muted ctk-note">Tồn sau giao dịch: Hiện tại / Đã giữ / Khả dụng. Giữ hàng chỉ thay đổi số lượng giữ, không làm giảm tồn thực tế.
      {d.lechSo && " Lịch sử giao dịch chưa đủ để giải thích toàn bộ số tồn hiện tại nên các dòng cũ có thể lệch."}</p>
    <p className="ctk-info"><Info size={14}/> Chỉ xem và đối chiếu tại màn hình này. Không có thao tác điều chỉnh tùy ý. Mọi nghiệp vụ nhập/xuất đều lưu mã tham chiếu và người thực hiện.</p>

    <section className="workspace-panel">
      <h2>Đối chiếu gần nhất</h2>
      <p className="ctk-line">{dongGanNhat}</p>
      {d.phieuNhapNhap.length > 0 && <p className="ctk-muted">Phiếu {d.phieuNhapNhap.join(", ")} đang là bản nháp, chưa làm thay đổi số lượng tồn kho. Giá vốn và giá bán được theo dõi riêng biệt.</p>}
    </section>
  </Khung>;
}
