
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { addProductToCart } from "../services/cartService";

const formatPrice = (price) => {
  if (price === null || price === undefined || price === "") {
    return "Liên hệ để biết giá";
  }

  const number = Number(price);
  if (!Number.isFinite(number)) return "Liên hệ để biết giá";

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(number);
};

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const navigate = useNavigate();

  const image = product.image || "/images/placeholder-product.jpg";
  const canAdd = Boolean(product.variantId) && Number(product.stock) > 0;

  const stockText =
    !product.variantId
      ? "Chưa có biến thể bán hàng"
      : product.stock === null || product.stock === undefined
      ? "Liên hệ để kiểm tra hàng"
      : product.stock > 0
        ? "Còn sản phẩm"
        : "Tạm hết hàng";

  async function handleAddToCart() {
    setFeedback(null);
    setAdding(true);
    try {
      await addProductToCart(product);
      setFeedback({ type: "success", message: "Đã thêm sản phẩm vào giỏ hàng." });
    } catch (error) {
      if (error.status === 401) {
        navigate("/dang-nhap", {
          state: { message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng." }
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
      <div className="product-image-wrap">
        {imageFailed ? (
          <div className="product-image-fallback">
            MỘC AN
          </div>
        ) : (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}

        {product.label && (
          <span className="product-label">{product.label}</span>
        )}
      </div>

      <div className="product-content">
        <p className="product-category">
          {product.category}
        </p>

        <h3 className="product-name">{product.name}</h3>

        <p className="product-price">
          {formatPrice(product.price)}
        </p>

        <p className={`product-stock ${
          product.stock === 0 ? "out-of-stock" : ""
        }`}>
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
          {adding
            ? "Đang thêm..."
            : !canAdd
              ? !product.variantId
                ? "Chưa có biến thể"
                : "Hết hàng"
              : "Thêm vào giỏ hàng"}
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
