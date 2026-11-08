const API_URL = "https://provinces.open-api.vn/api/v2";

export async function getWards(maTinh) {
  let response;
  try {
    response = await fetch(`${API_URL}/p/${encodeURIComponent(maTinh)}?depth=2`);
  } catch {
    throw new Error("Không thể kết nối dịch vụ địa chỉ để tải phường, xã.");
  }

  if (!response.ok) {
    throw new Error("Không thể tải danh sách phường, xã. Vui lòng thử lại.");
  }

  let province;
  try {
    province = await response.json();
  } catch {
    throw new Error("Dữ liệu phường, xã không đúng định dạng.");
  }

  if (!Array.isArray(province.wards)) {
    throw new Error("Không tìm thấy danh sách phường, xã cho tỉnh đã chọn.");
  }

  return province.wards.map((ward) => ({
    ma: ward.code,
    ten: ward.name
  }));
}
