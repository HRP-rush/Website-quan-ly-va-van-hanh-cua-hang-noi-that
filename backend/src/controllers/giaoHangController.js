const { sql, getPool } = require('../config/db');
const { capNhatTrangThaiDonHang } = require('./donHangController');

const allowed = ['Chờ giao', 'Đang giao', 'Giao thành công', 'Giao không thành công'];
const idFrom = req => Number(req.params.id);
const validId = id => Number.isSafeInteger(id) && id > 0;
const fail = (res, status, message) => res.status(status).json({success:false,message});
const displayOrderId = (id, date) => `MA-${String(date).slice(0,10).replace(/-/g,'')}-${String(id).padStart(3,'0')}`;

async function danhSachGiaoHang(req,res) {
  const q = String(req.query.q || '').trim().slice(0,150);
  const trangThai = String(req.query.trangThai || '');
  const tuNgay = String(req.query.tuNgay || '');
  const denNgay = String(req.query.denNgay || '');
  if ((trangThai && !allowed.includes(trangThai)) || [tuNgay,denNgay].some(v=>v && !/^\d{4}-\d{2}-\d{2}$/.test(v)))
    return fail(res,400,'Bộ lọc giao hàng không hợp lệ.');
  try {
    const pool=await getPool();
    const result=await pool.request().input('q',sql.NVarChar(150),q)
      .input('trangThai',sql.NVarChar(40),trangThai)
      .input('role',sql.NVarChar(30),req.user.TenVaiTro).input('viewer',sql.Int,req.user.MaNguoiDung)
      .input('tuNgay',sql.VarChar(10),tuNgay).input('denNgay',sql.VarChar(10),denNgay)
      .query(`SELECT gh.MaGiaoHang,gh.MaDon,gh.TrangThaiGiao,
          CONVERT(varchar(19),dh.NgayDat,126) NgayDat,
          dh.TenNguoiNhan,dh.SDTNhan,dh.DiaChiGiao,dh.TrangThai AS TrangThaiDon,
          CONVERT(varchar(19),COALESCE(gh.NgayCapNhat,gh.NgayGiaoThucTe,dh.NgayDat),126) AS NgayCapNhat,
          gh.NgayGiaoThucTe
        FROM dbo.GiaoHang gh
        INNER JOIN dbo.DonHang dh ON dh.MaDon=gh.MaDon
        WHERE dh.TrangThai <> N'Chờ xác nhận'
          AND (@role<>N'Nhân viên' OR dh.MaNhanVienXuLy=@viewer)
          AND (@trangThai=N'' OR gh.TrangThaiGiao=@trangThai)
          AND (@tuNgay='' OR COALESCE(gh.NgayCapNhat,gh.NgayGiaoThucTe,dh.NgayDat)>=TRY_CONVERT(date,@tuNgay,23))
          AND (@denNgay='' OR COALESCE(gh.NgayCapNhat,gh.NgayGiaoThucTe,dh.NgayDat)<DATEADD(day,1,TRY_CONVERT(date,@denNgay,23)))
          AND (@q=N'' OR dh.TenNguoiNhan LIKE N'%'+@q+N'%' OR dh.SDTNhan LIKE '%'+@q+'%'
           OR CAST(dh.MaDon AS varchar(20))=@q OR CAST(gh.MaGiaoHang AS varchar(20))=@q
           OR CONCAT('MA-',CONVERT(char(8),dh.NgayDat,112),'-',RIGHT('000'+CAST(dh.MaDon AS varchar(20)),3)) LIKE N'%'+@q+N'%')
        ORDER BY dh.NgayDat DESC,gh.MaGiaoHang DESC`);
    return res.json({success:true,data:result.recordset.map(x=>({...x,MaDonHienThi:displayOrderId(x.MaDon,x.NgayDat),MaGiaoHangHienThi:`GH-${String(x.MaGiaoHang).padStart(6,'0')}`}))});
  } catch(e) {console.error('Danh sách giao hàng:',e.message);return fail(res,500,'Không tải được danh sách giao hàng.');}
}

async function chiTietGiaoHang(req,res) {
  const id=idFrom(req); if(!validId(id))return fail(res,400,'Mã giao hàng không hợp lệ.');
  try {
    const pool=await getPool();
    const result=await pool.request().input('id',sql.Int,id)
      .input('role',sql.NVarChar(30),req.user.TenVaiTro).input('viewer',sql.Int,req.user.MaNguoiDung).query(`
      SELECT gh.MaGiaoHang,gh.MaDon,gh.TrangThaiGiao,gh.NgayGiaoThucTe,
        gh.LyDoThatBai,dh.TrangThai AS TrangThaiDon,
        CONVERT(varchar(19),dh.NgayDat,126) AS NgayDat,dh.TenNguoiNhan,
        dh.SDTNhan,dh.DiaChiGiao,dh.TongThanhToan,
        tt.PhuongThuc,tt.TrangThai AS TrangThaiThanhToan
      FROM dbo.GiaoHang gh INNER JOIN dbo.DonHang dh ON dh.MaDon=gh.MaDon
      OUTER APPLY (SELECT TOP(1) PhuongThuc,TrangThai FROM dbo.ThanhToan
        WHERE MaDon=dh.MaDon ORDER BY MaThanhToan DESC) tt
      WHERE gh.MaGiaoHang=@id AND dh.TrangThai<>N'Chờ xác nhận'
        AND (@role<>N'Nhân viên' OR dh.MaNhanVienXuLy=@viewer)`);
    const delivery=result.recordset[0];
    if(!delivery)return fail(res,404,'Không tìm thấy phiếu giao hàng.');
    const items=await pool.request().input('id',sql.Int,delivery.MaDon).query(`
      SELECT ct.TenSanPhamSnapshot AS TenSanPham,ct.SKUSnapshot AS SKU,
        ct.CauHinhSnapshot AS CauHinh,ct.SoLuong,
        (SELECT TOP(1) a.DuongDan FROM dbo.AnhSanPham a
          INNER JOIN dbo.BienTheSanPham bt ON bt.MaSanPham=a.MaSanPham
          WHERE bt.MaBienThe=ct.MaBienThe ORDER BY a.LaAnhDaiDien DESC,a.MaAnh) AS DuongDanAnh
      FROM dbo.CTDonHang ct WHERE ct.MaDon=@id ORDER BY ct.MaCTDon`);
    return res.json({success:true,data:{...delivery,MaDonHienThi:displayOrderId(delivery.MaDon,delivery.NgayDat),MaGiaoHangHienThi:`GH-${String(id).padStart(6,'0')}`,items:items.recordset}});
  } catch(e){console.error('Chi tiết giao hàng:',e.message);return fail(res,500,'Không tải được chi tiết giao hàng. Hãy kiểm tra cập nhật SQL nếu cần.');}
}

async function batDauGiaoHang(req,res){
  const id=idFrom(req);if(!validId(id))return fail(res,400,'Mã giao hàng không hợp lệ.');
  let tx,started=false;
  try {
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
    const r=await new sql.Request(tx).input('id',sql.Int,id).query(`
      SELECT gh.MaDon,gh.TrangThaiGiao,dh.MaNhanVienXuLy,dh.TrangThai AS TrangThaiDon
      FROM dbo.GiaoHang gh INNER JOIN dbo.DonHang dh WITH (UPDLOCK,HOLDLOCK) ON dh.MaDon=gh.MaDon
      WHERE gh.MaGiaoHang=@id`);
    const x=r.recordset[0];
    if(x && req.user.TenVaiTro==='Nhân viên' && Number(x.MaNhanVienXuLy)!==req.user.MaNguoiDung){await tx.rollback();started=false;return fail(res,403,'Phiếu giao chưa được phân công cho bạn.');}
    if(!x || !['Chờ giao','Giao không thành công'].includes(x.TrangThaiGiao) || !['Đang chuẩn bị','Đang giao'].includes(x.TrangThaiDon)){
      await tx.rollback();started=false;return fail(res,409,'Phiếu giao không ở trạng thái có thể bắt đầu giao.');
    }
    await new sql.Request(tx).input('id',sql.Int,id).query(`
      UPDATE dbo.GiaoHang SET TrangThaiGiao=N'Đang giao',LyDoThatBai=NULL,NgayCapNhat=SYSDATETIME() WHERE MaGiaoHang=@id`);
    if(x.TrangThaiDon==='Đang chuẩn bị'){
      await new sql.Request(tx).input('id',sql.Int,x.MaDon).query("UPDATE dbo.DonHang SET TrangThai=N'Đang giao' WHERE MaDon=@id");
      await new sql.Request(tx).input('id',sql.Int,x.MaDon).input('uid',sql.Int,req.user.MaNguoiDung)
        .query(`INSERT dbo.LichSuTrangThaiDon (MaDon,MaNguoiDung,TrangThaiCu,TrangThaiMoi)
          VALUES (@id,@uid,N'Đang chuẩn bị',N'Đang giao')`);
    }
    await tx.commit();started=false;
    return res.json({success:true,data:{MaGiaoHang:id,TrangThaiGiao:'Đang giao'}});
  }catch(e){if(started)await tx.rollback().catch(()=>{});console.error('Bắt đầu giao hàng:',e.message);return fail(res,500,'Không thể bắt đầu giao hàng.');}
}

async function baoGiaoThatBai(req,res){
  const id=idFrom(req);const reason=String(req.body?.lyDo||'').trim();
  if(!validId(id))return fail(res,400,'Mã giao hàng không hợp lệ.');
  if(reason.length<5||reason.length>500)return fail(res,400,'Vui lòng nhập lý do giao thất bại từ 5 đến 500 ký tự.');
  let tx,started=false;
  try{
    const pool=await getPool();tx=new sql.Transaction(pool);await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);started=true;
    const r=await new sql.Request(tx).input('id',sql.Int,id).query(`
      SELECT gh.TrangThaiGiao,dh.MaNhanVienXuLy,dh.TrangThai AS TrangThaiDon
      FROM dbo.GiaoHang gh INNER JOIN dbo.DonHang dh WITH (UPDLOCK,HOLDLOCK) ON dh.MaDon=gh.MaDon
      WHERE gh.MaGiaoHang=@id`);
    const x=r.recordset[0];
    if(x && req.user.TenVaiTro==='Nhân viên' && Number(x.MaNhanVienXuLy)!==req.user.MaNguoiDung){await tx.rollback();started=false;return fail(res,403,'Phiếu giao chưa được phân công cho bạn.');}
    if(!x||x.TrangThaiGiao!=='Đang giao'||x.TrangThaiDon!=='Đang giao'){
      await tx.rollback();started=false;return fail(res,409,'Chỉ báo thất bại khi phiếu giao đang được giao.');
    }
    await new sql.Request(tx).input('id',sql.Int,id).input('reason',sql.NVarChar(500),reason)
      .query("UPDATE dbo.GiaoHang SET TrangThaiGiao=N'Giao không thành công',LyDoThatBai=@reason,NgayCapNhat=SYSDATETIME() WHERE MaGiaoHang=@id");
    await tx.commit();started=false;
    return res.json({success:true,data:{MaGiaoHang:id,TrangThaiGiao:'Giao không thành công',LyDoThatBai:reason}});
  }catch(e){if(started)await tx.rollback().catch(()=>{});console.error('Giao hàng thất bại:',e.message);return fail(res,500,'Không thể ghi nhận kết quả giao hàng.');}
}

async function giaoThanhCong(req,res){
  const id=idFrom(req);if(!validId(id))return fail(res,400,'Mã giao hàng không hợp lệ.');
  try{
    const pool=await getPool();const r=await pool.request().input('id',sql.Int,id)
      .query('SELECT MaDon FROM dbo.GiaoHang WHERE MaGiaoHang=@id');
    if(!r.recordset.length)return fail(res,404,'Không tìm thấy phiếu giao hàng.');
    // Reuse transaction xuất kho, ghi lịch sử và khóa đơn của đơn hàng.
    // Hàm này khóa lại trạng thái GiaoHang/DonHang, từ chối ghi nhận trùng.
    req.params={...req.params,id:String(r.recordset[0].MaDon)};
    req.body={...req.body,trangThai:'Hoàn tất'};
    return capNhatTrangThaiDonHang(req,res);
  }catch(e){console.error('Giao thành công:',e.message);return fail(res,500,'Không thể xác nhận giao thành công.');}
}
module.exports={danhSachGiaoHang,chiTietGiaoHang,batDauGiaoHang,baoGiaoThatBai,giaoThanhCong};
