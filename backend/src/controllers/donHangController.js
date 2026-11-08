const { getPool } = require("../config/db");
const crypto = require('crypto');
const querystring = require('qs');

exports.taoDonHang = async (req, res) => {
  try {
    const { maKhachHang, tongTien, phuongThucThanhToan, thongTinGiaoHang } = req.body;
    const pool = await getPool();
    
    const maDonHang = "DH" + Date.now();
    // Nếu là COD thì trạng thái là Chờ xác nhận, nếu thanh toán online (VNPay/MoMo) thì là Chờ thanh toán
    const trangThai = phuongThucThanhToan === 'COD' ? 'ChoXacNhan' : 'ChoThanhToan';

    // 1. Lưu thông tin đơn hàng vào bảng Orders trong SQL Server
    await pool.request()
      .input('MaDonHang', maDonHang)
      .input('MaKhachHang', maKhachHang || 1)
      .input('TongTien', tongTien)
      .input('PhuongThucThanhToan', phuongThucThanhToan)
      .input('TrangThai', trangThai)
      .input('DiaChiGiao', thongTinGiaoHang?.diaChi || '')
      .input('SoDienThoai', thongTinGiaoHang?.sdt || '')
      .query(`
        INSERT INTO Orders (MaDonHang, MaKhachHang, TongTien, PhuongThucThanhToan, TrangThai, DiaChiGiao, SoDienThoai, NgayTao)
        VALUES (@MaDonHang, @MaKhachHang, @TongTien, @PhuongThucThanhToan, @TrangThai, @DiaChiGiao, @SoDienThoai, GETDATE())
      `);

    // 2. Xử lý phương thức: Thanh toán khi nhận hàng (COD)
    if (phuongThucThanhToan === 'COD') {
      return res.status(200).json({
        success: true,
        message: "Đặt hàng thành công với phương thức COD!",
        maDonHang
      });
    }

    // 3. Xử lý phương thức: Cổng thanh toán VNPay
    if (phuongThucThanhToan === 'VNPay') {
      const tmnCode = process.env.VNP_TMNCODE || "DEMO_TMNCODE";
      const secretKey = process.env.VNP_HASHSECRET || "DEMO_HASHSECRET";
      let vnpUrl = process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
      const returnUrl = process.env.VNP_RETURNURL || "http://localhost:5173/payment-return";

      const date = new Date();
      const createDate = date.getFullYear() +
        ('0' + (date.getMonth() + 1)).slice(-2) +
        ('0' + date.getDate()).slice(-2) +
        ('0' + date.getHours()).slice(-2) +
        ('0' + date.getMinutes()).slice(-2) +
        ('0' + date.getSeconds()).slice(-2);

      const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      let vnp_Params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'pay',
        'vnp_TmnCode': tmnCode,
        'vnp_Locale': 'vn',
        'vnp_CurrCode': 'VND',
        'vnp_TxnRef': maDonHang,
        'vnp_OrderInfo': `Thanh toan don hang ${maDonHang}`,
        'vnp_OrderType': 'other',
        'vnp_Amount': tongTien * 100,
        'vnp_ReturnUrl': returnUrl,
        'vnp_IpAddr': ipAddr,
        'vnp_CreateDate': createDate
      };

      let sortedParams = {};
      let keys = Object.keys(vnp_Params).sort();
      keys.forEach(key => {
        sortedParams[key] = encodeURIComponent(vnp_Params[key]).replace(/%20/g, "+");
      });

      const signData = querystring.stringify(sortedParams, { encode: false });
      const hmac = crypto.createHmac("sha512", secretKey);
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
      
      sortedParams['vnp_SecureHash'] = signed;
      vnpUrl += '?' + querystring.stringify(sortedParams, { encode: false });

      return res.status(200).json({
        success: true,
        paymentUrl: vnpUrl,
        maDonHang
      });
    }

    // 4. Xử lý phương thức: Ví điện tử MoMo
    if (phuongThucThanhToan === 'MoMo') {
      const momoPartnerCode = process.env.MOMO_PARTNER_CODE || "MOMO_DEMO";
      
      return res.status(200).json({
        success: true,
        message: "Khởi tạo thanh toán MoMo thành công!",
        paymentUrl: "https://test-payment.momo.vn/v2/gateway/api/create", // URL sandbox MoMo
        maDonHang
      });
    }

  } catch (error) {
    console.error("Lỗi tạo đơn hàng:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};