const { sql, getPool } = require("../config/db");
const { DON_DANG_GIU_HANG } = require("../config/donHang");

async function layTongQuan(req, res) {
  const raw = req.query.soNgay ?? "7";

  if (typeof raw !== "string" || !["1", "7", "30"].includes(raw)) {
    return res.status(400).json({
      success: false,
      message: "Chọn Hôm nay, 7 ngày hoặc 30 ngày."
    });
  }

  try {
    const pool = await getPool();
    const request = pool.request()
      .input("soNgay", sql.Int, Number(raw));

    DON_DANG_GIU_HANG.forEach((state, i) => {
      request.input(`giu${i}`, sql.NVarChar(40), state);
    });

    const giu = DON_DANG_GIU_HANG
      .map((_, i) => `@giu${i}`)
      .join(",");

    const result = await request.query(`
      SET NOCOUNT ON;

      DECLARE @now DATETIME2(0)=SYSDATETIME();
      DECLARE @den DATE=CONVERT(DATE,@now);
      DECLARE @tu DATE=DATEADD(DAY,1-@soNgay,@den);
      DECLARE @sau DATE=DATEADD(DAY,1,@den);

      -- Một dòng mỗi đơn, tránh cộng trùng tiền khi đơn có nhiều sản phẩm.
      DECLARE @don TABLE(
        MaDon INT PRIMARY KEY,
        MaNguoiDung INT,
        NgayDat DATETIME2(0),
        TrangThai NVARCHAR(40),
        TienHang DECIMAL(18,2),
        GiamGia DECIMAL(18,2),
        TongThanhToan DECIMAL(18,2)
      );

      INSERT @don
      SELECT MaDon,MaNguoiDung,NgayDat,TrangThai,
             TienHang,GiamGia,TongThanhToan
      FROM dbo.DonHang
      WHERE NgayDat>=@tu AND NgayDat<@sau;

      -- Tồn kho hiện tại; cùng cách tính khả dụng với trang Kho hàng.
      DECLARE @kho TABLE(
        MaBienThe NVARCHAR(80),
        SKU VARCHAR(80),
        TenSanPham NVARCHAR(250),
        KhaDung BIGINT,
        MucCanhBao INT,
        CoTon BIT
      );

      INSERT @kho
      SELECT
        CONVERT(NVARCHAR(80),b.MaBienThe),
        b.SKU,
        sp.TenSanPham,
        CASE
          WHEN COALESCE(t.SoLuongTon,0)-COALESCE(g.DaGiu,0)>0
          THEN COALESCE(t.SoLuongTon,0)-COALESCE(g.DaGiu,0)
          ELSE 0
        END,
        COALESCE(t.MucCanhBao,5),
        CASE WHEN t.MaBienThe IS NULL THEN 0 ELSE 1 END
      FROM dbo.BienTheSanPham b
      JOIN dbo.SanPham sp ON sp.MaSanPham=b.MaSanPham
      LEFT JOIN dbo.TonKho t ON t.MaBienThe=b.MaBienThe
      OUTER APPLY(
        SELECT SUM(CAST(ct.SoLuong AS BIGINT)) DaGiu
        FROM dbo.CTDonHang ct
        JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon
        WHERE ct.MaBienThe=b.MaBienThe
          AND dh.TrangThai IN (${giu})
      ) g
      WHERE b.TrangThai=N'Đang bán'
        AND sp.TrangThai=N'Đang bán';

      -- 0. Khoảng thời gian.
      SELECT
        CONVERT(CHAR(10),@tu,23) TuNgay,
        CONVERT(CHAR(10),@den,23) DenNgay,
        CONVERT(VARCHAR(19),@now,126) CapNhat;

      -- 1. Chỉ số đơn hàng trong kỳ.
      SELECT
        COALESCE(SUM(
          CASE WHEN TrangThai=N'Hoàn tất'
          THEN TienHang-GiamGia ELSE 0 END
        ),0) DoanhThu,
        COUNT(*) TongDon,
        COALESCE(SUM(
          CASE WHEN TrangThai=N'Hoàn tất' THEN 1 ELSE 0 END
        ),0) HoanTat,
        COALESCE(SUM(
          CASE WHEN TrangThai=N'Đã hủy' THEN 1 ELSE 0 END
        ),0) DaHuy,
        (
          SELECT COALESCE(SUM(CAST(ct.SoLuong AS BIGINT)),0)
          FROM dbo.CTDonHang ct
          JOIN @don d ON d.MaDon=ct.MaDon
          WHERE d.TrangThai=N'Hoàn tất'
        ) DaBan
      FROM @don;

      -- 2. Chỉ số tồn kho hiện tại.
      SELECT
        COALESCE(SUM(
          CASE WHEN KhaDung>0 AND KhaDung<=MucCanhBao
          THEN 1 ELSE 0 END
        ),0) SapHet,
        COALESCE(SUM(
          CASE WHEN KhaDung=0 THEN 1 ELSE 0 END
        ),0) HetHang,
        COALESCE(SUM(
          CASE WHEN CoTon=0 THEN 1 ELSE 0 END
        ),0) ChuaCoTon
      FROM @kho;

      -- 3. Doanh thu từng ngày, gồm cả ngày không phát sinh.
      ;WITH ngay AS(
        SELECT @tu Ngay
        UNION ALL
        SELECT DATEADD(DAY,1,Ngay)
        FROM ngay WHERE Ngay<@den
      )
      SELECT
        CONVERT(CHAR(10),n.Ngay,23) Ngay,
        COALESCE(SUM(
          CASE WHEN d.TrangThai=N'Hoàn tất'
          THEN d.TienHang-d.GiamGia ELSE 0 END
        ),0) DoanhThu
      FROM ngay n
      LEFT JOIN @don d
        ON d.NgayDat>=n.Ngay
       AND d.NgayDat<DATEADD(DAY,1,n.Ngay)
      GROUP BY n.Ngay
      ORDER BY n.Ngay
      OPTION(MAXRECURSION 30);

      -- 4. Trạng thái các đơn đặt trong kỳ.
      SELECT TrangThai,COUNT(*) SoLuong
      FROM @don
      GROUP BY TrangThai
      ORDER BY TrangThai;

      -- 5. Sản phẩm bán chạy.
      SELECT TOP(5)
        sp.MaSanPham,
        sp.TenSanPham,
        SUM(CAST(ct.SoLuong AS BIGINT)) SoLuong
      FROM dbo.CTDonHang ct
      JOIN @don d ON d.MaDon=ct.MaDon
      JOIN dbo.BienTheSanPham b ON b.MaBienThe=ct.MaBienThe
      JOIN dbo.SanPham sp ON sp.MaSanPham=b.MaSanPham
      WHERE d.TrangThai=N'Hoàn tất'
      GROUP BY sp.MaSanPham,sp.TenSanPham
      ORDER BY SoLuong DESC,sp.MaSanPham;

      -- 6. Tối đa 5 SKU cần bổ sung.
      SELECT TOP(5) *
      FROM @kho
      WHERE KhaDung<=MucCanhBao
      ORDER BY KhaDung,SKU;

      -- 7. Đơn gần đây trong kỳ.
      SELECT TOP(10)
        d.MaDon,
        COALESCE(NULLIF(nd.HoTen,N''),nd.Email) KhachHang,
        CONVERT(VARCHAR(19),d.NgayDat,126) NgayDat,
        d.TongThanhToan,
        d.TrangThai
      FROM @don d
      JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=d.MaNguoiDung
      ORDER BY d.NgayDat DESC,d.MaDon DESC;

      -- 8. Phiếu nhập gần đây trong kỳ.
      SELECT TOP(5)
        pn.MaPhieuNhap,
        CONVERT(VARCHAR(19),pn.NgayNhap,126) NgayNhap,
        ncc.TenNCC,
        pn.TrangThai,
        COALESCE(x.TongTien,0) TongTien
      FROM dbo.PhieuNhap pn
      JOIN dbo.NhaCungCap ncc ON ncc.MaNCC=pn.MaNCC
      OUTER APPLY(
        SELECT SUM(
          CAST(ct.SoLuong AS DECIMAL(18,2))*ct.DonGiaNhap
        ) TongTien
        FROM dbo.CTPhieuNhap ct
        WHERE ct.MaPhieuNhap=pn.MaPhieuNhap
      ) x
      WHERE pn.NgayNhap>=@tu AND pn.NgayNhap<@sau
      ORDER BY pn.NgayNhap DESC,pn.MaPhieuNhap DESC;

      -- 9. Nghiệp vụ hiện tại trên toàn hệ thống.
      SELECT N'don-hang' Nhom,TrangThai,COUNT(*) SoLuong
      FROM dbo.DonHang GROUP BY TrangThai

      UNION ALL
      SELECT N'giao-hang',TrangThaiGiao,COUNT(*)
      FROM dbo.GiaoHang GROUP BY TrangThaiGiao

      UNION ALL
      SELECT N'phieu-nhap',TrangThai,COUNT(*)
      FROM dbo.PhieuNhap GROUP BY TrangThai

      UNION ALL
      SELECT N'thanh-toan',TrangThai,COUNT(*)
      FROM(
        SELECT TrangThai,
          ROW_NUMBER() OVER(
            PARTITION BY MaDon ORDER BY MaThanhToan DESC
          ) rn
        FROM dbo.ThanhToan
      ) tt
      WHERE rn=1
      GROUP BY TrangThai

      UNION ALL
      SELECT N'phan-hoi',dg.TrangThaiDuyet,COUNT(*)
      FROM dbo.DanhGia dg
      JOIN dbo.CTDonHang ct ON ct.MaCTDon=dg.MaCTDon
      JOIN dbo.DonHang dh
        ON dh.MaDon=ct.MaDon
       AND dh.MaNguoiDung=dg.MaNguoiDung
      WHERE dh.TrangThai=N'Hoàn tất'
      GROUP BY dg.TrangThaiDuyet

      UNION ALL
      SELECT N'san-pham',TrangThai,COUNT(*)
      FROM dbo.SanPham GROUP BY TrangThai

      UNION ALL
      SELECT N'khach-hang',nd.TrangThai,COUNT(*)
      FROM dbo.NguoiDung nd
      JOIN dbo.VaiTro vt ON vt.MaVaiTro=nd.MaVaiTro
      WHERE vt.TenVaiTro=N'Khách hàng'
      GROUP BY nd.TrangThai

      UNION ALL
      SELECT N'nhan-vien',
        vt.TenVaiTro+N' · '+nd.TrangThai,
        COUNT(*)
      FROM dbo.NguoiDung nd
      JOIN dbo.VaiTro vt ON vt.MaVaiTro=nd.MaVaiTro
      WHERE vt.TenVaiTro IN(N'Nhân viên',N'Quản lý')
      GROUP BY vt.TenVaiTro,nd.TrangThai;
    `);

    const r = result.recordsets;

    res.set("Cache-Control", "no-store");
    return res.json({
      success: true,
      data: {
        period: r[0][0],
        summary: { ...r[1][0], ...r[2][0] },
        series: r[3],
        states: r[4],
        topProducts: r[5],
        stockAlerts: r[6],
        recentOrders: r[7],
        recentReceipts: r[8],
        operations: r[9]
      }
    });
  } catch (error) {
    console.error("Lỗi tổng quan:", error.message);
    return res.status(500).json({
      success: false,
      message:
        "Không thể tải số liệu tổng quan. Kiểm tra kết nối DB và log backend."
    });
  }
}

module.exports = { layTongQuan };