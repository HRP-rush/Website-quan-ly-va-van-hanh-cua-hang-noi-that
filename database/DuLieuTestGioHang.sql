USE QuanLyCuaHangNoiThat;
GO

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @MaVaiTro INT;
    DECLARE @MaNguoiDung INT;
    DECLARE @MaDanhMuc INT;
    DECLARE @MaSanPhamSofa INT;
    DECLARE @MaSanPhamBan INT;
    DECLARE @MaBienTheSofa INT;
    DECLARE @MaBienTheBan INT;
    DECLARE @MaGio INT;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.VaiTro WHERE TenVaiTro = N'Khách hàng'
    )
    BEGIN
        INSERT INTO dbo.VaiTro (TenVaiTro) VALUES (N'Khách hàng');
    END;
    SELECT @MaVaiTro = MaVaiTro
    FROM dbo.VaiTro
    WHERE TenVaiTro = N'Khách hàng';

    IF NOT EXISTS (
        SELECT 1 FROM dbo.NguoiDung WHERE Email = 'postman.giohang@example.com'
    )
    BEGIN
        INSERT INTO dbo.NguoiDung (MaVaiTro, Email, MatKhauHash, SoDienThoai, DiaChi)
        VALUES (
            @MaVaiTro,
            'postman.giohang@example.com',
            'HASH_TEST_KHONG_DUNG_DANG_NHAP',
            '0900000000',
            N'Địa chỉ thử nghiệm'
        );
    END;
    SELECT @MaNguoiDung = MaNguoiDung
    FROM dbo.NguoiDung
    WHERE Email = 'postman.giohang@example.com';

    IF NOT EXISTS (
        SELECT 1 FROM dbo.DanhMuc WHERE TenDanhMuc = N'Sản phẩm kiểm thử Postman'
    )
    BEGIN
        IF COLUMNPROPERTY(OBJECT_ID(N'dbo.DanhMuc'), N'MaDanhMuc', 'IsIdentity') = 1
        BEGIN
            INSERT INTO dbo.DanhMuc (TenDanhMuc, MoTa)
            VALUES (N'Sản phẩm kiểm thử Postman', N'Dữ liệu mẫu để thử API giỏ hàng');
        END
        ELSE
        BEGIN
            SELECT @MaDanhMuc = ISNULL(MAX(MaDanhMuc), 0) + 1
            FROM dbo.DanhMuc WITH (UPDLOCK, HOLDLOCK);

            INSERT INTO dbo.DanhMuc (MaDanhMuc, TenDanhMuc, MoTa)
            VALUES (
                @MaDanhMuc,
                N'Sản phẩm kiểm thử Postman',
                N'Dữ liệu mẫu để thử API giỏ hàng'
            );
        END;
    END;
    SELECT @MaDanhMuc = MaDanhMuc
    FROM dbo.DanhMuc
    WHERE TenDanhMuc = N'Sản phẩm kiểm thử Postman';

    IF NOT EXISTS (
        SELECT 1 FROM dbo.BienTheSanPham WHERE SKU = 'TEST-CART-SOFA-001'
    )
    BEGIN
        IF COLUMNPROPERTY(OBJECT_ID(N'dbo.SanPham'), N'MaSanPham', 'IsIdentity') = 1
        BEGIN
            INSERT INTO dbo.SanPham (MaDanhMuc, TenSanPham, MoTa, TrangThai)
            VALUES (@MaDanhMuc, N'Sofa kiểm thử giỏ hàng', N'Dữ liệu mẫu Postman', N'Đang bán');
            SET @MaSanPhamSofa = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            SELECT @MaSanPhamSofa = ISNULL(MAX(MaSanPham), 0) + 1
            FROM dbo.SanPham WITH (UPDLOCK, HOLDLOCK);

            INSERT INTO dbo.SanPham (MaSanPham, MaDanhMuc, TenSanPham, MoTa, TrangThai)
            VALUES (@MaSanPhamSofa, @MaDanhMuc, N'Sofa kiểm thử giỏ hàng', N'Dữ liệu mẫu Postman', N'Đang bán');
        END;

        IF COLUMNPROPERTY(OBJECT_ID(N'dbo.BienTheSanPham'), N'MaBienThe', 'IsIdentity') = 1
        BEGIN
            INSERT INTO dbo.BienTheSanPham
                (MaSanPham, SKU, MauSac, ChatLieu, KichThuoc, GiaBan, TrangThai)
            VALUES
                (@MaSanPhamSofa, 'TEST-CART-SOFA-001', N'Kem', N'Vải', N'220 × 90 × 80 cm', 18900000, N'Đang bán');
        END
        ELSE
        BEGIN
            SELECT @MaBienTheSofa = ISNULL(MAX(MaBienThe), 0) + 1
            FROM dbo.BienTheSanPham WITH (UPDLOCK, HOLDLOCK);

            INSERT INTO dbo.BienTheSanPham
                (MaBienThe, MaSanPham, SKU, MauSac, ChatLieu, KichThuoc, GiaBan, TrangThai)
            VALUES
                (@MaBienTheSofa, @MaSanPhamSofa, 'TEST-CART-SOFA-001', N'Kem', N'Vải', N'220 × 90 × 80 cm', 18900000, N'Đang bán');
        END;
    END;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.BienTheSanPham WHERE SKU = 'TEST-CART-BAN-001'
    )
    BEGIN
        IF COLUMNPROPERTY(OBJECT_ID(N'dbo.SanPham'), N'MaSanPham', 'IsIdentity') = 1
        BEGIN
            INSERT INTO dbo.SanPham (MaDanhMuc, TenSanPham, MoTa, TrangThai)
            VALUES (@MaDanhMuc, N'Bàn kiểm thử giỏ hàng', N'Dữ liệu mẫu Postman', N'Đang bán');
            SET @MaSanPhamBan = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            SELECT @MaSanPhamBan = ISNULL(MAX(MaSanPham), 0) + 1
            FROM dbo.SanPham WITH (UPDLOCK, HOLDLOCK);

            INSERT INTO dbo.SanPham (MaSanPham, MaDanhMuc, TenSanPham, MoTa, TrangThai)
            VALUES (@MaSanPhamBan, @MaDanhMuc, N'Bàn kiểm thử giỏ hàng', N'Dữ liệu mẫu Postman', N'Đang bán');
        END;

        IF COLUMNPROPERTY(OBJECT_ID(N'dbo.BienTheSanPham'), N'MaBienThe', 'IsIdentity') = 1
        BEGIN
            INSERT INTO dbo.BienTheSanPham
                (MaSanPham, SKU, MauSac, ChatLieu, KichThuoc, GiaBan, TrangThai)
            VALUES
                (@MaSanPhamBan, 'TEST-CART-BAN-001', N'Tự nhiên', N'Gỗ sồi', N'100 × 60 × 40 cm', 4200000, N'Đang bán');
        END
        ELSE
        BEGIN
            SELECT @MaBienTheBan = ISNULL(MAX(MaBienThe), 0) + 1
            FROM dbo.BienTheSanPham WITH (UPDLOCK, HOLDLOCK);

            INSERT INTO dbo.BienTheSanPham
                (MaBienThe, MaSanPham, SKU, MauSac, ChatLieu, KichThuoc, GiaBan, TrangThai)
            VALUES
                (@MaBienTheBan, @MaSanPhamBan, 'TEST-CART-BAN-001', N'Tự nhiên', N'Gỗ sồi', N'100 × 60 × 40 cm', 4200000, N'Đang bán');
        END;
    END;

    SELECT @MaBienTheSofa = MaBienThe
    FROM dbo.BienTheSanPham
    WHERE SKU = 'TEST-CART-SOFA-001';

    SELECT @MaBienTheBan = MaBienThe
    FROM dbo.BienTheSanPham
    WHERE SKU = 'TEST-CART-BAN-001';

    IF EXISTS (SELECT 1 FROM dbo.TonKho WHERE MaBienThe = @MaBienTheSofa)
        UPDATE dbo.TonKho SET SoLuongTon = 10 WHERE MaBienThe = @MaBienTheSofa;
    ELSE
        INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon) VALUES (@MaBienTheSofa, 10);

    IF EXISTS (SELECT 1 FROM dbo.TonKho WHERE MaBienThe = @MaBienTheBan)
        UPDATE dbo.TonKho SET SoLuongTon = 5 WHERE MaBienThe = @MaBienTheBan;
    ELSE
        INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon) VALUES (@MaBienTheBan, 5);

    IF NOT EXISTS (SELECT 1 FROM dbo.GioHang WHERE MaNguoiDung = @MaNguoiDung)
        INSERT INTO dbo.GioHang (MaNguoiDung) VALUES (@MaNguoiDung);

    SELECT @MaGio = MaGio
    FROM dbo.GioHang
    WHERE MaNguoiDung = @MaNguoiDung;

    IF EXISTS (
        SELECT 1 FROM dbo.CTGioHang WHERE MaGio = @MaGio AND MaBienThe = @MaBienTheSofa
    )
        UPDATE dbo.CTGioHang SET SoLuong = 1
        WHERE MaGio = @MaGio AND MaBienThe = @MaBienTheSofa;
    ELSE
        INSERT INTO dbo.CTGioHang (MaGio, MaBienThe, SoLuong)
        VALUES (@MaGio, @MaBienTheSofa, 1);

    IF EXISTS (
        SELECT 1 FROM dbo.CTGioHang WHERE MaGio = @MaGio AND MaBienThe = @MaBienTheBan
    )
        UPDATE dbo.CTGioHang SET SoLuong = 1
        WHERE MaGio = @MaGio AND MaBienThe = @MaBienTheBan;
    ELSE
        INSERT INTO dbo.CTGioHang (MaGio, MaBienThe, SoLuong)
        VALUES (@MaGio, @MaBienTheBan, 1);

    COMMIT TRANSACTION;

    SELECT
        @MaNguoiDung AS MaNguoiDung,
        @MaGio AS MaGio,
        @MaBienTheSofa AS MaBienTheSofa,
        @MaBienTheBan AS MaBienTheBan;

    SELECT
        ct.MaCTGio,
        bt.SKU,
        sp.TenSanPham,
        ct.SoLuong,
        tk.SoLuongTon
    FROM dbo.CTGioHang AS ct
    INNER JOIN dbo.BienTheSanPham AS bt ON bt.MaBienThe = ct.MaBienThe
    INNER JOIN dbo.SanPham AS sp ON sp.MaSanPham = bt.MaSanPham
    INNER JOIN dbo.TonKho AS tk ON tk.MaBienThe = bt.MaBienThe
    WHERE ct.MaGio = @MaGio;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
