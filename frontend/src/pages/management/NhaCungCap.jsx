import { useEffect, useState } from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  UserRound,
  X
} from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import {
  createSupplier,
  getSupplierDetail,
  listSuppliers,
  updateSupplierStatus
} from "../../services/khoService";
import "../../styles/nhaCungCap.css";

const SO_DONG = 10;
const TRANG_THAI_DANG_HOP_TAC = "Đang hợp tác";
const TRANG_THAI_NGUNG_HOP_TAC = "Ngừng hợp tác";

const FORM_MAC_DINH = {
  tenNCC: "",
  nguoiLienHe: "",
  dienThoai: "",
  email: "",
  diaChi: "",
  trangThai: TRANG_THAI_DANG_HOP_TAC
};

function maHienThi(maNCC) {
  return `NCC-${String(maNCC).padStart(3, "0")}`;
}

function ngayHienThi(value) {
  if (!value) return "Chưa có phiếu nhập";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value));
}

function HuyHieuTrangThai({ value }) {
  const isActive = value === TRANG_THAI_DANG_HOP_TAC;
  return <span className={`supplier-status ${isActive ? "is-active" : "is-paused"}`}>{value}</span>;
}

function Modal({ title, onClose, children, wide = false }) {
  return <div className="supplier-modal-overlay" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className={`supplier-modal${wide ? " is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="supplier-modal-head">
        <h2>{title}</h2>
        <button type="button" className="supplier-icon-button" onClick={onClose} aria-label="Đóng">
          <X size={19} />
        </button>
      </header>
      {children}
    </section>
  </div>;
}

export default function NhaCungCap({ user, mode }) {
  const [danhSach, setDanhSach] = useState({ data: [], total: 0, tongQuan: {} });
  const [tuKhoaNhap, setTuKhoaNhap] = useState("");
  const [tuKhoa, setTuKhoa] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [trang, setTrang] = useState(1);
  const [taiLai, setTaiLai] = useState(0);
  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState("");
  const [thongBao, setThongBao] = useState("");
  const [moThem, setMoThem] = useState(false);
  const [form, setForm] = useState(FORM_MAC_DINH);
  const [dangLuu, setDangLuu] = useState(false);
  const [chiTiet, setChiTiet] = useState(null);
  const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false);
  const [dangCapNhatMa, setDangCapNhatMa] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTuKhoa(tuKhoaNhap.trim());
      setTrang(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [tuKhoaNhap]);

  useEffect(() => {
    let active = true;
    setDangTai(true);
    setLoiTai("");
    listSuppliers({ q: tuKhoa, trangThai, trang, soDong: SO_DONG })
      .then((result) => { if (active) setDanhSach(result); })
      .catch((error) => { if (active) setLoiTai(error.message); })
      .finally(() => { if (active) setDangTai(false); });
    return () => { active = false; };
  }, [tuKhoa, trangThai, trang, taiLai]);

  const kpi = danhSach.tongQuan || {};
  const soTrang = Math.max(1, Math.ceil(danhSach.total / SO_DONG));
  const tuDong = danhSach.total ? (trang - 1) * SO_DONG + 1 : 0;
  const denDong = Math.min(trang * SO_DONG, danhSach.total);

  function doiTruong(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function xemNhaCungCap(item) {
    setChiTiet({ ...item, SoPhieuNhap: 0 });
    setDangTaiChiTiet(true);
    try {
      setChiTiet(await getSupplierDetail(item.MaNCC));
    } catch (error) {
      setLoiTai(error.message);
    } finally {
      setDangTaiChiTiet(false);
    }
  }

  async function themNhaCungCap(event) {
    event.preventDefault();
    setDangLuu(true);
    setLoiTai("");
    setThongBao("");
    try {
      await createSupplier(form);
      setMoThem(false);
      setForm(FORM_MAC_DINH);
      setTuKhoaNhap("");
      setTuKhoa("");
      setTrangThai("");
      setTrang(1);
      setThongBao("Đã thêm nhà cung cấp vào danh sách.");
      setTaiLai((value) => value + 1);
    } catch (error) {
      setLoiTai(error.message);
    } finally {
      setDangLuu(false);
    }
  }

  async function doiTrangThai(item) {
    const next = item.TrangThai === TRANG_THAI_DANG_HOP_TAC
      ? TRANG_THAI_NGUNG_HOP_TAC
      : TRANG_THAI_DANG_HOP_TAC;
    setDangCapNhatMa(item.MaNCC);
    setLoiTai("");
    try {
      await updateSupplierStatus(item.MaNCC, next);
      setThongBao(`Đã chuyển ${maHienThi(item.MaNCC)} sang trạng thái ${next.toLowerCase()}.`);
      setTaiLai((value) => value + 1);
      if (chiTiet?.MaNCC === item.MaNCC) setChiTiet((current) => ({ ...current, TrangThai: next }));
    } catch (error) {
      setLoiTai(error.message);
    } finally {
      setDangCapNhatMa(null);
    }
  }

  return <WorkspaceLayout user={user} mode={mode} activeTitle="Nhà cung cấp">
    <div className="workspace-breadcrumb">Quản trị / Nhà cung cấp / Danh sách nhà cung cấp</div>

    <div className="supplier-heading-row">
      <div className="workspace-head">
        <h1>Danh sách nhà cung cấp</h1>
        <p>Thông tin đối tác, đầu mối liên hệ và tình trạng hợp tác.</p>
      </div>
      <button type="button" className="supplier-add-button" onClick={() => { setLoiTai(""); setMoThem(true); }}>
        <Plus size={16} /> Thêm nhà cung cấp
      </button>
    </div>

    <section className="supplier-kpis" aria-label="Tổng quan nhà cung cấp">
      <article className="supplier-kpi"><span>Tổng nhà cung cấp</span><strong>{String(kpi.Tong || 0).padStart(2, "0")}</strong><small>Đối tác trong danh bạ</small></article>
      <article className="supplier-kpi"><span>Đang hợp tác</span><strong>{String(kpi.DangHopTac || 0).padStart(2, "0")}</strong><small>Có thể chọn khi nhập hàng</small></article>
      <article className="supplier-kpi"><span>Ngừng hợp tác</span><strong>{String(kpi.NgungHopTac || 0).padStart(2, "0")}</strong><small>Lưu lịch sử đối tác và chứng từ</small></article>
    </section>

    <section className="supplier-filters" aria-label="Bộ lọc nhà cung cấp">
      <label className="supplier-field">
        <span>Tìm kiếm</span>
        <div className="supplier-search-input"><SearchIcon /><input value={tuKhoaNhap} onChange={(event) => setTuKhoaNhap(event.target.value)} placeholder="Tìm tên, mã NCC, điện thoại..." /></div>
      </label>
      <label className="supplier-field">
        <span>Trạng thái</span>
        <select value={trangThai} onChange={(event) => { setTrangThai(event.target.value); setTrang(1); }}>
          <option value="">Tất cả</option>
          <option value={TRANG_THAI_DANG_HOP_TAC}>{TRANG_THAI_DANG_HOP_TAC}</option>
          <option value={TRANG_THAI_NGUNG_HOP_TAC}>{TRANG_THAI_NGUNG_HOP_TAC}</option>
        </select>
      </label>
      <button type="button" className="supplier-refresh-button" onClick={() => setTaiLai((value) => value + 1)} disabled={dangTai} aria-label="Làm mới danh sách">
        <RefreshCw size={15} /> Làm mới
      </button>
    </section>

    {loiTai && <div className="supplier-alert is-error" role="alert">{loiTai}<button type="button" onClick={() => setTaiLai((value) => value + 1)}>Thử lại</button></div>}
    {thongBao && <div className="supplier-alert is-success" role="status"><Check size={15} />{thongBao}<button type="button" onClick={() => setThongBao("")} aria-label="Đóng thông báo"><X size={14} /></button></div>}

    <div className={`workspace-table-scroll supplier-table-wrap${dangTai ? " is-loading" : ""}`}>
      <table className="workspace-table supplier-table">
        <thead><tr>
          <th>Mã NCC</th><th>Nhà cung cấp</th><th>Người liên hệ</th><th>Điện thoại</th>
          <th>Email</th><th>Địa chỉ</th><th>Trạng thái</th><th>Thao tác</th>
        </tr></thead>
        <tbody>
          {danhSach.data.map((item) => <tr key={item.MaNCC}>
            <td className="supplier-code">{maHienThi(item.MaNCC)}</td>
            <td className="supplier-name">{item.TenNCC}</td>
            <td>{item.NguoiLienHe || "—"}</td>
            <td>{item.DienThoai || "—"}</td>
            <td>{item.Email || "—"}</td>
            <td className="supplier-address-cell">{item.DiaChi || "—"}</td>
            <td><HuyHieuTrangThai value={item.TrangThai} /></td>
            <td><div className="supplier-row-actions">
              <button type="button" onClick={() => xemNhaCungCap(item)} title="Xem chi tiết"><Eye size={14} /><span>Xem</span></button>
              <button type="button" disabled={dangCapNhatMa === item.MaNCC} onClick={() => doiTrangThai(item)}>
                {dangCapNhatMa === item.MaNCC ? "Đang lưu..." : item.TrangThai === TRANG_THAI_DANG_HOP_TAC ? "Ngừng hợp tác" : "Kích hoạt"}
              </button>
            </div></td>
          </tr>)}
          {!dangTai && danhSach.data.length === 0 && <tr><td colSpan={8} className="supplier-empty">
            {tuKhoa || trangThai ? "Không có nhà cung cấp phù hợp với bộ lọc." : "Chưa có nhà cung cấp. Hãy thêm đối tác đầu tiên."}
          </td></tr>}
          {dangTai && <tr><td colSpan={8} className="supplier-empty">Đang tải danh sách nhà cung cấp...</td></tr>}
        </tbody>
      </table>
    </div>

    <div className="supplier-pager">
      <span>Hiển thị {tuDong}–{denDong} / {danhSach.total} kết quả • {SO_DONG} dòng / trang</span>
      <div>
        <button type="button" className="supplier-page-button" disabled={trang <= 1} onClick={() => setTrang((value) => value - 1)} aria-label="Trang trước"><ChevronLeft size={15} /></button>
        <span className="supplier-current-page">{trang}</span>
        <button type="button" className="supplier-page-button" disabled={trang >= soTrang} onClick={() => setTrang((value) => value + 1)} aria-label="Trang sau"><ChevronRight size={15} /></button>
      </div>
    </div>

    <p className="supplier-note">Không xóa nhà cung cấp đã có phiếu nhập. Có thể chuyển trạng thái sang ngừng hợp tác để lưu lịch sử chứng từ.</p>
    <p className="supplier-foot">MỘC AN INTERIOR • Danh bạ nhà cung cấp lấy từ dữ liệu cửa hàng.</p>

    {moThem && <Modal title="Thêm nhà cung cấp" onClose={() => !dangLuu && setMoThem(false)}>
      <form className="supplier-form" onSubmit={themNhaCungCap}>
        <label className="is-required"><span>Tên nhà cung cấp</span><input name="tenNCC" value={form.tenNCC} onChange={doiTruong} maxLength={250} required autoFocus placeholder="Nhập tên công ty hoặc xưởng" /></label>
        <label><span>Người liên hệ</span><input name="nguoiLienHe" value={form.nguoiLienHe} onChange={doiTruong} maxLength={150} placeholder="Tên người phụ trách" /></label>
        <div className="supplier-form-two">
          <label><span>Điện thoại</span><input name="dienThoai" value={form.dienThoai} onChange={doiTruong} maxLength={20} inputMode="tel" placeholder="090..." /></label>
          <label><span>Email</span><input name="email" value={form.email} onChange={doiTruong} maxLength={254} type="email" placeholder="email@congty.vn" /></label>
        </div>
        <label><span>Địa chỉ</span><textarea name="diaChi" value={form.diaChi} onChange={doiTruong} maxLength={500} rows={3} placeholder="Địa chỉ giao dịch hoặc kho hàng" /></label>
        <label><span>Trạng thái hợp tác</span>
          <select name="trangThai" value={form.trangThai} onChange={doiTruong}>
            <option value={TRANG_THAI_DANG_HOP_TAC}>{TRANG_THAI_DANG_HOP_TAC}</option>
            <option value={TRANG_THAI_NGUNG_HOP_TAC}>{TRANG_THAI_NGUNG_HOP_TAC}</option>
          </select>
        </label>
        {loiTai && <p className="supplier-form-error" role="alert">{loiTai}</p>}
        <footer className="supplier-modal-actions">
          <button type="button" className="supplier-secondary-button" disabled={dangLuu} onClick={() => setMoThem(false)}>Hủy</button>
          <button type="submit" className="supplier-primary-button" disabled={dangLuu}>{dangLuu ? "Đang lưu..." : "Lưu nhà cung cấp"}</button>
        </footer>
      </form>
    </Modal>}

    {chiTiet && <Modal title="Thông tin nhà cung cấp" onClose={() => setChiTiet(null)} wide>
      {dangTaiChiTiet ? <div className="supplier-detail-loading">Đang tải thông tin...</div> : <>
        <div className="supplier-detail-title"><div className="supplier-detail-icon"><Building2 size={22} /></div><div><h3>{chiTiet.TenNCC}</h3><span>{maHienThi(chiTiet.MaNCC)}</span></div><HuyHieuTrangThai value={chiTiet.TrangThai} /></div>
        <div className="supplier-detail-grid">
          <div><UserRound size={16} /><span>Người liên hệ</span><strong>{chiTiet.NguoiLienHe || "Chưa cập nhật"}</strong></div>
          <div><Phone size={16} /><span>Điện thoại</span><strong>{chiTiet.DienThoai || "Chưa cập nhật"}</strong></div>
          <div><Mail size={16} /><span>Email</span><strong>{chiTiet.Email || "Chưa cập nhật"}</strong></div>
          <div><MapPin size={16} /><span>Địa chỉ</span><strong>{chiTiet.DiaChi || "Chưa cập nhật"}</strong></div>
        </div>
        <div className="supplier-receipt-summary"><span>Số phiếu nhập liên quan</span><strong>{chiTiet.SoPhieuNhap || 0}</strong><small>Lần nhập gần nhất: {ngayHienThi(chiTiet.LanNhapGanNhat)}</small></div>
        <footer className="supplier-modal-actions">
          <button type="button" className="supplier-secondary-button" onClick={() => setChiTiet(null)}>Đóng</button>
          <button type="button" className="supplier-primary-button" disabled={dangCapNhatMa === chiTiet.MaNCC} onClick={() => doiTrangThai(chiTiet)}>
            {chiTiet.TrangThai === TRANG_THAI_DANG_HOP_TAC ? "Ngừng hợp tác" : "Kích hoạt lại"}
          </button>
        </footer>
      </>}
    </Modal>}
  </WorkspaceLayout>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.3 4.3"/></svg>;
}
