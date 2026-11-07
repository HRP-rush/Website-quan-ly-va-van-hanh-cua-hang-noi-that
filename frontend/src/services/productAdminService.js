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

export const imageUrl = (path) =>
  !path ? "/images/placeholder-product.jpg"
  : path.startsWith("/uploads") ? `${API_URL}${path}`   // ảnh upload do backend phục vụ
  : path;                                                // ảnh mẫu nằm trong frontend/public

export async function getMaterials() {
  const res = await fetch(`${API_URL}/api/san-pham/chat-lieu`, { credentials: "include" });
  return (await parse(res)).data; // ["Vải Linen, khung gỗ tự nhiên", ...]
}

export async function listProducts(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== "" && v != null) qs.set(k, v); });
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri?${qs}`, { credentials: "include" });
  return parse(res); // { data, total, tongTatCa, trang, soDong }
}

export async function setProductStatus(maSanPham, trangThai) {
  const res = await fetch(`${API_URL}/api/san-pham/${encodeURIComponent(maSanPham)}/trang-thai`, {
    method: "PATCH", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trangThai })
  });
  return parse(res);
}

export async function getProductDetail(maSanPham) {
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri/${encodeURIComponent(maSanPham)}`, { credentials: "include" });
  return (await parse(res)).data; // { sanPham, anh, bienThe, donHang, tongDon }
}

export async function getProductForEdit(maSanPham) {
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri/${encodeURIComponent(maSanPham)}/chinh-sua`, { credentials: "include" });
  return (await parse(res)).data; // { sanPham, anh: [{ MaAnh, DuongDan }], bienThe: { SoBienThe, KhaDung } }
}

// thuTuAnh: mảng thứ tự ảnh, vd [12, "moi", 15]; anhMoi: các File mới theo đúng thứ tự xuất hiện của "moi"
export async function updateProduct(maSanPham, form, thuTuAnh, anhMoi) {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => fd.append(k, v));
  fd.append("thuTuAnh", JSON.stringify(thuTuAnh));
  anhMoi.forEach((f) => fd.append("anhMoi", f));
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri/${encodeURIComponent(maSanPham)}`, {
    method: "PUT", credentials: "include", body: fd
  });
  return parse(res);
}

export async function getVariants(maSanPham) {
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri/${encodeURIComponent(maSanPham)}/bien-the`, { credentials: "include" });
  return (await parse(res)).data; // { sanPham, bienThe: [...] }
}

const jsonInit = (method, body) => ({
  method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
});

export async function createVariant(maSanPham, form) {
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri/${encodeURIComponent(maSanPham)}/bien-the`, jsonInit("POST", form));
  return parse(res);
}
export async function updateVariant(maBienThe, form) {
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri/bien-the/${encodeURIComponent(maBienThe)}`, jsonInit("PUT", form));
  return parse(res);
}
export async function setVariantStatus(maBienThe, trangThai) {
  const res = await fetch(`${API_URL}/api/san-pham/quan-tri/bien-the/${encodeURIComponent(maBienThe)}/trang-thai`, jsonInit("PATCH", { trangThai }));
  return parse(res);
}
