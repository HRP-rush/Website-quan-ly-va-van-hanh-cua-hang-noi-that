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

export async function listReceipts(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== "" && v != null) qs.set(k, v); });
  const res = await fetch(`${API_URL}/api/nhap-kho/phieu-nhap?${qs}`, { credentials: "include" });
  return parse(res); // { data, total, tongQuan, trang, soDong }
}
