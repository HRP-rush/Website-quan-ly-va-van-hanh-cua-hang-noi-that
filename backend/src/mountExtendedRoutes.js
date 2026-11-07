// Trong server.js: const mountExtendedRoutes=require('./mountExtendedRoutes'); mountExtendedRoutes(app);
// Đặt SAU express.json(), cookieParser(), cors() nhưng TRƯỚC app.listen().
const express=require('express');
const path=require('path');
const {taiKhoan,admin,danhMuc,uploadDir}=require('./routes/extendedRoutes');
module.exports=function mountExtendedRoutes(app){
  app.use('/uploads/avatars',express.static(uploadDir,{maxAge:'1d',index:false}));
  app.use('/api/v1/tai-khoan',taiKhoan);
  app.use('/api/v1/quan-tri',admin);
  // CHÚ Ý: nếu Người 2 đã triển khai /api/v1/danh-muc, không gắn hai router có route trùng.
  app.use('/api/v1/danh-muc',danhMuc);
};
