const { sql, getPool } = require("../config/db");
const { DON_DANG_GIU_HANG } = require("../config/donHang");

const PHI_GIAO = 300000;

function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

function validate(body) {
  const info = body?.thongTinGiaoNhan;

  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuid.test(String(body?.maYeuCau || ""))) {
    return "Mã yêu cầu đặt hàng không hợp lệ. Hãy tải lại trang thanh toán.";
  }

  if (body.phuongThucThanhToan !== "cod") {
    return "Vui lòng chọn thanh toán khi nhận hàng (COD).";
  }

  if (
    !info ||
    typeof info.hoTen !== "string" ||
    info.hoTen.trim().length < 2 ||
    info.hoTen.trim().length > 150
  ) {
    return "Họ tên người nhận cần từ 2 đến 150 ký tự.";
  }

  const phone =
    /^(?:0(?:2\d{8,9}|[35789]\d{8})|\+84(?:2\d{8,9}|[35789]\d{8}))$/;

  if (
    typeof info.soDienThoai !== "string" ||
    !phone.test(info.soDienThoai)
  ) {
    return "Số điện thoại người nhận không hợp lệ.";
  }

  if (
    typeof info.email !== "string" ||
    info.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email.trim())
  ) {
    return "Email người nhận không hợp lệ.";
  }

  if (
    typeof info.diaChiGiao !== "string" ||
    info.diaChiGiao.trim().length < 5 ||
    info.diaChiGiao.trim().length > 500
  ) {
    return "Địa chỉ giao hàng cần từ 5 đến 500 ký tự.";
  }

  if (
    info.ghiChu != null &&
    (
      typeof info.ghiChu !== "string" ||
      info.ghiChu.length > 500
    )
  ) {
    return "Ghi chú tối đa 500 ký tự.";
  }

  if (
    typeof body.tongDuKien !== "number" ||
    !Number.isFinite(body.tongDuKien) ||
    body.tongDuKien < 0 ||
    !Number.isSafeInteger(Math.round(body.tongDuKien * 100))
  ) {
    return "Tổng tiền dự kiến không hợp lệ.";
  }

  return null;
}

async function receipt(tx, id) {
  const head = await new sql.Request(tx)
    .input("id", sql.Int, id)
    .query(`
      SELECT
        MaDon,
        CONVERT(VARCHAR(19), NgayDat, 126) AS NgayDat,
        TrangThai AS TrangThaiDon,
        TenNguoiNhan,
        SDTNhan,
        DiaChiGiao,
        EmailNhan,
        GhiChu,
        TienHang,
        PhiGiao,
        GiamGia,
        TongThanhToan,
        N'Thanh toán khi nhận hàng (COD)'
          AS PhuongThucThanhToan,
        (
          SELECT TOP(1) TrangThai
          FROM dbo.ThanhToan
          WHERE MaDon = dh.MaDon
          ORDER BY MaThanhToan DESC
        ) AS TrangThaiThanhToan
      FROM dbo.DonHang dh
      WHERE MaDon = @id
    `);

  const items = await new sql.Request(tx)
    .input("id", sql.Int, id)
    .query(`
      SELECT
        TenSanPhamSnapshot AS TenSanPham,
        CauHinhSnapshot AS CauHinh,
        SKUSnapshot AS SKU,
        GiaBanSnapshot AS GiaBan,
        SoLuong,
        ThanhTien
      FROM dbo.CTDonHang
      WHERE MaDon = @id
      ORDER BY MaCTDon
    `);

  const row = head.recordset[0];
  const date = row.NgayDat.slice(0, 10).replace(/-/g, "");

  return {
    ...row,
    MaDonHienThi: `MA-${date}-${String(id).padStart(3, "0")}`,
    thongTinGiaoNhan: {
      hoTen: row.TenNguoiNhan,
      soDienThoai: row.SDTNhan,
      email: row.EmailNhan,
      diaChiGiao: row.DiaChiGiao,
      ghiChu: row.GhiChu
    },
    items: items.recordset
  };
}

async function datHang(req, res) {
  const invalid = validate(req.body);

  if (invalid) {
    return res.status(400).json({
      success: false,
      message: invalid
    });
  }

  const {
    thongTinGiaoNhan: info,
    maYeuCau,
    tongDuKien
  } = req.body;

  let tx;
  let started = false;

  try {
    const pool = await getPool();
    tx = new sql.Transaction(pool);

    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    started = true;

    // Gửi lại cùng yêu cầu thì trả đơn cũ,
    // không tạo thêm đơn hoặc xóa giỏ mới.
    const old = await new sql.Request(tx)
      .input("key", sql.UniqueIdentifier, maYeuCau)
      .input("user", sql.Int, req.user.MaNguoiDung)
      .query(`
        SELECT MaDon
        FROM dbo.DonHang WITH (UPDLOCK, HOLDLOCK)
        WHERE MaYeuCau = @key
          AND MaNguoiDung = @user
      `);

    if (old.recordset.length) {
      const data = await receipt(
        tx,
        old.recordset[0].MaDon
      );

      await tx.commit();
      started = false;

      return res.json({
        success: true,
        message: "Đơn hàng đã được ghi nhận trước đó.",
        data
      });
    }

    const request = new sql.Request(tx)
      .input("user", sql.Int, req.user.MaNguoiDung);

    DON_DANG_GIU_HANG.forEach((value, i) => {
      request.input(`state${i}`, sql.NVarChar(40), value);
    });

    const held = DON_DANG_GIU_HANG
      .map((_, i) => `@state${i}`)
      .join(",");

    const cart = await request.query(`
      SELECT
        ct.MaBienThe,
        ct.SoLuong,
        b.SKU,
        b.GiaBan,
        b.TrangThai AS TrangThaiBienThe,
        b.MauSac,
        b.ChatLieu,
        b.KichThuoc,
        sp.TenSanPham,
        sp.TrangThai AS TrangThaiSanPham,
        dm.HienThi,
        ISNULL(t.SoLuongTon, 0)
          - ISNULL(held.DaGiu, 0) AS KhaDung
      FROM dbo.GioHang gh WITH (UPDLOCK, HOLDLOCK)
      INNER JOIN dbo.CTGioHang ct WITH (UPDLOCK, HOLDLOCK)
        ON ct.MaGio = gh.MaGio
      INNER JOIN dbo.BienTheSanPham b
        ON b.MaBienThe = ct.MaBienThe
      INNER JOIN dbo.SanPham sp
        ON sp.MaSanPham = b.MaSanPham
      INNER JOIN dbo.DanhMuc dm
        ON dm.MaDanhMuc = sp.MaDanhMuc
      LEFT JOIN dbo.TonKho t WITH (UPDLOCK, HOLDLOCK)
        ON t.MaBienThe = b.MaBienThe
      OUTER APPLY (
        SELECT SUM(c.SoLuong) AS DaGiu
        FROM dbo.CTDonHang c
        INNER JOIN dbo.DonHang d ON d.MaDon = c.MaDon
        WHERE c.MaBienThe = b.MaBienThe
          AND d.TrangThai IN (${held})
      ) held
      WHERE gh.MaNguoiDung = @user
      ORDER BY b.MaBienThe
    `);

    const items = cart.recordset;

    if (!items.length) {
      throw fail(
        409,
        "Giỏ hàng trống. Nếu bạn vừa đặt hàng, hãy kiểm tra Đơn hàng của tôi."
      );
    }

    for (const item of items) {
      if (
        item.TrangThaiBienThe !== "Đang bán" ||
        item.TrangThaiSanPham !== "Đang bán" ||
        !item.HienThi
      ) {
        throw fail(
          409,
          `Sản phẩm ${item.TenSanPham} không còn được bán.`
        );
      }

      if (
        !Number.isSafeInteger(Number(item.SoLuong)) ||
        Number(item.SoLuong) < 1 ||
        Number(item.SoLuong) > Number(item.KhaDung)
      ) {
        throw fail(
          409,
          `Sản phẩm ${item.TenSanPham} không đủ tồn kho. Vui lòng kiểm tra lại giỏ hàng.`
        );
      }

      if (
        !Number.isFinite(Number(item.GiaBan)) ||
        Number(item.GiaBan) < 0
      ) {
        throw fail(409, "Giá sản phẩm chưa hợp lệ.");
      }
    }

    const cents = items.reduce(
      (sum, item) =>
        sum +
        Math.round(Number(item.GiaBan) * 100) *
        Number(item.SoLuong),
      0
    );

    if (!Number.isSafeInteger(cents + PHI_GIAO * 100)) {
      throw fail(
        409,
        "Giá trị đơn hàng vượt giới hạn xử lý."
      );
    }

    const tienHang = cents / 100;
    const total = tienHang + PHI_GIAO;

    if (
      Math.round(tongDuKien * 100) !==
      Math.round(total * 100)
    ) {
      throw fail(
        409,
        "Giá sản phẩm hoặc giỏ hàng đã thay đổi. Vui lòng tải lại trang và kiểm tra tổng tiền."
      );
    }

    const created = await new sql.Request(tx)
      .input("user", sql.Int, req.user.MaNguoiDung)
      .input("key", sql.UniqueIdentifier, maYeuCau)
      .input("name", sql.NVarChar(150), info.hoTen.trim())
      .input("phone", sql.VarChar(20), info.soDienThoai)
      .input("email", sql.VarChar(254), info.email.trim())
      .input(
        "address",
        sql.NVarChar(500),
        info.diaChiGiao.trim()
      )
      .input(
        "note",
        sql.NVarChar(500),
        (info.ghiChu || "").trim() || null
      )
      .input("subtotal", sql.Decimal(18, 2), tienHang)
      .input("shipping", sql.Decimal(18, 2), PHI_GIAO)
      .input("total", sql.Decimal(18, 2), total)
      .query(`
        INSERT dbo.DonHang (
          MaNguoiDung, MaYeuCau, TrangThai,
          TenNguoiNhan, SDTNhan, EmailNhan,
          DiaChiGiao, GhiChu,
          TienHang, PhiGiao, GiamGia, TongThanhToan
        )
        OUTPUT INSERTED.MaDon
        VALUES (
          @user, @key, N'Chờ xác nhận',
          @name, @phone, @email,
          @address, @note,
          @subtotal, @shipping, 0, @total
        )
      `);

    const id = created.recordset[0].MaDon;

    for (const item of items) {
      const config = [
        item.MauSac,
        item.ChatLieu,
        item.KichThuoc
      ].filter(Boolean).join(" / ");

      await new sql.Request(tx)
        .input("order", sql.Int, id)
        .input(
          "variant",
          sql.VarChar(80),
          String(item.MaBienThe)
        )
        .input("name", sql.NVarChar(250), item.TenSanPham)
        .input("config", sql.NVarChar(500), config)
        .input("sku", sql.VarChar(80), item.SKU)
        .input("price", sql.Decimal(18, 2), item.GiaBan)
        .input("qty", sql.Int, item.SoLuong)
        .query(`
          INSERT dbo.CTDonHang (
            MaDon, MaBienThe, TenSanPhamSnapshot,
            CauHinhSnapshot, SKUSnapshot,
            GiaBanSnapshot, SoLuong, ThanhTien
          )
          VALUES (
            @order, @variant, @name,
            @config, @sku,
            @price, @qty, @price * @qty
          )
        `);
    }

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("user", sql.Int, req.user.MaNguoiDung)
      .input("total", sql.Decimal(18, 2), total)
      .query(`
        INSERT dbo.ThanhToan (
          MaDon, PhuongThuc, SoTien, TrangThai
        )
        VALUES (
          @id,
          N'Thanh toán khi nhận hàng (COD)',
          @total,
          N'Chờ thanh toán'
        );

        INSERT dbo.LichSuTrangThaiDon (
          MaDon, MaNguoiDung, TrangThaiCu, TrangThaiMoi
        )
        VALUES (
          @id, @user, NULL, N'Chờ xác nhận'
        );

        INSERT dbo.GiaoHang (MaDon, TrangThaiGiao)
        VALUES (@id, N'Chờ giao');

        DELETE ct
        FROM dbo.CTGioHang ct
        INNER JOIN dbo.GioHang gh ON gh.MaGio = ct.MaGio
        WHERE gh.MaNguoiDung = @user;

        UPDATE dbo.GioHang
        SET NgayCapNhat = SYSDATETIME()
        WHERE MaNguoiDung = @user;
      `);

    const data = await receipt(tx, id);

    await tx.commit();
    started = false;

    return res.status(201).json({
      success: true,
      message: "Đặt hàng thành công.",
      data
    });
  } catch (err) {
    if (started) {
      await tx.rollback().catch(() => {});
    }

    console.error("Đặt hàng:", err.message);

    return res.status(err.status || 500).json({
      success: false,
      message: err.status
        ? err.message
        : "Chưa thể xác nhận kết quả đặt hàng. Kiểm tra Đơn hàng của tôi trước khi thử lại."
    });
  }
}

module.exports = { datHang, validate };