import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Info,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck
} from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {
  checkCartStock,
  getCart,
  notifyCartCount,
  removeCartItem,
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
                              {[item.MauSac, item.ChatLieu, item.KichThuoc].filter(Boolean).join(" / ") ||
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

                        <div className="cart-quantity-column">
                          <div className="cart-quantity" aria-label={`Số lượng ${item.TenSanPham}`}>
                            <button
                              type="button"
                              aria-label="Giảm số lượng"
                              disabled={isDeleting || item.SoLuong <= 1}
                              onClick={() => changeQuantity(item, -1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span aria-live="polite">{item.SoLuong}</span>
                            <button
                              type="button"
                              aria-label="Tăng số lượng"
                              disabled={!canIncrease}
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
      <Footer />
    </>
  );
}
