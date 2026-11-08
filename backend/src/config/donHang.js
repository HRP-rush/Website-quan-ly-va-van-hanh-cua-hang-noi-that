// Các trạng thái đơn còn "giữ hàng" (chưa giao xong, chưa hủy).
// !!! Sửa cho khớp quy trình đơn hàng thật của bạn. Đây là NƠI DUY NHẤT khai báo danh sách này:
// sanPhamController.js và khoController.js đều nên import từ đây.
const DON_DANG_GIU_HANG = ["Chờ xác nhận", "Đã xác nhận", "Đang chuẩn bị", "Đang giao"];

module.exports = { DON_DANG_GIU_HANG };
