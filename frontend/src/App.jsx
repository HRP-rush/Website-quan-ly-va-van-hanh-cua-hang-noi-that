
import { useEffect, useState } from "react";

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL;

        console.log("Địa chỉ Backend:", apiUrl);

        const response = await fetch(
          `${apiUrl}/api/san-pham`
        );

        if (!response.ok) {
          throw new Error(`Lỗi HTTP ${response.status}`);
        }

        const result = await response.json();

        console.log("Dữ liệu nhận được:", result);

        setProducts(result.data);
      } catch (err) {
        console.error("Lỗi kết nối API:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  return (
    <div style={{
      maxWidth: "1000px",
      margin: "40px auto",
      padding: "24px",
      fontFamily: "Arial"
    }}>
      <h1>QUẢN LÝ CỬA HÀNG NỘI THẤT</h1>
      <h2>Danh sách sản phẩm</h2>

      {loading && <p>Đang tải dữ liệu...</p>}

      {error && (
        <p style={{ color: "red" }}>
          Lỗi: {error}
        </p>
      )}

      {!loading && !error && products.map((sp) => (
        <div
          key={sp.MaSanPham}
          style={{
            padding: "20px",
            marginBottom: "16px",
            border: "1px solid #ddd",
            borderRadius: "8px"
          }}
        >
          <h3>{sp.TenSanPham}</h3>
          <p>Danh mục: {sp.TenDanhMuc}</p>
          <p>Phong cách: {sp.PhongCach}</p>
          <p>Mô tả: {sp.MoTa}</p>
          <p>Trạng thái: {sp.TrangThai}</p>
        </div>
      ))}

      {!loading && !error && products.length === 0 && (
        <p>Chưa có sản phẩm nào.</p>
      )}
    </div>
  );
}

export default App;
