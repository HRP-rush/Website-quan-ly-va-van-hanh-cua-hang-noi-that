
const maNguoiDungTest = import.meta.env.DEV
  ? import.meta.env.VITE_TEST_MA_NGUOI_DUNG
  : undefined

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App maNguoiDung={maNguoiDungTest} />
  </StrictMode>,
)
import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
