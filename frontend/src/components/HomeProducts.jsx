import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, RefreshCw } from "lucide-react";

import ProductCard from "./ProductCard";
import { getProducts } from "../services/productService";

import "../styles/homeProducts.css";

const HOME_LIMIT = 8;

export default function HomeProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    let controller;

    async function load() {
      controller?.abort();

      const current = new AbortController();
      controller = current;

      setLoading(true);
      setError("");

      try {
        const data = await getProducts({
          limit: HOME_LIMIT,
          signal: current.signal
        });

        if (active && !current.signal.aborted) {
          setProducts(data.slice(0, HOME_LIMIT));
        }
      } catch (err) {
        if (active && !current.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (active && !current.signal.aborted) {
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(load, 0);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };

    window.addEventListener("focus", load);
    document.addEventListener(
      "visibilitychange",
      onVisible
    );

    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();

      window.removeEventListener("focus", load);
      document.removeEventListener(
        "visibilitychange",
        onVisible
      );
    };
  }, [reload]);

  return (
    <section
      className="section products-section home-products"
      id="products"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              KHÁM PHÁ NỘI THẤT MỘC AN
            </p>

            <h2>Những thiết kế dành cho bạn</h2>
          </div>

          <Link
            to="/san-pham"
            className="text-link"
          >
            Xem tất cả sản phẩm
            <ArrowUpRight size={15} />
          </Link>
        </div>

        <div aria-busy={loading}>
          {loading ? (
            <p
              className="result-message"
              role="status"
            >
              Đang tải sản phẩm...
            </p>
          ) : error ? (
            <div
              className="home-products-message"
              role="alert"
            >
              <p>{error}</p>

              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setReload(n => n + 1)}
              >
                <RefreshCw size={15} />
                Thử lại
              </button>
            </div>
          ) : products.length > 0 ? (
            <div className="product-grid home-product-grid">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="empty-products">
              <h3>Sản phẩm đang được cập nhật</h3>

              <p>
                Mộc An sẽ sớm giới thiệu
                những thiết kế mới đến bạn.
              </p>
            </div>
          )}
        </div>

        <div className="products-bottom">
          <Link
            to="/san-pham"
            className="btn btn-outline"
          >
            Hiện thêm
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}