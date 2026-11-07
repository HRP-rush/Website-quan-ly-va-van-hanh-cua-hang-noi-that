
import { useCallback, useEffect, useMemo, useState } from "react";
import { accountAPI } from "../../services/accountApi";

const INITIAL_FORM = {
  hoTen: "",
  email: "",
  soDienThoai: "",
  matKhau: "",
  vaiTro: "Khách hàng"
};

const ALLOWED_ROLES = ["Khách hàng", "Nhân viên", "Quản lý"];

function errorText(error) {
  return error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
}

export default function AccountManagement({
  user,
  type = "staff"
}) {
  const isCustomer = type === "customers";

  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);

  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  // ===== TẢI DANH SÁCH =====
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await accountAPI.list({
        vaiTro: isCustomer ? "Khách hàng" : "",
        q: query,
        trangThai: statusFilter
      });

      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : [];

      // Không dùng họ tên để phân loại vai trò.
      const scoped = list.filter((item) =>
        isCustomer
          ? item.TenVaiTro === "Khách hàng"
          : ["Nhân viên", "Quản lý"].includes(item.TenVaiTro)
      );

      setUsers(scoped);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [isCustomer, query, statusFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ===== LỌC VAI TRÒ =====
  const filtered = useMemo(() => {
    return users.filter(
      (item) => !roleFilter || item.TenVaiTro === roleFilter
    );
  }, [users, roleFilter]);

  const activeCount = filtered.filter(
    (item) => item.TrangThai === "Hoạt động"
  ).length;

  // ===== MỞ BIỂU MẪU =====
  function open(item = null) {
    setEditId(item ? item.MaNguoiDung : null);

    setForm(
      item
        ? {
            hoTen: item.HoTen || "",
            email: item.Email || "",
            soDienThoai: item.SoDienThoai || "",
            matKhau: "",
            vaiTro: item.TenVaiTro
          }
        : {
            ...INITIAL_FORM,
            vaiTro: isCustomer ? "Khách hàng" : "Nhân viên"
          }
    );

    setModalError("");
    setMessage("");
  }

  function updateField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));

    setModalError("");
  }

  // ===== TẠO / CẬP NHẬT TÀI KHOẢN =====
  async function save(event) {
    event.preventDefault();
    if (saving || !form) return;

    setModalError("");
    setMessage("");

    const payload = {
      hoTen: form.hoTen.trim(),
      email: form.email.trim().toLowerCase(),
      soDienThoai: form.soDienThoai.trim()
    };

    if (!payload.hoTen || !payload.email) {
      setModalError("Vui lòng nhập họ tên và email.");
      return;
    }

    if (payload.hoTen.length > 150) {
      setModalError("Họ tên không được vượt quá 150 ký tự.");
      return;
    }

    if (
      payload.soDienThoai &&
      !/^0[0-9]{9,10}$/.test(payload.soDienThoai)
    ) {
      setModalError("Số điện thoại không hợp lệ.");
      return;
    }

    try {
      setSaving(true);

      if (editId !== null) {
        // SỬA: không gửi vaiTro, không sửa mật khẩu.
        await accountAPI.update(editId, payload);
      } else {
        const selectedRole = isCustomer
          ? "Khách hàng"
          : form.vaiTro;

        if (!ALLOWED_ROLES.includes(selectedRole)) {
          setModalError("Vai trò không hợp lệ.");
          return;
        }

        if (
          !form.matKhau ||
          form.matKhau.length < 8 ||
          !/[A-Z]/.test(form.matKhau) ||
          !/[a-z]/.test(form.matKhau) ||
          !/[0-9]/.test(form.matKhau) ||
          new TextEncoder().encode(form.matKhau).length > 72
        ) {
          setModalError(
            "Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và không quá 72 byte."
          );
          return;
        }

        // THÊM: chỉ lần tạo mới mới có vaiTro.
        await accountAPI.create({
          ...payload,
          matKhau: form.matKhau,
          vaiTro: selectedRole
        });
      }

      setForm(null);
      setEditId(null);

      setMessage(
        editId !== null
          ? "Cập nhật thông tin tài khoản thành công."
          : "Tạo tài khoản thành công."
      );

      await reload();
    } catch (err) {
      setModalError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  // ===== KHÓA / MỞ / XÓA MỀM =====
  async function handleAction(item, kind) {
    if (busyId !== null) return;

    if (item.MaNguoiDung === user?.MaNguoiDung) {
      setError("Bạn không thể thực hiện thao tác này với chính mình.");
      return;
    }

    const nextStatus =
      item.TrangThai === "Hoạt động" ? "Đã khóa" : "Hoạt động";

    const description =
      kind === "delete"
        ? `Xóa mềm tài khoản "${item.HoTen || item.Email}"?`
        : `${nextStatus === "Đã khóa" ? "Khóa" : "Mở khóa"} tài khoản "${item.Email}"?`;

    if (!window.confirm(description)) return;

    try {
      setBusyId(item.MaNguoiDung);
      setError("");
      setMessage("");

      if (kind === "delete") {
        await accountAPI.remove(item.MaNguoiDung);
      } else {
        await accountAPI.status(item.MaNguoiDung, nextStatus);
      }

      setMessage("Thao tác đã được thực hiện thành công.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="moc-toolbar">
        <p>
          {isCustomer
            ? "Tra cứu hồ sơ, lịch sử mua hàng và trạng thái tài khoản khách hàng."
            : "Quản lý tài khoản nhân viên và quản lý cửa hàng."}
        </p>

        <button
          className="moc-primary"
          type="button"
          onClick={() => open()}
        >
          {isCustomer
            ? "+ Thêm khách hàng"
            : "+ Tạo tài khoản"}
        </button>
      </div>

      {/* THỐNG KÊ */}
      <div className="moc-kpis">
        <article>
          <span>
            {isCustomer ? "Khách hàng" : "Tài khoản nội bộ"}
          </span>
          <b>{String(filtered.length).padStart(2, "0")}</b>
        </article>

        <article>
          <span>Đang hoạt động</span>
          <b>{String(activeCount).padStart(2, "0")}</b>
        </article>

        <article>
          <span>Đã khóa / vô hiệu hóa</span>
          <b>
            {String(filtered.length - activeCount).padStart(2, "0")}
          </b>
        </article>
      </div>

      {/* BỘ LỌC */}
      <div className="moc-filters">
        <label>
          Tìm kiếm
          <input
            placeholder="Tìm tên, email, điện thoại..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>

        {!isCustomer && (
          <label>
            Vai trò
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Tất cả vai trò</option>
              <option value="Nhân viên">Nhân viên</option>
              <option value="Quản lý">Quản lý</option>
            </select>
          </label>
        )}

        <label>
          Trạng thái
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="Hoạt động">Hoạt động</option>
            <option value="Đã khóa">Đã khóa</option>
            <option value="Đã xóa">Đã xóa</option>
          </select>
        </label>
      </div>

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

      {/* BẢNG TÀI KHOẢN */}
      <div className="moc-table-wrap">
        <table className="moc-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Điện thoại</th>
              {!isCustomer && <th>Vai trò</th>}
              {isCustomer && <th>Số đơn</th>}
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isCustomer ? 7 : 7}>
                  Đang tải tài khoản...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  Không tìm thấy tài khoản phù hợp.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.MaNguoiDung}>
                  <td>
                    {isCustomer ? "KH" : "TK"}-
                    {String(item.MaNguoiDung).padStart(3, "0")}
                  </td>

                  <td>{item.HoTen || "Chưa cập nhật"}</td>
                  <td>{item.Email}</td>
                  <td>{item.SoDienThoai || "—"}</td>

                  {!isCustomer && <td>{item.TenVaiTro}</td>}
                  {isCustomer && <td>{item.SoDon ?? 0}</td>}

                  <td>
                    <span
                      className={
                        "moc-tag " +
                        (item.TrangThai === "Hoạt động"
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
                      onClick={() => open(item)}
                    >
                      Xem / Sửa
                    </button>

                    {item.TrangThai !== "Đã xóa" && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => handleAction(item, "status")}
                      >
                        {item.TrangThai === "Hoạt động"
                          ? "Khóa"
                          : "Mở"}
                      </button>
                    )}

                    {item.TrangThai !== "Đã xóa" && (
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => handleAction(item, "delete")}
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="moc-notice">
        Admin và Quản lý được tạo tài khoản Khách hàng,
        Nhân viên hoặc Quản lý. Vai trò chỉ được chọn khi tạo
        mới và không thể thay đổi trong chức năng chỉnh sửa.
        Xóa tài khoản là xóa mềm để giữ lịch sử nghiệp vụ.
      </p>

      {/* MODAL THÊM / SỬA */}
      {form !== null && (
        <div className="moc-overlay">
          <form className="moc-dialog" onSubmit={save}>
            <h2>
              {editId !== null
                ? "Thông tin tài khoản"
                : "Tạo tài khoản mới"}
            </h2>

            <label>
              Họ và tên *
              <input
                required
                maxLength={150}
                value={form.hoTen}
                onChange={(e) =>
                  updateField("hoTen", e.target.value)
                }
              />
            </label>

            <label>
              Email *
              <input
                required
                type="email"
                maxLength={254}
                value={form.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
              />
            </label>

            <label>
              Số điện thoại
              <input
                type="tel"
                value={form.soDienThoai}
                onChange={(e) =>
                  updateField("soDienThoai", e.target.value)
                }
              />
            </label>

            {editId === null ? (
              <>
                <label>
                  Vai trò tài khoản *
                  <select
                    value={form.vaiTro}
                    disabled={isCustomer}
                    onChange={(e) =>
                      updateField("vaiTro", e.target.value)
                    }
                  >
                    {ALLOWED_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Mật khẩu ban đầu *
                  <input
                    required
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={form.matKhau}
                    onChange={(e) =>
                      updateField("matKhau", e.target.value)
                    }
                  />
                </label>
              </>
            ) : (
              <label>
                Vai trò hiện tại
                <input
                  value={form.vaiTro}
                  disabled
                  readOnly
                />
              </label>
            )}

            {modalError && (
              <p className="moc-alert danger" role="alert">
                {modalError}
              </p>
            )}

            <div className="moc-dialog-actions">
              <button
                type="button"
                disabled={saving}
                onClick={() => setForm(null)}
              >
                Hủy
              </button>

              <button
                type="submit"
                className="moc-primary"
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu tài khoản"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
