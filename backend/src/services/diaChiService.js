const API_DIA_GIOI = "https://provinces.open-api.vn/api/v2";
const THOI_HAN_CACHE = 24 * 60 * 60 * 1000;
const THOI_GIAN_CHO = 10000;
const MA_THANH_PHO_TRUC_THUOC_TRUNG_UONG = new Set([1, 31, 46, 48, 79, 92]);

let cacheTinhThanh;
const cachePhuongXa = new Map();

async function layDuLieuDiaGioi(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(THOI_GIAN_CHO)
  });

  if (!response.ok) {
    throw new Error(`API địa giới trả về HTTP ${response.status}`);
  }

  return response.json();
}

async function layDanhSachTinhThanh() {
  if (cacheTinhThanh && cacheTinhThanh.expiresAt > Date.now()) {
    return cacheTinhThanh.data;
  }

  const danhSach = await layDuLieuDiaGioi(`${API_DIA_GIOI}/`);
  if (
    !Array.isArray(danhSach) ||
    danhSach.some((tinh) =>
      !Number.isSafeInteger(tinh.code) || typeof tinh.name !== "string"
    )
  ) {
    throw new Error("Dữ liệu tỉnh, thành từ nguồn không hợp lệ");
  }

  const data = danhSach
    .map(({ code, name }) => ({
      code,
      name:
        !MA_THANH_PHO_TRUC_THUOC_TRUNG_UONG.has(code) &&
        name.startsWith("Thành phố ")
          ? name.replace(/^Thành phố /, "Tỉnh ")
          : name
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  cacheTinhThanh = { data, expiresAt: Date.now() + THOI_HAN_CACHE };
  return data;
}

async function layDanhSachPhuongXa(maTinh) {
  const cache = cachePhuongXa.get(maTinh);
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data;
  }

  const tinhThanh = await layDuLieuDiaGioi(
    `${API_DIA_GIOI}/p/${maTinh}?depth=2`
  );
  if (
    !Array.isArray(tinhThanh.wards) ||
    tinhThanh.wards.some((phuongXa) =>
      !Number.isSafeInteger(phuongXa.code) || typeof phuongXa.name !== "string"
    )
  ) {
    throw new Error("Dữ liệu phường, xã từ nguồn không hợp lệ");
  }

  const data = tinhThanh.wards
    .map(({ code, name }) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  cachePhuongXa.set(maTinh, {
    data,
    expiresAt: Date.now() + THOI_HAN_CACHE
  });
  return data;
}

module.exports = { layDanhSachTinhThanh, layDanhSachPhuongXa };
