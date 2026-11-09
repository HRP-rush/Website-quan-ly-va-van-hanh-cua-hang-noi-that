import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { getReceiptDetail } from "../services/nhapKhoService";
import "../styles/chiTietPhieuNhap.css";

const GHI_NHAN = "Đã ghi nhận"; // trùng backend/src/config/phieuNhap.js
const fmtTien = (n) => `${Number(n || 0).toLocaleString("vi-VN")} ₫`;

// Pop-up xem chi tiết phiếu nhập: CHỈ ĐỌC, không có ô nhập hay nút sửa/xóa.
export default function ChiTietPhieuNhapModal({ maPhieuNhap, onClose }) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const dongRef = useRef(null);

  useEffect(() => {
    let live = true;
    setD(null); setError("");
    getReceiptDetail(maPhieuNhap).then((r) => { if (live) setD(r); }).catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [maPhieuNhap]);

  useEffect(() => {
    dongRef.current?.focus();
    const khoa = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = khoa; window.removeEventListener("keydown", esc); };
  }, [onClose]);

  const p = d?.phieu;
  const daGhiNhan = p?.TrangThai === GHI_NHAN;
  const chiTietTon = (d?.dong || []).filter((r) => r.TonSau != null)
    .map((r) => `${d.dong.length > 1 ? `${r.SKU}: ` : "hiện tại "}${r.TonTruoc} → ${r.TonSau}`);

  return <div className="ctpn-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className="ctpn-modal" role="dialog" aria-modal="true" aria-labelledby="ctpn-title">
      <header>
        <div>
          <small>PHIẾU NHẬP / CHỈ ĐỌC</small>
          <h2 id="ctpn-title">Chi tiết phiếu nhập {p?.MaPhieu || ""}</h2>
        </div>
        <button type="button" className="ctpn-close" ref={dongRef} onClick={onClose} aria-label="Đóng"><X size={18}/></button>
      </header>

      {error && <p className="ctpn-alert" role="alert">{error}</p>}
      {!d && !error && <p className="ctpn-muted">Đang tải chi tiết phiếu nhập...</p>}

      {d && <>
        <div className="ctpn-top">
          <div className="ctpn-left">
            <h3>{p.TenNCC} • {p.MaNCC}</h3>
            <p>Ngày nhập: {p.Ngay}{p.Gio ? ` • ${p.Gio}` : ""}</p>
            <p>Người lập: {p.NguoiLap}</p>
            <p>Ghi chú: {p.GhiChu || "—"}</p>
          </div>
          <div className="ctpn-right">
            <span className={`ctpn-chip ${daGhiNhan ? "ok" : "low"}`}>{daGhiNhan ? "Đã ghi nhận • Chỉ đọc" : "Bản nháp"}</span>
            {daGhiNhan && <>
              <p>Mã giao dịch: {d.maGiaoDich ? `${d.maGiaoDich}${d.soGiaoDich > 1 ? ` (+${d.soGiaoDich - 1})` : ""}` : "—"}</p>
              <small>{d.gioGhiNhan ? `Đã nhập thành công lúc ${d.gioGhiNhan}. ` : ""}Không sửa hoặc xóa phiếu đã ghi nhận.</small>
            </>}
          </div>
        </div>

        <div className="ctpn-table">
          <table>
            <thead><tr><th>Mã SKU</th><th>Thuộc tính</th><th>Số lượng</th><th>Giá nhập</th><th>Thành tiền</th></tr></thead>
            <tbody>
              {d.dong.map((r) => <tr key={r.SKU}>
                <td>{r.SKU}</td>
                <td>{[r.ChatLieu, r.MauSac].filter(Boolean).join(" / ") || "—"}{r.KichThuoc ? ` • ${r.KichThuoc} cm` : ""}</td>
                <td>{r.SoLuong}</td><td>{fmtTien(r.DonGiaNhap)}</td><td>{fmtTien(r.ThanhTien)}</td>
              </tr>)}
              {d.dong.length === 0 && <tr><td colSpan={5} className="ctpn-muted">Phiếu chưa có dòng sản phẩm nào.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="ctpn-total">
          <span>{d.dong.length} SKU • Tổng số lượng {d.tongSoLuong} sản phẩm</span>
          <strong>{fmtTien(d.tongTien)}</strong>
        </div>

        {daGhiNhan
          ? <p className="ctpn-note"><Check size={14}/> {chiTietTon.length
              ? `Đã ghi nhận vào lịch sử kho. Tại thời điểm nhập: ${chiTietTon.join("; ")}. Số dư hiện nay xem ở chi tiết tồn kho.`
              : "Phiếu đã ghi nhận nhưng chưa tìm thấy giao dịch kho tương ứng. Hãy đối chiếu ở chi tiết tồn kho."}</p>
          : <p className="ctpn-note low">Phiếu nháp chưa làm thay đổi số lượng tồn kho.</p>}

        <footer><button type="button" className="ctpn-btn" onClick={onClose}>Đóng</button></footer>
      </>}
    </div>
  </div>;
}
