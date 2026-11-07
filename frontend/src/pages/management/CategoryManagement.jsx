
import { useCallback, useEffect, useMemo, useState } from "react";
import { categoryAPI } from "../../services/accountApi";

const emptyForm = {
  maDanhMuc: "",
  tenDanhMuc: "",
  moTa: "",
  maDanhMucCha: "",
  thuTuHienThi: 0,
  trangThai: "Hiển thị"
};

function getErrorMessage(error) {
  return error?.message || "Có lỗi xảy ra. Vui lòng thử lại.";
}

export default function CategoryManagement({ user }) {
  // ===== STATE =====
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState("");

  // null: đóng modal, "new": thêm mới, còn lại: mã đang sửa
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalError, setModalError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ===== LẤY DANH SÁCH =====
  const load = useCallback(async () => {
    try {
      setLoading(true);

      const data = await categoryAPI.list();

      // Hỗ trợ cả API trả mảng trực tiếp
      // và API trả về { success, data: [...] }.
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setItems(list);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ===== TÌM KIẾM VÀ LỌC =====
  const filtered = useMemo(() => {
    const keyword = filter.trim().toLocaleLowerCase("vi-VN");

    return items.filter((item) => {
      const ma = String(item.MaDanhMuc || "")
        .toLocaleLowerCase("vi-VN");

      const ten = String(item.TenDanhMuc || "")
        .toLocaleLowerCase("vi-VN");

      const matchKeyword =
        !keyword ||
        ma.includes(keyword) ||
        ten.includes(keyword);

      const matchStatus =
        !status || item.TrangThai === status;

      return matchKeyword && matchStatus;
    });
  }, [items, filter, status]);

  // ===== MỞ MODAL THÊM / SỬA =====
  function edit(row = null) {
    setEditing(row ? row.MaDanhMuc : "new");

    setForm(
      row
        ? {
            maDanhMuc: row.MaDanhMuc,
            tenDanhMuc: row.TenDanhMuc || "",
            moTa: row.MoTa || "",
            maDanhMucCha: row.MaDanhMucCha || "",
            thuTuHienThi: row.ThuTuHienThi ?? 0,
            trangThai: row.TrangThai || "Hiển thị"
          }
        : {
            ...emptyForm,
            thuTuHienThi: items.length + 1
          }
    );

    setModalError("");
    setError("");
    setMessage("");
  }

  // ===== ĐÓNG MODAL =====
  function closeModal() {
    if (saving) return;

    setEditing(null);
    setModalError("");
  }

  // ===== CẬP NHẬT FORM =====
  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));

    setModalError("");
  }

  // ===== THÊM / SỬA DANH MỤC =====
  async function save(event) {
    event.preventDefault();

    if (saving) return;

    setModalError("");
    setError("");
    setMessage("");

    const payload = {
      maDanhMuc: String(form.maDanhMuc)
        .trim()
        .toUpperCase(),

      tenDanhMuc: String(form.tenDanhMuc).trim(),
      moTa: String(form.moTa || "").trim(),

      maDanhMucCha: form.maDanhMucCha
        ? String(form.maDanhMucCha)
        : null,

      thuTuHienThi: Number(form.thuTuHienThi),
      trangThai: form.trangThai
    };

    // Kiểm tra mã danh mục
    if (!/^[A-Z0-9_-]{1,50}$/.test(payload.maDanhMuc)) {
      setModalError(
        "Mã danh mục phải có 1–50 ký tự, chỉ gồm chữ in hoa, số, dấu - hoặc _."
      );
      return;
    }

    // Kiểm tra tên
    if (
      !payload.tenDanhMuc ||
      payload.tenDanhMuc.length > 150
    ) {
      setModalError(
        "Tên danh mục không được trống và tối đa 150 ký tự."
      );
      return;
    }

    // Kiểm tra mô tả
    if (payload.moTa.length > 1000) {
      setModalError("Mô tả tối đa 1000 ký tự.");
      return;
    }

    // Kiểm tra thứ tự
    if (
      !Number.isInteger(payload.thuTuHienThi) ||
      payload.thuTuHienThi < 0
    ) {
      setModalError(
        "Thứ tự hiển thị phải là số nguyên không âm."
      );
      return;
    }

    // Không cho chọn chính mình làm danh mục cha
    if (payload.maDanhMucCha === payload.maDanhMuc) {
      setModalError(
        "Danh mục không thể là danh mục cha của chính nó."
      );
      return;
    }

    try {
      setSaving(true);

      if (editing === "new") {
        await categoryAPI.create(payload);
      } else {
        await categoryAPI.update(editing, payload);
      }

      setEditing(null);
      setMessage(
        editing === "new"
          ? "Thêm danh mục thành công."
          : "Cập nhật danh mục thành công."
      );

      await load();
    } catch (err) {
      setModalError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // ===== XÓA DANH MỤC =====
  async function removeCategory(item) {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa danh mục "${item.TenDanhMuc}"?\n` +
      "Chỉ có thể xóa khi danh mục không chứa sản phẩm và không có danh mục con."
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await categoryAPI.remove(item.MaDanhMuc);

      setMessage("Xóa danh mục thành công.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ===== SẮP XẾP DANH MỤC =====
  async function moveCategory(item, delta) {
    const index = items.findIndex(
      (x) => x.MaDanhMuc === item.MaDanhMuc
    );

    const nextIndex = index + delta;

    if (
      index < 0 ||
      nextIndex < 0 ||
      nextIndex >= items.length
    ) {
      return;
    }

    const reordered = [...items];

    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index]
    ];

    try {
      setError("");
      setMessage("");

      await categoryAPI.reorder(
        reordered.map((x, i) => ({
          maDanhMuc: x.MaDanhMuc,
          thuTuHienThi: i + 1
        }))
      );

      setMessage("Đã cập nhật thứ tự danh mục.");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // ===== GIAO DIỆN =====
  return (
    <>
      {/* THANH TIÊU ĐỀ VÀ NÚT THÊM */}
      <div className="moc-toolbar">
        <p>
          Sắp xếp sản phẩm theo không gian sống •{" "}
          {items.length} danh mục
        </p>

        <button
          type="button"
          className="moc-primary"
          onClick={() => edit(null)}
        >
          + Thêm danh mục
        </button>
      </div>

      {/* TÌM KIẾM / LỌC */}
      <div className="moc-filters">
        <label>
          Tìm kiếm danh mục
          <input
            type="search"
            placeholder="Nhập mã hoặc tên danh mục..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>

        <label>
          Trạng thái
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Hiển thị">Hiển thị</option>
            <option value="Tạm ẩn">Tạm ẩn</option>
          </select>
        </label>
      </div>

      {/* THÔNG BÁO */}
      {error && (
        <p className="moc-alert danger" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="moc-alert ok" role="status">
          {message}
        </p>
      )}

      {/* BẢNG DANH MỤC */}
      <div className="moc-table-wrap">
        <table className="moc-table">
          <thead>
            <tr>
              <th>Mã danh mục</th>
              <th>Tên danh mục</th>
              <th>Mô tả</th>
              <th>Danh mục cha</th>
              <th>Số SP</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  Đang tải danh sách danh mục...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  Chưa có danh mục phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.MaDanhMuc}>
                  <td>{item.MaDanhMuc}</td>
                  <td>{item.TenDanhMuc}</td>
                  <td>{item.MoTa || "—"}</td>
                  <td>{item.TenDanhMucCha || "—"}</td>
                  <td>{item.SoSanPham ?? 0}</td>

                  <td>
                    <span
                      className={
                        "moc-tag " +
                        (item.TrangThai === "Hiển thị"
                          ? "ok"
                          : "warn")
                      }
                    >
                      {item.TrangThai}
                    </span>
                  </td>

                  <td className="moc-operations">
                    <button
                      type="button"
                      onClick={() => edit(item)}
                    >
                      Sửa
                    </button>

                    <button
                      type="button"
                      title="Chuyển lên"
                      onClick={() => moveCategory(item, -1)}
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      title="Chuyển xuống"
                      onClick={() => moveCategory(item, 1)}
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => removeCategory(item)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* GHI CHÚ */}
      <div className="moc-notice">
        Không xóa danh mục đang chứa sản phẩm hoặc có danh mục
        con. Thay đổi thứ tự bằng ↑ ↓; tránh tạo vòng lặp cha–con.
      </div>

      {/* MODAL THÊM / SỬA */}
      {editing !== null && (
        <div className="moc-overlay">
          <form
            className="moc-dialog"
            onSubmit={save}
            aria-label={
              editing === "new"
                ? "Thêm danh mục"
                : "Chỉnh sửa danh mục"
            }
          >
            <h2>
              {editing === "new"
                ? "Thêm danh mục"
                : "Chỉnh sửa danh mục"}
            </h2>

            {/* MÃ DANH MỤC */}
            <label>
              Mã danh mục *
              <input
                type="text"
                placeholder="Ví dụ: DM-PA001"
                maxLength={50}
                required
                value={form.maDanhMuc}
                disabled={editing !== "new"}
                onChange={(e) =>
                  updateForm(
                    "maDanhMuc",
                    e.target.value.toUpperCase()
                  )
                }
              />
            </label>

            {/* TÊN DANH MỤC */}
            <label>
              Tên danh mục *
              <input
                type="text"
                placeholder="Nhập tên danh mục"
                required
                maxLength={150}
                value={form.tenDanhMuc}
                onChange={(e) =>
                  updateForm("tenDanhMuc", e.target.value)
                }
              />
            </label>

            {/* MÔ TẢ */}
            <label>
              Mô tả
              <textarea
                rows={3}
                placeholder="Nhập mô tả danh mục"
                maxLength={1000}
                value={form.moTa}
                onChange={(e) =>
                  updateForm("moTa", e.target.value)
                }
              />
            </label>

            {/* DANH MỤC CHA */}
            <label>
              Danh mục cha
              <select
                value={form.maDanhMucCha}
                onChange={(e) =>
                  updateForm("maDanhMucCha", e.target.value)
                }
              >
                <option value="">
                  Không có (danh mục gốc)
                </option>

                {items
                  .filter(
                    (item) => item.MaDanhMuc !== editing
                  )
                  .map((item) => (
                    <option
                      key={item.MaDanhMuc}
                      value={item.MaDanhMuc}
                    >
                      {item.TenDanhMuc}
                    </option>
                  ))}
              </select>
            </label>

            {/* THỨ TỰ */}
            <label>
              Thứ tự hiển thị
              <input
                type="number"
                min={0}
                step={1}
                value={form.thuTuHienThi}
                onChange={(e) =>
                  updateForm(
                    "thuTuHienThi",
                    e.target.value
                  )
                }
              />
            </label>

            {/* TRẠNG THÁI */}
            <label>
              Trạng thái
              <select
                value={form.trangThai}
                onChange={(e) =>
                  updateForm("trangThai", e.target.value)
                }
              >
                <option value="Hiển thị">
                  Hiển thị
                </option>

                <option value="Tạm ẩn">
                  Tạm ẩn
                </option>
              </select>
            </label>

            {/* LỖI TRONG MODAL */}
            {modalError && (
              <p className="moc-alert danger" role="alert">
                {modalError}
              </p>
            )}

            {/* NÚT THAO TÁC */}
            <div className="moc-dialog-actions">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="moc-primary"
                disabled={saving}
              >
                {saving
                  ? "Đang lưu..."
                  : "Lưu danh mục"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
