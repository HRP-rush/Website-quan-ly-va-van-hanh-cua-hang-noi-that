
export default function HeroBanner() {
  return (
    <section className="hero" id="home">
      <div className="hero-overlay container">
        <div className="hero-content">
          <p className="eyebrow">
            KHÔNG GIAN SỐNG ĐẦY CẢM HỨNG
          </p>

          <h1>
            Chạm vào vẻ đẹp
            <br />
            của sự tinh giản
          </h1>

          <p className="hero-description">
            Khám phá những thiết kế nội thất hài hòa giữa
            công năng, chất liệu và cảm xúc.
          </p>

          <div className="hero-buttons">
            <a href="#products" className="btn btn-primary">
              Khám phá sản phẩm
            </a>

            <a href="#inspiration" className="btn btn-outline">
              Xem bộ sưu tập
            </a>
          </div>
        </div>
      </div>

      <div className="hero-pagination">
        <span>BỘ SƯU TẬP AN NHIÊN / 2026</span>
        <span>01 — 03</span>
      </div>
    </section>
  );
}
