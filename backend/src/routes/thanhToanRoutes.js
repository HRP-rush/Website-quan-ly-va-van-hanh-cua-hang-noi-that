const express = require('express');
const router = express.Router();
const thanhToanController = require('../controllers/thanhToanController');

// Route tạo URL thanh toán
router.post('/tao-url-vnpay', thanhToanController.taoUrlThanhToan);

// Route xử lý phản hồi từ VNPay
router.get('/vnpay-return', thanhToanController.vnpayReturn);

module.exports = router;