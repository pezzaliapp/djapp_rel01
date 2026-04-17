import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/global.css'

// Previeni il default del browser su touch per evitare
// scroll / zoom accidentale durante uso dei jog wheel
document.addEventListener('touchmove', (e) => {
  if (e.target.closest('[data-touch-lock]')) {
    e.preventDefault()
  }
}, { passive: false })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
