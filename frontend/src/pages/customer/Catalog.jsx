import { useEffect,useMemo,useState } from 'react';
import {useSearchParams} from 'react-router-dom';
import Header from '../../components/Header';import Footer from '../../components/Footer';import ProductCard from '../../components/ProductCard';
import {getProducts} from '../../services/productService';import '../../styles/catalog.css';
export default function Catalog(){
 const [products,setProducts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [params,setParams]=useSearchParams();
 const q=params.get('q')||'',category=params.get('danh-muc')||'',sort=params.get('sap-xep')||'new',max=params.get('gia-den')||'';
 useEffect(()=>{let active=true;getProducts().then(d=>active&&setProducts(d)).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));return()=>{active=false}},[]);
 const patch=(key,value)=>{const next=new URLSearchParams(params);value?next.set(key,value):next.delete(key);setParams(next);};
 const categories=[...new Set(products.map(p=>p.category).filter(Boolean))];
 const filtered=useMemo(()=>{
  const needle=q.trim().toLocaleLowerCase('vi-VN');let list=products.filter(p=>(!needle||[p.name,p.category,p.shortDescription,p.style,p.material].join(' ').toLocaleLowerCase('vi-VN').includes(needle))&&(!category||p.category===category)&&(!max||(p.price!=null&&p.price<=Number(max))));
  return list.sort((a,b)=>sort==='price-up'?(a.price??Infinity)-(b.price??Infinity):sort==='price-down'?(b.price??-1)-(a.price??-1):sort==='name'?a.name.localeCompare(b.name,'vi'):0);
 },[products,q,category,max,sort]);
 return <><Header onSearch={v=>patch('q',v)} onCategoryChange={v=>patch('danh-muc',v)}/><main className="moc-catalog-page"><div className="container"><div className="moc-catalog-heading"><p className="eyebrow">KHÁM PHÁ MỘC AN</p><h1>Chọn nội thất cho tổ ấm</h1><p>Tìm kiếm thiết kế theo tên, không gian, chất liệu và khoảng giá.</p></div>
 <div className="moc-catalog-layout"><aside className="moc-filters"><h2>Bộ lọc sản phẩm</h2><label>Từ khóa<input value={q} onChange={e=>patch('q',e.target.value)} placeholder="Tên sản phẩm..."/></label><label>Không gian<select value={category} onChange={e=>patch('danh-muc',e.target.value)}><option value="">Tất cả danh mục</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Giá tối đa (VNĐ)<input type="number" min="0" value={max} onChange={e=>patch('gia-den',e.target.value)} placeholder="Ví dụ: 10000000"/></label><button className="moc-outline-btn" onClick={()=>setParams({})}>Xóa bộ lọc</button></aside>
 <section className="moc-catalog-results"><div className="moc-results-bar"><span>{filtered.length} sản phẩm</span><label>Sắp xếp: <select value={sort} onChange={e=>patch('sap-xep',e.target.value)}><option value="new">Mới cập nhật</option><option value="price-up">Giá tăng dần</option><option value="price-down">Giá giảm dần</option><option value="name">Tên A–Z</option></select></label></div>
 {loading&&<p className="moc-status">Đang tải dữ liệu...</p>}{error&&<p className="moc-status moc-error" role="alert">{error}</p>}{!loading&&!error&&!filtered.length&&<div className="moc-status">Không tìm thấy sản phẩm phù hợp. Hãy thử điều chỉnh bộ lọc.</div>}
 <div className="product-grid">{filtered.map(p=><ProductCard key={p.id} product={p}/>)}</div></section></div></div></main><Footer/></>;
}
