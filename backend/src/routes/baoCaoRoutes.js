const router = require('express').Router();
const { xacThuc, choPhepVaiTro } = require('../middleware/xacThuc');
const { thongKeBaoCao } = require('../controllers/baoCaoController');
const { xuatDoanhThuExcel } = require('../controllers/xuatBaoCaoDoanhThuController');
router.get('/tong-quan', xacThuc, choPhepVaiTro('Quản lý', 'Admin'), thongKeBaoCao);
router.get('/xuat-doanh-thu', xacThuc, choPhepVaiTro('Quản lý', 'Admin'), xuatDoanhThuExcel);
module.exports = router;
