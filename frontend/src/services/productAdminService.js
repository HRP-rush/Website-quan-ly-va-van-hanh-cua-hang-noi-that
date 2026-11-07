const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function parse(response) {
  let data;
  try { data = await response.json(); }
  catch { throw new Error("API không trả dữ liệu JSON hợp lệ."); }
  if (!response.ok) throw new Error(data.message || "Yêu cầu thất bại.");
  return data;
}

export async function getCategories() {
  const res = await fetch(`${API_URL}/api/san-pham/danh-muc`, { credentials: "include" });
  return (await parse(res)).data; // [{ MaDanhMuc, TenDanhMuc }]
}

// KHÔNG tự đặt Content-Type: trình duyệt tự thêm multipart boundary khi body là FormData
export async function createProduct(form, anhChinh, anhBoSung) {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.append(k, v));
  if (anhChinh) fd.append("anhChinh", anhChinh);
  anhBoSung.forEach((f) => fd.append("anhBoSung", f));
  const res = await fetch(`${API_URL}/api/san-pham/them-san-pham`, {
    method: "POST", credentials: "include", body: fd
  });
  return parse(res);
}
