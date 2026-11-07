const API=import.meta.env.VITE_API_URL||'http://localhost:5000';
export async function request(path,{method='GET',body,form=false}={}){
 const opts={method,credentials:'include',headers:{},};
 if(body!==undefined){if(form)opts.body=body;else {opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body)}}
 const r=await fetch(API+path,opts);let result;
 try{result=await r.json()}catch{throw new Error('Máy chủ không trả dữ liệu JSON. Kiểm tra Backend.')}
 if(!r.ok||result.success===false)throw new Error(result.message||`Lỗi HTTP ${r.status}`);
 return result.data??result;
}
export const accountAPI={
 list:(params={})=>request('/api/v1/quan-tri/tai-khoan?'+new URLSearchParams(params)),
 detail:id=>request(`/api/v1/quan-tri/tai-khoan/${id}`),
 create:b=>request('/api/v1/quan-tri/tai-khoan',{method:'POST',body:b}),
 update:(id,b)=>request(`/api/v1/quan-tri/tai-khoan/${id}`,{method:'PUT',body:b}),
 role:(id,vaiTro)=>request(`/api/v1/quan-tri/tai-khoan/${id}/vai-tro`,{method:'PATCH',body:{vaiTro}}),
 status:(id,trangThai)=>request(`/api/v1/quan-tri/tai-khoan/${id}/trang-thai`,{method:'PATCH',body:{trangThai}}),
 remove:id=>request(`/api/v1/quan-tri/tai-khoan/${id}`,{method:'DELETE'})
};
export const categoryAPI={
 list:()=>request('/api/v1/danh-muc'),
 create:b=>request('/api/v1/danh-muc',{method:'POST',body:b}),
 update:(id,b)=>request(`/api/v1/danh-muc/${id}`,{method:'PUT',body:b}),
 remove:id=>request(`/api/v1/danh-muc/${id}`,{method:'DELETE'}),
 reorder:danhSach=>request('/api/v1/danh-muc/thu-tu/sap-xep',{method:'PATCH',body:{danhSach}})
};
export const profileAPI={
 get:()=>request('/api/v1/tai-khoan/ho-so'),
 update:b=>request('/api/v1/tai-khoan/cua-toi',{method:'PATCH',body:b}),
 addresses:()=>request('/api/v1/tai-khoan/dia-chi'),
 addAddress:b=>request('/api/v1/tai-khoan/dia-chi',{method:'POST',body:b}),
 editAddress:(id,b)=>request(`/api/v1/tai-khoan/dia-chi/${id}`,{method:'PUT',body:b}),
 deleteAddress:id=>request(`/api/v1/tai-khoan/dia-chi/${id}`,{method:'DELETE'}),
 defaultAddress:id=>request(`/api/v1/tai-khoan/dia-chi/${id}/mac-dinh`,{method:'PATCH'}),
 changePass:b=>request('/api/v1/tai-khoan/doi-mat-khau',{method:'POST',body:b}),
 avatar:img=>{const f=new FormData();f.append('anh',img);return request('/api/v1/tai-khoan/anh-dai-dien',{method:'POST',body:f,form:true})},
 forgot:email=>request('/api/v1/tai-khoan/quen-mat-khau',{method:'POST',body:{email}}),
 reset:(token,matKhauMoi)=>request('/api/v1/tai-khoan/dat-lai-mat-khau',{method:'POST',body:{token,matKhauMoi}})
};
export const avatarSrc=v=>v?.startsWith('/uploads/')?(API+v):v;
