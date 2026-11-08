import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { addProductToCart } from "../services/cartService";
import { getCurrentUser } from "../services/authService";
import { formatPrice } from "../services/productService";

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const productUrl = `/san-pham/${encodeURIComponent(product.id)}`;
  const canAdd = Boolean(product.variantId) && Number(product.stock) > 0;
  const stockText = !product.variantId
    ? "Chưa có biến thể bán hàng"
    : product.stock == null
      ? "Liên hệ để kiểm tra hàng"
      : Number(product.stock) > 0
        ? "Còn sản phẩm"
        : "Tạm hết hàng";

  async function handleAddToCart() {
    setFeedback(null);
    setAdding(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        navigate("/dang-nhap", {
          state: {
            from: `${location.pathname}${location.search}`,
            message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng."
          }
        });
        return;
      }
      if (user.TenVaiTro !== "Khách hàng") {
        setFeedback({ type: "error", message: "Chức năng giỏ hàng dành cho tài khoản khách hàng." });
        return;
      }

      await addProductToCart(product);
      setFeedback({ type: "success", message: "Đã thêm sản phẩm vào giỏ hàng." });
    } catch (error) {
      if (error.status === 401) {
        navigate("/dang-nhap", {
          state: {
            from: `${location.pathname}${location.search}`,
            message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng."
          }
        });
        return;
      }
      setFeedback({ type: "error", message: error.message || "Không thể thêm sản phẩm vào giỏ hàng." });
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="product-card">
      <Link className="product-image-wrap moc-product-image" to={productUrl} aria-label={`Xem ${product.name}`}>
        {imageFailed ? (
          <div className="product-image-fallback">MỘC AN</div>
        ) : (
          <img
            src={product.image || "/images/placeholder-product.jpg"}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        {product.label && <span className="product-label">{product.label}</span>}
      </Link>

      <div className="product-content">
        <p className="product-category">{product.category || "Nội thất Mộc An"}</p>
        <h3 className="product-name"><Link to={productUrl}>{product.name}</Link></h3>
        <p className="moc-product-description">
          {product.shortDescription || product.description || "Thiết kế dành cho không gian sống."}
        </p>
        <p className="product-price">{formatPrice(product.price)}</p>
        <p className={`product-stock ${Number(product.stock) < 1 ? "out-of-stock" : ""}`}>
          <span className="stock-dot" />
          {stockText}
        </p>
        <button
          className="product-add-button"
          type="button"
          onClick={handleAddToCart}
          disabled={!canAdd || adding}
        >
          <ShoppingCart size={15} aria-hidden="true" />
          {adding ? "Đang thêm..." : !canAdd ? "Chưa có hàng" : "Thêm vào giỏ hàng"}
        </button>
        {feedback && (
          <p className={`product-cart-feedback is-${feedback.type}`} role="status">
            {feedback.message}
            {feedback.type === "success" && <> <Link to="/gio-hang">Xem giỏ hàng</Link></>}
          </p>
        )}
      </div>
    </article>
  );
}
