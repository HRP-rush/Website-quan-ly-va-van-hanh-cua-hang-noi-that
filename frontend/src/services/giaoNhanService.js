const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function confirmDeliveryInformation(information) {
  let response;
  try {
    response = await fetch(`${API_URL}/api/v1/gio-hang/xac-nhan-giao-nhan`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(information)
    });
  } catch {
    throw new Error("Không thể kết nối máy chủ để xác nhận thông tin giao hàng.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("API không trả dữ liệu xác nhận hợp lệ.");
  }

  if (!response.ok) {
    const error = new Error(result.message || "Không thể xác nhận thông tin giao hàng.");
    error.status = response.status;
    throw error;
  }

  return result.data;
}
