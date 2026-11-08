const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const DELIVERY_STORAGE_KEY = "mocan_delivery_information";
export const PAYMENT_STORAGE_KEY = "mocan_payment_method";
export const ORDER_STORAGE_KEY = "mocan_completed_order";

function readStorage(key) {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Không thể đọc dữ liệu thanh toán đã lưu: ${error.message}`, { cause: error });
  }
}

export function getDeliveryInformation() {
  return readStorage(DELIVERY_STORAGE_KEY);
}

export function getSavedPaymentMethod() {
  return sessionStorage.getItem(PAYMENT_STORAGE_KEY) || "";
}

export function savePaymentMethod(method) {
  sessionStorage.setItem(PAYMENT_STORAGE_KEY, method);
}

export function getCompletedOrder() {
  return readStorage(ORDER_STORAGE_KEY);
}

export function saveCompletedOrder(order) {
  sessionStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
}

export async function createOrder(paymentMethod, cartSnapshot = []) {
  const thongTinGiaoNhan = getDeliveryInformation();
  if (!thongTinGiaoNhan) {
    throw new Error("Chưa có thông tin giao nhận. Vui lòng nhập lại thông tin người nhận.");
  }

  let response;
  try {
    response = await fetch(`${API_URL}/api/v1/don-hang/tao-moi`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thongTinGiaoNhan, phuongThucThanhToan: paymentMethod })
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ để ghi nhận đơn hàng.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("API không trả dữ liệu tạo đơn hàng hợp lệ.");
  }

  if (!response.ok) {
    const error = new Error(result.message || "Không thể ghi nhận đơn hàng.");
    error.status = response.status;
    throw error;
  }

  const orderData = result?.data;
  if (!orderData || !Number.isFinite(Number(orderData.MaDon)) || !Array.isArray(orderData.items)) {
    throw new Error("Đơn hàng đã được gửi nhưng dữ liệu biên nhận trả về không hợp lệ. Vui lòng kiểm tra mục Đơn hàng của tôi.");
  }

  const imagesBySku = new Map(cartSnapshot.map((item) => [item.SKU, item.image]));
  const completedOrder = {
    ...orderData,
    items: orderData.items.map((item) => ({
      ...item,
      image: imagesBySku.get(item.SKU) || "/images/placeholder-product.jpg"
    })),
    thongTinGiaoNhan,
    PhuongThucThanhToan: orderData.PhuongThucThanhToan || ""
  };
  saveCompletedOrder(completedOrder);
  sessionStorage.removeItem(PAYMENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("mocan-cart-change", { detail: { count: 0 } }));
  return completedOrder;
}
