import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Leaf,
  Armchair,
  HandHeart,
  ArrowUpRight
} from "lucide-react";

import Header from "../../components/Header";
import HeroBanner from "../../components/HeroBanner";
import HomeProducts from "../../components/HomeProducts";
import Footer from "../../components/Footer";

import "../../styles/catalog.css";

const categories = [
  {
    name: "Phòng khách",
    subtitle: "Gắn kết những khoảnh khắc",
    image: "/images/category-living.jpg"
  },
  {
    name: "Phòng ngủ",
    subtitle: "Chốn nghỉ ngơi bình yên",
    image: "/images/category-bedroom.jpg"
  },
  {
    name: "Phòng ăn",
    subtitle: "Gói trọn vị ấm áp",
    image: "/images/category-dining.jpg"
  },
  {
    name: "Phòng làm việc",
    subtitle: "Khơi nguồn sáng tạo",
    image: "/images/category-office.jpg"
  }
];

const benefits = [
  {
    icon: Leaf,
    title: "Chất liệu chọn lọc",
    description:
      "Gỗ tự nhiên và vật liệu bền đẹp, phù hợp với cuộc sống mỗi ngày."
  },
  {
    icon: Armchair,
    title: "Thiết kế tinh tế",
    description:
      "Đường nét giản dị, tỷ lệ hài hòa và công năng được cân nhắc."
  },
  {
    icon: HandHeart,
    title: "Hỗ trợ tận tâm",
    description:
      "Tư vấn, giao hàng và lắp đặt chu đáo trong từng bước."
  }
];

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("tuKhoa");
    const category = params.get("danhMuc");

    // Chuyển đường dẫn tìm kiếm/danh mục cũ sang trang sản phẩm.
    if (q || category) {
      const next = new URLSearchParams();

      if (q) {
        next.set("q", q);
      }

      if (category) {
        next.set("danh-muc", category);
      }

      navigate(`/san-pham?${next}`, {
        replace: true
      });

      return;
    }

    const section = location.hash.slice(1);

    if (!section) return;

    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(section)
        ?.scrollIntoView({
          behavior: "smooth"
        });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [location.search, location.hash, navigate]);

  const selectCategory = value => {
    const params = new URLSearchParams({
      "danh-muc": value
    });

    navigate(`/san-pham?${params}`);
  };

  return (
    <>
      <Header
        onSearch={value => {
          const keyword = value.trim();

          navigate(
            keyword
              ? `/san-pham?${new URLSearchParams({
                  q: keyword
                })}`
              : "/san-pham"
          );
        }}
        onCategoryChange={selectCategory}
      />

      <main>
        <div className="moc-visitor-hint container">
          Khám phá nội thất cho không gian sống của bạn
        </div>

        <HeroBanner />

        {/* DANH MỤC THEO KHÔNG GIAN */}
        <section
          className="section categories-section"
          id="categories"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  MỘT NGÔI NHÀ, NHIỀU CẢM HỨNG
                </p>

                <h2>Khám phá theo không gian</h2>
              </div>

              <a href="#products" className="text-link">
                Tìm không gian của bạn
                <ArrowUpRight size={15} />
              </a>
            </div>

            <div className="category-grid">
              {categories.map(item => (
                <button
                  type="button"
                  key={item.name}
                  className="category-card"
                  onClick={() => selectCategory(item.name)}
                >
                  <div className="category-image">
                    <img
                      src={item.image}
                      alt={item.name}
                    />
                  </div>

                  <div className="category-title-row">
                    <h3>{item.name}</h3>
                    <ArrowUpRight size={17} />
                  </div>

                  <p>{item.subtitle}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* LẤY TỐI ĐA 8 SẢN PHẨM TỪ DATABASE */}
        <HomeProducts />

        {/* CÂU CHUYỆN CHẤT LIỆU */}
        <section className="material-story" id="story">
          <div className="material-image">
            <img
              src="/images/material-story.jpg"
              alt="Chất liệu gỗ tự nhiên và vải nội thất"
              loading="lazy"
            />
          </div>

          <div className="material-content">
            <div className="material-content-inner">
              <p className="eyebrow">
                ĐẸP TỪ NHỮNG ĐIỀU CHÂN THẬT
              </p>

              <h2>
                Được tạo nên từ những chất liệu có giá trị
              </h2>

              <p>
                Vân gỗ tự nhiên, bề mặt linen mềm mại và những
                đường nét được chăm chút. Mỗi thiết kế Mộc An
                là sự trân trọng dành cho chất liệu và nhịp sống
                của bạn.
              </p>

              <a
                href="#inspiration"
                className="btn btn-outline"
              >
                Câu chuyện chất liệu
              </a>
            </div>
          </div>
        </section>

        {/* GIÁ TRỊ THƯƠNG HIỆU */}
        <section className="benefits-section">
          <div className="container benefits-grid">
            {benefits.map(item => {
              const Icon = item.icon;

              return (
                <div
                  className="benefit"
                  key={item.title}
                >
                  <Icon
                    className="benefit-icon"
                    size={26}
                    strokeWidth={1.2}
                  />

                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CẢM HỨNG CHO TỪNG GÓC NHÀ */}
        <section
          className="section inspiration-section"
          id="inspiration"
        >
          <div className="container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  SỐNG CHẬM, SỐNG CÓ GU
                </p>

                <h2>Cảm hứng cho từng góc nhà</h2>
              </div>

              <a
                href="#consultation"
                className="text-link"
              >
                Ghé thăm góc cảm hứng
                <ArrowUpRight size={15} />
              </a>
            </div>

            <div className="inspiration-grid">
              <div className="inspiration-featured">
                <img
                  src="/images/inspiration-living.jpg"
                  alt="Không gian phòng khách tinh giản"
                  loading="lazy"
                />

                <p className="eyebrow">
                  KHÔNG GIAN SỐNG / 5 PHÚT ĐỌC
                </p>

                <h3>
                  Một khoảng lặng giữa nhịp sống thành thị
                </h3>

                <p>
                  Khi ánh sáng, chất liệu và những đường nét
                  tối giản cùng kể câu chuyện về nhà.
                </p>
              </div>

              <div className="inspiration-side">
                <div className="inspiration-small">
                  <img
                    src="/images/inspiration-bedroom.jpg"
                    alt="Không gian phòng ngủ ấm áp"
                    loading="lazy"
                  />

                  <h3>
                    Để phòng ngủ trở thành nơi bạn muốn trở về
                  </h3>
                </div>

                <div className="inspiration-small">
                  <img
                    src="/images/inspiration-dining.jpg"
                    alt="Không gian phòng ăn hiện đại"
                    loading="lazy"
                  />

                  <h3>
                    Bàn ăn ấm áp, câu chuyện dài hơn
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA TƯ VẤN */}
        <section
          className="consultation-section"
          id="consultation"
        >
          <div className="container consultation-inner">
            <div>
              <h2>
                Tổ ấm của bạn, cùng Mộc An vun đắp.
              </h2>

              <p>
                Đội ngũ tư vấn luôn sẵn sàng
                lắng nghe ý tưởng của bạn.
              </p>
            </div>

            <a
              className="btn btn-primary"
              href="#footer"
            >
              Đặt lịch tư vấn miễn phí
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}