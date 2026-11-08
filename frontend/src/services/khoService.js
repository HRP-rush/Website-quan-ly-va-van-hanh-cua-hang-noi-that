const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function parse(response) {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); }
  catch {
    const tomTat = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
    throw new Error(`Máy chủ trả về dữ liệu không phải JSON (HTTP ${response.status}): ${tomTat}`);
  }
  if (!response.ok) throw new Error(data.message || "Yêu cầu thất bại.");
  return data;
}

export async function listStock(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== "" && v != null) qs.set(k, v); });
  const res = await fetch(`${API_URL}/api/kho/ton-kho?${qs}`, { credentials: "include" });
  return parse(res); // { data, total, tongQuan, canhBao, tongCanhBao, trang, soDong }
}

export async function getStockDetail(maBienThe) {
  const res = await fetch(`${API_URL}/api/kho/ton-kho/${encodeURIComponent(maBienThe)}`, { credentials: "include" });
  return (await parse(res)).data; // { bienThe, lichSu, lechSo, phieuNhapNhap }
}

export async function listSuppliers(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) qs.set(key, value);
  });
  const res = await fetch(`${API_URL}/api/kho/nha-cung-cap?${qs}`, { credentials: "include" });
  return parse(res);
}

export async function getSupplierDetail(maNCC) {
  const res = await fetch(`${API_URL}/api/kho/nha-cung-cap/${encodeURIComponent(maNCC)}`, { credentials: "include" });
  return (await parse(res)).data;
}

export async function createSupplier(data) {
  const res = await fetch(`${API_URL}/api/kho/nha-cung-cap`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return (await parse(res)).data;
}

export async function updateSupplierStatus(maNCC, trangThai) {
  const res = await fetch(`${API_URL}/api/kho/nha-cung-cap/${encodeURIComponent(maNCC)}/trang-thai`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trangThai })
  });
  return parse(res);
}

// Chỉ nhân viên được gọi các endpoint tra cứu này.
export async function listEmployeeStock(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== "" && v != null) qs.set(k, v); });
  const res = await fetch(`${API_URL}/api/kho/tra-cuu-ton-kho?${qs}`, { credentials: "include" });
  return parse(res);
}

export async function listEmployeeStockCategories() {
  const res = await fetch(`${API_URL}/api/kho/tra-cuu-danh-muc`, { credentials: "include" });
  return (await parse(res)).data;
}

// API lịch sử kho dành cho nhân viên (chỉ đọc).
export async function listEmployeeWarehouseHistory(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key,value]) => { if(value != null && value !== "") qs.set(key,value); });
  const res = await fetch(`${API_URL}/api/kho/lich-su-kho?${qs}`,{credentials:"include"});
  return parse(res);
}
export async function getEmployeeWarehouseTransaction(id) {
  const res = await fetch(`${API_URL}/api/kho/lich-su-kho/${encodeURIComponent(id)}`,{credentials:"include"});
  return (await parse(res)).data;
}
