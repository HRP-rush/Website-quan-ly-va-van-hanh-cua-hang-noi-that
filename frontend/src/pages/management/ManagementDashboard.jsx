import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import WorkspaceLayout from "../../components/WorkspaceLayout";
import { peopleRequest } from "../../services/peopleService";
import "../../styles/tongQuan.css";

const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Number(n));

const number = (n) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2
  }).format(Number(n));

const date = (s) =>
  s ? s.slice(0, 10).split("-").reverse().join("/") : "—";

const palette = [
  "#a57a52", "#31352f", "#4e829e", "#739b86",
  "#c77467", "#9685a1", "#b7afa4"
];

const groups = [
  ["don-hang", "Đơn hàng", "đơn"],
  ["giao-hang", "Giao hàng", "phiếu giao"],
  ["phieu-nhap", "Phiếu nhập", "phiếu"],
  ["thanh-toan", "Thanh toán", "đơn có thanh toán"],
  ["phan-hoi", "Phản hồi", "đánh giá", "/phan-hoi"],
  ["san-pham", "Sản phẩm", "sản phẩm", "/san-pham"],
  ["khach-hang", "Khách hàng", "tài khoản", "/khach-hang"],
  ["nhan-vien", "Nhân viên & quản lý", "tài khoản", "/nhan-vien"]
];

function RevenueChart({ rows }) {
  const w = 720, h = 240, left = 54, bottom = 32;
  const values = rows.map((r) => Number(r.DoanhThu) / 1000000);
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);

  const x = (i) =>
    rows.length === 1
      ? (w + left - 12) / 2
      : left + i * (w - left - 12) / (rows.length - 1);

  const y = (v) =>
    h - bottom -
    (v - min) / (max - min) * (h - bottom - 16);

  const labels = new Set(
    Array.from(
      { length: Math.min(6, rows.length) },
      (_, i) =>
        Math.round(
          i * (rows.length - 1) /
          Math.max(1, Math.min(6, rows.length) - 1)
        )
    )
  );

  return (
    <>
      <svg
        className="workspace-chart-svg"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Doanh thu tiền hàng của đơn hoàn tất theo ngày đặt, đơn vị triệu đồng"
      >
        {Array.from(
          { length: 5 },
          (_, i) => min + (max - min) * i / 4
        ).map((v, i) => (
          <g key={i}>
            <line
              x1={left}
              x2={w - 12}
              y1={y(v)}
              y2={y(v)}
              stroke="#e8dfd4"
            />
            <text
              x={0}
              y={y(v) + 4}
              fontSize="11"
              fill="#888079"
            >
              {number(v)}
            </text>
          </g>
        ))}

        <polyline
          points={values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          fill="none"
          stroke="#a57a52"
          strokeWidth="2.5"
        />

        {rows.map((r, i) => (
          <g key={r.Ngay}>
            <circle
              cx={x(i)}
              cy={y(values[i])}
              r={3}
              fill="#a57a52"
            >
              <title>
                {date(r.Ngay)}: {money(r.DoanhThu)}
              </title>
            </circle>

            {labels.has(i) && (
              <text
                x={x(i)}
                y={h - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#888079"
              >
                {date(r.Ngay).slice(0, 5)}
              </text>
            )}
          </g>
        ))}
      </svg>

      <details className="dashboard-daily">
        <summary>Xem số liệu theo ngày</summary>
        <table>
          <thead>
            <tr>
              <th>Ngày đặt</th>
              <th>Doanh thu tiền hàng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.Ngay}>
                <td>{date(r.Ngay)}</td>
                <td>{money(r.DoanhThu)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

function OrderStates({ rows }) {
  const total = rows.reduce(
    (n, r) => n + Number(r.SoLuong),
    0
  );

  let offset = 0;
  const stops = rows.map((r, i) => {
    const from = offset;
    offset += total ? Number(r.SoLuong) / total * 100 : 0;
    return `${palette[i % palette.length]} ${from}% ${offset}%`;
  });

  return (
    <div className="workspace-donut-wrap">
      <div
        className="workspace-donut"
        style={{
          background: total
            ? `conic-gradient(${stops.join(",")})`
            : "#eee9e2"
        }}
        role="img"
        aria-label={
          rows.map((r) => `${r.TrangThai}: ${r.SoLuong}`).join(", ")
          || "Chưa có đơn trong kỳ"
        }
      >
        <span>
          {number(total)}
          <small>đơn</small>
        </span>
      </div>

      <div className="workspace-legend">
        {total ? rows.map((r, i) => (
          <p key={r.TrangThai}>
            <i style={{ background: palette[i % palette.length] }} />
            {r.TrangThai} • {number(r.SoLuong)}
          </p>
        )) : <p>Chưa có đơn trong kỳ.</p>}
      </div>
    </div>
  );
}

export default function ManagementDashboard({
  user,
  mode = "manager"
}) {
  const base = mode === "admin" ? "/admin" : "/quan-ly";
  const [days, setDays] = useState(7);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({
    data: null,
    error: "",
    loading: true
  });

  useEffect(() => {
    const controller = new AbortController();

    peopleRequest(
      `/tong-quan?soNgay=${days}`,
      "GET",
      undefined,
      controller.signal
    )
      .then(({ data }) => {
        if (
          !data?.period ||
          !data.summary ||
          !Array.isArray(data.operations)
        ) {
          throw new Error(
            "API tổng quan trả dữ liệu chưa đúng cấu trúc."
          );
        }

        if (!controller.signal.aborted) {
          setState({ data, loading: false, error: "" });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({
            data: null,
            loading: false,
            error: error.message
          });
        }
      });

    return () => controller.abort();
  }, [days, version]);

  function refresh(next = days) {
    setState({ data: null, error: "", loading: true });
    setDays(next);
    setVersion((n) => n + 1);
  }

  const d = state.data;
  const k = d?.summary;

  return (
    <WorkspaceLayout
      user={user}
      mode={mode}
      activeTitle="Tổng quan"
    >
      <div className="dashboard-page">
        <div className="workspace-breadcrumb">
          Quản trị / Tổng quan / Tổng quan kinh doanh
        </div>

        <div className="workspace-head">
          <h1>Tổng quan kinh doanh</h1>
          <p>
            Theo dõi doanh thu, đơn hàng và trạng thái vận hành
            của cửa hàng.
          </p>
        </div>

        <div className="workspace-filters">
          {[
            [1, "Hôm nay"],
            [7, "7 ngày"],
            [30, "30 ngày"]
          ].map(([n, label]) => (
            <button
              type="button"
              key={n}
              aria-pressed={days === n}
              className={days === n ? "selected" : ""}
              onClick={() => refresh(n)}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            disabled={state.loading}
            onClick={() => refresh()}
          >
            <RefreshCw size={13} />
            Cập nhật
          </button>

          {d && (
            <span>
              {date(d.period.TuNgay)}–{date(d.period.DenNgay)}
              {" • Cập nhật "}
              {date(d.period.CapNhat)}{" "}
              {d.period.CapNhat.slice(11)}
            </span>
          )}
        </div>

        {state.loading ? (
          <p className="dashboard-message" role="status">
            Đang tải số liệu từ database…
          </p>
        ) : state.error ? (
          <div className="workspace-order-error" role="alert">
            {state.error}{" "}
            <button
              type="button"
              className="workspace-refresh"
              onClick={() => refresh()}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <p className="dashboard-note">
              Thống kê trong kỳ theo ngày đặt. Doanh thu = tiền hàng
              − giảm giá của đơn Hoàn tất, không gồm phí giao.
            </p>

            <div className="workspace-kpi-grid">
              {[
                [
                  "Doanh thu tiền hàng",
                  money(k.DoanhThu),
                  "Đơn đã hoàn tất, đặt trong kỳ"
                ],
                [
                  "Tổng số đơn hàng",
                  number(k.TongDon),
                  `${number(k.HoanTat)} hoàn tất • ` +
                  `${number(k.DaHuy)} đã hủy • ` +
                  `${number(k.TongDon - k.HoanTat - k.DaHuy)} đang xử lý`
                ],
                [
                  "Sản phẩm đã bán",
                  number(k.DaBan),
                  "Tổng số lượng từ đơn hoàn tất trong kỳ"
                ],
                [
                  "SKU cần bổ sung hiện tại",
                  `${number(k.SapHet + k.HetHang)} SKU`,
                  `${number(k.SapHet)} sắp hết • ` +
                  `${number(k.HetHang)} hết hàng • SKU đang bán`
                ]
              ].map(([title, amount, info]) => (
                <section className="workspace-kpi" key={title}>
                  <p>{title}</p>
                  <strong>{amount}</strong>
                  <small>{info}</small>
                </section>
              ))}
            </div>

            <div className="workspace-two-col workspace-chart-panels">
              <section className="workspace-panel">
                <h2>Doanh thu theo thời gian</h2>
                <p className="workspace-subcaption">
                  Đơn vị: triệu đồng • Tổng {money(k.DoanhThu)}
                </p>
                <RevenueChart rows={d.series} />
              </section>

              <section className="workspace-panel">
                <h2>Phân bổ trạng thái đơn</h2>
                <OrderStates rows={d.states} />
                <small>
                  Các đơn đặt trong kỳ đã chọn, gồm cả đơn đã hủy.
                </small>
              </section>
            </div>

            <div className="workspace-two-col">
              <section className="workspace-panel">
                <h2>5 sản phẩm bán chạy</h2>
                <small>
                  Số lượng từ đơn hoàn tất, đặt trong kỳ.
                </small>

                {d.topProducts.length ? (
                  <div className="workspace-bestsellers">
                    {d.topProducts.map((p) => (
                      <div
                        className="workspace-best-row"
                        key={p.MaSanPham}
                      >
                        <span>{p.TenSanPham}</span>
                        <div className="workspace-progress">
                          <div
                            style={{
                              width:
                                `${Number(p.SoLuong) /
                                  Math.max(
                                    1,
                                    ...d.topProducts.map(
                                      (v) => Number(v.SoLuong)
                                    )
                                  ) * 100}%`
                            }}
                          />
                        </div>
                        <strong>{number(p.SoLuong)}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dashboard-empty">
                    Chưa có sản phẩm bán từ đơn hoàn tất trong kỳ.
                  </p>
                )}
              </section>

              <section className="workspace-panel">
                <h2>Cảnh báo tồn kho hiện tại</h2>
                <small>
                  Khả dụng = tồn kho − số lượng đang giữ, tối thiểu 0.
                  Dùng mức cảnh báo riêng của từng SKU đang bán.
                </small>

                {d.stockAlerts.length ? (
                  d.stockAlerts.map((p) => (
                    <div
                      className="dashboard-stock-row"
                      key={p.MaBienThe}
                    >
                      <div>
                        <strong>{p.TenSanPham}</strong>
                        <small>
                          {p.SKU} • Ngưỡng {number(p.MucCanhBao)}
                        </small>
                      </div>

                      <span className="workspace-stock-alert">
                        {Number(p.KhaDung) === 0
                          ? "Hết hàng"
                          : "Sắp hết"}
                        {" • "}
                        {number(p.KhaDung)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="dashboard-empty">
                    Không có SKU cần bổ sung.
                  </p>
                )}

                {k.ChuaCoTon > 0 && (
                  <small>
                    {number(k.ChuaCoTon)} SKU chưa có bản ghi tồn kho,
                    khả dụng đang tính bằng 0.
                  </small>
                )}

                <Link
                  className="dashboard-link"
                  to={`${base}/kho-hang`}
                >
                  Xem kho hàng →
                </Link>
              </section>
            </div>

            <div className="dashboard-section-heading">
              <h2>Trạng thái nghiệp vụ hiện tại</h2>
              <p>
                Toàn bộ dữ liệu đã lưu, không giới hạn ngày tạo.
                Thanh toán lấy bản ghi mới nhất của mỗi đơn.
              </p>
            </div>

            <div className="dashboard-operations">
              {groups.map(([key, title, unit, path]) => {
                const rows = d.operations.filter(
                  (r) => r.Nhom === key
                );

                return (
                  <section className="workspace-panel" key={key}>
                    <h3>{title}</h3>
                    <p className="dashboard-operation-total">
                      {number(
                        rows.reduce(
                          (n, r) => n + Number(r.SoLuong),
                          0
                        )
                      )}{" "}
                      <small>{unit}</small>
                    </p>

                    {rows.length ? rows.map((r) => (
                      <div
                        className="dashboard-state-row"
                        key={r.TrangThai}
                      >
                        <span>{r.TrangThai}</span>
                        <strong>{number(r.SoLuong)}</strong>
                      </div>
                    )) : (
                      <p className="dashboard-empty">
                        Chưa có dữ liệu.
                      </p>
                    )}

                    {path && (
                      <Link
                        className="dashboard-link"
                        to={base + path}
                      >
                        Mở {title.toLowerCase()} →
                      </Link>
                    )}
                  </section>
                );
              })}
            </div>

            <section className="workspace-panel workspace-wide">
              <h2>Đơn hàng gần đây trong kỳ</h2>
              <small>
                Tối đa 10 đơn • Tổng tiền gồm phí giao
                và đã trừ giảm giá.
              </small>

              <div className="workspace-table-scroll">
                <table className="workspace-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Khách hàng</th>
                      <th>Ngày đặt</th>
                      <th>Tổng tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentOrders.length ? (
                      d.recentOrders.map((o) => (
                        <tr key={o.MaDon}>
                          <td>ĐH-{o.MaDon}</td>
                          <td>{o.KhachHang}</td>
                          <td>{date(o.NgayDat)}</td>
                          <td>{money(o.TongThanhToan)}</td>
                          <td>
                            <span className="workspace-status">
                              {o.TrangThai}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          Chưa có đơn hàng trong kỳ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="workspace-panel workspace-wide">
              <h2>Phiếu nhập gần đây trong kỳ</h2>
              <small>
                Tối đa 5 phiếu • Giá trị theo chi tiết phiếu,
                gồm cả phiếu chưa nhập kho.
              </small>

              <div className="workspace-table-scroll">
                <table className="workspace-table">
                  <thead>
                    <tr>
                      <th>Mã phiếu</th>
                      <th>Nhà cung cấp</th>
                      <th>Ngày nhập</th>
                      <th>Giá trị phiếu</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentReceipts.length ? (
                      d.recentReceipts.map((p) => (
                        <tr key={p.MaPhieuNhap}>
                          <td>PN-{p.MaPhieuNhap}</td>
                          <td>{p.TenNCC}</td>
                          <td>{date(p.NgayNhap)}</td>
                          <td>{money(p.TongTien)}</td>
                          <td>
                            <span className="workspace-status">
                              {p.TrangThai}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>
                          Chưa có phiếu nhập trong kỳ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </WorkspaceLayout>
  );
}