USE QuanLyCuaHangNoiThat;
GO

/*
  Du lieu mau cho schema dang dung: cac ma DanhMuc/SanPham/BienThe la VARCHAR.
  Chi chay tren database phat trien/kiem thu.
  Moi lan chay se dat lai ton kho cua 2 SKU mau thanh 5 va 3.
*/
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @MaDanhMuc VARCHAR(50) = 'TEST-CHECKOUT-CAT';
    DECLARE @MaSanPham VARCHAR(50);
    DECLARE @MaBienThe VARCHAR(80);

    IF EXISTS (
        SELECT 1
        FROM dbo.DanhMuc
        WHERE MaDanhMuc = @MaDanhMuc
          AND TenDanhMuc <> N'Dữ liệu mẫu kiểm tra tồn kho'
    )
        THROW 51000, 'MaDanhMuc TEST-CHECKOUT-CAT da duoc su dung.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.DanhMuc
        WHERE MaDanhMuc = @MaDanhMuc
    )
    BEGIN
        INSERT INTO dbo.DanhMuc (MaDanhMuc, TenDanhMuc, MoTa)
        VALUES (
            @MaDanhMuc,
            N'Dữ liệu mẫu kiểm tra tồn kho',
            N'Danh mục dùng cho dữ liệu thử luồng thanh toán'
        );
    END;

    IF EXISTS (
        SELECT 1
        FROM dbo.BienTheSanPham AS bt
        INNER JOIN dbo.SanPham AS sp ON sp.MaSanPham = bt.MaSanPham
        WHERE bt.SKU = 'LUNA-LINEN-KEM-220'
          AND sp.MaDanhMuc <> @MaDanhMuc
    )
        THROW 51001, 'SKU LUNA-LINEN-KEM-220 da thuoc du lieu khac.', 1;

    SELECT @MaBienThe = MaBienThe, @MaSanPham = MaSanPham
    FROM dbo.BienTheSanPham
    WHERE SKU = 'LUNA-LINEN-KEM-220';

    IF @MaBienThe IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.SanPham WHERE MaSanPham = 'TEST-LUNA-CHECKOUT')
            THROW 51002, 'MaSanPham TEST-LUNA-CHECKOUT da duoc su dung.', 1;
        IF EXISTS (SELECT 1 FROM dbo.BienTheSanPham WHERE MaBienThe = 'TEST-VAR-LUNA')
            THROW 51003, 'MaBienThe TEST-VAR-LUNA da duoc su dung.', 1;

        INSERT INTO dbo.SanPham (MaSanPham, MaDanhMuc, TenSanPham, MoTa, TrangThai)
        VALUES (
            'TEST-LUNA-CHECKOUT',
            @MaDanhMuc,
            N'Sofa LUNA 3 chỗ',
            N'Sản phẩm mẫu dùng để kiểm tra tồn kho khi thanh toán',
            N'Đang bán'
        );

        INSERT INTO dbo.BienTheSanPham
            (MaBienThe, MaSanPham, SKU, MauSac, ChatLieu, KichThuoc, GiaBan, TrangThai)
        VALUES (
            'TEST-VAR-LUNA',
            'TEST-LUNA-CHECKOUT',
            'LUNA-LINEN-KEM-220',
            N'Kem',
            N'Vải Linen',
            N'220 × 90 × 80 cm',
            18900000,
            N'Đang bán'
        );
        SET @MaBienThe = 'TEST-VAR-LUNA';
        SET @MaSanPham = 'TEST-LUNA-CHECKOUT';
    END;

    UPDATE dbo.SanPham
    SET TrangThai = N'Đang bán'
    WHERE MaSanPham = @MaSanPham;

    UPDATE dbo.BienTheSanPham
    SET TrangThai = N'Đang bán'
    WHERE MaBienThe = @MaBienThe;

    IF EXISTS (SELECT 1 FROM dbo.TonKho WHERE MaBienThe = @MaBienThe)
        UPDATE dbo.TonKho SET SoLuongTon = 5 WHERE MaBienThe = @MaBienThe;
    ELSE
        INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon)
        VALUES (@MaBienThe, 5);

    SET @MaSanPham = NULL;
    SET @MaBienThe = NULL;

    IF EXISTS (
        SELECT 1
        FROM dbo.BienTheSanPham AS bt
        INNER JOIN dbo.SanPham AS sp ON sp.MaSanPham = bt.MaSanPham
        WHERE bt.SKU = 'NORDIC-OAK-100'
          AND sp.MaDanhMuc <> @MaDanhMuc
    )
        THROW 51004, 'SKU NORDIC-OAK-100 da thuoc du lieu khac.', 1;

    SELECT @MaBienThe = MaBienThe, @MaSanPham = MaSanPham
    FROM dbo.BienTheSanPham
    WHERE SKU = 'NORDIC-OAK-100';

    IF @MaBienThe IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM dbo.SanPham WHERE MaSanPham = 'TEST-NORDIC-CHECKOUT')
            THROW 51005, 'MaSanPham TEST-NORDIC-CHECKOUT da duoc su dung.', 1;
        IF EXISTS (SELECT 1 FROM dbo.BienTheSanPham WHERE MaBienThe = 'TEST-VAR-NORDIC')
            THROW 51006, 'MaBienThe TEST-VAR-NORDIC da duoc su dung.', 1;

        INSERT INTO dbo.SanPham (MaSanPham, MaDanhMuc, TenSanPham, MoTa, TrangThai)
        VALUES (
            'TEST-NORDIC-CHECKOUT',
            @MaDanhMuc,
            N'Bàn trà NORDIC',
            N'Sản phẩm mẫu dùng để kiểm tra tồn kho khi thanh toán',
            N'Đang bán'
        );

        INSERT INTO dbo.BienTheSanPham
            (MaBienThe, MaSanPham, SKU, MauSac, ChatLieu, KichThuoc, GiaBan, TrangThai)
        VALUES (
            'TEST-VAR-NORDIC',
            'TEST-NORDIC-CHECKOUT',
            'NORDIC-OAK-100',
            N'Tự nhiên',
            N'Gỗ sồi',
            N'100 × 60 × 40 cm',
            4200000,
            N'Đang bán'
        );
        SET @MaBienThe = 'TEST-VAR-NORDIC';
        SET @MaSanPham = 'TEST-NORDIC-CHECKOUT';
    END;

    UPDATE dbo.SanPham
    SET TrangThai = N'Đang bán'
    WHERE MaSanPham = @MaSanPham;

    UPDATE dbo.BienTheSanPham
    SET TrangThai = N'Đang bán'
    WHERE MaBienThe = @MaBienThe;

    IF EXISTS (SELECT 1 FROM dbo.TonKho WHERE MaBienThe = @MaBienThe)
        UPDATE dbo.TonKho SET SoLuongTon = 3 WHERE MaBienThe = @MaBienThe;
    ELSE
        INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon)
        VALUES (@MaBienThe, 3);

    COMMIT TRANSACTION;

    SELECT
        sp.TenSanPham,
        bt.SKU,
        bt.TrangThai,
        tk.SoLuongTon
    FROM dbo.BienTheSanPham AS bt
    INNER JOIN dbo.SanPham AS sp ON sp.MaSanPham = bt.MaSanPham
    INNER JOIN dbo.TonKho AS tk ON tk.MaBienThe = bt.MaBienThe
    WHERE bt.SKU IN ('LUNA-LINEN-KEM-220', 'NORDIC-OAK-100')
    ORDER BY bt.SKU;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
