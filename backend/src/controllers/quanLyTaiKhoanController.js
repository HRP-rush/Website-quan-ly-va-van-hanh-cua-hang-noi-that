const {sql,bcrypt,getPool,ROLES,validEmail,validPass,validName,validPhone,safeUser,failed}=require('../services/taiKhoanUtils');
const isManager=u=>['Admin','Quản lý'].includes(u.TenVaiTro);
const editable=(actor,target)=>{
 if (!target) return false;
 if (actor.MaNguoiDung===target.MaNguoiDung) return false;
 if (target.TenVaiTro==='Admin') return false; // do not let any admin be changed from this UI
 return isManager(actor);
};
const canAssign=(actor,role)=>role!=='Admin'&&['Quản lý','Nhân viên','Khách hàng'].includes(role)&&isManager(actor);
async function list(req,res){
 try{
 const p=await getPool();const role=req.query.vaiTro||'';const q=String(req.query.q||'').slice(0,100);const status=String(req.query.trangThai||'').slice(0,30);
 const r=await p.request().input('role',sql.NVarChar(50),role).input('q',sql.NVarChar(120),'%'+q+'%').input('status',sql.NVarChar(30),status)
 .query(`SELECT n.MaNguoiDung,n.HoTen,n.Email,n.SoDienThoai,n.TrangThai,n.NgayTao,n.AnhDaiDien,v.TenVaiTro,(SELECT COUNT(*) FROM dbo.DonHang d WHERE d.MaNguoiDung=n.MaNguoiDung) SoDon FROM dbo.NguoiDung n JOIN dbo.VaiTro v ON v.MaVaiTro=n.MaVaiTro WHERE (@role=N'' OR v.TenVaiTro=@role) AND (@status=N'' OR n.TrangThai=@status) AND (n.HoTen LIKE @q OR n.Email LIKE @q OR n.SoDienThoai LIKE @q) ORDER BY n.MaNguoiDung DESC`);
 return res.json({success:true,data:r.recordset,total:r.recordset.length});
 }catch(e){return failed(res,e)}
}
async function detail(req,res){try{const p=await getPool();const r=await p.request().input('id',sql.Int,Number(req.params.id)).query('SELECT n.MaNguoiDung,n.HoTen,n.Email,n.SoDienThoai,n.DiaChi,n.TrangThai,n.NgayTao,n.AnhDaiDien,v.TenVaiTro FROM dbo.NguoiDung n JOIN dbo.VaiTro v ON v.MaVaiTro=n.MaVaiTro WHERE n.MaNguoiDung=@id');if(!r.recordset[0])return res.status(404).json({success:false,message:'Không tìm thấy tài khoản.'});return res.json({success:true,data:r.recordset[0]})}catch(e){return failed(res,e)}}
async function create(req,res){
 try{
 const {hoTen,email,soDienThoai,matKhau,vaiTro}=req.body||{};
 if(!validName(hoTen)||!validEmail(email)||!validPhone(soDienThoai)||!validPass(matKhau)||!canAssign(req.user,vaiTro))return res.status(400).json({success:false,message:'Dữ liệu hoặc vai trò không hợp lệ.'});
 const p=await getPool();const hash=await bcrypt.hash(matKhau,12);
 const r=await p.request().input('role',sql.NVarChar(50),vaiTro).input('ten',sql.NVarChar(150),hoTen.trim()).input('email',sql.VarChar(254),email.trim().toLowerCase()).input('phone',sql.VarChar(20),soDienThoai||null).input('hash',sql.VarChar(255),hash).query(`INSERT dbo.NguoiDung(MaVaiTro,HoTen,Email,SoDienThoai,MatKhauHash,TrangThai) OUTPUT INSERTED.MaNguoiDung SELECT v.MaVaiTro,@ten,@email,@phone,@hash,N'Hoạt động' FROM dbo.VaiTro v WHERE v.TenVaiTro=@role`);
 if(!r.recordset.length)return res.status(400).json({success:false,message:'Vai trò chưa được thiết lập trong bảng VaiTro.'});return res.status(201).json({success:true,data:{MaNguoiDung:r.recordset[0].MaNguoiDung},message:'Đã tạo tài khoản.'});
 }catch(e){return failed(res,e)}
}
async function update(req,res){
 try{
 const id=Number(req.params.id);const {hoTen,soDienThoai,email}=req.body||{};
 if(!Number.isInteger(id)||!validName(hoTen)||!validPhone(soDienThoai)||!validEmail(email))return res.status(400).json({success:false,message:'Dữ liệu không hợp lệ.'});
 const p=await getPool();const existing=await p.request().input('id',sql.Int,id).query('SELECT n.MaNguoiDung,v.TenVaiTro FROM dbo.NguoiDung n JOIN dbo.VaiTro v ON v.MaVaiTro=n.MaVaiTro WHERE n.MaNguoiDung=@id');
 if(!editable(req.user,existing.recordset[0]))return res.status(403).json({success:false,message:'Không được cập nhật tài khoản này.'});
 await p.request().input('id',sql.Int,id).input('ten',sql.NVarChar(150),hoTen.trim()).input('phone',sql.VarChar(20),soDienThoai||null).input('email',sql.VarChar(254),email.toLowerCase().trim()).query('UPDATE dbo.NguoiDung SET HoTen=@ten,SoDienThoai=@phone,Email=@email WHERE MaNguoiDung=@id');return res.json({success:true,message:'Đã cập nhật thông tin tài khoản.'});
 }catch(e){return failed(res,e)}
}
async function changeRole(req,res){
 try{
 const id=Number(req.params.id);const role=req.body?.vaiTro;
 if(!canAssign(req.user,role))return res.status(403).json({success:false,message:'Không có quyền cấp vai trò này.'});
 const p=await getPool();const r=await p.request().input('id',sql.Int,id).query('SELECT n.MaNguoiDung,v.TenVaiTro FROM dbo.NguoiDung n JOIN dbo.VaiTro v ON v.MaVaiTro=n.MaVaiTro WHERE n.MaNguoiDung=@id');
 if(!editable(req.user,r.recordset[0]))return res.status(403).json({success:false,message:'Không thể đổi vai trò tài khoản này.'});
 const q=await p.request().input('id',sql.Int,id).input('role',sql.NVarChar(50),role).query('UPDATE dbo.NguoiDung SET MaVaiTro=(SELECT MaVaiTro FROM dbo.VaiTro WHERE TenVaiTro=@role) WHERE MaNguoiDung=@id');return res.json({success:true,message:'Đã cập nhật vai trò.'});
 }catch(e){return failed(res,e)}
}
async function status(req,res){
 try{
 const id=Number(req.params.id);const b=req.body?.trangThai;
 if(!['Hoạt động','Đã khóa'].includes(b))return res.status(400).json({success:false,message:'Trạng thái không hợp lệ.'});
 const p=await getPool();const old=await p.request().input('id',sql.Int,id).query('SELECT n.MaNguoiDung,v.TenVaiTro FROM dbo.NguoiDung n JOIN dbo.VaiTro v ON v.MaVaiTro=n.MaVaiTro WHERE n.MaNguoiDung=@id');
 if(!editable(req.user,old.recordset[0]))return res.status(403).json({success:false,message:'Không thể thay đổi trạng thái tài khoản này.'});
 await p.request().input('id',sql.Int,id).input('status',sql.NVarChar(30),b).query('UPDATE dbo.NguoiDung SET TrangThai=@status WHERE MaNguoiDung=@id');return res.json({success:true,message:'Đã cập nhật trạng thái.'});
 }catch(e){return failed(res,e)}
}
async function remove(req,res){
 try{
 const id=Number(req.params.id);const p=await getPool();const old=await p.request().input('id',sql.Int,id).query('SELECT n.MaNguoiDung,v.TenVaiTro FROM dbo.NguoiDung n JOIN dbo.VaiTro v ON v.MaVaiTro=n.MaVaiTro WHERE n.MaNguoiDung=@id');
 if(!editable(req.user,old.recordset[0]))return res.status(403).json({success:false,message:'Không thể xóa tài khoản này.'});
 // Soft delete: prevent login, retain references to orders, receipts and logs.
 await p.request().input('id',sql.Int,id).query(`UPDATE dbo.NguoiDung SET TrangThai=N'Đã xóa' WHERE MaNguoiDung=@id`);
 return res.json({success:true,message:'Tài khoản đã được vô hiệu hóa (xóa mềm), dữ liệu nghiệp vụ được giữ nguyên.'});
 }catch(e){return failed(res,e)}
}
module.exports={list,detail,create,update,changeRole,status,remove};
