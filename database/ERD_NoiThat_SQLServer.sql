-- Tạo Database cho hệ thống Mộc An Interior
CREATE DATABASE MocAnInteriorDB;
GO
USE MocAnInteriorDB;
GO

-- ==========================================
-- 1. BẢNG USERS (Quản lý tài khoản khách hàng, nhân viên, admin)
-- ==========================================
CREATE TABLE Users (
    user_id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address NVARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('Customer', 'Staff', 'Admin')) DEFAULT 'Customer',
    created_at DATETIME DEFAULT GETDATE()
);
GO

<<<<<<< Updated upstream
-- 2. Nguoi dung (ERD moi khong co HoTen)
CREATE TABLE dbo.NguoiDung (
    MaNguoiDung    INT IDENTITY(1,1) NOT NULL,
    MaVaiTro       INT NOT NULL,
    HoTen          NVARCHAR(150) NULL,
    Email          VARCHAR(254) NOT NULL,
    MatKhauHash    VARCHAR(255) NOT NULL,
    SoDienThoai    VARCHAR(20) NULL,
    DiaChi         NVARCHAR(500) NULL,
    TrangThai      NVARCHAR(30) NOT NULL CONSTRAINT DF_NguoiDung_TrangThai DEFAULT (N'Hoạt động'),
    CONSTRAINT PK_NguoiDung PRIMARY KEY (MaNguoiDung),
    CONSTRAINT UQ_NguoiDung_Email UNIQUE (Email),
    CONSTRAINT FK_NguoiDung_VaiTro FOREIGN KEY (MaVaiTro) REFERENCES dbo.VaiTro(MaVaiTro)
=======
-- ==========================================
-- 2. BẢNG CATEGORIES (Danh mục sản phẩm nội thất: Bàn, Ghế, Tủ, Giường...)
-- ==========================================
CREATE TABLE Categories (
    category_id INT IDENTITY(1,1) PRIMARY KEY,
    category_name NVARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description NVARCHAR(500)
>>>>>>> Stashed changes
);
GO

-- ==========================================
-- 3. BẢNG PRODUCTS (Sản phẩm nội thất chính)
-- ==========================================
CREATE TABLE Products (
    product_id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT FOREIGN KEY REFERENCES Categories(category_id),
    product_name NVARCHAR(150) NOT NULL,
    description NVARCHAR(MAX),
    base_price DECIMAL(18, 2) NOT NULL,
    image_url VARCHAR(255),
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================
-- 4. BẢNG PRODUCT_VARIANTS (Biến thể sản phẩm: Màu sắc, kích thước, chất liệu, giá và tồn kho)
-- ==========================================
CREATE TABLE ProductVariants (
    variant_id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT FOREIGN KEY REFERENCES Products(product_id) ON DELETE CASCADE,
    color NVARCHAR(50),
    material NVARCHAR(100), -- Ví dụ: Gỗ sồi, Gỗ óc chó, Da công nghiệp...
    size NVARCHAR(50),      -- Ví dụ: 1m2, 1m6, 2m...
    price DECIMAL(18, 2) NOT NULL, -- Giá cụ thể cho từng biến thể
    stock INT NOT NULL DEFAULT 0,  -- Quản lý tồn kho trực tiếp
    sku VARCHAR(100) UNIQUE
);
GO

-- ==========================================
-- 5. BẢNG ORDERS (Đơn hàng của khách hàng)
-- ==========================================
CREATE TABLE Orders (
    order_id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES Users(user_id),
    total_amount DECIMAL(18, 2) NOT NULL,
    order_status VARCHAR(50) CHECK (order_status IN ('Pending', 'Processing', 'Shipping', 'Completed', 'Cancelled')) DEFAULT 'Pending',
    payment_method VARCHAR(50) CHECK (payment_method IN ('COD', 'VNPay', 'MoMo')) DEFAULT 'COD',
    payment_status VARCHAR(50) CHECK (payment_status IN ('Pending', 'Paid', 'Failed')) DEFAULT 'Pending',
    shipping_address NVARCHAR(255) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    receiver_name NVARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================
-- 6. BẢNG ORDER_DETAILS (Chi tiết sản phẩm trong mỗi đơn hàng)
-- ==========================================
CREATE TABLE OrderDetails (
    order_detail_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT FOREIGN KEY REFERENCES Orders(order_id) ON DELETE CASCADE,
    variant_id INT FOREIGN KEY REFERENCES ProductVariants(variant_id),
    quantity INT NOT NULL,
    unit_price DECIMAL(18, 2) NOT NULL
);
GO

-- ==========================================
-- 7. BẢNG PAYMENTS (Lịch sử giao dịch thanh toán trực tuyến qua VNPay/MoMo)
-- ==========================================
CREATE TABLE Payments (
    payment_id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT FOREIGN KEY REFERENCES Orders(order_id),
    transaction_no VARCHAR(100), -- Mã giao dịch trả về từ cổng thanh toán
    payment_gateway VARCHAR(50) CHECK (payment_gateway IN ('VNPay', 'MoMo')),
    amount DECIMAL(18, 2) NOT NULL,
    response_code VARCHAR(50),
    status VARCHAR(50) CHECK (status IN ('Success', 'Failed', 'Pending')) DEFAULT 'Pending',
    created_at DATETIME DEFAULT GETDATE()
);
GO




-- Thêm danh mục mẫu
INSERT INTO Categories (category_name, slug, description) VALUES 
(N'Ghế Sofa', N'ghe-sofa', N'Các loại ghế sofa phòng khách cao cấp'),
(N'Bàn Ăn', N'ban-an', N'Bàn ăn gia đình chất liệu gỗ tự nhiên');

-- Thêm sản phẩm mẫu
INSERT INTO Products (category_id, product_name, description, base_price, image_url) VALUES 
(1, N'Ghế Sofa Gỗ Sồi Nga', N'Sofa phòng khách thiết kế hiện đại', 5500000, 'sofa_soi.jpg'),
(2, N'Bàn Ăn Thông Minh 6 Ghế', N'Bàn ăn kéo dài tiện lợi', 8200000, 'ban_an_6_ghe.jpg');

-- Thêm biến thể cho sản phẩm (Màu sắc, kích thước, tồn kho)
INSERT INTO ProductVariants (product_id, color, material, size, price, stock, sku) VALUES 
(1, N'Xám', N'Gỗ sồi + Vỉ nỉ', N'2m', 5500000, 15, 'SOFA-SOI-XAM-2M'),
(1, N'Nâu', N'Gỗ sồi + Da', N'2m', 5800000, 10, 'SOFA-SOI-NAU-2M'),
(2, N'Trắng kem', N'Gỗ óc chó', N'1m6', 8200000, 8, 'BAN-AN-TRANG-1M6');