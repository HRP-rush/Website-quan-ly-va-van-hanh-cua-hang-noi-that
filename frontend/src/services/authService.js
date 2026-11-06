const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function parseResponse(response) {
  let data;
  try { data = await response.json(); }
  catch { throw new Error("API không trả dữ liệu JSON hợp lệ."); }
  if (!response.ok) throw new Error(data.message || "Yêu cầu thất bại.");
  return data;
}

export async function login(email, matKhau, ghiNho = false) {
  const response = await fetch(`${API_URL}/api/v1/tai-khoan/dang-nhap`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, matKhau, ghiNho })
  });
  const result = await parseResponse(response);
  return result.data;
}

export async function registerCustomer({hoTen, email, soDienThoai, matKhau}) {
  const response = await fetch(`${API_URL}/api/v1/tai-khoan/dang-ky`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({hoTen, email, soDienThoai, matKhau})
  });
  return parseResponse(response); // Không tự đăng nhập sau đăng ký!
}

export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/api/v1/tai-khoan/cua-toi`, {
    credentials: "include"
  });
  if (response.status === 401 || response.status === 403) return null;
  const result = await parseResponse(response);
  return result.data;
}

export async function logout() {
  const response = await fetch(`${API_URL}/api/v1/tai-khoan/dang-xuat`, {
    method: "POST", credentials: "include"
  });
  return parseResponse(response);
}

// Khách hàng luôn quay về trang chủ công khai.
export function getRolePath(role) {
  return ({
    "Admin": "/admin",
    "Quản lý": "/quan-ly",
    "Nhân viên": "/nhan-vien",
    "Khách hàng": "/"
  })[role] || "/";
}
