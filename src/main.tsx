import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' 
import './index.css'  // <--- 加上這一行！很重要！

// 建立 React 的根節點並啟動 App
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)