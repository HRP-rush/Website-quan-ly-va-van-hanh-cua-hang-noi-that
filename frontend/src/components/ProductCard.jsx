import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowUpRight } from 'lucide-react';
import { formatPrice } from '../services/productService';
export default function ProductCard({product,onAdd}){
 const [failed,setFailed]=useState(false);
 const url=`/san-pham/${encodeURIComponent(product.id)}`;
 return <article className="product-card">
  <Link className="product-image-wrap moc-product-image" to={url} aria-label={`Xem ${product.name}`}>
   <img src={failed?'/images/placeholder-product.jpg':product.image} onError={()=>setFailed(true)} alt={product.name} loading="lazy" />
   <span className="moc-product-view">Xem chi tiết <ArrowUpRight size={15}/></span>
  </Link>
  <div className="product-content">
   <p className="product-category">{product.category||'Nội thất Mộc An'}</p>
   <h3 className="product-name"><Link to={url}>{product.name}</Link></h3>
   <p className="moc-product-description">{product.shortDescription||product.description||'Thiết kế dành cho không gian sống.'}</p>
   <p className="product-price">{formatPrice(product.price)}</p>
   <p className={`product-stock ${product.stock===0?'out-of-stock':''}`}><span className="stock-dot"/>{product.stock==null?'Liên hệ kiểm tra tồn kho':product.stock>0?`Tồn kho: ${product.stock}`:'Tạm hết hàng'}</p>
   <div className="moc-card-actions"><Link to={url} className="moc-outline-btn">Chi tiết</Link><button type="button" className="moc-dark-btn" onClick={()=>onAdd?.(product)}><ShoppingBag size={15}/> Thêm vào giỏ</button></div>
  </div>
 </article>;
}
