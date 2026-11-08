const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const CART_STORAGE_KEY = "mocan_cart";

class CartApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}/api/v1/gio-hang${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("API không trả dữ liệu JSON hợp lệ.");
  }

  if (!response.ok) {
    throw new CartApiError(result.message || "Yêu cầu giỏ hàng thất bại.", response.status);
  }

  return result;
}

function readGuestCart() {
  const raw = localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error("Dữ liệu giỏ hàng không hợp lệ.");
    return items;
  } catch (error) {
    throw new Error(`Không thể đọc giỏ hàng đã lưu: ${error.message}`, { cause: error });
  }
}

function saveGuestCart(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  thongBaoThayDoi(items);
}

function thongBaoThayDoi(items) {
  const count = items.reduce((total, item) => total + Number(item.SoLuong || 0), 0);
  thongBaoSoLuong(count);
}

export function notifyCartCount(items) {
  thongBaoThayDoi(items);
}

function thongBaoSoLuong(count) {
  window.dispatchEvent(new CustomEvent("mocan-cart-change", { detail: { count } }));
}

function chuanHoaAnh(path) {
  if (!path) return "/images/placeholder-product.jpg";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function mapServerItem(item) {
  return {
    ...item,
    _cartSource: "server",
    image: chuanHoaAnh(item.DuongDan),
    stock: Number(item.SoLuongKhaDung || 0),
    price: Number(item.GiaBan || 0)
  };
}

function mapGuestItems(items) {
  return items.map((item) => ({ ...item, _cartSource: "guest" }));
}

function isSameCartItem(storedItem, item) {
  const key = ["MaCTGio", "MaBienThe", "SKU", "id"].find(
    (field) => storedItem[field] != null && item[field] != null
  );
  return Boolean(key) && String(storedItem[key]) === String(item[key]);
}

export async function getCart() {
  try {
    const result = await request("/");
    const items = result.data.map(mapServerItem);
    thongBaoThayDoi(items);
    return items;
  } catch (error) {
    if (error.status === 401) {
      const items = mapGuestItems(readGuestCart());
      thongBaoThayDoi(items);
      return items;
    }
    if (error instanceof TypeError) {
      const items = mapGuestItems(readGuestCart());
      if (items.length > 0) {
        thongBaoThayDoi(items);
        return items;
      }
    }
    throw error;
  }
}

export async function getCartTotal() {
  const result = await request("/tinh-tong-tien");
  return result.data;
}

export async function checkCartStock(maBienThe, maSanPham) {
  const query = new URLSearchParams(
    maBienThe
      ? { maBienThe: String(maBienThe) }
      : { maSanPham: String(maSanPham) }
  );
  const response = await fetch(
    `${API_URL}/api/v1/gio-hang/kiem-tra-ton-kho?${query}`
  );

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("API không trả dữ liệu kiểm tra tồn kho hợp lệ.");
  }
  if (!response.ok) {
    throw new CartApiError(result.message || "Không thể kiểm tra tồn kho.", response.status);
  }
  return result.data;
}

export async function addProductToCart(product) {
  if (!product.id) throw new Error("Không xác định được mã sản phẩm trong cơ sở dữ liệu.");

  if (Number(product.stock) < 1 || !product.variantId) {
    throw new Error("Sản phẩm hiện đã hết hàng hoặc chưa có biến thể bán.");
  }

  const result = await request("/them-san-pham", {
    method: "POST",
    body: JSON.stringify({ maBienThe: String(product.variantId), soLuong: 1 })
  });
  thongBaoSoLuong(Number(result.data?.SoLuongTrongGio || 0));
  return result;
}

export async function updateCartQuantity(item, quantity, currentItems = []) {
  if (!Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 2147483647) {
    throw new Error("Số lượng phải là số nguyên dương hợp lệ.");
  }

  if (item._cartSource === "server") {
    await request("/cap-nhat-so-luong", {
      method: "PUT",
      body: JSON.stringify({ maCTGio: item.MaCTGio, soLuong: quantity })
    });
    const items = currentItems.map((currentItem) =>
      isSameCartItem(currentItem, item)
        ? { ...currentItem, SoLuong: quantity }
        : currentItem
    );
    return items;
  }

  const storedItems = readGuestCart();
  let matched = false;
  const items = storedItems.map((storedItem) => {
    const isTarget = isSameCartItem(storedItem, item);
    if (isTarget) matched = true;
    return isTarget
      ? {
          ...storedItem,
          SoLuong: quantity
        }
      : storedItem
  });
  if (!matched) throw new Error("Sản phẩm trong giỏ đã thay đổi. Vui lòng tải lại giỏ hàng.");
  saveGuestCart(items);
  return mapGuestItems(items);
}

export async function removeCartItem(item) {
  if (item._cartSource === "server") {
    await request(`/xoa-san-pham/${item.MaCTGio}`, { method: "DELETE" });
    const items = await getCart();
    thongBaoThayDoi(items);
    return items;
  }

  const items = readGuestCart().filter(
    (storedItem) => !isSameCartItem(storedItem, item)
  );
  saveGuestCart(items);
  return items;
}
