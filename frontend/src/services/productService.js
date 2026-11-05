
const API_URL = import.meta.env.VITE_API_URL;

export async function getProducts() {
  const response = await fetch(
    `${API_URL}/api/san-pham`
  );

  if (!response.ok) {
    throw new Error("Không thể lấy danh sách sản phẩm");
  }

  const result = await response.json();

  return result.data.map((item) => ({
    id: item.MaSanPham,
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
