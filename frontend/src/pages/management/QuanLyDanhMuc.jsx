import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus, RefreshCw, Info,
  ChevronLeft, ChevronRight, X
} from "lucide-react";

import WorkspaceLayout from "../../components/WorkspaceLayout";

import {
  categoryCode,
  categoryImage,
  listCategories,
  getCategory,
  changeCategoryStatus,
  deleteCategory
} from "../../services/categoryService";

import "../../styles/danhSachSanPham.css";
import "../../styles/quanLyDanhMuc.css";

function ChiTietDanhMuc({ item, onClose, onEdit }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();

    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className="dm-detail-dialog"
      aria-labelledby="dm-detail-title"
      onCancel={e => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="dm-detail-head">
        <h2 id="dm-detail-title">Chi tiết danh mục</h2>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X size={20} />
        </button>
      </div>

      <p className="dm-detail-code">
        {categoryCode(item.MaDanhMuc)}
      </p>

      {item.HinhAnh && (
        <img
          className="dm-detail-image"
          src={categoryImage(item.HinhAnh)}
          alt={item.TenDanhMuc}
        />
      )}

      <h3>{item.TenDanhMuc}</h3>

      <p className="dm-detail-description">
        {item.MoTa || "Chưa có mô tả."}
      </p>

      <p className="dm-detail-summary">
        {item.SoSanPham} sản phẩm •{" "}
        {item.HienThi ? "Đang hiển thị" : "Tạm ẩn"}
      </p>

      <div className="dm-detail-actions">
        <button
          type="button"
          className="dsp-btn dsp-btn-outline"
          onClick={onClose}
        >
          Đóng
        </button>

        <button
          type="button"
          className="dsp-btn dsp-btn-dark"
          onClick={onEdit}
        >
          Chỉnh sửa
        </button>
      </div>
    </dialog>
  );
}

export default function QuanLyDanhMuc({
  user,
  mode = "manager"
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const base = mode === "admin" ? "/admin" : "/quan-ly";

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [revision, setRevision] = useState(0);

  const [result, setResult] = useState({
    data: [],
    total: 0,
    tongDanhMuc: 0,
    tongSanPham: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [notice, setNotice] = useState(
    location.state?.categoryMessage || ""
  );

  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const actionRef = useRef(false);

  useEffect(() => {
    if (location.state?.categoryMessage) {
      navigate(location.pathname, {
        replace: true,
        state: null
      });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const data = await listCategories(
          {
            q,
            trangThai: status,
            trang: page,
            soDong: size
          },
          controller.signal
        );

        if (controller.signal.aborted) return;

        const last = Math.max(
          1,
          Math.ceil(data.total / size)
        );

        if (page > last) {
          setPage(last);
          return;
        }

        setResult(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, status, page, size, revision]);

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => setNotice(""), 6000);

    return () => clearTimeout(timer);
  }, [notice]);

  function refresh() {
    setLoading(true);
    setQ("");
    setStatus("");
    setPage(1);
    setActionError("");
    setRevision(n => n + 1);
  }

  function edit(item) {
    navigate(
      `${base}/danh-muc/${encodeURIComponent(item.MaDanhMuc)}/chinh-sua`
    );
  }

  async function showDetail(item) {
    if (actionRef.current) return;

    actionRef.current = true;
    setBusy(true);
    setActionError("");

    try {
      const response = await getCategory(item.MaDanhMuc);
      setDetail(response.data);
    } catch (err) {
      setActionError(err.message);
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  async function act(item, remove = false) {
    if (actionRef.current) return;

    const message = remove
      ? `Xóa danh mục "${item.TenDanhMuc}"? Chỉ có thể xóa danh mục chưa có sản phẩm.`
      : `${item.HienThi ? "Ẩn" : "Hiển thị"} danh mục "${item.TenDanhMuc}"? Dữ liệu sản phẩm và lịch sử đơn hàng được giữ nguyên.`;

    if (!window.confirm(message)) return;

    actionRef.current = true;
    setBusy(true);
    setActionError("");

    try {
      const response = remove
        ? await deleteCategory(item.MaDanhMuc)
        : await changeCategoryStatus(
            item.MaDanhMuc,
            !item.HienThi
          );

      setNotice(response.message);
      setLoading(true);
      setRevision(n => n + 1);
    } catch (err) {
      setActionError(err.message);
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  const pages = Math.max(
    1,
    Math.ceil(result.total / size)
  );

  return (
    <WorkspaceLayout
      user={user}
      mode={mode}
      activeTitle="Danh mục"
    >
      <div className="dm-list">
        <div className="workspace-breadcrumb">
          Quản trị / Danh mục / Quản lý danh mục
        </div>

        <div className="dsp-head">
          <div className="workspace-head">
            <h1>Quản lý danh mục</h1>

            <p>
              Quản lý thông tin, hình ảnh và trạng thái
              hiển thị của {result.tongDanhMuc} danh mục.
            </p>
          </div>

          <button
            type="button"
            className="dsp-btn dsp-btn-dark"
            onClick={() => navigate(`${base}/danh-muc/them`)}
          >
            <Plus size={15} />
            Thêm danh mục
          </button>
        </div>

        {notice && (
          <div className="dm-success" role="status">
            {notice}
          </div>
        )}

        <div className="dsp-search">
          <label className="dsp-field dsp-grow">
            <span>Tìm kiếm danh mục</span>

            <input
              value={q}
              maxLength={150}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
                setLoading(true);
              }}
              placeholder="Tìm theo mã hoặc tên danh mục..."
            />
          </label>

          <button
            type="button"
            className="dsp-btn dsp-btn-outline"
            onClick={refresh}
          >
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>

        <div className="dsp-filters dm-list-filters">
          <label className="dsp-field">
            <span>Trạng thái</span>

            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
                setLoading(true);
              }}
            >
              <option value="">Tất cả</option>
              <option value="true">Đang hiển thị</option>
              <option value="false">Tạm ẩn</option>
            </select>
          </label>
        </div>

        {(error || actionError) && (
          <div className="dsp-alert" role="alert">
            {error || actionError}
          </div>
        )}

        <div
          className="workspace-table-scroll dsp-table"
          aria-busy={loading}
        >
          <table className="workspace-table">
            <thead>
              <tr>
                <th scope="col">Ảnh</th>
                <th scope="col">Mã danh mục</th>
                <th scope="col">Tên danh mục</th>
                <th scope="col">Mô tả</th>
                <th scope="col">Số sản phẩm</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="dsp-empty"
                    role="status"
                  >
                    Đang tải danh sách danh mục...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="dsp-empty">
                    Chưa tải được dữ liệu.
                    Chọn Làm mới để thử lại.
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map(item => (
                  <tr key={item.MaDanhMuc}>
                    <td>
                      {item.HinhAnh ? (
                        <img
                          className="dsp-thumb"
                          src={categoryImage(item.HinhAnh)}
                          alt={item.TenDanhMuc}
                          loading="lazy"
                        />
                      ) : (
                        <span
                          className="dm-no-image"
                          aria-label="Chưa có ảnh"
                        >
                          —
                        </span>
                      )}
                    </td>

                    <td>
                      {categoryCode(item.MaDanhMuc)}
                    </td>

                    <td className="dm-name-cell">
                      {item.TenDanhMuc}
                    </td>

                    <td className="dm-description-cell">
                      {item.MoTa || "—"}
                    </td>

                    <td>{item.SoSanPham}</td>

                    <td>
                      <span
                        className={`dsp-status ${
                          item.HienThi
                            ? "is-active"
                            : "is-stopped"
                        }`}
                      >
                        {item.HienThi
                          ? "Đang hiển thị"
                          : "Tạm ẩn"}
                      </span>
                    </td>

                    <td>
                      <div className="dsp-actions">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => showDetail(item)}
                          aria-label={`Xem ${item.TenDanhMuc}`}
                        >
                          Xem
                        </button>

                        {" "}·{" "}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => edit(item)}
                          aria-label={`Sửa ${item.TenDanhMuc}`}
                        >
                          Chỉnh sửa
                        </button>

                        <br />

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => act(item)}
                          aria-label={
                            `${item.HienThi ? "Ẩn" : "Hiện"} ${item.TenDanhMuc}`
                          }
                        >
                          {item.HienThi
                            ? "Ẩn danh mục"
                            : "Hiện danh mục"}
                        </button>

                        {item.SoSanPham === 0 && (
                          <>
                            {" "}·{" "}

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => act(item, true)}
                              aria-label={`Xóa ${item.TenDanhMuc}`}
                            >
                              Xóa
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="dsp-empty">
                    {q || status
                      ? "Không tìm thấy danh mục phù hợp với bộ lọc."
                      : "Chưa có danh mục. Chọn Thêm danh mục để bắt đầu."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="dsp-pager">
          <div className="dm-result-count">
            <span>
              {loading
                ? "Đang tải..."
                : error
                  ? "Chưa có dữ liệu"
                  : `Hiển thị ${
                      result.total
                        ? (page - 1) * size + 1
                        : 0
                    }–${Math.min(
                      page * size,
                      result.total
                    )} / ${result.total} danh mục`}
            </span>

            <select
              aria-label="Số dòng mỗi trang"
              value={size}
              onChange={e => {
                setSize(Number(e.target.value));
                setPage(1);
                setLoading(true);
              }}
            >
              {[10, 20, 50].map(n => (
                <option key={n} value={n}>
                  {n} dòng / trang
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="button"
              className="dsp-btn dsp-btn-outline"
              disabled={loading || Boolean(error) || page <= 1}
              onClick={() => {
                setPage(p => p - 1);
                setLoading(true);
              }}
              aria-label="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>

            <span className="dsp-page">
              Trang {page} / {pages}
            </span>

            <button
              type="button"
              className="dsp-btn dsp-btn-outline"
              disabled={
                loading || Boolean(error) || page >= pages
              }
              onClick={() => {
                setPage(p => p + 1);
                setLoading(true);
              }}
              aria-label="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <p className="dsp-note">
          <Info size={14} />
          Chỉ có thể xóa danh mục chưa có sản phẩm.
          Bạn có thể tạm ẩn danh mục và vẫn giữ
          thông tin để quản trị.
        </p>
      </div>

      {detail && (
        <ChiTietDanhMuc
          item={detail}
          onClose={() => setDetail(null)}
          onEdit={() => edit(detail)}
        />
      )}
    </WorkspaceLayout>
  );
}