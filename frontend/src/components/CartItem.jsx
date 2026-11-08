import Icon from "./Icons.jsx";

function formatCurrency(value) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ₫`;
}

function CartItem({ item, onQuantityChange, onRemove }) {
  return (
    <article className="cart-item">
      <img className="cart-item-image" src={item.image} alt={item.imageAlt} />
      <div className="cart-item-details">
        <h2>{item.name}</h2>
        <p>{item.material} / {item.dimensions}</p>
        <span className="item-sku">{item.sku}</span>
        <strong className="mobile-price">{formatCurrency(item.price)}</strong>
        <span className="stock-status">
          <span aria-hidden="true" />
          Còn hàng
        </span>
      </div>
      <div className="quantity-cell">
        <div className="quantity-control" aria-label={`Số lượng ${item.name}`}>
          <button
            type="button"
            aria-label={`Giảm số lượng ${item.name}`}
            onClick={() => onQuantityChange(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Icon name="minus" size={14} />
          </button>
          <span aria-live="polite">{item.quantity}</span>
          <button
            type="button"
            aria-label={`Tăng số lượng ${item.name}`}
            onClick={() => onQuantityChange(item.id, item.quantity + 1)}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
        <button
          className="remove-item"
          type="button"
          onClick={() => onRemove(item.id)}
        >
          <Icon name="trash" size={13} />
          Xóa sản phẩm
        </button>
      </div>
      <strong className="line-total">
        {formatCurrency(item.price * item.quantity)}
      </strong>
    </article>
  );
}

export default CartItem;
