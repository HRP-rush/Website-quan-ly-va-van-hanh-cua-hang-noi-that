import {useEffect,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import {PeopleField} from "../../components/PeopleUI";
import {peopleRequest} from "../../services/peopleService";
export default function ThietLapTaiKhoan(){
 const [params,setParams]=useSearchParams(),token=params.get("token")||"";
 const [person,setPerson]=useState(null),[error,setError]=useState(""),[pass,setPass]=useState(""),[confirm,setConfirm]=useState(""),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 useEffect(()=>{if(done)return;let live=true;peopleRequest(`/con-nguoi/thiet-lap?${new URLSearchParams({token})}`).then(r=>live&&setPerson(r.data)).catch(e=>live&&setError(e.message));return()=>{live=false;};},[token,done]);
 async function submit(e){e.preventDefault();if(busy)return;setError("");if(pass!==confirm){setError("Mật khẩu xác nhận không khớp.");return;}setBusy(true);try{await peopleRequest("/con-nguoi/thiet-lap","POST",{token,matKhau:pass});setDone(true);setPass("");setConfirm("");setParams({}, {replace:true});}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <><Header/><main className="pp-setup"><section className="pp-setup-card"><p className="eyebrow">MỘC AN INTERIOR</p><h1>Thiết lập tài khoản</h1>{done?<><p className="pp-success" role="status">Mật khẩu đã được thiết lập. Tài khoản có thể đăng nhập.</p><Link to="/dang-nhap" className="pp-btn pp-primary">Đăng nhập</Link></>:<>{error&&<p className="pp-error" role="alert">{error}</p>}{person?<form onSubmit={submit}><p className="pp-muted">{person.HoTen} • {person.Email}</p><fieldset className="pp-fields" disabled={busy}><PeopleField label="Mật khẩu mới *" hint="Ít nhất 8 ký tự gồm chữ hoa, chữ thường, số; tối đa 72 byte."><input type="password" required minLength={8} autoComplete="new-password" value={pass} onChange={e=>setPass(e.target.value)}/></PeopleField><PeopleField label="Xác nhận mật khẩu *"><input type="password" required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></PeopleField><button className="pp-btn pp-primary">{busy?"Đang lưu...":"Thiết lập mật khẩu"}</button></fieldset></form>:!error&&<p>Đang kiểm tra liên kết...</p>}</>}</section></main><Footer/></>;
}
