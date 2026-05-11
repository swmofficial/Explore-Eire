import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles/global.css'
import App from './App.jsx'
import { initSentry, ErrorBoundary } from './lib/sentry.js'

initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary fallback={
      <div style={{ position: 'fixed', inset: 0, background: '#0a0c1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 16 }}>Something went wrong. Please restart the app.</span>
      </div>
    }>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

if (!import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY) {
  console.warn('[Explore Eire] Stripe price IDs not set — upgrade flow will not work')
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.warn)
}
