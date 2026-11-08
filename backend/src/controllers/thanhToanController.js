const crypto = require('crypto');
const querystring = require('qs');

// Hàm sắp xếp các thuộc tính theo alphabet (bắt buộc của VNPay)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// 1. API Tạo URL thanh toán VNPay
exports.taoUrlThanhToan = async (req, res) => {
  try {
    const { amount, orderId, orderInfo } = req.body;

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
      'vnp_TxnRef': orderId || Date.now().toString(),
      'vnp_OrderInfo': orderInfo || `Thanh toan don hang ${orderId}`,
      'vnp_OrderType': 'other',
      'vnp_Amount': amount * 100, // VNPay tính bằng đơn vị đồng * 100
      'vnp_ReturnUrl': returnUrl,
      'vnp_IpAddr': ipAddr,
      'vnp_CreateDate': createDate
    };

    vnp_Params = sortObject(vnp_Params);
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    
    vnp_Params['vnp_SecureHash'] = signed;
    vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

    return res.status(200).json({ success: true, paymentUrl: vnpUrl });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. API Xử lý kết quả trả về từ VNPay (Return URL / IPN)
exports.vnpayReturn = async (req, res) => {
  try {
    let vnp_Params = req.query;
    const secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    const secretKey = process.env.VNP_HASHSECRET || "DEMO_HASHSECRET";
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
      const responseCode = vnp_Params['vnp_ResponseCode'];
      if (responseCode === '00') {
        // Cập nhật trạng thái đơn hàng trong CSDL thành 'Paid'
        return res.status(200).json({ success: true, message: "Thanh toán thành công!", data: vnp_Params });
      } else {
        return res.status(400).json({ success: false, message: "Giao dịch không thành công!", code: responseCode });
      }
    } else {
      return res.status(400).json({ success: false, message: "Chữ ký không hợp lệ (Invalid Signature)!" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};