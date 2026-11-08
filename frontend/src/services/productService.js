const API_URL = (import.meta.env.VITE_API_URL || "")
  .replace(/\/$/, "");
function imageUrl(path) {
  if (!path) return "/images/placeholder-product.jpg";
  if (/^https?:\/\//i.test(path) || path.startsWith("/images/")) return path;
  return `${API_URL}/${String(path).replace(/^\/+/, "")}`;
}

function normalizeVariant(variant) {
  return {
    ...variant,
    GiaBan: variant.GiaBan == null ? null : Number(variant.GiaBan),
    SoLuongTon: variant.SoLuongTon == null ? null : Number(variant.SoLuongTon)
  };
}

function normalize(product) {
  const variants = (product.BienThe || []).map(normalizeVariant);
  const primaryVariant = variants[0];

  return {
    id: product.MaSanPham,
    variantId: product.MaBienThe || primaryVariant?.MaBienThe || "",
    sku: product.SKU || primaryVariant?.SKU || "",
    name: product.TenSanPham,
    description: product.MoTa || "",
    shortDescription: product.MoTaNgan || "",
    category: product.TenDanhMuc || "",
    categoryId: product.MaDanhMuc,
    style: product.PhongCach || "",
    material: product.ChatLieuChinh || "",
    care: product.HuongDanBaoQuan || "",
    specs: product.ThongSoKyThuat || "",
    status: product.TrangThai || "",
    image: imageUrl(product.DuongDanAnh),
    price: product.GiaBan == null ? null : Number(product.GiaBan),
    basePrice: product.GiaCoBan == null ? null : Number(product.GiaCoBan),
    stock: product.SoLuongTon == null ? null : Number(product.SoLuongTon),
    images: (product.Anh || []).map((image) => ({ ...image, url: imageUrl(image.DuongDan) })),
    variants
  };
}

async function request(path, { signal } = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      signal
    });
  } catch {
    if (signal?.aborted) {
      throw new DOMException(
        "Đã hủy yêu cầu.",
        "AbortError"
      );
    }

    throw new Error(
      "Không thể kết nối máy chủ sản phẩm. Vui lòng thử lại."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `API sản phẩm không trả JSON hợp lệ (HTTP ${response.status}).`
    );
  }

  if (!response.ok || !result?.success) {
    throw new Error(
      result?.message || "Không thể tải dữ liệu sản phẩm."
    );
  }

  if (!Array.isArray(result.data) && !result.data) {
    throw new Error(
      "API sản phẩm trả dữ liệu không đúng định dạng."
    );
  }

  return result.data;
}

export async function getProducts({
  limit,
  signal
} = {}) {
  const query =
    limit == null
      ? ""
      : `?gioiHan=${encodeURIComponent(limit)}`;

  const products = await request(
    `/api/san-pham${query}`,
    { signal }
  );

  if (!Array.isArray(products)) {
    throw new Error(
      "API sản phẩm không trả danh sách hợp lệ."
    );
  }

  return products.map(normalize);
}

export async function getProductDetail(id) {
  return normalize(await request(`/api/san-pham/cong-khai/${encodeURIComponent(id)}`));
}

export const formatPrice = (price) => price == null
  ? "Liên hệ để biết giá"
  : new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0
    }).format(Number(price) || 0);
