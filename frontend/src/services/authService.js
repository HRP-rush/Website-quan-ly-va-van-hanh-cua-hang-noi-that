
const API_URL = import.meta.env.VITE_API_URL;

export async function login(email, matKhau, ghiNho) {
  const response = await fetch(
    `${API_URL}/api/v1/tai-khoan/dang-nhap`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        matKhau,
        ghiNho
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Đăng nhập thất bại.");
  }

  return result.data;
}

export async function getCurrentUser() {
  const response = await fetch(
    `${API_URL}/api/v1/tai-khoan/cua-toi`,
    {
      credentials: "include"
    }
  );

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result.data;
}

export async function logout() {
  const response = await fetch(
    `${API_URL}/api/v1/tai-khoan/dang-xuat`,
    {
      method: "POST",
      credentials: "include"
    }
  );

  if (!response.ok) {
    throw new Error("Không thể đăng xuất.");
  }
}

export function getRolePath(role) {
  const paths = {
    Admin: "/admin",
    "Quản lý": "/quan-ly",
    "Nhân viên": "/nhan-vien",
    "Khách hàng": "/tai-khoan"
  };

  return paths[role] || "/";
}


export async function registerCustomer({
  hoTen,
  email,
  soDienThoai,
  matKhau
}) {
  const API_URL = import.meta.env.VITE_API_URL;

  const response = await fetch(
    `${API_URL}/api/v1/tai-khoan/dang-ky`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hoTen,
        email,
        soDienThoai,
        matKhau
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Đăng ký tài khoản thất bại."
    );
  }

  return result;
}
