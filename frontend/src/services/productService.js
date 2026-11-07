const API_URL=(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/,'');
const img=(path)=>{
 if(!path)return '/images/placeholder-product.jpg';
 if(/^https?:\/\//i.test(path))return path;
 if(path.startsWith('/images/'))return path;
 return `${API_URL}/${String(path).replace(/^\/+/, '')}`;
};
const normalize=(p)=>({
 id:p.MaSanPham,name:p.TenSanPham,description:p.MoTa,shortDescription:p.MoTaNgan,
 category:p.TenDanhMuc,categoryId:p.MaDanhMuc,style:p.PhongCach,
 material:p.ChatLieuChinh,care:p.HuongDanBaoQuan,specs:p.ThongSoKyThuat,
 status:p.TrangThai,image:img(p.DuongDanAnh),price:p.GiaBan==null?null:Number(p.GiaBan),
 basePrice:p.GiaCoBan==null?null:Number(p.GiaCoBan),
 stock:p.SoLuongTon==null?null:Number(p.SoLuongTon),
 images:(p.Anh||[]).map(x=>({...x,url:img(x.DuongDan)})),
 variants:(p.BienThe||[]).map(x=>({...x,GiaBan:Number(x.GiaBan),SoLuongTon:Number(x.SoLuongTon||0)}))
});
async function request(url){
 const response=await fetch(`${API_URL}${url}`,{credentials:'include'});
 let result;try{result=await response.json();}catch{throw new Error('Máy chủ không trả về JSON hợp lệ.');}
 if(!response.ok||!result.success)throw new Error(result.message||'Không thể tải dữ liệu.');
 return result.data;
}
export async function getProducts(){return (await request('/api/san-pham')).map(normalize);}
export async function getProductDetail(id){return normalize(await request(`/api/san-pham/cong-khai/${encodeURIComponent(id)}`));}
export const formatPrice=p=>p==null?'Liên hệ để biết giá':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(p);
