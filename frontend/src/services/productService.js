
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function getProducts() {
  const response = await fetch(`${API_URL}/api/san-pham`);

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `API sản phẩm không trả JSON hợp lệ (HTTP ${response.status}). Hãy kiểm tra backend tại ${API_URL}.`
    );
  }

  if (!response.ok) {
    throw new Error(result.message || "Không thể lấy danh sách sản phẩm.");
  }

  if (!Array.isArray(result?.data)) {
    throw new Error("API sản phẩm trả về dữ liệu không đúng định dạng.");
  }

  return result.data.map((item) => ({
    id: item.MaSanPham,
    variantId: item.MaBienThe,
    name: item.TenSanPham,
    description: item.MoTa,
    category: item.TenDanhMuc,
    style: item.PhongCach,
    status: item.TrangThai,

    image: item.DuongDanAnh || "/images/placeholder-product.jpg",

    price: item.GiaBan ?? null,
    stock: item.SoLuongTon ?? null
  }));
}
