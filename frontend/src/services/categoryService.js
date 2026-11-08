const API = (import.meta.env.VITE_API_URL || "")
  .replace(/\/$/, "");

async function request(path = "", options = {}) {
  const response = await fetch(
    `${API}/api/danh-muc${path}`,
    {
      credentials: "include",
      ...options
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "Không thể đọc phản hồi. Kiểm tra backend và thử lại."
    );
  }

  if (!response.ok) {
    const error = new Error(
      data.message || "Yêu cầu thất bại."
    );

    error.field = data.field;
    throw error;
  }

  return data;
}

export const categoryCode = id =>
  /^\d+$/.test(String(id))
    ? `DM-${String(id).padStart(3, "0")}`
    : String(id);

export const categoryImage = url =>
  url?.startsWith("/uploads/")
    ? `${API}${url}`
    : url;

export const listCategories = (params, signal) =>
  request(
    `?${new URLSearchParams(params)}`,
    { signal }
  );

export const getCategory = id =>
  request(`/${encodeURIComponent(id)}`);

export function saveCategory(id, form, file) {
  const body = new FormData();

  Object.entries(form).forEach(([key, value]) => {
    body.append(key, value);
  });

  if (file) {
    body.append("hinhAnh", file);
  }

  return request(
    id ? `/${encodeURIComponent(id)}` : "",
    {
      method: id ? "PUT" : "POST",
      body
    }
  );
}

export const changeCategoryStatus = (id, hienThi) =>
  request(
    `/${encodeURIComponent(id)}/trang-thai`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ hienThi })
    }
  );

export const deleteCategory = id =>
  request(
    `/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );