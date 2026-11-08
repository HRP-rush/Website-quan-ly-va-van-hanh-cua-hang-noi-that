import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, Info, AlertTriangle } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { listReceipts } from "../../services/nhapKhoService";
import "../../styles/phieuNhap.css";

const SO_DONG = 10;
// Giá trị gửi lên server phải trùng backend/src/config/phieuNhap.js
const NHAP = "Nháp", GHI_NHAN = "Đã ghi nhận";
const NHAN = { [NHAP]: "Bản nháp", [GHI_NHAN]: "Đã ghi nhận" };
const LOP = { [NHAP]: "low", [GHI_NHAN]: "ok" };
const KHOANG = [["", "Tất cả"], ["homNay", "Hôm nay"], ["7ngay", "7 ngày qua"], ["thangNay", "Tháng này"], ["thangTruoc", "Tháng trước"]];
const pad = (n) => String(n ?? 0).padStart(2, "0");
const fmtTien = (n) => `${Number(n).toLocaleString("vi-VN")} ₫`;
const fmtGon = (n) => {
  n = Number(n) || 0;
  const so = (x) => x.toFixed(1).replace(".", ",");
  return n >= 1e9 ? `${so(n / 1e9)} tỷ ₫` : n >= 1e6 ? `${so(n / 1e6)} triệu ₫` : fmtTien(n);
};
const luc = () => new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

function Khung({ user, mode, children }) {
  return <WorkspaceLayout user={user} mode={mode} activeTitle="Phiếu nhập">
    <div className="workspace-breadcrumb">Quản trị / Phiếu nhập / Danh sách phiếu nhập kho</div>
    {children}
  </WorkspaceLayout>;
}

export default function DanhSachPhieuNhap({ user, mode }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const base = mode === "admin" ? "/admin" : "/quan-ly";
  const [flash, setFlash] = useState(state?.flash || "");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [khoang, setKhoang] = useState("");
  const [trang, setTrang] = useState(1);
  const [kq, setKq] = useState({ data: [], total: 0, tongQuan: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [capNhat, setCapNhat] = useState("");

  // Thông báo sau khi lưu phiếu tự ẩn sau 5 giây
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 5000);
    return () => clearTimeout(t);
  }, [flash]);

  // Chờ người dùng ngừng gõ 400ms rồi mới gọi API
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput.trim()); setTrang(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let live = true;
    setLoading(true); setError("");
    listReceipts({ q, trangThai, khoang, trang, soDong: SO_DONG })
      .then((r) => { if (live) { setKq(r); setCapNhat(luc()); } })
      .catch((e) => { if (live) setError(e.message); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [q, trangThai, khoang, trang]);

  const k = kq.tongQuan || {};
  const tongTrang = Math.max(1, Math.ceil(kq.total / SO_DONG));
  const tu = kq.total === 0 ? 0 : (trang - 1) * SO_DONG + 1;
  const den = Math.min(trang * SO_DONG, kq.total);
  const chuaCo = "Sẽ triển khai ở màn hình tiếp theo";

  return <Khung user={user} mode={mode}>
    <div className="pn-head">
      <div className="workspace-head"><h1>Danh sách phiếu nhập kho</h1>
        <p>Quản lý chứng từ nhập hàng và theo dõi các lần ghi nhận vào kho.</p></div>
      <button type="button" className="pn-btn" onClick={() => navigate(`${base}/phieu-nhap/tao`)}><Plus size={15}/> Tạo phiếu nhập</button>
    </div>

    <div className="pn-kpis">
      {[["Phiếu trong tháng", pad(k.TrongThang), k.Thang ? `Tháng ${k.Thang}` : "Tháng này"],
        ["Đã ghi nhận", pad(k.DaGhiNhan), "Lưu lịch sử, không chỉnh sửa"],
        ["Phiếu nháp", pad(k.Nhap), "Chưa cập nhật tồn kho"],
        ["Giá trị đã nhập", fmtGon(k.GiaTriDaNhap), "Không bao gồm phiếu nháp"]]
        .map(([nhan, so, ghiChu]) => <div className="workspace-panel pn-kpi" key={nhan}>
          <span>{nhan}</span><strong>{so}</strong><small>{ghiChu}</small></div>)}
    </div>

    <div className="pn-filters">
      <label className="pn-field"><span>Tìm kiếm</span>
        <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tìm mã phiếu, nhà cung cấp..."/></label>
      <label className="pn-field"><span>Trạng thái</span>
        <select value={trangThai} onChange={(e) => { setTrangThai(e.target.value); setTrang(1); }}>
          <option value="">Tất cả</option><option value={NHAP}>{NHAN[NHAP]}</option><option value={GHI_NHAN}>{NHAN[GHI_NHAN]}</option></select></label>
      <label className="pn-field"><span>Ngày nhập</span>
        <select value={khoang} onChange={(e) => { setKhoang(e.target.value); setTrang(1); }}>
          {KHOANG.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
    </div>

    {flash && <div className="pn-flash" role="status">{flash}</div>}
    {error && <div className="pn-alert" role="alert">{error}</div>}

    <div className={`workspace-table-scroll pn-table ${loading ? "is-loading" : ""}`}>
      <table className="workspace-table">
        <thead><tr><th>Mã phiếu</th><th>Nhà cung cấp</th><th>Ngày nhập</th><th>Người lập</th><th>Số SKU</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
        <tbody>
          {kq.data.map((p) => <tr key={p.MaPhieuNhap}>
            <td>{p.MaPhieu}</td><td>{p.TenNCC}</td><td>{p.NgayNhap}</td><td>{p.NguoiLap}</td>
            <td>{p.SoSku}</td><td>{fmtTien(p.TongTien)}</td>
            <td><span className={`pn-chip ${LOP[p.TrangThai] || "stopped"}`}>{NHAN[p.TrangThai] || p.TrangThai}</span></td>
            <td className="pn-actions">{p.TrangThai === NHAP
              ? <button type="button" onClick={() => navigate(`${base}/phieu-nhap/${p.MaPhieuNhap}/sua`)}>Tiếp tục lập</button>
              : <span title={chuaCo}>Xem chi tiết →</span>}</td>
          </tr>)}
          {!loading && kq.data.length === 0 && <tr><td colSpan={8} className="pn-empty">
            {q || trangThai || khoang ? "Không có phiếu nhập phù hợp với bộ lọc." : "Chưa có phiếu nhập nào."}</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="pn-pager">
      <span>Hiển thị {tu}–{den} / {kq.total} kết quả • {SO_DONG} dòng / trang</span>
      <div>
        <button type="button" className="pn-page" disabled={trang <= 1} onClick={() => setTrang(trang - 1)} aria-label="Trang trước">‹</button>
        <span className="pn-page is-on">{trang}</span>
        <button type="button" className="pn-page" disabled={trang >= tongTrang} onClick={() => setTrang(trang + 1)} aria-label="Trang sau">›</button>
      </div>
    </div>

    <p className="pn-info"><Info size={14}/> Phiếu nháp chưa làm thay đổi số lượng tồn kho. Tồn kho chỉ được cập nhật khi phiếu được xác nhận thành công.</p>
    <p className="pn-warn"><AlertTriangle size={14}/> Phiếu đã ghi nhận chỉ được xem. Không sửa hoặc xóa chứng từ để tránh làm sai lịch sử tồn kho và giá vốn.</p>
    <p className="pn-foot">MỘC AN INTERIOR{capNhat && ` • Cập nhật lúc ${capNhat}`}</p>
  </Khung>;
}