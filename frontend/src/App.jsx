import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Import toàn bộ các trang chức năng trong dự án
import Checkout from './pages/customer/Checkout';
import PaymentReturn from './pages/customer/PaymentReturn';
import Invoice from './pages/customer/Invoice';
import ProductReview from './pages/customer/ProductReview';
import ManageReviews from './pages/customer/ManageReviews';
import SalesReport from './pages/customer/SalesReport';
import WarehouseReport from './pages/customer/WarehouseReport';

export default function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', background: '#f4f6f8', paddingBottom: '40px', fontFamily: 'Arial, sans-serif' }}>
        {/* Thanh điều hướng (Navbar) tổng hợp toàn bộ các module */}
        <nav style={{ background: '#343a40', color: '#fff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Mộc An Interior</h2>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Thanh Toán</Link>
            <Link to="/invoice" style={{ color: '#fff', textDecoration: 'none' }}>Hóa Đơn</Link>
            <Link to="/danh-gia" style={{ color: '#fff', textDecoration: 'none' }}>Đánh Giá</Link>
            <Link to="/quan-ly-phan-hoi" style={{ color: '#fff', textDecoration: 'none' }}>Quản Lý Phản Hồi</Link>
            <Link to="/bao-cao" style={{ color: '#fff', textDecoration: 'none' }}>Báo Cáo Doanh Thu</Link>
            <Link to="/kho-hang" style={{ color: '#fff', textDecoration: 'none' }}>Kho Hàng & Giao Hàng</Link>
          </div>
        </nav>

        {/* Khung định tuyến chứa các Route */}
        <div style={{ padding: '20px' }}>
          <Routes>
            {/* Nhóm 9: Đơn hàng, giao hàng và thanh toán */}
            <Route path="/" element={<Checkout />} />
            <Route path="/payment-return" element={<PaymentReturn />} />
            <Route path="/invoice" element={<Invoice />} />

            {/* Nhóm 10: Phản hồi, báo cáo, đánh giá và quản lý kho */}
            <Route path="/danh-gia" element={<ProductReview />} />
            <Route path="/quan-ly-phan-hoi" element={<ManageReviews />} />
            <Route path="/bao-cao" element={<SalesReport />} />
            <Route path="/kho-hang" element={<WarehouseReport />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}