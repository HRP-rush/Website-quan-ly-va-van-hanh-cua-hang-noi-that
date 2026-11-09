# MỘC AN INTERIOR — Website quản lý và vận hành cửa hàng nội thất

## 1. Giới thiệu

MỘC AN INTERIOR là website bán hàng nội thất tích hợp quy trình vận hành: quản lý danh mục, sản phẩm và biến thể SKU; mua hàng và theo dõi đơn; nhập kho, tồn kho, giao hàng; quản lý nhà cung cấp và thống kê. Theo yêu cầu đề tài Nhóm 6 (trang 19–21), trọng tâm là quản lý tồn đúng biến thể và nhất quán từ nhập hàng → đặt hàng → giao hàng.

### Vai trò

| Vai trò | Phạm vi chính |
|---|---|
| Khách hàng | Xem/tìm/lọc sản phẩm, giỏ hàng, tạo đơn, theo dõi đơn; đánh giá sau hoàn tất nếu chức năng đã được tích hợp |
| Nhân viên | Tra cứu tồn, lập phiếu nhập, xem lịch sử kho; xử lý đơn và giao hàng theo quyền/đơn được phân công nếu đã tích hợp patch |
| Quản lý | Quản lý sản phẩm, danh mục, biến thể, kho, nhà cung cấp, đơn/giao hàng và thống kê; phân công nhân viên nếu đã tích hợp patch |
| Admin | Các màn hình quản trị theo cấu hình phân quyền của phiên bản cài đặt |

## 2. Công nghệ và cấu trúc

- **Frontend:** React 19, Vite 8, React Router 7, Lucide React.
- **Backend:** Node.js, Express 5, `mssql`, JWT, HttpOnly Cookie, Multer.
- **Database:** Microsoft SQL Server.
- **Kho mã nguồn:** Git/GitHub (nhóm điền URL repository thực tế vào phần thông tin dự án).

```text
Website-quan-ly-va-van-hanh-cua-hang-noi-that/
├── frontend/                 # React + Vite
│   ├── src/pages/            # customer, employee, management
│   ├── src/services/         # lời gọi API
│   └── vite.config.js        # proxy /api, /uploads
├── backend/
│   ├── src/server.js         # điểm khởi chạy API
│   ├── src/routes/           # các tuyến API
│   ├── src/controllers/      # nghiệp vụ
│   └── src/config/db.js      # cấu hình kết nối SQL Server
└── database/
    └── ERD_NoiThat_SQLServer.sql
```

## 3. Yêu cầu môi trường

- Node.js tương thích Vite 8 (khuyến nghị kiểm tra yêu cầu `engines` của Vite và sử dụng phiên bản Node LTS mới phù hợp).
- npm; Microsoft SQL Server đang chạy và cho phép Backend kết nối; SQL Server Management Studio để khôi phục/kiểm tra CSDL.
- Hai cổng mặc định: Frontend **5173**, Backend **5000**; SQL Server thường **1433** (có thể thay đổi).

## 4. Cài đặt và chạy

### Bước 1 — Chuẩn bị database

1. Tạo/khôi phục database SQL Server theo bản database **mới nhất của nhóm**.
2. `database/ERD_NoiThat_SQLServer.sql` trong ZIP có thể chưa cập nhật đủ tất cả các thay đổi; **không chạy ghi đè lên database đang dùng nếu chưa sao lưu**.
3. Kiểm tra tài khoản SQL Server, tên máy chủ, tên database, quyền truy cập và dữ liệu demo (sản phẩm, biến thể, tồn, tài khoản, đơn hàng, nhà cung cấp).
4. Với sản phẩm cần hiện ở catalog: trạng thái sản phẩm phải là `Đang bán`, danh mục có `HienThi = 1` nếu API đang dùng điều kiện này.

### Bước 2 — Backend

```bash
cd backend
npm install
```

Tạo/cập nhật `backend/.env` trên máy chạy (không commit mật khẩu DB/khóa JWT):

```dotenv
PORT=5000
FRONTEND_URL=http://localhost:5173
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=<TEN_DATABASE_CUA_NHOM>
DB_USER=<SQL_USER>
DB_PASSWORD=<SQL_PASSWORD>
DB_ENCRYPT=false
DB_TRUST_CERT=true
JWT_SECRET=<KHOA_BI_MAT_DU_DAI>
```

Các biến JWT/khác cần đối chiếu trực tiếp code phiên bản hiện tại; nội dung trên là **cấu hình ví dụ**, không thay thế cho `.env` đang chạy tốt của nhóm.

```bash
npm run dev
# hoặc npm start
```

Kiểm tra: `http://localhost:5000/api/health/db` (mong đợi HTTP 200, `status: connected`).

### Bước 3 — Frontend

Mở terminal khác:

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173`. Trong `frontend/vite.config.js`, `/api` và `/uploads` được proxy tới `http://127.0.0.1:5000` hoặc giá trị `API_PROXY_TARGET`.

### Lệnh kiểm tra bổ sung

```bash
cd frontend
npm run build
npm run lint
```

## 5. Tài khoản demo (chỉ dành cho môi trường thử nghiệm)

| Vai trò | Email | Mật khẩu tạm |
|---|---|---|
| Khách hàng | `demo.khachhang@mocan.test` | `SzIHVFVtkowVDzxfK1LAPXsZ` |
| Nhân viên | `demo.nhanvien@mocan.test` | `z0y0EKTuCZ71dMygVKvXMng2` |
| Quản lý | `demo.quanly@mocan.test` | `5gRzjJE_6_cLfu_buKdWopwt` |

**CẢNH BÁO:** Mật khẩu do nhóm cung cấp, chưa được xác minh trên DB hiện tại.

## 6. Kịch bản demo

1. **Quản lý:** đăng nhập, xem/tạo sản phẩm và biến thể theo màu/chất liệu/kích thước; kiểm tra tồn theo SKU.
2. **Quản lý/Nhân viên:** tạo và xác nhận phiếu nhập; so sánh tồn trước/sau; kiểm tra lịch sử `Nhập kho`.
3. **Khách hàng:** lọc sản phẩm, chọn đúng biến thể, thêm vào giỏ, chỉnh số lượng, đặt hàng và xem lịch sử đơn.
4. **Nhân viên:** xác nhận đơn đủ tồn, thử đơn vượt tồn phải bị chặn; xử lý theo chuỗi trạng thái hợp lệ.
5. **Giao hàng:** bắt đầu giao, xác nhận thành công → đơn hoàn tất, tồn giảm đúng SKU một lần, có lịch sử xuất kho. Thử xác nhận lặp phải bị chặn.
6. **Đơn hủy:** hủy ở trạng thái được phép; đối chiếu tồn/đã giữ theo quy tắc của hệ thống.
7. **Khách hàng:** xem đơn hoàn tất; đánh giá sản phẩm nếu tính năng đánh giá đã được tích hợp.
8. **Quản lý:** xem báo cáo theo khoảng ngày; xuất Excel ngày/tuần/tháng/quý/năm nếu PATCH xuất báo cáo đã tích hợp.
9. **Phân quyền:** đăng nhập Khách hàng và thử API/trang kho, nhập hàng/quản trị — hệ thống phải từ chối; thử sửa đơn không được phân công với tài khoản Nhân viên nếu có phân công.

## 7. Quy tắc nghiệp vụ cần chứng minh

- Tồn được quản lý ở cấp **biến thể/SKU**, không dùng tồn tổng sản phẩm để bán nhầm cấu hình.
- Lưu **giá/tên/cấu hình tại thời điểm đặt** để dữ liệu đơn cũ không thay đổi khi sửa catalog.
- Khi xác nhận đơn, kiểm tra lại tồn khả dụng và không cho bán vượt tồn.
- Quy định rõ khi nào **giữ tồn**, **giải phóng giữ tồn**, **xuất kho**; không trừ tồn lặp khi giao thành công.
- Phiếu nhập nháp không tăng tồn; chỉ ghi nhận sau khi xác nhận và phải có giao dịch kho.
- Chỉ người có quyền mới xử lý trạng thái, phân công, nhập kho hoặc xem báo cáo.
- Đánh giá chỉ cho phép với sản phẩm thuộc đơn đã hoàn tất nếu tính năng có triển khai.

## 8. Kiểm thử và truy vết

Sử dụng file **`MOC_AN_Test_Plan_Test_Cases_RTM.xlsx`** đi kèm:

- `Tong quan`: đếm test case, trạng thái thực thi, Pass/Fail, theo dõi tiến độ.
- `Test Plan`: phạm vi, cách chạy, loại kiểm thử, điều kiện vào/ra.
- `Test Cases`: **35 test case** positive/negative/boundary/permission, bước làm, dữ liệu và kết quả mong đợi.
- `RTM`: liên kết **G6-FR01…G6-FR13** với test case và kết quả.
- `Bug Log`: nhật ký lỗi và re-test (mẫu trống — chỉ điền sau khi chạy thật).
- `Du lieu demo`: checklist chuẩn bị bộ seed nghiệm thu.

Trạng thái `Chưa chạy` là chủ đích: chưa chạy trên SQL Server của nhóm nên không được tự ghi `Pass`. Trong buổi test, điền **Actual Result**, đổi **Status**, lưu ảnh/video/log và phiên bản commit kiểm thử. Nếu một chức năng chưa được tích hợp, đánh `Blocked` và nêu lý do.

## 9. Đối chiếu yêu cầu đề bài

| ID | Ưu tiên | Nội dung |
|---|---|---|
| G6-FR01 | MUST | Đăng ký/đăng nhập và phân quyền |
| G6-FR02 | MUST | Quản lý danh mục/sản phẩm/thuộc tính |
| G6-FR03 | MUST | Quản lý SKU/biến thể và tồn đúng cấu hình |
| G6-FR04 | MUST | Tìm/lọc/sắp xếp và xem tồn khả dụng |
| G6-FR05 | MUST | Giỏ hàng, đặt hàng, lưu giá/biến thể lịch sử |
| G6-FR06 | MUST | Kiểm tra tồn trước xác nhận, chống bán vượt tồn |
| G6-FR07 | MUST | Nhân viên xử lý đơn/giao hàng |
| G6-FR08 | MUST | Nhập kho và lịch sử biến động |
| G6-FR09 | MUST | Theo dõi đơn, đánh giá sau hoàn tất |
| G6-FR10 | MUST | Nhà cung cấp và tài khoản nhân viên |
| G6-FR11 | SHOULD | Dashboard kinh doanh và tồn thấp |
| G6-FR12 | SHOULD | Mã giảm giá/phí giao hàng |
| G6-FR13 | COULD | Chatbot có fallback, không bịa dữ liệu |

## 10. Khắc phục lỗi phổ biến

| Hiện tượng | Cách kiểm tra |
|---|---|
| Trang chủ không hiện sản phẩm | API `/api/san-pham?gioiHan=8`, trạng thái `Đang bán`, `DanhMuc.HienThi=1`, dữ liệu SKU/ảnh |
| Backend không kết nối DB | `/api/health/db`, `.env`, tên máy chủ, cổng SQL, quyền truy cập |
| Frontend lỗi API | Backend có chạy cổng 5000, cấu hình proxy trong Vite, Network tab |
| Sai quyền/sidebar | `RoleGate`, đường dẫn vai trò, `WorkspaceLayout`/mode của component |
| Tồn không trừ sau giao | Kiểm tra trạng thái đơn, giao dịch `Xuất kho`, tồn đúng SKU; **không trừ bù thủ công nếu chưa đối chiếu** |
