const router=require("express").Router();
const {xacThuc,choPhepVaiTro}=require("../middleware/xacThuc");
const c=require("../controllers/phanHoiController");
router.use(xacThuc);
router.get("/don-hang/:id",choPhepVaiTro("Khách hàng"),c.order);
router.post("/",choPhepVaiTro("Khách hàng"),c.create);
router.get("/quan-tri",choPhepVaiTro("Quản lý","Admin"),c.list);
router.patch("/quan-tri/:id",choPhepVaiTro("Quản lý","Admin"),c.processReview);
module.exports=router;
