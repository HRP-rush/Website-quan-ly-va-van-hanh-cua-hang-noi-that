const {sql,bcrypt,crypto,getPool,validPass,failed,hexHash}=require('../services/taiKhoanUtils');
const nodemailer=require('nodemailer');
const generic='Nếu email đã đăng ký, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.';
async function sendMail(email,token){
 const host=process.env.SMTP_HOST;
 const url=(process.env.FRONTEND_URL||'http://localhost:5173')+'/dat-lai-mat-khau?token='+encodeURIComponent(token);
 if (!host) {
   if(process.env.ENABLE_DEV_RESET_LINK==='true' && process.env.NODE_ENV!=='production'){
     console.log('[DEMO ONLY] Link đặt lại mật khẩu:',url);
     return;
   }
   throw new Error('Chưa cấu hình SMTP_HOST hoặc chế độ demo');
 }
 const transport=nodemailer.createTransport({host,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT||587)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
 await transport.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:email,subject:'Mộc An – Đặt lại mật khẩu',text:`Bạn đã yêu cầu đặt lại mật khẩu. Liên kết có hiệu lực 15 phút: ${url}\nNếu không yêu cầu, hãy bỏ qua email này.`});
}
async function requestReset(req,res){
 try{
  const email=String(req.body?.email||'').trim().toLowerCase();
  if(!email||email.length>254)return res.status(400).json({success:false,message:'Email không hợp lệ.'});
  if(!process.env.SMTP_HOST && !(process.env.ENABLE_DEV_RESET_LINK==='true' && process.env.NODE_ENV!=='production'))return res.status(503).json({success:false,message:'Chức năng gửi email chưa được cấu hình trên máy chủ.'});
  const p=await getPool();const r=await p.request().input('email',sql.VarChar(254),email).query("SELECT MaNguoiDung FROM dbo.NguoiDung WHERE Email=@email AND TrangThai=N'Hoạt động'");
  if(r.recordset.length){
   const id=r.recordset[0].MaNguoiDung;const token=crypto.randomBytes(32).toString('hex');const hash=hexHash(token);
   await p.request().input('id',sql.Int,id).query('UPDATE dbo.DatLaiMatKhau SET DaDung=1 WHERE MaNguoiDung=@id AND DaDung=0');
   await p.request().input('id',sql.Int,id).input('hash',sql.Char(64),hash).query('INSERT dbo.DatLaiMatKhau(MaNguoiDung,TokenHash,HetHan) VALUES(@id,@hash,DATEADD(MINUTE,15,SYSDATETIME()))');
   try {await sendMail(email,token)}catch(e){console.error('Không thể gửi email:',e.message);await p.request().input('hash',sql.Char(64),hash).query('UPDATE dbo.DatLaiMatKhau SET DaDung=1 WHERE TokenHash=@hash');return res.status(503).json({success:false,message:'Dịch vụ email tạm thời không khả dụng.'})}
  }
  return res.json({success:true,message:generic});
 }catch(e){return failed(res,e)}
}
async function reset(req,res){
 try{
 const token=req.body?.token, password=req.body?.matKhauMoi;
 if(typeof token!=='string'||!(/^[a-f0-9]{64}$/.test(token))||!validPass(password))return res.status(400).json({success:false,message:'Liên kết hoặc mật khẩu không hợp lệ.'});
 const p=await getPool();const hash=hexHash(token),newHash=await bcrypt.hash(password,12);const t=new sql.Transaction(p);await t.begin();
 try{
  const r=await new sql.Request(t).input('hash',sql.Char(64),hash).query(`SELECT MaYeuCau,MaNguoiDung FROM dbo.DatLaiMatKhau WITH (UPDLOCK,HOLDLOCK) WHERE TokenHash=@hash AND DaDung=0 AND HetHan>SYSDATETIME()`);
  if(!r.recordset.length){await t.rollback();return res.status(400).json({success:false,message:'Liên kết đã hết hạn hoặc đã được sử dụng.'})}
  const rec=r.recordset[0];await new sql.Request(t).input('id',sql.Int,rec.MaNguoiDung).input('newHash',sql.VarChar(255),newHash).query('UPDATE dbo.NguoiDung SET MatKhauHash=@newHash WHERE MaNguoiDung=@id');
  await new sql.Request(t).input('id',sql.Int,rec.MaNguoiDung).query('UPDATE dbo.DatLaiMatKhau SET DaDung=1 WHERE MaNguoiDung=@id');await t.commit();return res.json({success:true,message:'Mật khẩu đã được cập nhật. Hãy đăng nhập lại.'});
 }catch(e){await t.rollback();throw e}
 }catch(e){return failed(res,e)}
}
module.exports={requestReset,reset};
