const { xacThuc } = require('./xacThuc');
// Reuse JWT/cookie validation middleware from phase 1.
const allowed = (...roles) => (req,res,next) => {
  if (!req.user || !roles.includes(req.user.TenVaiTro))
    return res.status(403).json({success:false,message:'Bạn không có quyền thực hiện thao tác này.'});
  next();
};
function validateOrigin(req,res,next) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  const origin=req.get('origin');
  const expected=process.env.FRONTEND_URL||'http://localhost:5173';
  if (origin && origin!==expected) return res.status(403).json({success:false,message:'Nguồn yêu cầu không được phép.'});
  next();
}
module.exports={xacThuc,allowed,validateOrigin};
