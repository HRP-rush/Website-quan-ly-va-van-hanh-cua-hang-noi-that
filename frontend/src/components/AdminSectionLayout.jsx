import {NavLink,useNavigate} from 'react-router-dom';
import {LayoutDashboard,Layers,Users,UserRound,ShoppingBag,Boxes,LogOut,ChevronRight} from 'lucide-react';
import {logout,getRolePath} from '../services/authService';
import '../styles/accountPages.css';
export default function AdminSectionLayout({user,title,caption,children}){
 const nav=[{to:getRolePath(user.TenVaiTro),label:'Tổng quan',icon:LayoutDashboard,end:true},{to:'/quan-tri/danh-muc',label:'Danh mục',icon:Layers},{to:'/quan-tri/khach-hang',label:'Khách hàng',icon:Users},{to:'/quan-tri/nhan-vien',label:'Nhân viên',icon:ShoppingBag},{to:'/ho-so',label:'Hồ sơ của tôi',icon:UserRound}];
 const navigate=useNavigate();return <div className="moc-admin"><aside className="moc-side"><div className="moc-logo">MỘC AN<small>INTERIOR</small></div><span className="moc-side-label">CỔNG QUẢN TRỊ</span><nav>{nav.map(x=>{const Icon=x.icon;return <NavLink key={x.to} end={x.end} to={x.to} className={({isActive})=>'moc-nav '+(isActive?'active':'')}><Icon size={17}/>{x.label}</NavLink>})}</nav><button className="moc-nav" onClick={async()=>{await logout();navigate('/dang-nhap')}}><LogOut size={17}/>Đăng xuất</button><div className="moc-side-bottom">MỘC AN INTERIOR<br/>Quản lý cửa hàng • 2026</div></aside><div className="moc-content"><div className="moc-top"><span>Cửa hàng nội thất Mộc An</span><div><b>{user.HoTen||user.Email}</b> <small>{user.TenVaiTro}</small></div></div><main className="moc-main"><div className="moc-breadcrumb">Quản trị <ChevronRight size={13}/>{caption||title}</div><h1>{title}</h1>{children}</main></div></div>
}
