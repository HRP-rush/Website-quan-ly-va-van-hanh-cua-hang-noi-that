const API=(import.meta.env.VITE_API_URL||"").replace(/\/$/,"");
export async function peopleRequest(path,method="GET",body,signal){
 const response=await fetch(`${API}/api${path}`,{method,credentials:"include",signal,headers:body?{"Content-Type":"application/json"}:{},body:body?JSON.stringify(body):undefined});
 let data;try{data=await response.json();}catch{throw new Error("Máy chủ không trả JSON hợp lệ. Kiểm tra đăng ký API và khởi động lại backend.");}
 if(!response.ok)throw new Error(data.message||"Yêu cầu thất bại.");return data;
}
export const dateText=v=>v?new Date(v).toLocaleDateString("vi-VN"):"—";
export const personCode=p=>`${p.TenVaiTro==="Khách hàng"?"KH":p.TenVaiTro==="Quản lý"?"QL":p.TenVaiTro==="Admin"?"QT":"NV"}-${String(p.MaNguoiDung).padStart(3,"0")}`;
export const orderCode=(id,date)=>`MA-${date?String(date).slice(0,10).replace(/-/g,""):""}-${String(id).padStart(3,"0")}`;
