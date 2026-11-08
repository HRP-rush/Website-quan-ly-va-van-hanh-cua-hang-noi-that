const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/v1/don-hang${path}`, {
      credentials: "include",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ đơn hàng.");
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error("API đơn hàng không trả dữ liệu hợp lệ."); }
  if (!response.ok) {
    const error = new Error(result.message || "Yêu cầu đơn hàng thất bại.");
    error.status = response.status;
    throw error;
  }
  return result.data;
}

export function getMyOrders() {
  return request("/lich-su");
}

export function trackOrder(id) {
  return request(`/${encodeURIComponent(id)}/theo-doi`);
}

export function getOrdersByStatus(status) {
  const query = new URLSearchParams({ trangThai: status });
  return request(`/loc-theo-trang-thai?${query}`);
}

export function updateOrderStatus(id, status) {
  return request(`/${encodeURIComponent(id)}/cap-nhat-giao-hang`, {
    method: "PATCH",
    body: JSON.stringify({ trangThai: status })
  });
}

export function getEmployeeOrders(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== "") params.set(key, String(value)); });
  return request(`/nhan-vien/danh-sach?${params}`);
}
export function getEmployeeOrder(id) { return request(`/nhan-vien/${encodeURIComponent(id)}/chi-tiet`); }
export function checkEmployeeOrderStock(id) { return request(`/nhan-vien/${encodeURIComponent(id)}/kiem-tra-ton`); }
