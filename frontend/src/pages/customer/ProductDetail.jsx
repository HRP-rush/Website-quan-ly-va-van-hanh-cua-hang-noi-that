import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, ShoppingBag, ArrowLeft, Check } from 'lucide-react';
import Header from '../../components/Header';import Footer from '../../components/Footer';
import {getProductDetail,formatPrice} from '../../services/productService';
import {getCurrentUser} from '../../services/authService';
import '../../styles/catalog.css';
export default function ProductDetail(){
 const {maSanPham}=useParams(),navigate=useNavigate(),location=useLocation();
 const [product,setProduct]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [photo,setPhoto]=useState(0),[variantId,setVariantId]=useState(''),[notice,setNotice]=useState(location.state?.message||'');
 useEffect(()=>{let active=true;setLoading(true);setError('');setPhoto(0);setVariantId('');
 getProductDetail(maSanPham).then(p=>{if(active){setProduct(p);setVariantId(String(p.variants[0]?.MaBienThe||''));}})
 .catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));return()=>{active=false};},[maSanPham]);
 const gallery=product?.images.length?product.images.map(i=>i.url):[product?.image||'/images/placeholder-product.jpg'];
 const variant=product?.variants.find(v=>String(v.MaBienThe)===variantId);
 async function add(){setNotice('');try{const user=await getCurrentUser();if(!user){navigate('/dang-nhap',{state:{from:location.pathname,message:'Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.'}});return;}
 if(user.TenVaiTro!=='Khách hàng'){setNotice('Hãy dùng tài khoản Khách hàng để sử dụng giỏ hàng.');return;}
 setNotice('Bạn đã đăng nhập. Chức năng lưu giỏ hàng sẽ được phát triển ở giai đoạn tiếp theo; sản phẩm chưa được thêm vào giỏ.');
 }catch(e){setNotice(`Không kiểm tra được tài khoản: ${e.message}`);}}
 return <><Header/><main className="moc-detail-page"><div className="container">
 <div className="moc-breadcrumb"><Link to="/">Trang chủ</Link><ChevronRight size={14}/><Link to="/san-pham">Sản phẩm</Link><ChevronRight size={14}/><span>{product?.name||'Chi tiết sản phẩm'}</span></div>
 {loading&&<p className="moc-status">Đang tải chi tiết từ SQL Server...</p>}
 {error&&<div className="moc-status moc-error" role="alert">{error} <Link to="/san-pham">Quay lại danh sách</Link></div>}
 {product&&<><div className="moc-detail-grid"><div className="moc-gallery">
 <div className="moc-gallery-main"><img src={gallery[photo]} alt={`${product.name} - ảnh ${photo+1}`} onError={e=>{e.currentTarget.src='/images/placeholder-product.jpg'}}/>
 {gallery.length>1&&<><button className="moc-gallery-prev" onClick={()=>setPhoto(i=>(i+gallery.length-1)%gallery.length)} aria-label="Ảnh trước"><ChevronLeft/></button><button className="moc-gallery-next" onClick={()=>setPhoto(i=>(i+1)%gallery.length)} aria-label="Ảnh sau"><ChevronRight/></button></>}</div>
 <div className="moc-thumbs">{gallery.map((url,i)=><button key={`${url}-${i}`} className={i===photo?'active':''} onClick={()=>setPhoto(i)} aria-label={`Xem ảnh ${i+1}`}><img src={url} alt=""/></button>)}</div></div>
 <div className="moc-detail-info"><p className="eyebrow">MỘC AN / {product.category||'NỘI THẤT'}</p><h1>{product.name}</h1>
 <p className="moc-detail-code">Mã sản phẩm: {product.id} {product.style&&` · ${product.style}`}</p>
 <p className="moc-detail-price">{formatPrice(variant?.GiaBan??product.price)}</p>
 <p className="moc-detail-desc">{product.shortDescription||product.description||'Chưa cập nhật mô tả sản phẩm.'}</p>
 <div className="moc-availability"><Check size={17}/>{product.variants.length?`Tồn của biến thể: ${variant?.SoLuongTon??0}`:product.stock==null?'Tồn kho chưa cập nhật':`Tồn kho hiện tại: ${product.stock}`}</div>
 {!!product.variants.length&&<div className="moc-variant-group"><label htmlFor="moc-variant">Chọn phiên bản (SKU)</label><select id="moc-variant" value={variantId} onChange={e=>setVariantId(e.target.value)}>{product.variants.map(v=><option key={v.MaBienThe} value={v.MaBienThe}>{[v.SKU,v.MauSac,v.ChatLieu,v.KichThuoc].filter(Boolean).join(' · ')} — {formatPrice(v.GiaBan)}</option>)}</select></div>}
 <button type="button" onClick={add} className="moc-detail-add"><ShoppingBag size={19}/> Thêm vào giỏ hàng</button>
 {notice&&<p className="moc-status" role="status">{notice}</p>}
 <p className="moc-detail-note">Giá, hình ảnh, biến thể và thông tin hiển thị được đọc từ cơ sở dữ liệu. Chưa triển khai quy trình đặt mua.</p>
 <Link className="moc-back" to="/san-pham"><ArrowLeft size={16}/> Xem sản phẩm khác</Link>
 </div></div>
 <section className="moc-details-panel"><h2>Thông tin sản phẩm</h2><div className="moc-spec-table">
 <div><b>Danh mục</b><span>{product.category||'Chưa cập nhật'}</span></div><div><b>Phong cách</b><span>{product.style||'Chưa cập nhật'}</span></div><div><b>Chất liệu chính</b><span>{product.material||'Chưa cập nhật'}</span></div>
 {variant&&<><div><b>Màu sắc</b><span>{variant.MauSac||'Chưa cập nhật'}</span></div><div><b>Kích thước</b><span>{variant.KichThuoc||'Chưa cập nhật'}</span></div><div><b>SKU</b><span>{variant.SKU}</span></div></>}
 </div><h3>Mô tả chi tiết</h3><p className="moc-long-text">{product.description||'Chưa có mô tả chi tiết.'}</p>
 <h3>Thông số kỹ thuật</h3><p className="moc-long-text">{product.specs||'Chưa cập nhật thông số kỹ thuật.'}</p>
 <h3>Hướng dẫn bảo quản</h3><p className="moc-long-text">{product.care||'Chưa cập nhật hướng dẫn bảo quản.'}</p></section>
 </>}
 </div></main><Footer/></>;
}
