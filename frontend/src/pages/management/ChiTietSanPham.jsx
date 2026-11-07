import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { getProductDetail, imageUrl } from "../../services/productAdminService";
import "../../styles/chiTietSanPham.css";

const NHAN = { "Đang bán": "Đang kinh doanh", "Tạm ẩn": "Tạm ẩn", "Ngừng bán": "Ngừng kinh doanh" };
const LOP = { "Đang bán": "is-active", "Tạm ẩn": "is-hidden", "Ngừng bán": "is-stopped" };
const LOP_KHO = { "Còn hàng": "ok", "Sắp hết": "low", "Hết hàng": "out", "Ngừng bán": "stopped" };
const fmt = (n) => (n == null ? "—" : `${Number(n).toLocaleString("vi-VN")} ₫`);
const pad = (n) => String(n).padStart(2, "0");
const tenNgan = (b) => [b.ChatLieu, b.MauSac].filter(Boolean).join(" ") || b.SKU;

function Khung({ user, mode, base, children }) {
  return <WorkspaceLayout user={user} mode={mode} activeTitle="Sản phẩm">
    <div className="workspace-breadcrumb">Quản trị / <Link to={`${base}/san-pham`}>Sản phẩm</Link> / Chi tiết sản phẩm</div>
    {children}
  </WorkspaceLayout>;
}

export default function ChiTietSanPham({ user, mode }) {
  const { maSanPham } = useParams();
  const navigate = useNavigate();
  const base = mode === "admin" ? "/admin" : "/quan-ly";
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const [anhDangXem, setAnhDangXem] = useState(0);

  useEffect(() => {
    let live = true;
    setD(null); setError(""); setAnhDangXem(0);
    getProductDetail(maSanPham)
      .then((r) => { if (live) setD(r); })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [maSanPham]);

  const tong = useMemo(() => {
    const bt = d?.bienThe || [];
    const sum = (k) => bt.reduce((s, b) => s + b[k], 0);
    return { soBienThe: bt.length, ton: sum("SoLuongTon"), giu: sum("DaGiu"), khaDung: sum("KhaDung"),
      dangBan: bt.filter((b) => b.TrangThai === "Đang bán").length,
      conHang: bt.filter((b) => b.TinhTrangKho === "Còn hàng" || b.TinhTrangKho === "Sắp hết").length };
  }, [d]);

  const canhBao = useMemo(() => (d?.bienThe || []).flatMap((b) =>
    b.TinhTrangKho === "Sắp hết" ? [`${tenNgan(b)} còn ${b.KhaDung}`]
    : b.TinhTrangKho === "Hết hàng" ? [`${tenNgan(b)} đã hết hàng`] : []), [d]);

  if (error) return <Khung user={user} mode={mode} base={base}>
    <div className="ctsp-alert" role="alert">{error}</div>
    <button type="button" className="ctsp-btn ctsp-btn-outline" onClick={() => navigate(`${base}/san-pham`)}>Quay lại danh sách</button>
  </Khung>;
  if (!d) return <Khung user={user} mode={mode} base={base}><p className="ctsp-loading">Đang tải chi tiết sản phẩm...</p></Khung>;

  const { sanPham: sp, anh, bienThe, donHang, tongDon } = d;
  const dsAnh = anh.length ? anh : [null];
  const khoangGia = sp.GiaBienTheMin == null ? null
    : sp.GiaBienTheMin === sp.GiaBienTheMax ? fmt(sp.GiaBienTheMin)
    : `${Number(sp.GiaBienTheMin).toLocaleString("vi-VN")}–${fmt(sp.GiaBienTheMax)}`;

  return <Khung user={user} mode={mode} base={base}>
    <div className="ctsp-head">
      <div className="workspace-head"><h1>Chi tiết sản phẩm</h1>
        <p>{sp.MaSanPham} • Thông tin đang hiển thị và cấu hình bán hàng hiện tại.</p></div>
      <button type="button" className="ctsp-btn ctsp-btn-dark" onClick={() => navigate(`${base}/san-pham/${encodeURIComponent(sp.MaSanPham)}/chinh-sua`)}>Chỉnh sửa sản phẩm</button>
    </div>

    <div className="ctsp-top">
      <div>
        <div className="ctsp-main-img"><img src={imageUrl(dsAnh[anhDangXem])} alt={sp.TenSanPham}/></div>
        {dsAnh.length > 1 && <div className="ctsp-thumbs">
          {dsAnh.map((a, i) => <button type="button" key={i} className={i === anhDangXem ? "is-on" : ""}
            onClick={() => setAnhDangXem(i)} aria-label={`Xem ảnh ${i + 1}`}>
            <img src={imageUrl(a)} alt="" loading="lazy"/></button>)}
        </div>}
      </div>

      <section className="workspace-panel ctsp-info">
        <span className={`ctsp-chip ${LOP[sp.TrangThai] || ""}`}>{NHAN[sp.TrangThai] || sp.TrangThai}</span>
        <h2 className="ctsp-title">{sp.TenSanPham}</h2>
        <p className="ctsp-sub">{sp.MaSanPham} • {sp.TenDanhMuc}</p>
        <p className="ctsp-price">{fmt(sp.Gia)}</p>
        <small className="ctsp-muted">Giá cơ bản{khoangGia && ` • Giá biến thể từ ${khoangGia}`}</small>
        <hr/>
        {sp.MoTaNgan && <p className="ctsp-desc">{sp.MoTaNgan}</p>}
        <p className="ctsp-specs">
          {sp.PhongCach && <>Phong cách: {sp.PhongCach}<br/></>}
          {sp.ChatLieuChinh && <>Chất liệu chính: {sp.ChatLieuChinh}</>}
        </p>
        <div className="ctsp-actions">
          <button type="button" className="ctsp-btn ctsp-btn-dark" disabled title="Sẽ triển khai ở màn hình tiếp theo">Quản lý biến thể</button>
          <button type="button" className="ctsp-btn ctsp-btn-outline" disabled title="Sẽ triển khai ở màn hình tiếp theo">Xem trên cửa hàng</button>
        </div>
      </section>
    </div>

    <div className="ctsp-kpis">
      {[["Biến thể hiện tại", tong.soBienThe], ["Tồn hiện tại", tong.ton], ["Đã giữ cho đơn", tong.giu], ["Khả dụng", tong.khaDung]]
        .map(([nhan, so]) => <div className="workspace-panel ctsp-kpi" key={nhan}><span>{nhan}</span><strong>{pad(so)}</strong></div>)}
    </div>

    <section className="workspace-panel">
      <h2>Biến thể và tồn kho hiện tại</h2>
      <div className="workspace-table-scroll">
        <table className="workspace-table">
          <thead><tr><th>SKU</th><th>Chất liệu / Màu</th><th>Kích thước (cm)</th><th>Hiện tại</th><th>Đã giữ</th><th>Khả dụng</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {bienThe.map((b) => <tr key={b.MaBienThe}>
              <td>{b.SKU}</td>
              <td>{[b.ChatLieu, b.MauSac].filter(Boolean).join(" / ") || "—"}</td>
              <td>{b.KichThuoc || "—"}</td>
              <td>{b.SoLuongTon}</td>
              <td>{b.DaGiu}</td>
              <td><strong className={`ctsp-avail ${LOP_KHO[b.TinhTrangKho]}`}>{b.KhaDung}</strong></td>
              <td><span className={`ctsp-chip ctsp-kho ${LOP_KHO[b.TinhTrangKho]}`}>{b.TinhTrangKho}</span></td>
            </tr>)}
            {bienThe.length === 0 && <tr><td colSpan={7} className="ctsp-empty">Sản phẩm chưa có biến thể nào.</td></tr>}
          </tbody>
        </table>
      </div>
      {canhBao.length > 0 && <p className="ctsp-warn"><AlertTriangle size={14}/> {canhBao.join("; ")}. SKU hết hàng không thể đặt mua dù sản phẩm đang kinh doanh.</p>}
    </section>

    <div className="ctsp-two">
      <section className="workspace-panel">
        <h2>Bảo quản & thông số</h2>
        <p className="ctsp-pre">{sp.HuongDanBaoQuan || "Chưa có hướng dẫn bảo quản."}</p>
        {sp.ThongSoKyThuat && <p className="ctsp-pre ctsp-muted">{sp.ThongSoKyThuat}</p>}
        <p className="ctsp-muted">Ngày tạo: {sp.NgayTao}</p>
      </section>
      <section className="workspace-panel">
        <h2>Tình trạng kinh doanh</h2>
        <p>
          {sp.TrangThai === "Đang bán" ? `Đang hiển thị trong danh mục ${sp.TenDanhMuc}.`
            : sp.TrangThai === "Tạm ẩn" ? "Đang tạm ẩn, khách hàng chưa nhìn thấy sản phẩm này."
            : "Đã ngừng kinh doanh, không còn hiển thị cho khách hàng."}
          {" "}Có {tong.dangBan} SKU đang bán, trong đó {tong.conHang} SKU còn hàng.
        </p>
        <span className="ctsp-chip ctsp-info-chip">{tongDon} đơn liên quan</span>
        <p className="ctsp-muted">Giữ nguyên thông tin các đơn đã đặt khi chỉnh sửa giá, tên hoặc trạng thái sản phẩm.</p>
      </section>
    </div>

    <section className="workspace-panel">
      <h2>Đơn hàng liên quan gần nhất</h2>
      <div className="workspace-table-scroll">
        <table className="workspace-table">
          <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Biến thể</th><th>Số lượng</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {donHang.map((o, i) => <tr key={`${o.MaDonHienThi}-${i}`}>
              <td>{o.MaDonHienThi}</td><td>{o.KhachHang}</td><td>{o.SKU}</td><td>{o.SoLuong}</td>
              <td><span className="ctsp-chip ctsp-order">{o.TrangThai}</span></td>
            </tr>)}
            {donHang.length === 0 && <tr><td colSpan={5} className="ctsp-empty">Chưa có đơn hàng nào chứa sản phẩm này.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </Khung>;
}
