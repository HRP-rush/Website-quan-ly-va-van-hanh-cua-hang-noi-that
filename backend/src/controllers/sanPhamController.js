
const { getPool, sql } = require("../config/db");

const PHI_GIAO_HANG = 300000;

function layMaSoHopLe(giaTri) {
  const maSo = Number(giaTri);
  return Number.isSafeInteger(maSo) && maSo > 0 ? maSo : null;
}

function taoYeuCau(giaoDich, maNguoiDung) {
  return giaoDich.request().input("maNguoiDung", sql.Int, maNguoiDung);
}

async function layDanhSachSanPham(req, res) {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        sp.MaSanPham,
        sp.TenSanPham,
        sp.MoTa,
        sp.PhongCach,
        sp.TrangThai,
        dm.TenDanhMuc
      FROM dbo.SanPham AS sp
      INNER JOIN dbo.DanhMuc AS dm
        ON sp.MaDanhMuc = dm.MaDanhMuc
      ORDER BY sp.MaSanPham DESC
    `);

    return res.json({
      success: true,
      total: result.recordset.length,
      data: result.recordset
    });
  } catch (error) {
    console.error("Lỗi lấy sản phẩm:", error.message);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách sản phẩm"
    });
  }
}

async function layGioHang(req, res) {
  const maNguoiDung = layMaSoHopLe(req.params.maNguoiDung);
  if (!maNguoiDung) {
    return res.status(400).json({ success: false, message: "Mã người dùng không hợp lệ" });
  }

  try {
    const pool = await getPool();
    const ketQua = await pool.request()
      .input("maNguoiDung", sql.Int, maNguoiDung)
      .query(`
        SELECT
          ct.MaCTGio,
          bt.MaBienThe,
          sp.TenSanPham,
          bt.SKU,
          bt.MauSac,
          bt.ChatLieu,
          bt.KichThuoc,
          bt.GiaBan,
          ct.SoLuong,
          ISNULL(tk.SoLuongTon, 0) AS SoLuongTon,
          CAST(bt.GiaBan * ct.SoLuong AS DECIMAL(18, 2)) AS ThanhTien
        FROM dbo.GioHang AS gh
        INNER JOIN dbo.CTGioHang AS ct ON ct.MaGio = gh.MaGio
        INNER JOIN dbo.BienTheSanPham AS bt ON bt.MaBienThe = ct.MaBienThe
        INNER JOIN dbo.SanPham AS sp ON sp.MaSanPham = bt.MaSanPham
        LEFT JOIN dbo.TonKho AS tk ON tk.MaBienThe = bt.MaBienThe
        WHERE gh.MaNguoiDung = @maNguoiDung
        ORDER BY ct.MaCTGio
      `);

    const sanPham = ketQua.recordset.map((dong) => ({
      ...dong,
      GiaBan: Number(dong.GiaBan),
      ThanhTien: Number(dong.ThanhTien)
    }));

    return res.json({
      success: true,
      tongSoLuong: sanPham.reduce((tong, dong) => tong + dong.SoLuong, 0),
      tamTinh: sanPham.reduce((tong, dong) => tong + dong.ThanhTien, 0),
      phiGiaoHang: sanPham.length ? PHI_GIAO_HANG : 0,
      data: sanPham
    });
  } catch (error) {
    console.error("Lỗi lấy giỏ hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể lấy giỏ hàng" });
  }
}

async function tangSoLuongTrongGio(req, res) {
  const maNguoiDung = layMaSoHopLe(req.params.maNguoiDung);
  const maCTGio = layMaSoHopLe(req.params.maCTGio);
  if (!maNguoiDung || !maCTGio) {
    return res.status(400).json({ success: false, message: "Mã người dùng hoặc mã sản phẩm không hợp lệ" });
  }

  let giaoDich;
  let daKetThucGiaoDich = false;
  try {
    const pool = await getPool();
    giaoDich = new sql.Transaction(pool);
    await giaoDich.begin();

    const yeuCau = taoYeuCau(giaoDich, maNguoiDung)
      .input("maCTGio", sql.Int, maCTGio);
    const dongGio = await yeuCau.query(`
      SELECT ct.MaGio
      FROM dbo.GioHang AS gh
      INNER JOIN dbo.CTGioHang AS ct WITH (UPDLOCK, HOLDLOCK)
        ON ct.MaGio = gh.MaGio
      WHERE gh.MaNguoiDung = @maNguoiDung AND ct.MaCTGio = @maCTGio
    `);

    if (!dongGio.recordset.length) {
      await giaoDich.rollback();
      daKetThucGiaoDich = true;
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    await taoYeuCau(giaoDich, maNguoiDung)
      .input("maCTGio", sql.Int, maCTGio)
      .query("UPDATE dbo.CTGioHang SET SoLuong = SoLuong + 1 WHERE MaCTGio = @maCTGio");

    await taoYeuCau(giaoDich, maNguoiDung)
      .query("UPDATE dbo.GioHang SET NgayCapNhat = SYSDATETIME() WHERE MaNguoiDung = @maNguoiDung");

    const chiTiet = await taoYeuCau(giaoDich, maNguoiDung)
      .input("maCTGio", sql.Int, maCTGio)
      .query(`
        SELECT ct.MaCTGio, bt.GiaBan, ct.SoLuong,
          CAST(bt.GiaBan * ct.SoLuong AS DECIMAL(18, 2)) AS ThanhTien
        FROM dbo.GioHang AS gh
        INNER JOIN dbo.CTGioHang AS ct ON ct.MaGio = gh.MaGio
        INNER JOIN dbo.BienTheSanPham AS bt ON bt.MaBienThe = ct.MaBienThe
        WHERE gh.MaNguoiDung = @maNguoiDung AND ct.MaCTGio = @maCTGio
      `);

    await giaoDich.commit();
    daKetThucGiaoDich = true;
    const dong = chiTiet.recordset[0];
    return res.json({
      success: true,
      message: "Đã tăng số lượng sản phẩm",
      data: {
        maCTGio: dong.MaCTGio,
        soLuong: dong.SoLuong,
        giaBan: Number(dong.GiaBan),
        thanhTien: Number(dong.ThanhTien)
      }
    });
  } catch (error) {
    if (giaoDich && !daKetThucGiaoDich) {
      try {
        await giaoDich.rollback();
      } catch (loiHoanTac) {
        console.error("Lỗi hoàn tác tăng số lượng:", loiHoanTac.message);
      }
    }
    console.error("Lỗi tăng số lượng giỏ hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể tăng số lượng sản phẩm" });
  }
}

async function xoaSanPhamKhoiGioHang(req, res) {
  const maNguoiDung = layMaSoHopLe(req.params.maNguoiDung);
  const maCTGio = layMaSoHopLe(req.params.maCTGio);
  if (!maNguoiDung || !maCTGio) {
    return res.status(400).json({ success: false, message: "Mã người dùng hoặc mã sản phẩm không hợp lệ" });
  }

  try {
    const pool = await getPool();
    const ketQua = await pool.request()
      .input("maNguoiDung", sql.Int, maNguoiDung)
      .input("maCTGio", sql.Int, maCTGio)
      .query(`
        DELETE ct
        FROM dbo.CTGioHang AS ct
        INNER JOIN dbo.GioHang AS gh ON gh.MaGio = ct.MaGio
        WHERE gh.MaNguoiDung = @maNguoiDung AND ct.MaCTGio = @maCTGio
      `);

    if (!ketQua.rowsAffected[0]) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong giỏ hàng" });
    }

    await pool.request()
      .input("maNguoiDung", sql.Int, maNguoiDung)
      .query("UPDATE dbo.GioHang SET NgayCapNhat = SYSDATETIME() WHERE MaNguoiDung = @maNguoiDung");

    return res.json({ success: true, message: "Đã xóa sản phẩm khỏi giỏ hàng" });
  } catch (error) {
    console.error("Lỗi xóa sản phẩm khỏi giỏ hàng:", error.message);
    return res.status(500).json({ success: false, message: "Không thể xóa sản phẩm khỏi giỏ hàng" });
  }
}

async function tienHanhThanhToan(req, res) {
  const maNguoiDung = layMaSoHopLe(req.params.maNguoiDung);
  const duLieu = req.body || {};
  const { tenNguoiNhan, soDienThoai, diaChiGiao } = duLieu;
  const phuongThuc = duLieu.phuongThuc || "COD";

  if (!maNguoiDung) {
    return res.status(400).json({ success: false, message: "Mã người dùng không hợp lệ" });
  }
  if (
    typeof tenNguoiNhan !== "string" || !tenNguoiNhan.trim() ||
    typeof soDienThoai !== "string" || !soDienThoai.trim() ||
    typeof diaChiGiao !== "string" || !diaChiGiao.trim() ||
    typeof phuongThuc !== "string" || !phuongThuc.trim() ||
    tenNguoiNhan.trim().length > 150 ||
    soDienThoai.trim().length > 20 ||
    diaChiGiao.trim().length > 500 ||
    phuongThuc.trim().length > 50
  ) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp tên người nhận, số điện thoại, địa chỉ giao hàng và phương thức thanh toán"
    });
  }

  let giaoDich;
  let daKetThucGiaoDich = false;
  try {
    const pool = await getPool();
    giaoDich = new sql.Transaction(pool);
    await giaoDich.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const gioHang = await taoYeuCau(giaoDich, maNguoiDung).query(`
      SELECT
        ct.MaCTGio,
        ct.MaBienThe,
        ct.SoLuong,
        sp.TenSanPham,
        sp.TrangThai AS TrangThaiSanPham,
        bt.SKU,
        bt.MauSac,
        bt.ChatLieu,
        bt.KichThuoc,
        bt.GiaBan,
        bt.TrangThai AS TrangThaiBienThe,
        ISNULL(tk.SoLuongTon, 0) AS SoLuongTon
      FROM dbo.GioHang AS gh
      INNER JOIN dbo.CTGioHang AS ct WITH (UPDLOCK, HOLDLOCK) ON ct.MaGio = gh.MaGio
      INNER JOIN dbo.BienTheSanPham AS bt ON bt.MaBienThe = ct.MaBienThe
      INNER JOIN dbo.SanPham AS sp ON sp.MaSanPham = bt.MaSanPham
      LEFT JOIN dbo.TonKho AS tk WITH (UPDLOCK, HOLDLOCK) ON tk.MaBienThe = bt.MaBienThe
      WHERE gh.MaNguoiDung = @maNguoiDung
      ORDER BY ct.MaBienThe
    `);

    if (!gioHang.recordset.length) {
      await giaoDich.rollback();
      daKetThucGiaoDich = true;
      return res.status(400).json({ success: false, message: "Giỏ hàng đang trống" });
    }

    const sanPhamKhongDuHang = gioHang.recordset
      .filter((dong) =>
        dong.SoLuongTon < dong.SoLuong ||
        dong.TrangThaiSanPham !== "Đang bán" ||
        dong.TrangThaiBienThe !== "Đang bán"
      )
      .map((dong) => ({
        tenSanPham: dong.TenSanPham,
        sku: dong.SKU,
        soLuongDat: dong.SoLuong,
        soLuongCon: dong.SoLuongTon,
        lyDo: dong.TrangThaiSanPham !== "Đang bán" || dong.TrangThaiBienThe !== "Đang bán"
          ? "Sản phẩm hiện không kinh doanh"
          : "Tồn kho không đủ"
      }));

    if (sanPhamKhongDuHang.length) {
      await giaoDich.rollback();
      daKetThucGiaoDich = true;
      return res.status(409).json({
        success: false,
        message: "Một số sản phẩm không đủ hàng để thanh toán",
        sanPhamKhongDuHang
      });
    }

    const tienHang = gioHang.recordset.reduce(
      (tong, dong) => tong + Number(dong.GiaBan) * dong.SoLuong,
      0
    );
    const tongThanhToan = tienHang + PHI_GIAO_HANG;
    const donHang = await taoYeuCau(giaoDich, maNguoiDung)
      .input("tenNguoiNhan", sql.NVarChar(150), tenNguoiNhan.trim())
      .input("soDienThoai", sql.VarChar(20), soDienThoai.trim())
      .input("diaChiGiao", sql.NVarChar(500), diaChiGiao.trim())
      .input("tienHang", sql.Decimal(18, 2), tienHang)
      .input("phiGiao", sql.Decimal(18, 2), PHI_GIAO_HANG)
      .input("tongThanhToan", sql.Decimal(18, 2), tongThanhToan)
      .query(`
        INSERT INTO dbo.DonHang
          (MaNguoiDung, TrangThai, TenNguoiNhan, SDTNhan, DiaChiGiao, TienHang, PhiGiao, GiamGia, TongThanhToan)
        OUTPUT INSERTED.MaDon
        VALUES
          (@maNguoiDung, N'Chờ xác nhận', @tenNguoiNhan, @soDienThoai, @diaChiGiao, @tienHang, @phiGiao, 0, @tongThanhToan)
      `);
    const maDon = donHang.recordset[0].MaDon;

    for (const dong of gioHang.recordset) {
      const cauHinh = [dong.MauSac, dong.ChatLieu, dong.KichThuoc].filter(Boolean).join(" / ");
      const chiTietDon = await giaoDich.request()
        .input("maDon", sql.Int, maDon)
        .input("maBienThe", sql.Int, dong.MaBienThe)
        .input("tenSanPham", sql.NVarChar(250), dong.TenSanPham)
        .input("cauHinh", sql.NVarChar(500), cauHinh || "Mặc định")
        .input("sku", sql.VarChar(80), dong.SKU)
        .input("giaBan", sql.Decimal(18, 2), dong.GiaBan)
        .input("soLuong", sql.Int, dong.SoLuong)
        .input("thanhTien", sql.Decimal(18, 2), Number(dong.GiaBan) * dong.SoLuong)
        .query(`
          INSERT INTO dbo.CTDonHang
            (MaDon, MaBienThe, TenSanPhamSnapshot, CauHinhSnapshot, SKUSnapshot, GiaBanSnapshot, SoLuong, ThanhTien)
          OUTPUT INSERTED.MaCTDon
          VALUES
            (@maDon, @maBienThe, @tenSanPham, @cauHinh, @sku, @giaBan, @soLuong, @thanhTien)
        `);
      const maCTDon = chiTietDon.recordset[0].MaCTDon;

      const capNhatKho = await giaoDich.request()
        .input("maBienThe", sql.Int, dong.MaBienThe)
        .input("soLuong", sql.Int, dong.SoLuong)
        .query(`
          UPDATE dbo.TonKho
          SET SoLuongTon = SoLuongTon - @soLuong
          WHERE MaBienThe = @maBienThe AND SoLuongTon >= @soLuong
        `);
      if (!capNhatKho.rowsAffected[0]) {
        const loiTonKho = new Error("Tồn kho đã thay đổi trong lúc tạo đơn hàng");
        loiTonKho.code = "TON_KHO_THAY_DOI";
        throw loiTonKho;
      }

      await giaoDich.request()
        .input("maNguoiDung", sql.Int, maNguoiDung)
        .input("maCTDon", sql.Int, maCTDon)
        .input("maBienThe", sql.Int, dong.MaBienThe)
        .input("soLuongThayDoi", sql.Int, -dong.SoLuong)
        .query(`
          INSERT INTO dbo.GiaoDichKho
            (MaNguoiDung, MaCTDon, MaBienThe, LoaiGiaoDich, SoLuongThayDoi, GhiChu)
          VALUES
            (@maNguoiDung, @maCTDon, @maBienThe, N'Xuất bán', @soLuongThayDoi, N'Xuất kho khi khách đặt hàng')
        `);
    }

    await giaoDich.request()
      .input("maDon", sql.Int, maDon)
      .input("phuongThuc", sql.NVarChar(50), phuongThuc.trim())
      .input("tongThanhToan", sql.Decimal(18, 2), tongThanhToan)
      .query(`
        INSERT INTO dbo.ThanhToan (MaDon, PhuongThuc, SoTien, TrangThai)
        VALUES (@maDon, @phuongThuc, @tongThanhToan, N'Chờ thanh toán')
      `);

    await taoYeuCau(giaoDich, maNguoiDung).query(`
      DELETE ct
      FROM dbo.CTGioHang AS ct
      INNER JOIN dbo.GioHang AS gh ON gh.MaGio = ct.MaGio
      WHERE gh.MaNguoiDung = @maNguoiDung
    `);

    await giaoDich.commit();
    daKetThucGiaoDich = true;
    return res.status(201).json({
      success: true,
      message: "Đã tạo đơn hàng. Đơn đang chờ thanh toán.",
      data: { maDon, tienHang, phiGiaoHang: PHI_GIAO_HANG, tongThanhToan }
    });
  } catch (error) {
    if (giaoDich && !daKetThucGiaoDich) {
      try {
        await giaoDich.rollback();
      } catch (loiHoanTac) {
        console.error("Lỗi hoàn tác đơn hàng:", loiHoanTac.message);
      }
    }
    console.error("Lỗi tạo đơn hàng:", error.message);
    if (error.code === "TON_KHO_THAY_DOI") {
      return res.status(409).json({
        success: false,
        message: "Tồn kho vừa thay đổi. Vui lòng kiểm tra lại giỏ hàng."
      });
    }
    return res.status(500).json({ success: false, message: "Không thể tạo đơn hàng" });
  }
}

module.exports = {
  layDanhSachSanPham,
  layGioHang,
  tangSoLuongTrongGio,
  xoaSanPhamKhoiGioHang,
  tienHanhThanhToan
};
