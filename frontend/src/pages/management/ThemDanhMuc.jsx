import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, ImagePlus, Trash2 } from "lucide-react";

import WorkspaceLayout from "../../components/WorkspaceLayout";

import {
  categoryCode,
  categoryImage,
  getCategory,
  saveCategory
} from "../../services/categoryService";

import "../../styles/themSanPham.css";
import "../../styles/quanLyDanhMuc.css";

function Field({
  label,
  required,
  hint,
  error,
  children
}) {
  return (
    <label className="sp-field">
      <span className="sp-label">
        {label}{required && " *"}
      </span>

      {children}

      {error ? (
        <small className="sp-error">{error}</small>
      ) : hint && (
        <small className="sp-hint">{hint}</small>
      )}
    </label>
  );
}

function CategoryEditor({ item, base }) {
  const navigate = useNavigate();

  const initial = {
    tenDanhMuc: item?.TenDanhMuc || "",
    moTa: item?.MoTa || "",
    hienThi: item ? Boolean(item.HienThi) : true,
    xoaAnh: false
  };

  const [form, setForm] = useState(initial);
  const [image, setImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);

  const fileInput = useRef(null);
  const previewRef = useRef("");
  const savingRef = useRef(false);
  const formRef = useRef(null);

  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial) ||
    Boolean(image);

  const title = item
    ? "Chỉnh sửa danh mục"
    : "Thêm danh mục";

  const preview =
    image?.url ||
    (form.xoaAnh ? null : categoryImage(item?.HinhAnh));

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!dirty || saving) return;

    const warn = e => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty, saving]);

  const set = name => e => {
    setForm(f => ({
      ...f,
      [name]: e.target.value
    }));

    setErrors(er => ({
      ...er,
      [name]: undefined
    }));
  };

  function chooseImage(e) {
    const file = e.target.files[0];
    e.target.value = "";

    if (!file) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      setErrors(er => ({
        ...er,
        hinhAnh: "Chỉ nhận JPG, PNG, WEBP tối đa 5 MB."
      }));
      return;
    }

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    previewRef.current = URL.createObjectURL(file);

    setImage({
      file,
      url: previewRef.current
    });

    setForm(f => ({
      ...f,
      xoaAnh: false
    }));

    setErrors(er => ({
      ...er,
      hinhAnh: undefined
    }));
  }

  function removeImage() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    previewRef.current = "";
    setImage(null);

    setForm(f => ({
      ...f,
      xoaAnh: true
    }));

    setErrors(er => ({
      ...er,
      hinhAnh: undefined
    }));
  }

  function back() {
    if (savingRef.current) return;

    if (
      !dirty ||
      window.confirm(
        "Thông tin chưa được lưu. Bạn có muốn quay lại danh sách?"
      )
    ) {
      navigate(`${base}/danh-muc`);
    }
  }

  async function submit(e) {
    e.preventDefault();

    if (savingRef.current) return;

    const er = {};

    if (!form.tenDanhMuc.trim()) {
      er.tenDanhMuc = "Vui lòng nhập tên danh mục.";
    } else if (form.tenDanhMuc.trim().length > 150) {
      er.tenDanhMuc = "Tên danh mục tối đa 150 ký tự.";
    }

    if (form.moTa.length > 1000) {
      er.moTa = "Mô tả tối đa 1.000 ký tự.";
    }

    setErrors(er);
    setServerError("");

    if (Object.keys(er).length) {
      formRef.current
        .querySelector(`[name="${Object.keys(er)[0]}"]`)
        ?.focus();

      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const response = await saveCategory(
        item?.MaDanhMuc,
        {
          ...form,
          tenDanhMuc: form.tenDanhMuc.trim()
        },
        image?.file
      );

      navigate(`${base}/danh-muc`, {
        replace: true,
        state: {
          categoryMessage: response.message
        }
      });
    } catch (err) {
      setServerError(err.message);

      if (err.field) {
        setErrors(er => ({
          ...er,
          [err.field]: err.message
        }));

        formRef.current
          .querySelector(`[name="${err.field}"]`)
          ?.focus();
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const checklist = [
    [
      Boolean(form.tenDanhMuc.trim()),
      "Đã nhập tên danh mục"
    ],
    [
      form.tenDanhMuc.trim().length <= 150 &&
      form.moTa.length <= 1000,
      "Nội dung trong giới hạn cho phép"
    ],
    [
      Boolean(preview),
      "Có hình đại diện (không bắt buộc)"
    ]
  ];

  return (
    <div className="dm-editor">
      <div className="workspace-breadcrumb">
        Quản trị / Danh mục / {title}
      </div>

      <div className="workspace-head">
        <h1>{title}</h1>

        <p>
          {item
            ? "Cập nhật thông tin, hình ảnh và trạng thái hiển thị của danh mục."
            : "Tạo danh mục để sắp xếp sản phẩm theo từng không gian sống."}
        </p>
      </div>

      <nav
        className="sp-steps"
        aria-label="Các phần của biểu mẫu"
      >
        {[
          ["dm-basic", "1. Thông tin cơ bản"],
          ["dm-image", "2. Hình ảnh"],
          ["dm-status", "3. Trạng thái"]
        ].map(([id, text]) => (
          <button
            type="button"
            key={id}
            onClick={() => {
              document.getElementById(id)?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
            }}
          >
            {text}
          </button>
        ))}
      </nav>

      {serverError && (
        <div className="sp-alert" role="alert">
          {serverError}
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
      >
        <fieldset
          className="dm-editor-fields"
          disabled={saving}
        >
          <div className="sp-layout">
            <div className="sp-col">
              <section
                className="workspace-panel"
                id="dm-basic"
              >
                <h2>Thông tin cơ bản</h2>

                <Field
                  label="Tên danh mục"
                  required
                  error={errors.tenDanhMuc}
                  hint="Tên danh mục phải duy nhất, tối đa 150 ký tự."
                >
                  <input
                    name="tenDanhMuc"
                    value={form.tenDanhMuc}
                    onChange={set("tenDanhMuc")}
                    maxLength={150}
                    required
                    aria-invalid={Boolean(errors.tenDanhMuc)}
                    placeholder="Ví dụ: Phòng khách"
                  />
                </Field>

                <Field
                  label="Mã danh mục"
                  hint="Mã do hệ thống tạo và được giữ nguyên khi chỉnh sửa."
                >
                  <input
                    readOnly
                    value={
                      item
                        ? categoryCode(item.MaDanhMuc)
                        : "Tự động tạo sau khi lưu"
                    }
                  />
                </Field>

                <Field
                  label="Mô tả"
                  error={errors.moTa}
                  hint={`${form.moTa.length}/1.000 ký tự`}
                >
                  <textarea
                    name="moTa"
                    aria-label="Mô tả"
                    rows={6}
                    value={form.moTa}
                    onChange={set("moTa")}
                    maxLength={1000}
                    aria-invalid={Boolean(errors.moTa)}
                    placeholder="Mô tả các sản phẩm và không gian sử dụng của danh mục..."
                  />
                </Field>
              </section>

              <section
                className="workspace-panel"
                id="dm-image"
              >
                <h2>Hình ảnh danh mục</h2>

                <div className="sp-main-image dm-category-image">
                  <div className="sp-main-preview">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Hình đại diện danh mục"
                      />
                    ) : (
                      <span className="dm-image-placeholder">
                        <ImagePlus size={30} />
                        Chưa có hình đại diện
                      </span>
                    )}
                  </div>

                  <div className="dm-image-info">
                    <span className="sp-badge">
                      Hình đại diện
                    </span>

                    <p className="sp-filename">
                      {image?.file.name ||
                        (preview
                          ? "Hình đại diện hiện tại"
                          : "Chưa chọn hình ảnh")}
                    </p>

                    <p className="sp-hint">
                      JPG, PNG, WEBP • Tối đa 5 MB.
                      Nên chọn ảnh rõ nét, cùng tỷ lệ
                      với các danh mục khác.
                    </p>

                    <input
                      ref={fileInput}
                      className="dm-file-input"
                      type="file"
                      name="hinhAnh"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={chooseImage}
                      aria-label="Chọn hình đại diện"
                    />

                    <div className="dm-image-buttons">
                      <button
                        type="button"
                        className="sp-btn sp-btn-outline"
                        onClick={() => fileInput.current.click()}
                      >
                        {preview
                          ? "Thay hình đại diện"
                          : "Chọn hình đại diện"}
                      </button>

                      {preview && (
                        <button
                          type="button"
                          className="sp-btn sp-btn-outline"
                          onClick={removeImage}
                        >
                          <Trash2 size={14} />
                          Xóa ảnh
                        </button>
                      )}
                    </div>

                    {errors.hinhAnh && (
                      <p className="sp-error" role="alert">
                        {errors.hinhAnh}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <aside className="sp-col">
              <section
                className="workspace-panel"
                id="dm-status"
              >
                <h2>Trạng thái hiển thị</h2>

                <Field
                  label="Trạng thái"
                  required
                  hint="Tạm ẩn để ẩn danh mục và sản phẩm thuộc danh mục khỏi danh sách công khai. Dữ liệu quản trị vẫn được giữ."
                >
                  <select
                    value={String(form.hienThi)}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        hienThi: e.target.value === "true"
                      }));
                    }}
                  >
                    <option value="true">
                      Đang hiển thị
                    </option>

                    <option value="false">
                      Tạm ẩn
                    </option>
                  </select>
                </Field>
              </section>

              <section className="workspace-panel">
                <h2>Sản phẩm liên quan</h2>

                <p className="dm-related-number">
                  {item?.SoSanPham || 0}
                </p>

                <p className="sp-hint">
                  {item
                    ? "Sản phẩm đang thuộc danh mục này. Chỉnh sửa thông tin danh mục không làm thay đổi sản phẩm hoặc lịch sử đơn hàng."
                    : "Lưu danh mục trước, sau đó chọn danh mục này khi thêm hoặc chỉnh sửa sản phẩm."}
                </p>
              </section>

              <section className="workspace-panel">
                <h2>Kiểm tra trước khi lưu</h2>

                <ul className="sp-checklist">
                  {checklist.map(([ok, text]) => (
                    <li
                      key={text}
                      className={ok ? "ok" : ""}
                    >
                      <Check size={13} />
                      {text}
                    </li>
                  ))}
                </ul>

                <small className="sp-hint">
                  Dấu * là trường bắt buộc.
                  Hệ thống kiểm tra tên trùng khi lưu.
                </small>
              </section>
            </aside>
          </div>

          <footer className="sp-footer">
            <span>
              {item
                ? `Đang chỉnh sửa ${categoryCode(item.MaDanhMuc)}`
                : "Bản nháp mới • Chưa tạo danh mục"}
            </span>

            <div>
              <button
                type="button"
                className="sp-btn sp-btn-outline"
                onClick={back}
              >
                Quay lại
              </button>

              <button
                type="submit"
                className="sp-btn sp-btn-dark"
              >
                {saving
                  ? "Đang lưu..."
                  : item
                    ? "Lưu thay đổi"
                    : "Lưu danh mục"}
              </button>
            </div>
          </footer>
        </fieldset>
      </form>
    </div>
  );
}

export default function ThemDanhMuc({
  user,
  mode = "manager"
}) {
  const { maDanhMuc } = useParams();
  const base = mode === "admin" ? "/admin" : "/quan-ly";

  const [state, setState] = useState({
    loading: Boolean(maDanhMuc),
    item: null,
    error: ""
  });

  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!maDanhMuc) return;

    let live = true;

    getCategory(maDanhMuc)
      .then(response => {
        if (live) {
          setState({
            loading: false,
            item: response.data,
            error: ""
          });
        }
      })
      .catch(err => {
        if (live) {
          setState({
            loading: false,
            item: null,
            error: err.message
          });
        }
      });

    return () => {
      live = false;
    };
  }, [maDanhMuc, retry]);

  return (
    <WorkspaceLayout
      user={user}
      mode={mode}
      activeTitle="Danh mục"
    >
      {maDanhMuc && state.loading ? (
        <p role="status">
          Đang tải thông tin danh mục...
        </p>
      ) : maDanhMuc && state.error ? (
        <div className="sp-alert" role="alert">
          {state.error}

          {" "}

          <button
            type="button"
            className="sp-btn sp-btn-outline"
            onClick={() => {
              setState(s => ({
                ...s,
                loading: true
              }));
              setRetry(n => n + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <CategoryEditor
          key={maDanhMuc || "new"}
          item={maDanhMuc ? state.item : null}
          base={base}
        />
      )}
    </WorkspaceLayout>
  );
}