
import { useState } from "react";

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

  const image = product.image || "/images/placeholder-product.jpg";

  const stockText =
    product.stock === null || product.stock === undefined
      ? "Liên hệ để kiểm tra hàng"
      : product.stock > 0
        ? "Còn sản phẩm"
        : "Tạm hết hàng";

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        {imageFailed ? (
          <div className="product-image-fallback">
            MỘC AN
          </div>
        ) : (
          <img
            src={product.image}
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
      </div>
    </article>
  );
}
