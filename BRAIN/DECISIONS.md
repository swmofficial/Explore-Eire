# Explore Eire — Architecture Decisions
Last updated: 2026-04-24

## Technology Stack

| Component | Decision | Version / Notes |
|---|---|---|
| Frontend | React + Vite | React 19, Vite 8 |
| Maps | MapLibre GL JS | **v5.22** (package.json) |
| Basemap tiles | MapTiler | satellite (default), outdoor, topo + terrain-rgb-v2 |
| Database | Supabase | `@supabase/supabase-js` v2 |
| Auth | Supabase Auth | Email + Google OAuth implemented |
| Payments | Stripe | `@stripe/stripe-js` v9 — checkout + webhook wired |
| State management | Zustand | v5 — mapStore, moduleStore, userStore |
| Font | Plus Jakarta Sans | Google Fonts — 400/500/600/700 |
| WMS Proxy | Hostinger VPS + Node | PM2 `wms-proxy` process |
| Offline tiles | MapLibre + Cache API | Service Worker intercepts MapTiler tiles |
| Native wrapper | Capacitor | **v8** — ios/ + android/ project dirs committed |
| Analytics | Plausible | Not yet started |
| Hosting | Vercel | Auto-deploy on push to main |

## Decision Log

### 2026-04-23 Static hex values in MapLibre paint objects
Choice: Replace var(--color-accent)/var(--color-text) with #E8C96A/#E8EAF0
Reason: MapLibre GL JS v5 does not support CSS custom properties in paint objects
Do not revisit unless: MapLibre adds native CSS var support

### 2026-04-23 WMS tile URL — no URLSearchParams
Choice: String concatenation only for WMS tile URL construction
Reason: URLSearchParams re-encodes {bbox-epsg-3857} placeholder, breaking MapLibre
Do not revisit unless: MapLibre changes tile URL template handling
