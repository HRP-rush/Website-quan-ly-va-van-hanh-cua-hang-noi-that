const router = require('express').Router();
const { xacThuc, choPhepVaiTro } = require('../middleware/xacThuc');
const { thongKeBaoCao } = require('../controllers/baoCaoController');
router.get('/tong-quan', xacThuc, choPhepVaiTro('Quản lý', 'Admin'), thongKeBaoCao);
module.exports = router;
