import { useMemo, useState } from "react";
import CartItem from "../../components/CartItem.jsx";
import Footer from "../../components/Footer.jsx";
import Header from "../../components/Header.jsx";
import Icon from "../../components/Icons.jsx";
import OrderSummary from "../../components/OrderSummary.jsx";
import Checkout from "./Checkout.jsx";
import OrderDetails from "./OrderDetails.jsx";
import "../../styles/cart.css";

const initialItems = [
  {
    id: "sofa-luna",
    name: "Sofa LUNA 3 chỗ",
    material: "Vải Linen / Kem",
    dimensions: "220 × 90 × 80 cm",
    sku: "LUNA-LINEN-KEM-220",
    price: 18_900_000,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=480&q=85",
    imageAlt: "Sofa vải màu kem trong phòng khách sáng",
  },
  {
    id: "ban-nordic",
    name: "Bàn trà NORDIC",
    material: "Gỗ Sồi Tự Nhiên",
    dimensions: "100 × 60 × 40 cm",
    sku: "NORDIC-OAK-100",
    price: 4_200_000,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1499933374294-4584851497cc?auto=format&fit=crop&w=480&q=85",
    imageAlt: "Bàn gỗ tự nhiên phong cách tối giản",
  },
];

function Cart({ maNguoiDung }) {
  const [items, setItems] = useState(initialItems);
  const [isCheckout, setIsCheckout] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  function changeQuantity(id, quantity) {
    if (quantity < 1) return;
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, quantity } : item,
      ),
    );
  }

  function removeItem(id) {
    setItems((currentItems) => currentItems.filter((item) => item.id !== id));
  }

  function handleCheckout() {
    setIsCheckout(true);
  }

  return (
    <div className="storefront">
      <Header
        itemCount={itemCount}
        variant={isCheckout && !selectedOrder ? "checkout" : "store"}
      />
      {selectedOrder ? (
        <OrderDetails
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
        />
      ) : isCheckout ? (
        <Checkout
          items={items}
          subtotal={subtotal}
          shipping={items.length ? 300_000 : 0}
          onBack={() => setIsCheckout(false)}
          maNguoiDung={maNguoiDung}
          onViewOrder={setSelectedOrder}
          onOrderCreated={() => setItems([])}
        />
      ) : (
        <main className="cart-page" id="cart">
          <div className="breadcrumbs">
            <a href="#home">Trang chủ</a>
            <span>/</span>
            <span>Giỏ hàng</span>
          </div>

          <div className="cart-heading">
            <h1>Giỏ hàng của bạn</h1>
            <p>
              {itemCount} sản phẩm đã chọn. Một bước gần hơn đến không gian bạn yêu.
            </p>
          </div>

          {items.length > 0 ? (
            <div className="cart-layout">
              <section className="cart-products" aria-label="Sản phẩm trong giỏ">
                <div className="cart-table-heading" aria-hidden="true">
                  <span>Sản phẩm</span>
                  <span>Số lượng</span>
                  <span>Thành tiền</span>
                </div>
                <div className="cart-items">
                  {items.map((item) => (
                    <CartItem
                      item={item}
                      key={item.id}
                      onQuantityChange={changeQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
                <a className="continue-shopping" href="#products">
                  <Icon name="arrowLeft" size={15} />
                  Tiếp tục mua sắm
                </a>
              </section>
              <OrderSummary
                itemCount={itemCount}
                subtotal={subtotal}
                shipping={items.length ? 300_000 : 0}
                onCheckout={handleCheckout}
              />
            </div>
          ) : (
            <section className="empty-cart">
              <Icon name="bag" size={32} />
              <h2>Giỏ hàng của bạn đang trống</h2>
              <p>Hãy khám phá những món đồ phù hợp với không gian của bạn.</p>
              <a className="continue-shopping" href="#products">
                <Icon name="arrowLeft" size={15} />
                Tiếp tục mua sắm
              </a>
            </section>
          )}
        </main>
      )}
      <Footer variant={isCheckout && !selectedOrder ? "checkout" : "store"} />
    </div>
  );
}

export default Cart;
