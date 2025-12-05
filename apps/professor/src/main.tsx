import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // Temporarily disabled StrictMode to fix double-invocation issues during dev
  // <React.StrictMode>
    <App />
  // </React.StrictMode>,
)
