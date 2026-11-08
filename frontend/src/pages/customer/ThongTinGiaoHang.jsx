import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Info, LockKeyhole, ShieldCheck } from "lucide-react";
import { checkCartStock, getCart } from "../../services/cartService";
import { getWards } from "../../services/diaChiService";
import { confirmDeliveryInformation } from "../../services/giaoNhanService";
import { tinhThanhVietNam } from "../../data/tinhThanhVietNam";
import "../../styles/giaoHang.css";

const STORAGE_KEY = "mocan_delivery_information";

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);

function docThongTinDaLuu() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function validateForm(form) {
  const errors = {};
  if (form.hoTen.trim().length < 2 || form.hoTen.trim().length > 150) {
    errors.hoTen = "Họ tên người nhận cần có từ 2 đến 150 ký tự.";
  }
  if (!/^0(?:2\d{8,9}|[35789]\d{8})$/.test(form.soDienThoai)) {
    errors.soDienThoai = "Số điện thoại Việt Nam chưa hợp lệ.";
  }
  if (form.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Vui lòng nhập email hợp lệ.";
  }
  if (!Number.isSafeInteger(Number(form.maTinh)) || Number(form.maTinh) <= 0) {
    errors.maTinh = "Vui lòng chọn tỉnh/thành phố.";
  }
  if (!Number.isSafeInteger(Number(form.maPhuongXa)) || Number(form.maPhuongXa) <= 0 || !form.phuongXa) {
    errors.maPhuongXa = "Vui lòng chọn phường/xã.";
  }
  if (form.diaChiChiTiet.trim().length < 5 || form.diaChiChiTiet.trim().length > 400) {
    errors.diaChiChiTiet = "Địa chỉ chi tiết cần có từ 5 đến 400 ký tự.";
  }
  const fullAddress = `${form.diaChiChiTiet.trim()}, ${form.phuongXa}, ${form.tinhThanhPho}`;
  if (fullAddress.length > 500) {
    errors.diaChiChiTiet = "Địa chỉ đầy đủ vượt quá giới hạn. Vui lòng rút gọn địa chỉ chi tiết.";
  }
  return errors;
}

export default function ThongTinGiaoHang() {
  const navigate = useNavigate();
  const savedInformation = docThongTinDaLuu();
  const [form, setForm] = useState({
    hoTen: savedInformation.hoTen || "",
    soDienThoai: (savedInformation.soDienThoai || "").replace(/\D/g, "").slice(0, 11),
    email: savedInformation.email || "",
    maTinh: savedInformation.maTinh || "",
    tinhThanhPho: savedInformation.tinhThanhPho || "",
    maPhuongXa: savedInformation.maPhuongXa || "",
    phuongXa: savedInformation.phuongXa || "",
    diaChiChiTiet: savedInformation.diaChiChiTiet || "",
    ghiChu: savedInformation.ghiChu || ""
  });
  const [wards, setWards] = useState([]);
  const [wardLoading, setWardLoading] = useState(false);
  const [wardError, setWardError] = useState("");
  const [wardRetry, setWardRetry] = useState(0);
  const [items, setItems] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(Boolean(savedInformation.hoTen));

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      try {
        const cartItems = await getCart();
        const checkedItems = await Promise.all(cartItems.map(async (item) => {
          try {
            const stock = await checkCartStock(item.MaBienThe);
            return {
              ...item,
              stock: Number(stock.SoLuongKhaDung),
              TinhTrangKho: stock.TinhTrangKho
            };
          } catch (error) {
            return { ...item, stockCheckError: error.message };
          }
        }));
        if (active) setItems(checkedItems);
      } catch (error) {
        if (active) setCartError(error.message);
      } finally {
        if (active) setCartLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.maTinh) return undefined;

    let active = true;
    Promise.resolve().then(async () => {
      setWardLoading(true);
      setWardError("");
      try {
        const data = await getWards(form.maTinh);
        if (active) setWards(data);
      } catch (error) {
        if (active) {
          setWards([]);
          setWardError(error.message);
        }
      } finally {
        if (active) setWardLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [form.maTinh, wardRetry]);

  const subtotal = useMemo(
    () => items.reduce(
      (total, item) => total + Number(item.GiaBan || item.price || 0) * Number(item.SoLuong || 0),
      0
    ),
    [items]
  );
  const shipping = items.length > 0 ? 300000 : 0;
  const total = subtotal + shipping;
  const selectedQuantity = items.reduce((sum, item) => sum + Number(item.SoLuong || 0), 0);
  const hasItems = items.length > 0;
  const stockUnavailable = items.some(
    (item) =>
      item.stockCheckError ||
      item.TinhTrangKho === "Ngừng bán" ||
      Number(item.stock) < 1 ||
      Number(item.SoLuong) > Number(item.stock)
  );

  function updateField(event) {
    const { name, value } = event.target;
    setConfirmed(false);
    setSubmitError("");
    setFieldErrors((current) => ({ ...current, [name]: "" }));

    if (name === "maTinh") {
      const province = tinhThanhVietNam.find((item) => String(item.ma) === value);
      setForm((current) => ({
        ...current,
        maTinh: value,
        tinhThanhPho: province?.ten || "",
        maPhuongXa: "",
        phuongXa: ""
      }));
      setWards([]);
      setWardLoading(false);
      setWardError("");
      return;
    }

    if (name === "maPhuongXa") {
      const ward = wards.find((item) => String(item.ma) === value);
      setForm((current) => ({
        ...current,
        maPhuongXa: value,
        phuongXa: ward?.ten || ""
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: name === "soDienThoai" ? value.replace(/\D/g, "").slice(0, 11) : value
    }));
  }

  async function submitForm(event) {
    event.preventDefault();
    if (submitting) return;
    const errors = validateForm(form);
    setFieldErrors(errors);
    setSubmitError("");
    if (Object.keys(errors).length > 0) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }
    if (!hasItems) {
      setSubmitError("Giỏ hàng chưa có sản phẩm. Vui lòng quay lại chọn sản phẩm.");
      return;
    }
    if (stockUnavailable) {
      setSubmitError("Vui lòng kiểm tra tồn kho các sản phẩm trong giỏ trước khi tiếp tục.");
      return;
    }

    setSubmitting(true);
    try {
      const information = {
        hoTen: form.hoTen.trim(),
        soDienThoai: form.soDienThoai,
        email: form.email.trim(),
        maTinh: Number(form.maTinh),
        tinhThanhPho: form.tinhThanhPho,
        maPhuongXa: Number(form.maPhuongXa),
        phuongXa: form.phuongXa,
        diaChiChiTiet: form.diaChiChiTiet.trim(),
        diaChiGiao: `${form.diaChiChiTiet.trim()}, ${form.phuongXa}, ${form.tinhThanhPho}`,
        ghiChu: form.ghiChu.trim()
      };
      const confirmedInformation = await confirmDeliveryInformation(information);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(confirmedInformation));
      setConfirmed(true);
      navigate("/thanh-toan/phuong-thuc");
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="delivery-page">
      <header className="delivery-header">
        <div className="delivery-header-inner">
          <Link to="/" className="delivery-brand" aria-label="Mộc An Interior">
            <span>MỘC AN</span>
            <small>INTERIOR</small>
          </Link>
          <span className="delivery-header-security">
            <LockKeyhole size={13} />
            Thanh toán an tâm · Hỗ trợ 1900 6868
          </span>
        </div>
      </header>

      <main className="delivery-main">
        <nav className="delivery-breadcrumb" aria-label="Điều hướng">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to="/gio-hang">Giỏ hàng</Link>
          <span>/</span>
          <span>Thanh toán</span>
        </nav>

        <div className="delivery-title">
          <h1>Hoàn thiện tổ ấm của bạn</h1>
          <p>Chia sẻ địa chỉ để Mộc An chuẩn bị hành trình đến nhà bạn.</p>
        </div>

        <ol className="delivery-steps" aria-label="Các bước thanh toán">
          <li className="delivery-step delivery-step-active">
            <span>1</span>
            <strong>Thông tin giao hàng</strong>
          </li>
          <li className="delivery-step">
            <span>2</span>
            <strong>Thanh toán</strong>
          </li>
          <li className="delivery-step">
            <span>3</span>
            <strong>Xác nhận đơn hàng</strong>
          </li>
        </ol>

        <div className="delivery-layout">
          <section className="delivery-form-section">
            <form onSubmit={submitForm} noValidate>
              <div className="delivery-section-heading">
                <h2>Thông tin người nhận</h2>
                <span>* Thông tin bắt buộc</span>
              </div>

              <div className="delivery-field">
                <label htmlFor="hoTen">Họ và tên *</label>
                <input
                  autoComplete="name"
                  id="hoTen"
                  maxLength={150}
                  name="hoTen"
                  value={form.hoTen}
                  onChange={updateField}
                  aria-invalid={Boolean(fieldErrors.hoTen)}
                  aria-describedby={fieldErrors.hoTen ? "hoTen-error" : undefined}
                />
                {fieldErrors.hoTen && <small id="hoTen-error" className="delivery-field-error">{fieldErrors.hoTen}</small>}
              </div>

              <div className="delivery-field-grid">
                <div className="delivery-field">
                  <label htmlFor="soDienThoai">Số điện thoại *</label>
                  <input
                    autoComplete="tel"
                    id="soDienThoai"
                    inputMode="numeric"
                    maxLength={11}
                    name="soDienThoai"
                    pattern="[0-9]*"
                    value={form.soDienThoai}
                    onChange={updateField}
                    aria-invalid={Boolean(fieldErrors.soDienThoai)}
                    aria-describedby={fieldErrors.soDienThoai ? "phone-error" : undefined}
                  />
                  {fieldErrors.soDienThoai && <small id="phone-error" className="delivery-field-error">{fieldErrors.soDienThoai}</small>}
                </div>
                <div className="delivery-field">
                  <label htmlFor="email">Email *</label>
                  <input
                    autoComplete="email"
                    id="email"
                    maxLength={254}
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateField}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                  />
                  {fieldErrors.email && <small id="email-error" className="delivery-field-error">{fieldErrors.email}</small>}
                </div>
              </div>

              <div className="delivery-divider" />
              <div className="delivery-section-heading delivery-address-heading">
                <h2>Địa chỉ giao hàng</h2>
              </div>

              <div className="delivery-field-grid">
                <div className="delivery-field">
                  <label htmlFor="maTinh">Tỉnh / Thành phố *</label>
                  <select
                    id="maTinh"
                    name="maTinh"
                    value={form.maTinh}
                    onChange={updateField}
                    aria-invalid={Boolean(fieldErrors.maTinh)}
                    aria-describedby={fieldErrors.maTinh ? "province-error" : undefined}
                  >
                    <option value="">Chọn tỉnh / thành phố</option>
                    {tinhThanhVietNam.map((province) => (
                      <option key={province.ma} value={province.ma}>{province.ten}</option>
                    ))}
                  </select>
                  {fieldErrors.maTinh && <small id="province-error" className="delivery-field-error">{fieldErrors.maTinh}</small>}
                </div>
                <div className="delivery-field">
                  <label htmlFor="maPhuongXa">Phường / Xã *</label>
                  <select
                    id="maPhuongXa"
                    name="maPhuongXa"
                    value={form.maPhuongXa}
                    onChange={updateField}
                    disabled={!form.maTinh || wardLoading || wards.length === 0}
                    aria-invalid={Boolean(fieldErrors.maPhuongXa)}
                    aria-describedby={
                      fieldErrors.maPhuongXa ? "ward-error" : wardError ? "ward-load-error" : undefined
                    }
                  >
                    <option value="">
                      {wardLoading ? "Đang tải phường / xã..." : form.maTinh ? "Chọn phường / xã" : "Chọn tỉnh trước"}
                    </option>
                    {wards.map((ward) => (
                      <option key={ward.ma} value={ward.ma}>{ward.ten}</option>
                    ))}
                  </select>
                  {fieldErrors.maPhuongXa && <small id="ward-error" className="delivery-field-error">{fieldErrors.maPhuongXa}</small>}
                  {wardError && (
                    <small id="ward-load-error" className="delivery-field-error">
                      {wardError}{" "}
                      <button type="button" className="delivery-retry" onClick={() => setWardRetry((current) => current + 1)}>
                        Tải lại
                      </button>
                    </small>
                  )}
                </div>
              </div>

              <div className="delivery-field">
                <label htmlFor="diaChiChiTiet">Địa chỉ chi tiết *</label>
                <input
                  autoComplete="street-address"
                  id="diaChiChiTiet"
                  maxLength={400}
                  name="diaChiChiTiet"
                  placeholder="Số nhà, tên đường, tòa nhà..."
                  value={form.diaChiChiTiet}
                  onChange={updateField}
                  aria-invalid={Boolean(fieldErrors.diaChiChiTiet)}
                  aria-describedby={fieldErrors.diaChiChiTiet ? "address-error" : undefined}
                />
                {fieldErrors.diaChiChiTiet && <small id="address-error" className="delivery-field-error">{fieldErrors.diaChiChiTiet}</small>}
                <small className="delivery-field-hint">
                  Địa chỉ càng cụ thể, quá trình giao hàng càng thuận tiện.
                </small>
              </div>

              <div className="delivery-field">
                <label htmlFor="ghiChu">Ghi chú giao hàng (không bắt buộc)</label>
                <textarea
                  id="ghiChu"
                  maxLength={500}
                  name="ghiChu"
                  rows="3"
                  placeholder="Ví dụ: gọi trước 30 phút, giao sau 14:00..."
                  value={form.ghiChu}
                  onChange={updateField}
                />
              </div>

              <div className="delivery-notice">
                <Info size={15} />
                <span>
                  Nội thất có kích thước lớn. Mộc An sẽ gọi trước để xác nhận lối vào, thang máy và
                  thời gian giao hàng. Vui lòng bảo đảm thông tin liên hệ chính xác.
                </span>
              </div>

              {cartError && <p className="delivery-error" role="alert">{cartError}</p>}
              {submitError && <p className="delivery-error" role="alert">{submitError}</p>}
              {confirmed && (
                <p className="delivery-success" role="status">
                  <Check size={16} />
                  Thông tin giao nhận đã được xác nhận và lưu cho phiên thanh toán này.
                </p>
              )}

              <div className="delivery-actions">
                <Link to="/gio-hang" className="delivery-back-link">
                  <ArrowLeft size={14} />
                  Quay lại giỏ hàng
                </Link>
                <button
                  type="submit"
                  className="delivery-submit"
                  disabled={submitting || cartLoading || wardLoading || !hasItems || stockUnavailable}
                >
                  {submitting ? "Đang xác nhận..." : "Tiếp tục đến thanh toán"}
                  {!submitting && <ArrowRight size={14} />}
                </button>
              </div>
            </form>
          </section>

          <aside className="delivery-summary">
            <h2>Đơn hàng của bạn</h2>
            {cartLoading ? (
              <p className="delivery-summary-loading">Đang tải sản phẩm...</p>
            ) : items.length === 0 ? (
              <p className="delivery-summary-loading">Giỏ hàng chưa có sản phẩm.</p>
            ) : (
              <div className="delivery-summary-products">
                {items.map((item) => (
                  <div className="delivery-summary-product" key={item.MaCTGio}>
                    <div className="delivery-summary-image">
                      <img
                        src={item.image || "/images/placeholder-product.jpg"}
                        alt=""
                        onError={(event) => {
                          event.currentTarget.src = "/images/placeholder-product.jpg";
                        }}
                      />
                      <span>{item.SoLuong}</span>
                    </div>
                    <div className="delivery-summary-product-info">
                      <strong>{item.TenSanPham}</strong>
                      <small>
                        {[item.MauSac, item.KichThuoc].filter(Boolean).join(" / ") || item.SKU}
                      </small>
                      <span>{formatPrice(item.GiaBan || item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="delivery-summary-divider" />
            <div className="delivery-summary-row">
              <span>Tạm tính ({selectedQuantity} sản phẩm)</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="delivery-summary-row">
              <span>Phí giao hàng & lắp đặt</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="delivery-summary-row">
              <span>Giảm giá</span>
              <span>{formatPrice(0)}</span>
            </div>
            <div className="delivery-summary-total">
              <span>Tổng thanh toán</span>
              <strong>{formatPrice(total)}</strong>
            </div>
            <p className="delivery-summary-tax">Đã bao gồm VAT. Phí giao hàng được tính theo đơn.</p>
            <p className="delivery-summary-security">
              <ShieldCheck size={14} />
              Bảo mật thông tin · Hỗ trợ 1900 6868
            </p>
          </aside>
        </div>
      </main>

      <footer className="delivery-footer">
        <div>
          <span>© 2026 MỘC AN INTERIOR. Nuôi giữ một không gian.</span>
          <span>Bảo mật thông tin · Điều khoản mua hàng</span>
        </div>
      </footer>
    </div>
  );
}
