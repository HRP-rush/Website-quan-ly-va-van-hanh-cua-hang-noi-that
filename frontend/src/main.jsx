import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const maNguoiDungTest = import.meta.env.DEV
  ? import.meta.env.VITE_TEST_MA_NGUOI_DUNG
  : undefined

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App maNguoiDung={maNguoiDungTest} />
  </StrictMode>,
)
