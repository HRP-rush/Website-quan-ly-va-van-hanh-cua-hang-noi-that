import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Info,
  Minus,
  Plus,
  SlidersHorizontal,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  X
} from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  checkCartStock,
  getCart,
  getCartVariants,
  notifyCartCount,
  removeCartItem,
  updateCartVariant,
  updateCartQuantity
} from "../../services/cartService";
import "../../styles/cart.css";

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(price) || 0);

function stockMessage(item) {
  if (item.stockCheckError) return `Chưa thể kiểm tra: ${item.stockCheckError}`;
  if (item.TinhTrangKho === "Ngừng bán") return "Sản phẩm ngừng kinh doanh";
  if (item.stock < 1) return "Sản phẩm đã hết hàng";
  if (item.SoLuong > item.stock) return `Đã chọn ${item.SoLuong}; hiện còn ${item.stock} sản phẩm`;
  return item.stock <= 5 ? `Còn ${item.stock} sản phẩm` : "Còn hàng";
}

function stockClass(item) {
  if (item.stockCheckError || item.TinhTrangKho === "Ngừng bán" || item.stock < 1 || item.SoLuong > item.stock) {
    return "cart-stock cart-stock-unavailable";
  }
  if (item.stock <= 5) return "cart-stock cart-stock-low";
  return "cart-stock";
}

function sameCartItem(first, second) {
  const key = ["MaCTGio", "MaBienThe", "SKU", "id"].find(
    (field) => first[field] != null && second[field] != null
  );
  return Boolean(key) && String(first[key]) === String(second[key]);
}

function cartItemKey(item) {
  return String(item.MaCTGio ?? item.MaBienThe ?? item.SKU ?? item.id);
}

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [savingIds, setSavingIds] = useState([]);
  const [variantsByProduct, setVariantsByProduct] = useState({});
  const [openVariantId, setOpenVariantId] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [variantError, setVariantError] = useState("");
  const [variantLoadingId, setVariantLoadingId] = useState(null);
  const [variantSavingId, setVariantSavingId] = useState(null);
  const itemsRef = useRef([]);
  const queuedQuantitiesRef = useRef(new Map());
  const syncingQuantityRef = useRef(new Set());
  const confirmedQuantitiesRef = useRef(new Map());
  const navigate = useNavigate();

  const loadCart = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const cartItems = await getCart();
      const checkedItems = await Promise.all(cartItems.map(async (item) => {
        try {
          const stock = await checkCartStock(item.MaBienThe);
          return {
            ...item,
            stock: Number(stock.SoLuongKhaDung),
            TinhTrangKho: stock.TinhTrangKho,
            image: item.image || stock.DuongDan
          };
        } catch (stockError) {
          return { ...item, stockCheckError: stockError.message };
        }
      }));
      itemsRef.current = checkedItems;
      confirmedQuantitiesRef.current = new Map(
        checkedItems.map((item) => [cartItemKey(item), Number(item.SoLuong)])
      );
      setItems(checkedItems);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadCart);
  }, [loadCart]);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + Number(item.GiaBan || item.price || 0) * Number(item.SoLuong || 0), 0),
    [items]
  );
  const shipping = items.length > 0 ? 300000 : 0;
  const total = subtotal + shipping;
  const selectedQuantity = items.reduce((sum, item) => sum + Number(item.SoLuong || 0), 0);
  const hasUnavailableItem = items.some(
    (item) =>
      item.stockCheckError ||
      item.TinhTrangKho === "Ngừng bán" ||
      item.stock < 1 ||
      item.SoLuong > item.stock
  );

  async function saveQueuedQuantity(item, key) {
    if (syncingQuantityRef.current.has(key)) return;

    syncingQuantityRef.current.add(key);
    setSavingIds((current) => current.includes(key) ? current : [...current, key]);
    try {
      while (queuedQuantitiesRef.current.has(key)) {
        const quantity = queuedQuantitiesRef.current.get(key);
        queuedQuantitiesRef.current.delete(key);
        await updateCartQuantity(item, quantity, itemsRef.current);
        confirmedQuantitiesRef.current.set(key, quantity);
      }
      setError("");
    } catch (updateError) {
      queuedQuantitiesRef.current.delete(key);
      const confirmedQuantity = confirmedQuantitiesRef.current.get(key);
      const restoredItems = itemsRef.current.map((currentItem) =>
        sameCartItem(currentItem, item)
          ? { ...currentItem, SoLuong: confirmedQuantity }
          : currentItem
      );
      itemsRef.current = restoredItems;
      setItems(restoredItems);
      notifyCartCount(restoredItems);
      setError(updateError.message);
    } finally {
      syncingQuantityRef.current.delete(key);
      setSavingIds((current) => current.filter((savingId) => savingId !== key));
    }
  }

  function changeQuantity(item, amount) {
    const currentItems = itemsRef.current;
    const latestItem = currentItems.find((currentItem) => sameCartItem(currentItem, item));
    if (!latestItem) return;

    const key = cartItemKey(latestItem);
    const currentQuantity = Number(latestItem.SoLuong);
    const quantity = Math.min(2147483647, Math.max(1, currentQuantity + amount));
    if (!Number.isSafeInteger(quantity) || quantity === currentQuantity) return;

    const optimisticItems = currentItems.map((currentItem) =>
      sameCartItem(currentItem, latestItem)
        ? { ...currentItem, SoLuong: quantity }
        : currentItem
    );
    itemsRef.current = optimisticItems;
    setItems(optimisticItems);
    notifyCartCount(optimisticItems);
    queuedQuantitiesRef.current.set(key, quantity);
    void saveQueuedQuantity(latestItem, key);
  }

  async function toggleVariantSelector(item) {
    const itemId = cartItemKey(item);
    if (openVariantId === itemId) {
      setOpenVariantId(null);
      return;
    }

    setSelectedVariantId(String(item.MaBienThe));
    setVariantError("");
    setOpenVariantId(itemId);
    if (variantsByProduct[item.MaSanPham]) return;

    setVariantLoadingId(itemId);
    try {
      const variants = await getCartVariants(item.MaSanPham);
      setVariantsByProduct((current) => ({ ...current, [item.MaSanPham]: variants }));
    } catch (loadError) {
      setError(loadError.message);
      setOpenVariantId(null);
    } finally {
      setVariantLoadingId(null);
    }
  }

  async function confirmVariantSelection(item) {
    const itemId = cartItemKey(item);
    const variant = (variantsByProduct[item.MaSanPham] || []).find(
      (option) => String(option.MaBienThe) === selectedVariantId
    );
    if (!variant) return;
    if (String(variant.MaBienThe) === String(item.MaBienThe)) {
      setOpenVariantId(null);
      return;
    }

    setVariantSavingId(itemId);
    setVariantError("");
    setError("");
    try {
      const result = await updateCartVariant(item, variant.MaBienThe);
      const saved = result.data;
      const updatedItem = {
        ...item,
        MaCTGio: saved.MaCTGio,
        MaBienThe: variant.MaBienThe,
        SKU: variant.SKU,
        MauSac: variant.MauSac,
        ChatLieu: variant.ChatLieu,
        KichThuoc: variant.KichThuoc,
        GiaBan: Number(variant.GiaBan || 0),
        SoLuong: Number(saved.SoLuong),
        TrangThai: variant.TrangThai,
        TrangThaiSanPham: variant.TrangThaiSanPham,
        TinhTrangKho: variant.TinhTrangKho,
        stock: Number(variant.SoLuongKhaDung || 0),
        stockCheckError: ""
      };
      const updatedItems = itemsRef.current.filter(
        (currentItem) =>
          !sameCartItem(currentItem, item) &&
          String(currentItem.MaCTGio) !== String(saved.MaCTGio)
      );
      updatedItems.push(updatedItem);

      itemsRef.current = updatedItems;
      confirmedQuantitiesRef.current = new Map(
        updatedItems.map((currentItem) => [cartItemKey(currentItem), Number(currentItem.SoLuong)])
      );
      setItems(updatedItems);
      notifyCartCount(updatedItems);
      setOpenVariantId(null);
      setVariantError("");
    } catch (updateError) {
      setVariantError(updateError.message);
    } finally {
      setVariantSavingId(null);
    }
  }

  async function deleteItem(item) {
    setPendingId(cartItemKey(item));
    setError("");
    try {
      await removeCartItem(item);
      await loadCart();
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setPendingId(null);
    }
  }

  const activeVariantItem = items.find((item) => cartItemKey(item) === openVariantId);
  const activeVariantOptions = activeVariantItem
    ? variantsByProduct[activeVariantItem.MaSanPham] || []
    : [];
  const selectedVariant = activeVariantOptions.find(
    (variant) => String(variant.MaBienThe) === selectedVariantId
  );

  return (
    <>
      <Header
        onSearch={(keyword) =>
          navigate(`/?tuKhoa=${encodeURIComponent(keyword)}#products`)
        }
        onCategoryChange={(category) =>
          navigate(`/?danhMuc=${encodeURIComponent(category)}#products`)
        }
      />
      <main className="cart-page">
        <div className="container">
          <nav className="cart-breadcrumb" aria-label="Điều hướng">
            <Link to="/">Trang chủ</Link>
            <span>/</span>
            <span>Giỏ hàng</span>
          </nav>

          <div className="cart-heading">
            <div>
              <p className="eyebrow">MỘC AN INTERIOR</p>
              <h1>Giỏ hàng của bạn</h1>
              <p className="cart-caption">
                {items.length > 0
                  ? `${selectedQuantity} sản phẩm đã chọn. Kiểm tra tồn kho trước khi đặt hàng.`
                  : "Những món đồ bạn yêu thích sẽ xuất hiện tại đây."}
              </p>
            </div>
          </div>

          <div className={`cart-error-slot${error ? " has-error" : ""}`} aria-live="polite">
            {error && (
              <div className="cart-error" role="alert">
                <Info size={17} />
                <span>{error}</span>
                <button type="button" onClick={loadCart}>Thử lại</button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="cart-loading" role="status">Đang tải giỏ hàng...</div>
          ) : items.length === 0 ? (
            <section className="cart-empty">
              <ShoppingBag size={36} strokeWidth={1.2} />
              <h2>Giỏ hàng đang trống</h2>
              <p>Khám phá những thiết kế nội thất được tuyển chọn cho tổ ấm của bạn.</p>
              <Link className="btn btn-primary" to="/">Tiếp tục mua sắm</Link>
            </section>
          ) : (
            <>
              <div className="cart-layout">
                <section className="cart-items" aria-label="Sản phẩm trong giỏ">
                  <div className="cart-table-head">
                    <span>Sản phẩm</span>
                    <span>Biến thể</span>
                    <span>Số lượng</span>
                    <span>Thành tiền</span>
                  </div>

                  {items.map((item) => {
                    const itemId = cartItemKey(item);
                    const itemPrice = Number(item.GiaBan || item.price || 0);
                    const isDeleting = String(pendingId) === itemId;
                    const isSaving = savingIds.includes(itemId);
                    const canIncrease = !isDeleting && Number(item.SoLuong) < 2147483647;

                    return (
                      <article className="cart-item" key={itemId}>
                        <div className="cart-product">
                          <Link to="/" className="cart-product-image">
                            <img
                              src={item.image || "/images/placeholder-product.jpg"}
                              alt={item.TenSanPham}
                              onError={(event) => {
                                event.currentTarget.src = "/images/placeholder-product.jpg";
                              }}
                            />
                          </Link>
                          <div className="cart-product-details">
                            <h2>{item.TenSanPham}</h2>
                            <p>
                              Biến thể: {[item.MauSac, item.ChatLieu, item.KichThuoc].filter(Boolean).join(" / ") ||
                                item.SKU ||
                                "Nội thất Mộc An"}
                            </p>
                            {item.SKU && <small>Mã: {item.SKU}</small>}
                            <strong>{formatPrice(itemPrice)}</strong>
                            <span className={stockClass(item)}>
                              <span className="cart-stock-dot" />
                              {stockMessage(item)}
                            </span>
                          </div>
                        </div>

                        <div className="cart-variant-column">
                          <button
                            className="cart-variant-button"
                            type="button"
                            aria-label={`Chọn biến thể cho ${item.TenSanPham}`}
                            aria-expanded={openVariantId === itemId}
                            title={item._cartSource === "server" ? "Chọn biến thể" : "Đăng nhập để đổi biến thể"}
                            disabled={item._cartSource !== "server" || isDeleting || isSaving || variantSavingId === itemId}
                            onClick={() => toggleVariantSelector(item)}
                          >
                            <SlidersHorizontal size={13} />
                            <span>Biến thể</span>
                          </button>
                        </div>

                        <div className="cart-quantity-column">
                          <div className="cart-quantity" aria-label={`Số lượng ${item.TenSanPham}`}>
                            <button
                              type="button"
                              aria-label="Giảm số lượng"
                              disabled={isDeleting || item.SoLuong <= 1 || isSaving}
                              onClick={() => changeQuantity(item, -1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span aria-live="polite">{item.SoLuong}</span>
                            <button
                              type="button"
                              aria-label="Tăng số lượng"
                              disabled={!canIncrease || isSaving}
                              onClick={() => changeQuantity(item, 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <button
                            className="cart-remove"
                            type="button"
                            disabled={isDeleting || isSaving}
                            onClick={() => deleteItem(item)}
                          >
                            <Trash2 size={13} />
                            Xóa sản phẩm
                          </button>
                        </div>

                        <strong className="cart-line-total">
                          {formatPrice(itemPrice * item.SoLuong)}
                        </strong>
                      </article>
                    );
                  })}

                  <div className="cart-continue-row">
                    <Link to="/" className="btn btn-outline">
                      <ArrowLeft size={14} />
                      Tiếp tục mua sắm
                    </Link>
                  </div>

                  <div className="cart-stock-notice">
                    <Info size={16} />
                    <span>
                      Tồn kho được kiểm tra trực tiếp. Sản phẩm hết hàng hoặc số lượng vượt tồn kho
                      sẽ không thể tiếp tục thanh toán.
                    </span>
                  </div>
                </section>

                <aside className="cart-summary">
                  <h2>Đơn hàng của bạn</h2>
                  <div className="cart-summary-row">
                    <span>Tạm tính ({selectedQuantity} sản phẩm)</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Phí giao hàng & lắp đặt</span>
                    <span>{formatPrice(shipping)}</span>
                  </div>
                  <div className="cart-summary-row">
                    <span>Giảm giá</span>
                    <span>{formatPrice(0)}</span>
                  </div>
                  <div className="cart-summary-total">
                    <span>Tổng thanh toán</span>
                    <strong>{formatPrice(total)}</strong>
                  </div>
                  <p className="cart-tax-note">Đã bao gồm VAT. Không phát sinh phí khi nhận hàng.</p>
                  <button
                    type="button"
                    className="cart-checkout-button"
                    disabled={hasUnavailableItem}
                    onClick={() => navigate("/thanh-toan/giao-hang")}
                  >
                    {hasUnavailableItem ? "Vui lòng kiểm tra tồn kho" : "Tiến hành thanh toán"}
                  </button>
                  <p className="cart-security-note">
                    <ShieldCheck size={15} />
                    Bảo mật thông tin · Hỗ trợ 1900 6868
                  </p>
                  <p className="cart-delivery-note">
                    <Truck size={17} />
                    Giao hàng và lắp đặt tận nơi. Đội ngũ sẽ liên hệ trước khi đến.
                  </p>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
      {activeVariantItem && (
        <div
          className="cart-variant-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !variantSavingId) setOpenVariantId(null);
          }}
        >
          <section
            className="cart-variant-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-variant-modal-title"
          >
            <header className="cart-variant-modal-header">
              <div>
                <p className="eyebrow">MỘC AN INTERIOR</p>
                <h2 id="cart-variant-modal-title">Chọn biến thể sản phẩm</h2>
              </div>
              <button
                className="cart-variant-modal-close"
                type="button"
                aria-label="Đóng cửa sổ chọn biến thể"
                disabled={Boolean(variantSavingId)}
                onClick={() => setOpenVariantId(null)}
              >
                <X size={18} />
              </button>
            </header>

            <p className="cart-variant-modal-product">{activeVariantItem.TenSanPham}</p>
            {variantLoadingId === cartItemKey(activeVariantItem) ? (
              <div className="cart-variant-modal-state" role="status">Đang tải biến thể...</div>
            ) : activeVariantOptions.length === 0 ? (
              <div className="cart-variant-modal-state">Sản phẩm chưa có biến thể để lựa chọn.</div>
            ) : (
              <div className="cart-variant-options" role="radiogroup" aria-label="Các biến thể sản phẩm">
                {activeVariantOptions.map((variant) => {
                  const isCurrent = String(variant.MaBienThe) === String(activeVariantItem.MaBienThe);
                  const isSelected = String(variant.MaBienThe) === selectedVariantId;
                  const unavailable = variant.TrangThai !== "Đang bán" ||
                    variant.TrangThaiSanPham !== "Đang bán" ||
                    Number(variant.SoLuongKhaDung) < 1;
                  const description = [variant.MauSac, variant.ChatLieu, variant.KichThuoc]
                    .filter(Boolean)
                    .join(" / ");

                  return (
                    <label
                      className={`cart-variant-option${isSelected ? " is-selected" : ""}${unavailable && !isCurrent ? " is-unavailable" : ""}`}
                      key={variant.MaBienThe}
                    >
                      <input
                        type="radio"
                        name={`cart-variant-${cartItemKey(activeVariantItem)}`}
                        value={variant.MaBienThe}
                        checked={isSelected}
                        disabled={(unavailable && !isCurrent) || variantSavingId === cartItemKey(activeVariantItem)}
                        onChange={() => setSelectedVariantId(String(variant.MaBienThe))}
                      />
                      <span className="cart-variant-option-details">
                        <strong>{description || variant.SKU || variant.MaBienThe}</strong>
                        <small>{variant.SKU ? `Mã biến thể: ${variant.SKU}` : variant.MaBienThe}</small>
                      </span>
                      <span className="cart-variant-option-meta">
                        <strong>{formatPrice(variant.GiaBan)}</strong>
                        <small className={unavailable ? "is-unavailable" : ""}>
                          {unavailable ? (isCurrent ? "Biến thể hiện tại · hết hàng" : "Hết hàng") : `Còn ${variant.SoLuongKhaDung}`}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {variantError && <p className="cart-variant-modal-error" role="alert">{variantError}</p>}

            <footer className="cart-variant-modal-actions">
              <button
                className="cart-variant-cancel"
                type="button"
                disabled={Boolean(variantSavingId)}
                onClick={() => setOpenVariantId(null)}
              >
                Hủy
              </button>
              <button
                className="cart-variant-confirm"
                type="button"
                disabled={!selectedVariant || Boolean(variantSavingId) || variantLoadingId === cartItemKey(activeVariantItem)}
                onClick={() => confirmVariantSelection(activeVariantItem)}
              >
                {variantSavingId ? "Đang cập nhật..." : "Xác nhận biến thể"}
              </button>
            </footer>
          </section>
        </div>
      )}
      <Footer />
    </>
  );
}
