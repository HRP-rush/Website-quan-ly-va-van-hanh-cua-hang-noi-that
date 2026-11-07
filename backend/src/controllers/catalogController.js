// API đọc công khai: không tiết lộ giá nhập hoặc các sản phẩm đang ẩn.
const { sql, getPool } = require('../config/db');
const { DON_DANG_GIU_HANG } = require('../config/donHang');

const heldStates = DON_DANG_GIU_HANG.map((s)=>`N'${s.replace(/'/g,"''")}'`).join(',');
const base = `
  FROM dbo.SanPham sp
  INNER JOIN dbo.DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
  OUTER APPLY (
    SELECT TOP (1) a.DuongDan FROM dbo.AnhSanPham a
    WHERE a.MaSanPham = sp.MaSanPham
    ORDER BY a.LaAnhDaiDien DESC, a.MaAnh ASC
  ) anh
  OUTER APPLY (
    SELECT MIN(CASE WHEN b.TrangThai = N'Đang bán' THEN b.GiaBan END) AS GiaMin,
           SUM(CASE WHEN b.TrangThai = N'Đang bán' THEN
               CASE WHEN ISNULL(t.SoLuongTon,0)>ISNULL(hold.DaGiu,0)
                 THEN ISNULL(t.SoLuongTon,0)-ISNULL(hold.DaGiu,0) ELSE 0 END
               ELSE 0 END) AS Ton
    FROM dbo.BienTheSanPham b
    LEFT JOIN dbo.TonKho t ON t.MaBienThe = b.MaBienThe
    OUTER APPLY (SELECT SUM(ct.SoLuong) AS DaGiu FROM dbo.CTDonHang ct
      INNER JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon
      WHERE ct.MaBienThe=b.MaBienThe AND dh.TrangThai IN (${heldStates})) hold
    WHERE b.MaSanPham = sp.MaSanPham
  ) tong
  WHERE sp.TrangThai = N'Đang bán'`;
async function danhSach(req,res){
 try {
  const pool=await getPool();
  const rs=await pool.request().query(`
   SELECT sp.MaSanPham,sp.TenSanPham,sp.MoTaNgan,sp.MoTa,sp.PhongCach,
   sp.ChatLieuChinh,sp.TrangThai,dm.TenDanhMuc,sp.MaDanhMuc,
   COALESCE(sp.GiaCoBan,tong.GiaMin) AS GiaBan,tong.Ton AS SoLuongTon,
   anh.DuongDan AS DuongDanAnh
   ${base} ORDER BY sp.NgayTao DESC,sp.MaSanPham ASC`);
  res.json({success:true,data:rs.recordset,total:rs.recordset.length});
 }catch(e){console.error('Catalog list:',e.message);res.status(500).json({success:false,message:'Không tải được sản phẩm công khai. Kiểm tra cấu trúc bảng và kết nối SQL Server.'});}
}
async function chiTiet(req,res){
 const id=String(req.params.maSanPham||'').trim();
 if(!id || id.length>50) return res.status(400).json({success:false,message:'Mã sản phẩm không hợp lệ.'});
 try{
  const pool=await getPool();const request=()=>pool.request().input('ma',sql.VarChar(50),id);
  const [item,images,variants]=await Promise.all([
   request().query(`SELECT TOP(1) sp.MaSanPham,sp.TenSanPham,sp.MoTaNgan,sp.MoTa,
     sp.GiaCoBan,sp.PhongCach,sp.ChatLieuChinh,sp.HuongDanBaoQuan,sp.ThongSoKyThuat,
     sp.TrangThai,sp.MaDanhMuc,dm.TenDanhMuc,
     COALESCE(sp.GiaCoBan,tong.GiaMin) AS GiaBan, tong.Ton AS SoLuongTon,
     anh.DuongDan AS DuongDanAnh ${base} AND sp.MaSanPham=@ma`),
   request().query(`SELECT a.MaAnh,a.DuongDan,a.LaAnhDaiDien,a.MaBienThe
     FROM dbo.AnhSanPham a INNER JOIN dbo.SanPham sp ON sp.MaSanPham=a.MaSanPham
     WHERE a.MaSanPham=@ma AND sp.TrangThai=N'Đang bán'
     ORDER BY a.LaAnhDaiDien DESC,a.MaAnh ASC`),
   request().query(`SELECT b.MaBienThe,b.SKU,b.MauSac,b.ChatLieu,b.KichThuoc,b.GiaBan,
     CASE WHEN ISNULL(t.SoLuongTon,0)>ISNULL(hold.DaGiu,0)
      THEN ISNULL(t.SoLuongTon,0)-ISNULL(hold.DaGiu,0) ELSE 0 END AS SoLuongTon
     FROM dbo.BienTheSanPham b INNER JOIN dbo.SanPham sp ON sp.MaSanPham=b.MaSanPham
     LEFT JOIN dbo.TonKho t ON t.MaBienThe=b.MaBienThe
     OUTER APPLY (SELECT SUM(ct.SoLuong) AS DaGiu FROM dbo.CTDonHang ct
       INNER JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon
       WHERE ct.MaBienThe=b.MaBienThe AND dh.TrangThai IN (${heldStates})) hold
     WHERE b.MaSanPham=@ma AND sp.TrangThai=N'Đang bán' AND b.TrangThai=N'Đang bán'
     ORDER BY b.MaBienThe`)
  ]);
  if(!item.recordset.length) return res.status(404).json({success:false,message:'Sản phẩm không tồn tại hoặc không được công khai.'});
  res.json({success:true,data:{...item.recordset[0],Anh:images.recordset,BienThe:variants.recordset}});
 }catch(e){console.error('Catalog detail:',e.message);res.status(500).json({success:false,message:'Không thể tải chi tiết sản phẩm.'});}
}
module.exports={danhSach,chiTiet};
