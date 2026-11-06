/*
  WEBSITE QUAN LY VA VAN HANH CUA HANG NOI THAT - NHOM 6
  SQL Server - tao CSDL va 19 bang theo ERD cap nhat.
  Chay toan bo trong SQL Server Management Studio (SSMS).
  LUU Y: Script tao moi, khong xoa bang/cu du lieu hien co.
*/
IF DB_ID(N'QuanLyCuaHangNoiThat') IS NULL
BEGIN
    CREATE DATABASE QuanLyCuaHangNoiThat;
END;
GO
USE QuanLyCuaHangNoiThat;
GO

-- 1. Vai tro
CREATE TABLE dbo.VaiTro (
    MaVaiTro       INT IDENTITY(1,1) NOT NULL,
    TenVaiTro      NVARCHAR(50) NOT NULL,
    CONSTRAINT PK_VaiTro PRIMARY KEY (MaVaiTro),
    CONSTRAINT UQ_VaiTro_TenVaiTro UNIQUE (TenVaiTro)
);
GO

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
);
GO

-- 3. Danh muc
CREATE TABLE dbo.DanhMuc (
    MaDanhMuc      INT IDENTITY(1,1) NOT NULL,
    TenDanhMuc     NVARCHAR(150) NOT NULL,
    MoTa           NVARCHAR(1000) NULL,
    CONSTRAINT PK_DanhMuc PRIMARY KEY (MaDanhMuc),
    CONSTRAINT UQ_DanhMuc_TenDanhMuc UNIQUE (TenDanhMuc)
);
GO

-- 4. San pham
CREATE TABLE dbo.SanPham (
    MaSanPham      INT IDENTITY(1,1) NOT NULL,
    MaDanhMuc      INT NOT NULL,
    TenSanPham     NVARCHAR(250) NOT NULL,
    MoTa           NVARCHAR(MAX) NULL,
    PhongCach      NVARCHAR(100) NULL,
    TrangThai      NVARCHAR(30) NOT NULL CONSTRAINT DF_SanPham_TrangThai DEFAULT (N'Đang bán'),
    CONSTRAINT PK_SanPham PRIMARY KEY (MaSanPham),
    CONSTRAINT FK_SanPham_DanhMuc FOREIGN KEY (MaDanhMuc) REFERENCES dbo.DanhMuc(MaDanhMuc)
);
GO

-- 5. Bien the san pham / SKU
CREATE TABLE dbo.BienTheSanPham (
    MaBienThe          INT IDENTITY(1,1) NOT NULL,
    MaSanPham          INT NOT NULL,
    SKU                VARCHAR(80) NOT NULL,
    MauSac             NVARCHAR(100) NULL,
    ChatLieu           NVARCHAR(150) NULL,
    KichThuoc          NVARCHAR(150) NULL,
    GiaBan             DECIMAL(18,2) NOT NULL,
    GiaNhapThamChieu   DECIMAL(18,2) NULL,
    TrangThai          NVARCHAR(30) NOT NULL CONSTRAINT DF_BienThe_TrangThai DEFAULT (N'Đang bán'),
    CONSTRAINT PK_BienTheSanPham PRIMARY KEY (MaBienThe),
    CONSTRAINT UQ_BienTheSanPham_SKU UNIQUE (SKU),
    CONSTRAINT FK_BienThe_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
    CONSTRAINT CK_BienThe_GiaBan CHECK (GiaBan >= 0),
    CONSTRAINT CK_BienThe_GiaNhap CHECK (GiaNhapThamChieu IS NULL OR GiaNhapThamChieu >= 0)
);
GO

-- 6. Anh san pham: anh chung hoac anh cua bien the cu the
CREATE TABLE dbo.AnhSanPham (
    MaAnh          INT IDENTITY(1,1) NOT NULL,
    MaSanPham      INT NOT NULL,
    MaBienThe      INT NULL,
    DuongDan       NVARCHAR(1000) NOT NULL,
    LaAnhDaiDien   BIT NOT NULL CONSTRAINT DF_AnhSanPham_DaiDien DEFAULT (0),
    CONSTRAINT PK_AnhSanPham PRIMARY KEY (MaAnh),
    CONSTRAINT FK_AnhSanPham_SanPham FOREIGN KEY (MaSanPham) REFERENCES dbo.SanPham(MaSanPham),
    CONSTRAINT FK_AnhSanPham_BienThe FOREIGN KEY (MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe)
);
GO

-- 7. Nha cung cap
CREATE TABLE dbo.NhaCungCap (
    MaNCC          INT IDENTITY(1,1) NOT NULL,
    TenNCC         NVARCHAR(250) NOT NULL,
    DienThoai      VARCHAR(20) NULL,
    Email          VARCHAR(254) NULL,
    DiaChi         NVARCHAR(500) NULL,
    CONSTRAINT PK_NhaCungCap PRIMARY KEY (MaNCC)
);
GO

-- 8. Gio hang: moi nguoi dung toi da 1 gio hang
CREATE TABLE dbo.GioHang (
    MaGio          INT IDENTITY(1,1) NOT NULL,
    MaNguoiDung    INT NOT NULL,
    NgayCapNhat    DATETIME2(0) NOT NULL CONSTRAINT DF_GioHang_NgayCapNhat DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_GioHang PRIMARY KEY (MaGio),
    CONSTRAINT UQ_GioHang_MaNguoiDung UNIQUE (MaNguoiDung),
    CONSTRAINT FK_GioHang_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung)
);
GO

-- 9. Chi tiet gio hang
CREATE TABLE dbo.CTGioHang (
    MaCTGio        INT IDENTITY(1,1) NOT NULL,
    MaGio          INT NOT NULL,
    MaBienThe      INT NOT NULL,
    SoLuong        INT NOT NULL,
    CONSTRAINT PK_CTGioHang PRIMARY KEY (MaCTGio),
    CONSTRAINT UQ_CTGioHang_Gio_BienThe UNIQUE (MaGio, MaBienThe),
    CONSTRAINT FK_CTGioHang_GioHang FOREIGN KEY (MaGio) REFERENCES dbo.GioHang(MaGio),
    CONSTRAINT FK_CTGioHang_BienThe FOREIGN KEY (MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe),
    CONSTRAINT CK_CTGioHang_SoLuong CHECK (SoLuong > 0)
);
GO

-- 10. Don hang
CREATE TABLE dbo.DonHang (
    MaDon          INT IDENTITY(1,1) NOT NULL,
    MaNguoiDung    INT NOT NULL,
    NgayDat        DATETIME2(0) NOT NULL CONSTRAINT DF_DonHang_NgayDat DEFAULT (SYSDATETIME()),
    TrangThai      NVARCHAR(40) NOT NULL CONSTRAINT DF_DonHang_TrangThai DEFAULT (N'Chờ xác nhận'),
    TenNguoiNhan   NVARCHAR(150) NOT NULL,
    SDTNhan        VARCHAR(20) NOT NULL,
    DiaChiGiao     NVARCHAR(500) NOT NULL,
    TienHang       DECIMAL(18,2) NOT NULL CONSTRAINT DF_DonHang_TienHang DEFAULT (0),
    PhiGiao        DECIMAL(18,2) NOT NULL CONSTRAINT DF_DonHang_PhiGiao DEFAULT (0),
    GiamGia        DECIMAL(18,2) NOT NULL CONSTRAINT DF_DonHang_GiamGia DEFAULT (0),
    TongThanhToan  DECIMAL(18,2) NOT NULL CONSTRAINT DF_DonHang_Tong DEFAULT (0),
    CONSTRAINT PK_DonHang PRIMARY KEY (MaDon),
    CONSTRAINT FK_DonHang_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT CK_DonHang_Tien CHECK (TienHang >= 0 AND PhiGiao >= 0 AND GiamGia >= 0 AND TongThanhToan >= 0),
    CONSTRAINT CK_DonHang_Tong CHECK (TongThanhToan = TienHang + PhiGiao - GiamGia)
);
GO

-- 11. Chi tiet don hang - luu snapshot khi dat
CREATE TABLE dbo.CTDonHang (
    MaCTDon             INT IDENTITY(1,1) NOT NULL,
    MaDon               INT NOT NULL,
    MaBienThe           INT NOT NULL,
    TenSanPhamSnapshot  NVARCHAR(250) NOT NULL,
    CauHinhSnapshot     NVARCHAR(500) NOT NULL,
    SKUSnapshot         VARCHAR(80) NOT NULL,
    GiaBanSnapshot      DECIMAL(18,2) NOT NULL,
    SoLuong             INT NOT NULL,
    ThanhTien           DECIMAL(18,2) NOT NULL,
    CONSTRAINT PK_CTDonHang PRIMARY KEY (MaCTDon),
    CONSTRAINT FK_CTDonHang_DonHang FOREIGN KEY (MaDon) REFERENCES dbo.DonHang(MaDon),
    CONSTRAINT FK_CTDonHang_BienThe FOREIGN KEY (MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe),
    CONSTRAINT CK_CTDonHang_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT CK_CTDonHang_Gia CHECK (GiaBanSnapshot >= 0 AND ThanhTien >= 0),
    CONSTRAINT CK_CTDonHang_ThanhTien CHECK (ThanhTien = GiaBanSnapshot * SoLuong)
);
GO

-- 12. Thanh toan: mot don co the co nhieu lan thu thanh toan
CREATE TABLE dbo.ThanhToan (
    MaThanhToan       INT IDENTITY(1,1) NOT NULL,
    MaDon             INT NOT NULL,
    PhuongThuc        NVARCHAR(50) NOT NULL,
    SoTien            DECIMAL(18,2) NOT NULL,
    TrangThai         NVARCHAR(40) NOT NULL CONSTRAINT DF_ThanhToan_TrangThai DEFAULT (N'Chờ thanh toán'),
    NgayThanhToan     DATETIME2(0) NULL,
    MaGiaoDichNgoai   VARCHAR(150) NULL,
    CONSTRAINT PK_ThanhToan PRIMARY KEY (MaThanhToan),
    CONSTRAINT FK_ThanhToan_DonHang FOREIGN KEY (MaDon) REFERENCES dbo.DonHang(MaDon),
    CONSTRAINT CK_ThanhToan_SoTien CHECK (SoTien >= 0)
);
GO

-- 13. Giao hang: moi don toi da 1 ban ghi giao hang
CREATE TABLE dbo.GiaoHang (
    MaGiaoHang       INT IDENTITY(1,1) NOT NULL,
    MaDon            INT NOT NULL,
    TrangThaiGiao    NVARCHAR(40) NOT NULL CONSTRAINT DF_GiaoHang_TrangThai DEFAULT (N'Chờ giao'),
    DonViGiao        NVARCHAR(150) NULL,
    MaVanDon         VARCHAR(100) NULL,
    NgayGiaoDuKien   DATETIME2(0) NULL,
    NgayGiaoThucTe   DATETIME2(0) NULL,
    CONSTRAINT PK_GiaoHang PRIMARY KEY (MaGiaoHang),
    CONSTRAINT UQ_GiaoHang_MaDon UNIQUE (MaDon),
    CONSTRAINT FK_GiaoHang_DonHang FOREIGN KEY (MaDon) REFERENCES dbo.DonHang(MaDon)
);
GO

-- 14. Lich su trang thai don - MaNguoiDung theo ERD moi
CREATE TABLE dbo.LichSuTrangThaiDon (
    MaLichSu        INT IDENTITY(1,1) NOT NULL,
    MaDon           INT NOT NULL,
    MaNguoiDung     INT NULL, -- NULL neu he thong tu dong thay doi
    TrangThaiCu     NVARCHAR(40) NULL,
    TrangThaiMoi    NVARCHAR(40) NOT NULL,
    ThoiDiem        DATETIME2(0) NOT NULL CONSTRAINT DF_LichSuTrangThaiDon_ThoiDiem DEFAULT (SYSDATETIME()),
    CONSTRAINT PK_LichSuTrangThaiDon PRIMARY KEY (MaLichSu),
    CONSTRAINT FK_LichSu_DonHang FOREIGN KEY (MaDon) REFERENCES dbo.DonHang(MaDon),
    CONSTRAINT FK_LichSu_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung)
);
GO

-- 15. Phieu nhap kho
CREATE TABLE dbo.PhieuNhap (
    MaPhieuNhap    INT IDENTITY(1,1) NOT NULL,
    MaNguoiDung    INT NOT NULL,
    MaNCC          INT NOT NULL,
    NgayNhap       DATETIME2(0) NOT NULL CONSTRAINT DF_PhieuNhap_NgayNhap DEFAULT (SYSDATETIME()),
    TrangThai      NVARCHAR(40) NOT NULL CONSTRAINT DF_PhieuNhap_TrangThai DEFAULT (N'Nháp'),
    CONSTRAINT PK_PhieuNhap PRIMARY KEY (MaPhieuNhap),
    CONSTRAINT FK_PhieuNhap_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT FK_PhieuNhap_NhaCungCap FOREIGN KEY (MaNCC) REFERENCES dbo.NhaCungCap(MaNCC)
);
GO

-- 16. Chi tiet phieu nhap kho
CREATE TABLE dbo.CTPhieuNhap (
    MaCTNhap        INT IDENTITY(1,1) NOT NULL,
    MaPhieuNhap     INT NOT NULL,
    MaBienThe       INT NOT NULL,
    SoLuong         INT NOT NULL,
    DonGiaNhap      DECIMAL(18,2) NOT NULL,
    CONSTRAINT PK_CTPhieuNhap PRIMARY KEY (MaCTNhap),
    CONSTRAINT UQ_CTPhieuNhap_Phieu_BienThe UNIQUE (MaPhieuNhap, MaBienThe),
    CONSTRAINT FK_CTPhieuNhap_PhieuNhap FOREIGN KEY (MaPhieuNhap) REFERENCES dbo.PhieuNhap(MaPhieuNhap),
    CONSTRAINT FK_CTPhieuNhap_BienThe FOREIGN KEY (MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe),
    CONSTRAINT CK_CTPhieuNhap_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT CK_CTPhieuNhap_DonGia CHECK (DonGiaNhap >= 0)
);
GO

-- 17. Ton kho - theo tung SKU (ERD moi khong co SoLuongGiuCho)
CREATE TABLE dbo.TonKho (
    MaTonKho        INT IDENTITY(1,1) NOT NULL,
    MaBienThe       INT NOT NULL,
    SoLuongTon      INT NOT NULL CONSTRAINT DF_TonKho_SoLuongTon DEFAULT (0),
    MucCanhBao      INT NOT NULL CONSTRAINT DF_TonKho_MucCanhBao DEFAULT (5),
    CONSTRAINT PK_TonKho PRIMARY KEY (MaTonKho),
    CONSTRAINT UQ_TonKho_MaBienThe UNIQUE (MaBienThe),
    CONSTRAINT FK_TonKho_BienThe FOREIGN KEY (MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe),
    CONSTRAINT CK_TonKho_SoLuongTon CHECK (SoLuongTon >= 0),
    CONSTRAINT CK_TonKho_MucCanhBao CHECK (MucCanhBao >= 0)
);
GO

-- 18. Danh gia san pham
CREATE TABLE dbo.DanhGia (
    MaDanhGia        INT IDENTITY(1,1) NOT NULL,
    MaNguoiDung      INT NOT NULL,
    MaCTDon          INT NOT NULL,
    SoSao            TINYINT NOT NULL,
    NoiDung          NVARCHAR(2000) NULL,
    NgayDanhGia      DATETIME2(0) NOT NULL CONSTRAINT DF_DanhGia_Ngay DEFAULT (SYSDATETIME()),
    TrangThaiDuyet   NVARCHAR(30) NOT NULL CONSTRAINT DF_DanhGia_Duyet DEFAULT (N'Chờ duyệt'),
    CONSTRAINT PK_DanhGia PRIMARY KEY (MaDanhGia),
    CONSTRAINT UQ_DanhGia_NguoiDung_CTDon UNIQUE (MaNguoiDung, MaCTDon),
    CONSTRAINT FK_DanhGia_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT FK_DanhGia_CTDonHang FOREIGN KEY (MaCTDon) REFERENCES dbo.CTDonHang(MaCTDon),
    CONSTRAINT CK_DanhGia_SoSao CHECK (SoSao BETWEEN 1 AND 5)
);
GO

-- 19. Giao dich kho (nhap/xuat/hoan/ dieu chinh)
CREATE TABLE dbo.GiaoDichKho (
    MaGiaoDich       INT IDENTITY(1,1) NOT NULL,
    MaNguoiDung      INT NULL, -- co the NULL neu do he thong tu dong ghi
    MaCTDon          INT NULL,
    MaCTNhap         INT NULL,
    MaBienThe        INT NOT NULL,
    LoaiGiaoDich     NVARCHAR(40) NOT NULL,
    SoLuongThayDoi   INT NOT NULL, -- duong khi tang kho, am khi giam kho
    NgayGiaoDich     DATETIME2(0) NOT NULL CONSTRAINT DF_GiaoDichKho_Ngay DEFAULT (SYSDATETIME()),
    GhiChu           NVARCHAR(500) NULL,
    CONSTRAINT PK_GiaoDichKho PRIMARY KEY (MaGiaoDich),
    CONSTRAINT FK_GiaoDichKho_NguoiDung FOREIGN KEY (MaNguoiDung) REFERENCES dbo.NguoiDung(MaNguoiDung),
    CONSTRAINT FK_GiaoDichKho_CTDonHang FOREIGN KEY (MaCTDon) REFERENCES dbo.CTDonHang(MaCTDon),
    CONSTRAINT FK_GiaoDichKho_CTPhieuNhap FOREIGN KEY (MaCTNhap) REFERENCES dbo.CTPhieuNhap(MaCTNhap),
    CONSTRAINT FK_GiaoDichKho_BienThe FOREIGN KEY (MaBienThe) REFERENCES dbo.BienTheSanPham(MaBienThe),
    CONSTRAINT CK_GiaoDichKho_ThayDoi CHECK (SoLuongThayDoi <> 0),
    CONSTRAINT CK_GiaoDichKho_Nguon CHECK (MaCTDon IS NULL OR MaCTNhap IS NULL)
);
GO

-- Index ho tro tra cuu va join theo khoa ngoai
CREATE INDEX IX_SanPham_MaDanhMuc ON dbo.SanPham(MaDanhMuc);
CREATE INDEX IX_BienThe_MaSanPham ON dbo.BienTheSanPham(MaSanPham);
CREATE INDEX IX_AnhSanPham_MaSanPham ON dbo.AnhSanPham(MaSanPham);
CREATE INDEX IX_CTGioHang_MaBienThe ON dbo.CTGioHang(MaBienThe);
CREATE INDEX IX_DonHang_MaNguoiDung_NgayDat ON dbo.DonHang(MaNguoiDung, NgayDat DESC);
CREATE INDEX IX_CTDonHang_MaDon ON dbo.CTDonHang(MaDon);
CREATE INDEX IX_ThanhToan_MaDon ON dbo.ThanhToan(MaDon);
CREATE INDEX IX_LichSu_MaDon_ThoiDiem ON dbo.LichSuTrangThaiDon(MaDon, ThoiDiem DESC);
CREATE INDEX IX_PhieuNhap_MaNCC ON dbo.PhieuNhap(MaNCC);
CREATE INDEX IX_CTPhieuNhap_MaPhieuNhap ON dbo.CTPhieuNhap(MaPhieuNhap);
CREATE INDEX IX_DanhGia_MaCTDon ON dbo.DanhGia(MaCTDon);
CREATE INDEX IX_GiaoDichKho_SKU_Ngay ON dbo.GiaoDichKho(MaBienThe, NgayGiaoDich DESC);
GO

-- Du lieu khoi tao cho 3 vai tro (thuc hien tren database moi)
INSERT INTO dbo.VaiTro (TenVaiTro)
SELECT v.TenVaiTro FROM (VALUES (N'Khách hàng'), (N'Nhân viên'), (N'Quản lý')) v(TenVaiTro)
WHERE NOT EXISTS (SELECT 1 FROM dbo.VaiTro x WHERE x.TenVaiTro = v.TenVaiTro);
GO

-- Kiem tra cac bang da tao
SELECT t.name AS TenBang FROM sys.tables AS t WHERE t.schema_id = SCHEMA_ID('dbo') ORDER BY t.name;
GO
