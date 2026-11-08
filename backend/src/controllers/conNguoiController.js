const bcrypt = require("bcryptjs");
const { randomBytes, createHash } = require("node:crypto");
const { sql, getPool } = require("../config/db");
const columns = `nd.MaNguoiDung,nd.HoTen,nd.Email,nd.SoDienThoai,nd.DiaChi,nd.TrangThai,nd.NgayTao,nd.NgayCapNhat,nd.LyDoKhoa,nd.DaThietLapMatKhau,vt.TenVaiTro`;
const joins = `FROM dbo.NguoiDung nd INNER JOIN dbo.VaiTro vt ON vt.MaVaiTro=nd.MaVaiTro`;
const scope = kind => kind === "khach-hang" ? "vt.TenVaiTro=N'Khách hàng'" : "vt.TenVaiTro IN(N'Nhân viên',N'Quản lý')";
const err = (status,message) => Object.assign(new Error(message),{status});
function report(res,error) {
  if ([2601,2627].includes(error.number || error.originalError?.info?.number)) return res.status(409).json({success:false,message:"Email đã được sử dụng."});
  if (!error.status) console.error("Con người:",error.message);
  return res.status(error.status||500).json({success:false,message:error.status?error.message:"Không thể xử lý tài khoản. Kiểm tra DB và migration 08."});
}
function id(value) { const n=Number(value); if(!Number.isSafeInteger(n)||n<1||n>2147483647)throw err(400,"Mã tài khoản không hợp lệ.");return n; }
function password(value) { return typeof value === "string" && value.length>=8 && Buffer.byteLength(value,"utf8")<=72 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value); }
function fields(body) {
  if(!body || typeof body.hoTen!=="string" || body.hoTen.trim().length<2 || body.hoTen.trim().length>150)throw err(400,"Họ tên cần từ 2 đến 150 ký tự.");
  if(typeof body.email!=="string" || body.email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) || !/^[\x00-\x7F]+$/.test(body.email))throw err(400,"Email không hợp lệ.");
  const phone=typeof body.soDienThoai==="string"?body.soDienThoai.replace(/[\s.-]/g,""):"";
  if(phone && !/^\+?\d{9,15}$/.test(phone))throw err(400,"Số điện thoại cần 9–15 chữ số.");
  if(body.diaChi!=null && (typeof body.diaChi!=="string" || body.diaChi.length>500))throw err(400,"Địa chỉ tối đa 500 ký tự.");
  return {name:body.hoTen.trim(),email:body.email.trim().toLowerCase(),phone:phone||null,address:(body.diaChi||"").trim()||null};
}
function bind(request,f) { return request.input("name",sql.NVarChar(150),f.name).input("email",sql.VarChar(254),f.email).input("phone",sql.VarChar(20),f.phone).input("address",sql.NVarChar(500),f.address); }
async function token(tx,user) {
  const raw=randomBytes(32).toString("hex"),hash=createHash("sha256").update(raw).digest("hex");
  const r=await new sql.Request(tx).input("user",sql.Int,user).input("hash",sql.Char(64),hash).query(`
    UPDATE dbo.ThietLapTaiKhoan SET DaDung=1 WHERE MaNguoiDung=@user;
    INSERT dbo.ThietLapTaiKhoan(MaNguoiDung,TokenHash,HanSuDung) OUTPUT INSERTED.HanSuDung VALUES(@user,@hash,DATEADD(HOUR,24,SYSDATETIME()));`);
  const origin=(process.env.FRONTEND_URL||"http://localhost:5173").replace(/\/$/,"");
  return {url:`${origin}/thiet-lap-tai-khoan?token=${raw}`,hanSuDung:r.recordset[0].HanSuDung};
}
async function target(tx,req) {
  const user=id(req.params.id);
  const r=await new sql.Request(tx).input("id",sql.Int,user).query(`SELECT ${columns} FROM dbo.NguoiDung nd WITH(UPDLOCK,HOLDLOCK) INNER JOIN dbo.VaiTro vt ON vt.MaVaiTro=nd.MaVaiTro WHERE nd.MaNguoiDung=@id AND ${scope(req.params.kind)}`);
  if(!r.recordset.length)throw err(404,"Không tìm thấy tài khoản trong nhóm này.");
  if(user===req.user.MaNguoiDung)throw err(409,"Hãy sửa tài khoản đang đăng nhập tại Tài khoản của tôi.");
  return r.recordset[0];
}
async function keepManager(tx,row,demoting) {
  if(!demoting || row.TenVaiTro!=="Quản lý" || row.TrangThai!=="Hoạt động")return;
  const r=await new sql.Request(tx).query(`SELECT nd.MaNguoiDung FROM dbo.NguoiDung nd WITH(UPDLOCK,HOLDLOCK) JOIN dbo.VaiTro vt ON vt.MaVaiTro=nd.MaVaiTro WHERE vt.TenVaiTro=N'Quản lý' AND nd.TrangThai=N'Hoạt động'`);
  if(r.recordset.length<=1)throw err(409,"Không thể vô hiệu hóa hoặc đổi vai trò của Quản lý hoạt động cuối cùng.");
}
async function list(req,res) {
  try{
    const page=Number(req.query.trang||1),size=10,q=String(req.query.q||"").trim().slice(0,150),status=String(req.query.trangThai||""),role=String(req.query.vaiTro||""),days=String(req.query.ngay||"");
    if(!Number.isSafeInteger(page)||page<1||page>100000||!["","Hoạt động","Đã khóa","Vô hiệu hóa","Chờ thiết lập"].includes(status)||!["","Nhân viên","Quản lý"].includes(role)||!["","7","30"].includes(days))throw err(400,"Bộ lọc không hợp lệ.");
    const pool=await getPool(),where=`WHERE ${scope(req.params.kind)} AND (@q=N'' OR nd.HoTen LIKE @search ESCAPE '~' OR nd.Email LIKE @search ESCAPE '~' OR nd.SoDienThoai LIKE @search ESCAPE '~' OR CONVERT(NVARCHAR(20),nd.MaNguoiDung)=@q) AND (@status=N'' OR nd.TrangThai=@status) AND (@role=N'' OR vt.TenVaiTro=@role) AND (@days=0 OR nd.NgayTao>=DATEADD(DAY,-@days,SYSDATETIME()))`;
    const r=await pool.request().input("q",sql.NVarChar(150),q).input("search",sql.NVarChar(310),'%'+q.replace(/[~%_\[]/g,'~$&')+'%').input("status",sql.NVarChar(30),status).input("role",sql.NVarChar(50),role).input("days",sql.Int,Number(days||0)).input("offset",sql.Int,(page-1)*size).query(`
      SELECT ${columns},(SELECT COUNT(*) FROM dbo.DonHang dh WHERE dh.MaNguoiDung=nd.MaNguoiDung) AS SoDon ${joins} ${where} ORDER BY nd.MaNguoiDung DESC OFFSET @offset ROWS FETCH NEXT 10 ROWS ONLY;
      SELECT COUNT(*) AS total ${joins} ${where};
      SELECT COUNT(*) AS Tong,COALESCE(SUM(CASE WHEN nd.TrangThai=N'Hoạt động' THEN 1 ELSE 0 END),0) AS HoatDong,COALESCE(SUM(CASE WHEN nd.TrangThai IN(N'Đã khóa',N'Vô hiệu hóa') THEN 1 ELSE 0 END),0) AS BiKhoa,COALESCE(SUM(CASE WHEN nd.TrangThai=N'Chờ thiết lập' THEN 1 ELSE 0 END),0) AS ChoThietLap ${joins} WHERE ${scope(req.params.kind)};`);
    res.json({success:true,data:r.recordsets[0],total:r.recordsets[1][0].total,stats:r.recordsets[2][0]});
  }catch(error){report(res,error);}
}
async function detail(req,res) {
  try{
    const pool=await getPool(),user=id(req.params.id);
    const r=await pool.request().input("id",sql.Int,user).query(`SELECT ${columns} ${joins} WHERE nd.MaNguoiDung=@id AND ${scope(req.params.kind)}`);
    if(!r.recordset.length)throw err(404,"Không tìm thấy tài khoản.");
    const orders=req.params.kind==="khach-hang"?await pool.request().input("id",sql.Int,user).query(`SELECT TOP(10) MaDon,NgayDat,TrangThai,TongThanhToan FROM dbo.DonHang WHERE MaNguoiDung=@id ORDER BY MaDon DESC`):{recordset:[]};
    res.json({success:true,data:{user:r.recordset[0],orders:orders.recordset}});
  }catch(error){report(res,error);}
}
async function create(req,res) {
  let tx,started=false;
  try{
    const f=fields(req.body),role=req.params.kind==="khach-hang"?"Khách hàng":req.body.vaiTro;
    if(!["Khách hàng","Nhân viên","Quản lý"].includes(role) || (req.params.kind==="nhan-vien" && role==="Khách hàng"))throw err(400,"Vai trò không hợp lệ.");
    const hash=await bcrypt.hash(randomBytes(32).toString("hex"),12),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
    const r=await bind(new sql.Request(tx),f).input("role",sql.NVarChar(50),role).input("hash",sql.VarChar(255),hash).query(`
      INSERT dbo.NguoiDung(MaVaiTro,HoTen,Email,SoDienThoai,DiaChi,MatKhauHash,TrangThai,DaThietLapMatKhau)
      OUTPUT INSERTED.MaNguoiDung SELECT MaVaiTro,@name,@email,@phone,@address,@hash,N'Chờ thiết lập',0 FROM dbo.VaiTro WHERE TenVaiTro=@role`);
    if(!r.recordset.length)throw err(409,"DB chưa có vai trò được chọn.");
    const invitation=await token(tx,r.recordset[0].MaNguoiDung);await tx.commit();started=false;
    res.status(201).json({success:true,message:"Đã tạo tài khoản. Sao chép liên kết để người nhận tự thiết lập mật khẩu.",data:invitation});
  }catch(error){if(started)await tx.rollback().catch(()=>{});report(res,error);}
}
async function update(req,res) {
  let tx,started=false;
  try{
    const f=fields(req.body),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
    const row=await target(tx,req),role=req.params.kind==="khach-hang"?"Khách hàng":req.body.vaiTro;
    if(!["Khách hàng","Nhân viên","Quản lý"].includes(role)||(req.params.kind==="nhan-vien"&&role==="Khách hàng"))throw err(400,"Vai trò không hợp lệ.");
    await keepManager(tx,row,role!=="Quản lý");
    const r=await bind(new sql.Request(tx),f).input("id",sql.Int,row.MaNguoiDung).input("role",sql.NVarChar(50),role).query(`UPDATE nd SET HoTen=@name,Email=@email,SoDienThoai=@phone,DiaChi=@address,MaVaiTro=vt.MaVaiTro,NgayCapNhat=SYSDATETIME() FROM dbo.NguoiDung nd JOIN dbo.VaiTro vt ON vt.TenVaiTro=@role WHERE nd.MaNguoiDung=@id`);
    if(!r.rowsAffected[0])throw err(409,"DB chưa có vai trò được chọn.");
    await tx.commit();started=false;res.json({success:true,message:"Đã cập nhật tài khoản."});
  }catch(error){if(started)await tx.rollback().catch(()=>{});report(res,error);}
}
async function status(req,res) {
  let tx,started=false;
  try{
    if(typeof req.body?.hoatDong!=="boolean")throw err(400,"Trạng thái không hợp lệ.");
    const reason=typeof req.body.lyDo==="string"?req.body.lyDo.trim():"";
    if(!req.body.hoatDong&&(reason.length<2||reason.length>500))throw err(400,"Nhập lý do khóa/vô hiệu hóa từ 2 đến 500 ký tự.");
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
    const row=await target(tx,req);await keepManager(tx,row,!req.body.hoatDong);
    if(req.body.hoatDong&&!row.DaThietLapMatKhau)throw err(409,"Tài khoản chưa thiết lập mật khẩu. Hãy tạo liên kết thiết lập.");
    const value=req.body.hoatDong?"Hoạt động":req.params.kind==="khach-hang"?"Đã khóa":"Vô hiệu hóa";
    await new sql.Request(tx).input("id",sql.Int,row.MaNguoiDung).input("status",sql.NVarChar(30),value).input("reason",sql.NVarChar(500),req.body.hoatDong?null:reason).query(`UPDATE dbo.NguoiDung SET TrangThai=@status,LyDoKhoa=@reason,NgayCapNhat=SYSDATETIME() WHERE MaNguoiDung=@id; UPDATE dbo.ThietLapTaiKhoan SET DaDung=1 WHERE MaNguoiDung=@id;`);
    await tx.commit();started=false;res.json({success:true,message:req.body.hoatDong?"Đã kích hoạt tài khoản.":"Đã khóa/vô hiệu hóa tài khoản. Dữ liệu lịch sử được giữ nguyên."});
  }catch(error){if(started)await tx.rollback().catch(()=>{});report(res,error);}
}
async function invite(req,res) {
  let tx,started=false;
  try{
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
    const row=await target(tx,req);await keepManager(tx,row,true);
    await new sql.Request(tx).input("id",sql.Int,row.MaNguoiDung).query(`UPDATE dbo.NguoiDung SET TrangThai=N'Chờ thiết lập',DaThietLapMatKhau=0,NgayCapNhat=SYSDATETIME() WHERE MaNguoiDung=@id`);
    const data=await token(tx,row.MaNguoiDung);await tx.commit();started=false;res.json({success:true,message:"Đã tạo liên kết mới. Liên kết cũ hết hiệu lực.",data});
  }catch(error){if(started)await tx.rollback().catch(()=>{});report(res,error);}
}
function tokenHash(raw) { if(typeof raw!=="string"||!/^[a-f0-9]{64}$/.test(raw))throw err(400,"Liên kết không hợp lệ hoặc đã hết hạn.");return createHash("sha256").update(raw).digest("hex"); }
async function setupInfo(req,res) {
  try{
    const pool=await getPool(),hash=tokenHash(req.query.token);
    const r=await pool.request().input("hash",sql.Char(64),hash).query(`SELECT nd.HoTen,nd.Email FROM dbo.ThietLapTaiKhoan t JOIN dbo.NguoiDung nd ON nd.MaNguoiDung=t.MaNguoiDung WHERE t.TokenHash=@hash AND t.DaDung=0 AND t.HanSuDung>SYSDATETIME() AND nd.TrangThai=N'Chờ thiết lập'`);
    if(!r.recordset.length)throw err(400,"Liên kết không hợp lệ hoặc đã hết hạn.");res.json({success:true,data:r.recordset[0]});
  }catch(error){report(res,error);}
}
async function setup(req,res) {
  let tx,started=false;
  try{
    const hash=tokenHash(req.body?.token);
    if(!password(req.body?.matKhau))throw err(400,"Mật khẩu cần ít nhất 8 ký tự, chữ hoa, chữ thường và số; tối đa 72 byte.");
    const pass=await bcrypt.hash(req.body.matKhau,12),pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
    const r=await new sql.Request(tx).input("hash",sql.Char(64),hash).query(`SELECT t.MaNguoiDung FROM dbo.ThietLapTaiKhoan t WITH(UPDLOCK,HOLDLOCK) JOIN dbo.NguoiDung nd WITH(UPDLOCK,HOLDLOCK) ON nd.MaNguoiDung=t.MaNguoiDung WHERE t.TokenHash=@hash AND t.DaDung=0 AND t.HanSuDung>SYSDATETIME() AND nd.TrangThai=N'Chờ thiết lập'`);
    if(!r.recordset.length)throw err(400,"Liên kết không hợp lệ hoặc đã hết hạn.");
    await new sql.Request(tx).input("id",sql.Int,r.recordset[0].MaNguoiDung).input("pass",sql.VarChar(255),pass).query(`UPDATE dbo.NguoiDung SET MatKhauHash=@pass,DaThietLapMatKhau=1,TrangThai=N'Hoạt động',LyDoKhoa=NULL,NgayCapNhat=SYSDATETIME() WHERE MaNguoiDung=@id; UPDATE dbo.ThietLapTaiKhoan SET DaDung=1 WHERE MaNguoiDung=@id;`);
    await tx.commit();started=false;res.json({success:true,message:"Đã thiết lập mật khẩu. Bạn có thể đăng nhập."});
  }catch(error){if(started)await tx.rollback().catch(()=>{});report(res,error);}
}
async function profile(req,res) {
  try{const pool=await getPool();const r=await pool.request().input("id",sql.Int,req.user.MaNguoiDung).query(`SELECT ${columns} ${joins} WHERE nd.MaNguoiDung=@id`);res.json({success:true,data:r.recordset[0]});}catch(error){report(res,error);}
}
async function updateProfile(req,res) {
  try{const f=fields(req.body),pool=await getPool();await bind(pool.request(),f).input("id",sql.Int,req.user.MaNguoiDung).query(`UPDATE dbo.NguoiDung SET HoTen=@name,Email=@email,SoDienThoai=@phone,DiaChi=@address,NgayCapNhat=SYSDATETIME() WHERE MaNguoiDung=@id`);return profile(req,res);}catch(error){report(res,error);}
}
async function changePassword(req,res) {
  try{
    if(typeof req.body?.matKhauCu!=="string" || Buffer.byteLength(req.body.matKhauCu,"utf8")>72 || !password(req.body?.matKhauMoi))throw err(400,"Nhập mật khẩu hiện tại và mật khẩu mới ít nhất 8 ký tự gồm chữ hoa, chữ thường, số.");
    const pool=await getPool(),r=await pool.request().input("id",sql.Int,req.user.MaNguoiDung).query(`SELECT MatKhauHash FROM dbo.NguoiDung WHERE MaNguoiDung=@id`);
    if(!r.recordset.length||!await bcrypt.compare(req.body.matKhauCu,r.recordset[0].MatKhauHash))throw err(400,"Mật khẩu hiện tại không đúng.");
    const pass=await bcrypt.hash(req.body.matKhauMoi,12);
    const changed=await pool.request().input("id",sql.Int,req.user.MaNguoiDung).input("old",sql.VarChar(255),r.recordset[0].MatKhauHash).input("pass",sql.VarChar(255),pass).query(`UPDATE dbo.NguoiDung SET MatKhauHash=@pass,NgayCapNhat=SYSDATETIME() WHERE MaNguoiDung=@id AND MatKhauHash=@old`);
    if(!changed.rowsAffected[0])throw err(409,"Mật khẩu đã thay đổi. Hãy đăng nhập lại.");res.json({success:true,message:"Đã đổi mật khẩu."});
  }catch(error){report(res,error);}
}
module.exports={list,detail,create,update,status,invite,setupInfo,setup,profile,updateProfile,changePassword,fields,password};
