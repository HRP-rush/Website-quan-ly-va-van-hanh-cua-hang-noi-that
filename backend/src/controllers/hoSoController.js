const {sql,bcrypt,getPool,validPass,validName,validPhone,safeUser,failed}=require('../services/taiKhoanUtils');
const fs=require('fs/promises');
const path=require('path');

async function thongTin(req,res){
 try{const p=await getPool();const r=await p.request().input('id',sql.Int,req.user.MaNguoiDung).query(`SELECT n.*,v.TenVaiTro FROM dbo.NguoiDung n JOIN dbo.VaiTro v ON v.MaVaiTro=n.MaVaiTro WHERE n.MaNguoiDung=@id`);return res.json({success:true,data:safeUser(r.recordset[0])});}catch(e){return failed(res,e)}
}
async function capNhat(req,res){
 try{
 const {hoTen,soDienThoai,diaChi}=req.body||{};
 if(!validName(hoTen)||!validPhone(soDienThoai)||typeof diaChi!=='string'||diaChi.length>500) return res.status(400).json({success:false,message:'Họ tên, số điện thoại hoặc địa chỉ không hợp lệ.'});
 const p=await getPool();await p.request().input('id',sql.Int,req.user.MaNguoiDung).input('ten',sql.NVarChar(150),hoTen.trim()).input('phone',sql.VarChar(20),soDienThoai||null).input('diaChi',sql.NVarChar(500),diaChi.trim()).query('UPDATE dbo.NguoiDung SET HoTen=@ten,SoDienThoai=@phone,DiaChi=@diaChi WHERE MaNguoiDung=@id');
 return thongTin(req,res);
 }catch(e){return failed(res,e)}
}
async function doiMatKhau(req,res){
 try{
 const {matKhauCu,matKhauMoi}=req.body||{};
 if(!validPass(matKhauMoi)||typeof matKhauCu!=='string') return res.status(400).json({success:false,message:'Mật khẩu mới phải có ít nhất 8 ký tự, tối đa 72 byte.'});
 const p=await getPool();const r=await p.request().input('id',sql.Int,req.user.MaNguoiDung).query('SELECT MatKhauHash FROM dbo.NguoiDung WHERE MaNguoiDung=@id');
 if(!r.recordset[0]||!await bcrypt.compare(matKhauCu,r.recordset[0].MatKhauHash))return res.status(400).json({success:false,message:'Mật khẩu hiện tại không chính xác.'});
 const hash=await bcrypt.hash(matKhauMoi,12);await p.request().input('id',sql.Int,req.user.MaNguoiDung).input('hash',sql.VarChar(255),hash).query('UPDATE dbo.NguoiDung SET MatKhauHash=@hash WHERE MaNguoiDung=@id');
 res.clearCookie('mocan_session',{path:'/',httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'});
 return res.json({success:true,message:'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.'});
 }catch(e){return failed(res,e)}
}
async function danhSachDiaChi(req,res){try{const p=await getPool();const r=await p.request().input('id',sql.Int,req.user.MaNguoiDung).query('SELECT * FROM dbo.DiaChiNguoiDung WHERE MaNguoiDung=@id ORDER BY MacDinh DESC,MaDiaChi DESC');return res.json({success:true,data:r.recordset})}catch(e){return failed(res,e)}}
function validateAddress(b){return b && validName(b.tenNguoiNhan) && typeof b.soDienThoai==='string' && /^0\d{9,10}$/.test(b.soDienThoai) && ['tinhThanh','phuongXa','diaChiChiTiet'].every(k=>typeof b[k]==='string'&&b[k].trim()&&b[k].length<=350)}
function addressInput(q,b){return q.input('ten',sql.NVarChar(150),b.tenNguoiNhan.trim()).input('phone',sql.VarChar(20),b.soDienThoai).input('tinh',sql.NVarChar(120),b.tinhThanh.trim()).input('phuong',sql.NVarChar(120),b.phuongXa.trim()).input('chiTiet',sql.NVarChar(350),b.diaChiChiTiet.trim());}
async function themDiaChi(req,res){try{const b=req.body;if(!validateAddress(b))return res.status(400).json({success:false,message:'Thông tin địa chỉ không hợp lệ.'});const p=await getPool();const q=addressInput(p.request().input('id',sql.Int,req.user.MaNguoiDung),b);await q.query(`INSERT dbo.DiaChiNguoiDung(MaNguoiDung,TenNguoiNhan,SoDienThoai,TinhThanh,PhuongXa,DiaChiChiTiet,MacDinh) VALUES(@id,@ten,@phone,@tinh,@phuong,@chiTiet,CASE WHEN NOT EXISTS(SELECT 1 FROM dbo.DiaChiNguoiDung WHERE MaNguoiDung=@id) THEN 1 ELSE 0 END)`);return res.status(201).json({success:true,message:'Đã thêm địa chỉ.'})}catch(e){return failed(res,e)}}
async function suaDiaChi(req,res){try{const b=req.body;if(!validateAddress(b))return res.status(400).json({success:false,message:'Địa chỉ không hợp lệ.'});const p=await getPool();const q=addressInput(p.request().input('id',sql.Int,req.user.MaNguoiDung).input('addr',sql.Int,Number(req.params.id)),b);const r=await q.query('UPDATE dbo.DiaChiNguoiDung SET TenNguoiNhan=@ten,SoDienThoai=@phone,TinhThanh=@tinh,PhuongXa=@phuong,DiaChiChiTiet=@chiTiet WHERE MaDiaChi=@addr AND MaNguoiDung=@id');return res.status(r.rowsAffected[0]?200:404).json({success:!!r.rowsAffected[0],message:r.rowsAffected[0]?'Đã sửa địa chỉ.':'Không tìm thấy địa chỉ.'})}catch(e){return failed(res,e)}}
async function xoaDiaChi(req,res){try{const p=await getPool();const id=req.user.MaNguoiDung;const q=await p.request().input('id',sql.Int,id).input('addr',sql.Int,Number(req.params.id)).query('DELETE FROM dbo.DiaChiNguoiDung WHERE MaDiaChi=@addr AND MaNguoiDung=@id');if(!q.rowsAffected[0])return res.status(404).json({success:false,message:'Không tìm thấy địa chỉ.'});await p.request().input('id',sql.Int,id).query(`UPDATE dbo.DiaChiNguoiDung SET MacDinh=1 WHERE MaDiaChi=(SELECT TOP 1 MaDiaChi FROM dbo.DiaChiNguoiDung WHERE MaNguoiDung=@id ORDER BY MacDinh DESC,MaDiaChi DESC) AND NOT EXISTS(SELECT 1 FROM dbo.DiaChiNguoiDung WHERE MaNguoiDung=@id AND MacDinh=1)`);return res.json({success:true,message:'Đã xóa địa chỉ.'})}catch(e){return failed(res,e)}}
async function macDinh(req,res){try{const p=await getPool();const id=req.user.MaNguoiDung;const addr=Number(req.params.id);const check=await p.request().input('id',sql.Int,id).input('addr',sql.Int,addr).query('SELECT MaDiaChi FROM dbo.DiaChiNguoiDung WHERE MaNguoiDung=@id AND MaDiaChi=@addr');if(!check.recordset.length)return res.status(404).json({success:false,message:'Không tìm thấy địa chỉ.'});const t=new sql.Transaction(p);await t.begin();try{await new sql.Request(t).input('id',sql.Int,id).query('UPDATE dbo.DiaChiNguoiDung SET MacDinh=0 WHERE MaNguoiDung=@id');await new sql.Request(t).input('id',sql.Int,id).input('addr',sql.Int,addr).query('UPDATE dbo.DiaChiNguoiDung SET MacDinh=1 WHERE MaNguoiDung=@id AND MaDiaChi=@addr');await t.commit()}catch(e){await t.rollback();throw e}return res.json({success:true,message:'Đã đặt địa chỉ mặc định.'})}catch(e){return failed(res,e)}}
async function anhDaiDien(req,res){try{if(!req.file)return res.status(400).json({success:false,message:'Chỉ chấp nhận ảnh JPEG, PNG, WebP dưới 2MB.'});const url='/uploads/avatars/'+req.file.filename;const p=await getPool();const old=await p.request().input('id',sql.Int,req.user.MaNguoiDung).query('SELECT AnhDaiDien FROM dbo.NguoiDung WHERE MaNguoiDung=@id');await p.request().input('id',sql.Int,req.user.MaNguoiDung).input('url',sql.NVarChar(500),url).query('UPDATE dbo.NguoiDung SET AnhDaiDien=@url WHERE MaNguoiDung=@id');const prev=old.recordset[0]?.AnhDaiDien;if(prev?.startsWith('/uploads/avatars/'))await fs.unlink(path.join(__dirname,'../../uploads/avatars',path.basename(prev))).catch(()=>{});return res.json({success:true,data:{AnhDaiDien:url}})}catch(e){return failed(res,e)}}
module.exports={thongTin,capNhat,doiMatKhau,danhSachDiaChi,themDiaChi,suaDiaChi,xoaDiaChi,macDinh,anhDaiDien};
