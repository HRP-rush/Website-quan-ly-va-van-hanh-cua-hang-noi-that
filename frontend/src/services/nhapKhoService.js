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

export async function getReceiptForm() {
  const res = await fetch(`${API_URL}/api/nhap-kho/khoi-tao-phieu`, { credentials: "include" });
  return (await parse(res)).data; // { nhaCungCap, bienThe, nguoiLap }
}

export async function getReceipt(maPhieuNhap) {
  const res = await fetch(`${API_URL}/api/nhap-kho/phieu-nhap/${encodeURIComponent(maPhieuNhap)}`, { credentials: "include" });
  return (await parse(res)).data; // { phieu, dong }
}

// maPhieuNhap = null -> tạo mới; có giá trị -> cập nhật phiếu nháp. body.ghiNhan = true để ghi nhận luôn.
export async function saveReceipt(maPhieuNhap, body) {
  const res = await fetch(`${API_URL}/api/nhap-kho/phieu-nhap${maPhieuNhap ? `/${encodeURIComponent(maPhieuNhap)}` : ""}`, {
    method: maPhieuNhap ? "PUT" : "POST", credentials: "include",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
  return parse(res); // { data: { MaPhieuNhap, MaPhieu, TrangThai } }
}