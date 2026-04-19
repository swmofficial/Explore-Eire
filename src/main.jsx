import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (!import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY) {
  console.warn('[Explore Eire] Stripe price IDs not set — upgrade flow will not work')
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn)
}
