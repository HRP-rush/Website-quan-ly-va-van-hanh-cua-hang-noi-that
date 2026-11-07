USE QuanLyCuaHangNoiThat;
GO

SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @Email VARCHAR(254) = 'order-test@mocan.local';
    DECLARE @MaVaiTro INT;

    SELECT @MaVaiTro = MaVaiTro
    FROM dbo.VaiTro WITH (UPDLOCK, HOLDLOCK)
    WHERE TenVaiTro = N'Khách hàng';

    IF @MaVaiTro IS NULL
        THROW 51100, 'Khong tim thay vai tro Khach hang.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.NguoiDung WITH (UPDLOCK, HOLDLOCK)
        WHERE Email = @Email
    )
    BEGIN
        INSERT INTO dbo.NguoiDung (MaVaiTro, HoTen, Email, MatKhauHash)
        VALUES (
            @MaVaiTro,
            N'Khách hàng kiểm thử đặt hàng',
            @Email,
            CONVERT(VARCHAR(64), HASHBYTES('SHA2_256', 'ORDER-TEST-ONLY-NOT-A-LOGIN'), 2)
        );
    END;

    COMMIT TRANSACTION;

    SELECT MaNguoiDung, Email, MaVaiTro
    FROM dbo.NguoiDung
    WHERE Email = @Email;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
