const {sql,getPool}=require("../config/db");
const fail=(status,message)=>Object.assign(new Error(message),{status});
function id(value){const n=Number(value);if(!Number.isSafeInteger(n)||n<1||n>2147483647)throw fail(400,"Mã đơn/đánh giá không hợp lệ.");return n;}
function report(res,e){if([2601,2627].includes(e.number||e.originalError?.info?.number))return res.status(409).json({success:false,message:"Bạn đã đánh giá sản phẩm trong đơn này."});if(!e.status)console.error("Phản hồi:",e.message);return res.status(e.status||500).json({success:false,message:e.status?e.message:"Không thể xử lý phản hồi. Kiểm tra DB và migration 08."});}
async function order(req,res){
 try{
  const pool=await getPool(),ma=id(req.params.id);
  const head=await pool.request().input("order",sql.Int,ma).input("user",sql.Int,req.user.MaNguoiDung).query(`SELECT MaDon,TrangThai,NgayDat FROM dbo.DonHang WHERE MaDon=@order AND MaNguoiDung=@user`);
  if(!head.recordset.length)throw fail(404,"Không tìm thấy đơn hàng của bạn.");
  const rows=await pool.request().input("order",sql.Int,ma).input("user",sql.Int,req.user.MaNguoiDung).query(`
    SELECT ct.MaCTDon,ct.TenSanPhamSnapshot AS TenSanPham,ct.CauHinhSnapshot AS CauHinh,ct.SKUSnapshot AS SKU,
      d.MaDanhGia,d.SoSao,d.TieuDe,d.NoiDung,d.NgayDanhGia,d.TrangThaiDuyet
    FROM dbo.CTDonHang ct LEFT JOIN dbo.DanhGia d ON d.MaCTDon=ct.MaCTDon AND d.MaNguoiDung=@user
    WHERE ct.MaDon=@order ORDER BY ct.MaCTDon`);
  res.json({success:true,data:{order:head.recordset[0],items:rows.recordset}});
 }catch(e){report(res,e);}
}
function validate(b){if(!b||!Number.isInteger(b.soSao)||b.soSao<1||b.soSao>5)return "Chọn số sao từ 1 đến 5.";if(typeof b.noiDung!=="string"||!b.noiDung.trim()||b.noiDung.length>2000)return "Nội dung đánh giá cần từ 1 đến 2.000 ký tự.";if(b.tieuDe!=null&&(typeof b.tieuDe!=="string"||b.tieuDe.length>150))return "Tiêu đề tối đa 150 ký tự.";return null;}
async function create(req,res){
 let tx,started=false;
 try{
  const invalid=validate(req.body);if(invalid)throw fail(400,invalid);
  const detail=id(req.body.maCTDon),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
  const owned=await new sql.Request(tx).input("detail",sql.Int,detail).input("user",sql.Int,req.user.MaNguoiDung).query(`SELECT dh.TrangThai FROM dbo.CTDonHang ct INNER JOIN dbo.DonHang dh WITH(UPDLOCK,HOLDLOCK) ON dh.MaDon=ct.MaDon WHERE ct.MaCTDon=@detail AND dh.MaNguoiDung=@user`);
  if(!owned.recordset.length)throw fail(404,"Không tìm thấy sản phẩm trong đơn hàng của bạn.");
  if(owned.recordset[0].TrangThai!=="Hoàn tất")throw fail(409,"Bạn chỉ có thể đánh giá sau khi đơn hàng đã hoàn tất.");
  const old=await new sql.Request(tx).input("detail",sql.Int,detail).input("user",sql.Int,req.user.MaNguoiDung).query(`SELECT MaDanhGia FROM dbo.DanhGia WITH(UPDLOCK,HOLDLOCK) WHERE MaCTDon=@detail AND MaNguoiDung=@user`);
  if(old.recordset.length)throw fail(409,"Bạn đã đánh giá sản phẩm trong đơn này.");
  await new sql.Request(tx).input("detail",sql.Int,detail).input("user",sql.Int,req.user.MaNguoiDung).input("stars",sql.TinyInt,req.body.soSao).input("title",sql.NVarChar(150),(req.body.tieuDe||"").trim()||null).input("text",sql.NVarChar(2000),req.body.noiDung.trim()).query(`INSERT dbo.DanhGia(MaNguoiDung,MaCTDon,SoSao,TieuDe,NoiDung,TrangThaiDuyet) VALUES(@user,@detail,@stars,@title,@text,N'Đã hiển thị')`);
  await tx.commit();started=false;res.status(201).json({success:true,message:"Cảm ơn bạn. Đánh giá đã được ghi nhận."});
 }catch(e){if(started)await tx.rollback().catch(()=>{});report(res,e);}
}
const joins=`FROM dbo.DanhGia d JOIN dbo.CTDonHang ct ON ct.MaCTDon=d.MaCTDon JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon AND dh.MaNguoiDung=d.MaNguoiDung JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=d.MaNguoiDung`;
async function list(req,res){
 try{
  const page=Number(req.query.trang||1),stars=Number(req.query.soSao||0),state=String(req.query.trangThai||""),q=String(req.query.q||"").trim().slice(0,150);
  if(!Number.isSafeInteger(page)||page<1||page>100000||!Number.isInteger(stars)||stars<0||stars>5||!["","Chờ duyệt","Đã hiển thị","Cần theo dõi","Đã xử lý"].includes(state))throw fail(400,"Bộ lọc đánh giá không hợp lệ.");
  const where=`WHERE dh.TrangThai=N'Hoàn tất' AND (@stars=0 OR d.SoSao=@stars) AND (@state=N'' OR d.TrangThaiDuyet=@state) AND (@q=N'' OR nd.HoTen LIKE @search ESCAPE '~' OR ct.TenSanPhamSnapshot LIKE @search ESCAPE '~' OR CONVERT(NVARCHAR(20),dh.MaDon)=@q)`;
  const pool=await getPool(),r=await pool.request().input("q",sql.NVarChar(150),q).input("search",sql.NVarChar(310),'%'+q.replace(/[~%_\[]/g,'~$&')+'%').input("stars",sql.Int,stars).input("state",sql.NVarChar(30),state).input("offset",sql.Int,(page-1)*10).query(`
    SELECT d.MaDanhGia,d.SoSao,d.TieuDe,d.NoiDung,d.NgayDanhGia,d.TrangThaiDuyet,d.GhiChuXuLy,d.NgayXuLy,nd.HoTen,nd.Email,ct.TenSanPhamSnapshot AS TenSanPham,ct.CauHinhSnapshot AS CauHinh,ct.SKUSnapshot AS SKU,dh.MaDon,dh.NgayDat ${joins} ${where} ORDER BY d.NgayDanhGia DESC,d.MaDanhGia DESC OFFSET @offset ROWS FETCH NEXT 10 ROWS ONLY;
    SELECT COUNT(*) AS total ${joins} ${where};
    SELECT COUNT(*) AS Tong,COALESCE(AVG(CAST(d.SoSao AS FLOAT)),0) AS TrungBinh,COALESCE(SUM(CASE WHEN d.TrangThaiDuyet=N'Cần theo dõi' THEN 1 ELSE 0 END),0) AS CanTheoDoi ${joins} WHERE dh.TrangThai=N'Hoàn tất';`);
  res.json({success:true,data:r.recordsets[0],total:r.recordsets[1][0].total,stats:r.recordsets[2][0]});
 }catch(e){report(res,e);}
}
async function processReview(req,res){
 try{
  const ma=id(req.params.id),b=req.body||{};
  if(!["Đã hiển thị","Cần theo dõi","Đã xử lý"].includes(b.trangThai)||typeof b.ghiChu!=="string"||b.ghiChu.length>1000)throw fail(400,"Trạng thái hoặc ghi chú xử lý không hợp lệ (tối đa 1.000 ký tự).");
  const pool=await getPool(),r=await pool.request().input("id",sql.Int,ma).input("state",sql.NVarChar(30),b.trangThai).input("note",sql.NVarChar(1000),b.ghiChu.trim()||null).input("user",sql.Int,req.user.MaNguoiDung).query(`UPDATE d SET TrangThaiDuyet=@state,GhiChuXuLy=@note,MaNguoiXuLy=@user,NgayXuLy=SYSDATETIME() FROM dbo.DanhGia d JOIN dbo.CTDonHang ct ON ct.MaCTDon=d.MaCTDon JOIN dbo.DonHang dh ON dh.MaDon=ct.MaDon AND dh.MaNguoiDung=d.MaNguoiDung WHERE d.MaDanhGia=@id AND dh.TrangThai=N'Hoàn tất'`);
  if(!r.rowsAffected[0])throw fail(404,"Không tìm thấy đánh giá hợp lệ.");
  res.json({success:true,message:"Đã cập nhật xử lý phản hồi."});
 }catch(e){report(res,e);}
}
module.exports={order,create,list,processReview,validate};
