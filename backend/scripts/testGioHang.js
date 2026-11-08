require("dotenv").config();

const { sql, getPool } = require("../src/config/db");

const testProduct = {
  productId: "TEST-CART-001",
  variantId: "TEST-CART-SKU-001",
  name: "[TEST] Sản phẩm thử giỏ hàng",
  categoryName: "phòng ngủ",
  price: 1890000,
  quantity: 10
};

function ensureDevelopment() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Chỉ chạy dữ liệu thử giỏ hàng khi NODE_ENV=development.");
  }
}

async function seedTestProduct() {
  ensureDevelopment();
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    const category = await new sql.Request(transaction)
      .input("name", sql.NVarChar(100), testProduct.categoryName)
      .query("SELECT TOP (1) MaDanhMuc FROM dbo.DanhMuc WHERE TenDanhMuc = @name");

    if (!category.recordset[0]) {
      throw new Error(`Không tìm thấy danh mục "${testProduct.categoryName}".`);
    }

    const existingProduct = await new sql.Request(transaction)
      .input("id", sql.VarChar(50), testProduct.productId)
      .query("SELECT MaSanPham, TenSanPham FROM dbo.SanPham WHERE MaSanPham = @id");

    if (existingProduct.recordset[0] && existingProduct.recordset[0].TenSanPham !== testProduct.name) {
      throw new Error(`Mã ${testProduct.productId} đã được dùng cho sản phẩm khác.`);
    }

    if (!existingProduct.recordset[0]) {
      await new sql.Request(transaction)
        .input("id", sql.VarChar(50), testProduct.productId)
        .input("category", sql.VarChar(50), category.recordset[0].MaDanhMuc)
        .input("name", sql.NVarChar(250), testProduct.name)
        .input("description", sql.NVarChar(500), "Dữ liệu tạm để kiểm tra luồng giỏ hàng.")
        .input("price", sql.Decimal(18, 2), testProduct.price)
        .query(`
          INSERT INTO dbo.SanPham
            (MaSanPham, MaDanhMuc, TenSanPham, MoTaNgan, GiaCoBan, TrangThai)
          VALUES
            (@id, @category, @name, @description, @price, N'Đang bán')
        `);
    }

    const existingVariant = await new sql.Request(transaction)
      .input("id", sql.VarChar(80), testProduct.variantId)
      .query("SELECT MaBienThe, MaSanPham FROM dbo.BienTheSanPham WHERE MaBienThe = @id");

    if (existingVariant.recordset[0] && existingVariant.recordset[0].MaSanPham !== testProduct.productId) {
      throw new Error(`Mã biến thể ${testProduct.variantId} đã được dùng cho sản phẩm khác.`);
    }

    if (!existingVariant.recordset[0]) {
      await new sql.Request(transaction)
        .input("id", sql.VarChar(80), testProduct.variantId)
        .input("product", sql.VarChar(50), testProduct.productId)
        .input("price", sql.Decimal(18, 2), testProduct.price)
        .query(`
          INSERT INTO dbo.BienTheSanPham
            (MaBienThe, MaSanPham, SKU, ChatLieu, KichThuoc, GiaBan, TrangThai)
          VALUES
            (@id, @product, @id, N'Vải linen mẫu', N'100 × 100 × 80 cm', @price, N'Đang bán')
        `);
    }

    await new sql.Request(transaction)
      .input("id", sql.VarChar(80), testProduct.variantId)
      .input("quantity", sql.Int, testProduct.quantity)
      .input("warning", sql.Int, 2)
      .query(`
        UPDATE dbo.TonKho
        SET SoLuongTon = @quantity, MucCanhBao = @warning
        WHERE MaBienThe = @id;
        IF @@ROWCOUNT = 0
          INSERT INTO dbo.TonKho (MaBienThe, SoLuongTon, MucCanhBao)
          VALUES (@id, @quantity, @warning);
      `);

    await transaction.commit();
    console.log(`Đã tạo dữ liệu thử: ${testProduct.productId} / ${testProduct.variantId}, tồn kho ${testProduct.quantity}.`);
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  } finally {
    await pool.close();
  }
}

async function removeTestProduct() {
  ensureDevelopment();
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const product = await new sql.Request(transaction)
      .input("id", sql.VarChar(50), testProduct.productId)
      .query("SELECT TenSanPham FROM dbo.SanPham WHERE MaSanPham = @id");

    if (!product.recordset[0]) {
      await transaction.commit();
      console.log("Không có sản phẩm thử để dọn.");
      return;
    }

    if (product.recordset[0].TenSanPham !== testProduct.name) {
      throw new Error(`Mã ${testProduct.productId} không phải sản phẩm do script thử nghiệm tạo.`);
    }

    const references = await new sql.Request(transaction)
      .input("id", sql.VarChar(80), testProduct.variantId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.CTGioHang WHERE MaBienThe = @id) AS CartReferences,
          (SELECT COUNT(*) FROM dbo.CTDonHang WHERE MaBienThe = @id) AS OrderReferences
      `);
    const { CartReferences, OrderReferences } = references.recordset[0];

    if (CartReferences > 0 || OrderReferences > 0) {
      await new sql.Request(transaction)
        .input("id", sql.VarChar(80), testProduct.variantId)
        .query("UPDATE dbo.TonKho SET SoLuongTon = 0 WHERE MaBienThe = @id");
      await new sql.Request(transaction)
        .input("id", sql.VarChar(80), testProduct.variantId)
        .query("UPDATE dbo.BienTheSanPham SET TrangThai = N'Ngừng bán' WHERE MaBienThe = @id");
      await new sql.Request(transaction)
        .input("id", sql.VarChar(50), testProduct.productId)
        .query("UPDATE dbo.SanPham SET TrangThai = N'Tạm ẩn' WHERE MaSanPham = @id");
      await transaction.commit();
      console.log("Sản phẩm thử đã được ẩn và đặt tồn kho về 0 vì đang được giỏ hàng/đơn hàng tham chiếu.");
      return;
    }

    await new sql.Request(transaction)
      .input("id", sql.VarChar(80), testProduct.variantId)
      .query("DELETE FROM dbo.TonKho WHERE MaBienThe = @id");
    await new sql.Request(transaction)
      .input("id", sql.VarChar(80), testProduct.variantId)
      .query("DELETE FROM dbo.BienTheSanPham WHERE MaBienThe = @id");
    await new sql.Request(transaction)
      .input("id", sql.VarChar(50), testProduct.productId)
      .query("DELETE FROM dbo.SanPham WHERE MaSanPham = @id");

    await transaction.commit();
    console.log("Đã xóa sản phẩm thử và tồn kho thử.");
  } catch (error) {
    await transaction.rollback().catch(() => {});
    throw error;
  } finally {
    await pool.close();
  }
}

const action = process.argv[2] || "seed";
const run = action === "cleanup" ? removeTestProduct : seedTestProduct;

run().catch((error) => {
  console.error("Không thể xử lý dữ liệu thử giỏ hàng:", error.message);
  process.exitCode = 1;
});
