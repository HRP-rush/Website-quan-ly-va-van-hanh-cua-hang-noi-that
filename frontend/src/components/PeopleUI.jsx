import {useEffect,useRef} from "react";
import {X,ChevronLeft,ChevronRight} from "lucide-react";
import "../styles/people.css";
export function PeopleModal({title,close,busy=false,children}){
 const ref=useRef(null);
 useEffect(()=>{const d=ref.current;d.showModal();return()=>d.close();},[]);
 return <dialog ref={ref} className="pp-modal" aria-labelledby="pp-modal-title" onCancel={e=>{e.preventDefault();if(!busy)close();}}><div className="pp-modal-head"><h2 id="pp-modal-title">{title}</h2><button type="button" disabled={busy} onClick={close} aria-label="Đóng"><X size={20}/></button></div>{children}</dialog>;
}
export function PeopleField({label,children,hint}){return <label className="pp-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;}
export function PeopleKpis({items}){return <div className="pp-kpis">{items.map(([label,value,note])=><article key={label}><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}</div>;}
export function PeoplePager({page,total,busy,onPage}){const pages=Math.max(1,Math.ceil(total/10));return <div className="pp-pager"><span>Hiển thị {total?(page-1)*10+1:0}–{Math.min(page*10,total)} / {total} kết quả • 10 dòng / trang</span><div><button type="button" disabled={busy||page<=1} onClick={()=>onPage(page-1)} aria-label="Trang trước"><ChevronLeft size={14}/></button><span>{page} / {pages}</span><button type="button" disabled={busy||page>=pages} onClick={()=>onPage(page+1)} aria-label="Trang sau"><ChevronRight size={14}/></button></div></div>;}
