# Explore Eire — Phase 2 Architect File
> Last updated: 16 April 2026 (session 3)
> For full design system, module specs, DB schema and waypoint spec see ARCHITECTURE.md — read it before working on any new component or module.
> DO NOT write a single line of code until you have read this file in full

---

## What We're Building

**Explore Eire** — Ireland's all-in-one outdoor platform. One app, one subscription, five modules covering everything the Irish outdoors enthusiast needs. The direct competitor to OnX Maps (US/AU) which does not serve Ireland or Europe.

**The core insight:** OnX built four separate apps for four audiences. We build one app with five modules. Same map engine, one subscription, everything included. Structurally better product.

**Business model:** Free tier (limited) → Explorer €9.99/month → Annual €79/year

**Competitor:** OnX Maps (US) — 3M+ users, $35/month per app, does NOT serve Ireland or Europe. Entire market unserved.

**Strategic direction:** Own the Irish outdoor market across all verticals before anyone else does. Gold/prospecting is the hero entry point and proven data foundation. Expand modules as data becomes available.

---

## Infrastructure

- **GitHub repo:** https://github.com/swmofficial/Explore-Eire
- **Deployment:** Vercel — auto-deploys on every push to `main`
- **VPS (WMS proxy):** `187.124.212.83` / `srv1566939.hstgr.cloud` — Ubuntu 24.04 LTS, PM2 `wms-proxy` process
- **Proxy URL (HTTPS via Traefik):** `https://srv1566939.hstgr.cloud` — Health check: `https://srv1566939.hstgr.cloud/health`
- **Proxy endpoints:** `/wms/geo` → GSI Geochemistry, `/wms/bed` → GSI Bedrock, `/wms/bore` → GSI Boreholes
- **Supabase:** `https://dozgrffjwxdzixpfnica.supabase.co`
- **MapTiler:** satellite (default), outdoor-v2, topo-v2 + terrain-rgb-v2

**Vercel env vars (set in Vercel dashboard):**
```
VITE_MAPTILER_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PRICE_ID_MONTHLY
VITE_STRIPE_PRICE_ID_ANNUAL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

**Local `.env` (never commit — confirmed in .gitignore):**
```
VITE_MAPTILER_KEY=HPJlwqR1pNmrR3Eyirrv
VITE_SUPABASE_URL=https://dozgrffjwxdzixpfnica.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Stack

| Component | Decision | Version / Notes |
|---|---|---|
| Frontend | React + Vite | React 19, Vite 8 |
| Maps | MapLibre GL JS | **v5.22** (package.json) |
| Basemap tiles | MapTiler | satellite (default), outdoor, topo + terrain-rgb-v2 |
| Database | Supabase | `@supabase/supabase-js` v2 |
| Auth | Supabase Auth | Email + Google OAuth implemented |
| Payments | Stripe | `@stripe/stripe-js` v9 — serverless stubs, not yet wired |
| State management | Zustand | v5 — mapStore, moduleStore, userStore |
| Font | Plus Jakarta Sans | Google Fonts — 400/500/600/700 |
| WMS Proxy | Hostinger VPS + Node | PM2 `wms-proxy` process |
| Offline tiles | MapLibre + IndexedDB | Not yet implemented |
| Native wrapper | Capacitor | Not yet started |
| Analytics | Plausible | Not yet started |
| Hosting | Vercel | Auto-deploy on push to main |

---

## Project Structure (actual current state)

```
explore-eire/
├── api/                         ← Vercel serverless functions — must be at root, not src/api/
│   ├── create-checkout-session.js  ← POST {plan, userId} → {url} Stripe Checkout session
│   └── stripe-webhook.js           ← Vercel webhook handler — updates Supabase subscriptions
├── index.html                   ← viewport-fit=cover, Plus Jakarta Sans, theme-color
├── vite.config.js               ← React plugin only
├── package.json
├── CLAUDE.md
├── .env                         ← never commit — in .gitignore
├── .gitignore                   ← UTF-8, covers node_modules + .env + dist
└── src/
    ├── main.jsx                 ← imports maplibre-gl CSS + global.css, renders App
    ├── App.jsx                  ← dashboard↔map routing, mounts SettingsPanel/AuthModal/UpgradeSheet
    ├── store/
    │   ├── mapStore.js          ← map instance, basemap(satellite), layers, 3D, DataSheet state,
    │   │                           LayerPanel/Settings/BasemapPicker open states, selectedSample,
    │   │                           tierFilter, sessionTrail, sessionWaypoints
    │   ├── moduleStore.js       ← activeModule, accessibleModules, activeCategoryTab
    │   └── userStore.js         ← user, isGuest, isPro, subscriptionStatus, legalAccepted,
    │                               showLegalDisclaimer, showAuthModal, showUpgradeSheet, theme
    ├── components/
    │   ├── Map.jsx              ← MapLibre map + overlay UI host. Renders: CategoryHeader,
    │   │                           CornerControls, DataSheet, SampleSheet, LayerPanel, BasemapPicker.
    │   │                           Handles basemap switching, 3D terrain, WMS layers, gold tiers.
    │   ├── ModuleDashboard.jsx  ← 5 module icons, lock/unlock, CTA, renders AuthModal inline
    │   ├── CategoryHeader.jsx   ← Fixed top strip: home button + module name + accent dot. No tabs.
    │   ├── LayerPanel.jsx       ← Right drawer (260ms slide). Layer toggles with Pro badges.
    │   │                           Opened by Layers corner button. Filtered by activeModule.
    │   ├── SettingsPanel.jsx    ← Left drawer. Theme (Dark/Light/Eire), account, sign out.
    │   ├── CornerControls.jsx   ← 4 glass buttons. Settings→SettingsPanel, Layers→LayerPanel,
    │   │                           Basemap→BasemapPicker, Camera→UpgradeSheet(free)/TODO(Pro)
    │   ├── DataSheet.jsx        ← 3-state bottom sheet (60px/46vh/85vh). Tier filter pills,
    │   │                           WMS toggle pills (Heatmap/Geology), nearest sample list.
    │   ├── SampleSheet.jsx      ← Sample detail: ppb hero, data rows, upstream tip, Save Waypoint.
    │   ├── MineralSheet.jsx     ← Mineral locality detail: name H1, category badge, townland, county, description, notes, coords.
    │   ├── BasemapPicker.jsx    ← Bottom sheet. 3 thumbnail cards + 2D/3D terrain toggle.
    │   ├── UpgradeSheet.jsx     ← Paywall. Feature list, monthly/annual pills, CTA (Stripe TODO).
    │   ├── AuthModal.jsx        ← Sign In/Up modal. Google OAuth + email/password + Continue as guest.
    │   ├── BottomSheet.jsx      ← Minimal reusable shell (no spring/drag yet)
    │   ├── FindSheet.jsx        ← GPS bounding-box query → Haversine sort → nearest 50 gold/minerals.
    │   │                           Gold tab free (t6/t7) / Pro (t1-t5). Minerals tab full Pro. Tab bar,
    │   │                           loading/error/empty states. Tap row → flyTo + open SampleSheet/MineralSheet.
    │   ├── WaypointSheet.jsx    ← Add/view/delete waypoints. Description, photo upload to Supabase Storage,
    │   │                           two-step confirm delete, photo display in view mode.
    │   ├── TrackOverlay.jsx     ← Floating pill (duration + distance) while tracking. Completion summary sheet.
    │   │                           Reads isTracking + sessionTrail from mapStore. Saves track to Supabase.
    │   ├── OfflineManager.jsx   ← STUB
    │   ├── RouteBuilder.jsx     ← Long-press (contextmenu) drops route points on map. Dashed gold polyline +
    │   │                           numbered dots. Panel: distance, point list, Clear + Save to Supabase routes.
    │   │                           Pro gate. Route sources: route-builder-src, route-points-src in Map.jsx.
    │   ├── SplashScreen.jsx     ← 1.8s branded hold + 300ms fade. Gold wordmark + grey tagline. Calls onDone.
    │   │                           Mounted in App.jsx with splashDone local state.
    │   ├── StatusToast.jsx      ← Animated toast stack. Persistent OFFLINE badge. Monitors navigator.onLine.
    │   └── LegalDisclaimerModal.jsx  ← Centred popup, 8 legal sections, checkbox accept, Supabase upsert
    ├── hooks/
    │   ├── useAuth.js           ← Auth state listener, legalFetchedFor ref, profile + sub fetch
    │   ├── useGoldSamples.js    ← Batched Supabase load (1000/batch, loop until exhausted)
    │   ├── useMineralLocalities.js ← Batched Supabase load of mineral_localities (1000/batch)
    │   ├── useGeolocation.js    ← Device GPS: getCurrentPosition, watchPosition, stopWatching
    │   ├── useSubscription.js   ← STUB (subscription fetch handled by useAuth currently)
    │   ├── useTracks.js         ← Full GPS tracking. startTracking/stopTracking. Exports calcTrailDistanceM.
    │   │                           Saves completed track to Supabase tracks table. Uses watchPosition directly.
    │   ├── useWaypoints.js      ← Full CRUD. Photo upload to Supabase Storage waypoint-photos/{userId}/{ts}.ext.
    │   └── useOffline.js        ← Partial (online/offline detection works; download TODO)
    ├── lib/
    │   ├── supabase.js          ← createClient with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
    │   ├── mapConfig.js         ← BASEMAPS, TERRAIN_SOURCE, TERRAIN_CONFIG, DEFAULT_CENTER/ZOOM,
    │   │                           GOLD_TIERS, GSI_LAYERS (Unicode-escaped), buildWmsUrl
    │   ├── layerCategories.js   ← LAYER_CATEGORIES: module → [{id, label, layers:[{id,label,pro}]}]
    │   └── moduleConfig.js      ← MODULES array (5 entries), getModule(id)
    └── styles/
        └── global.css           ← CSS vars (all 3 themes), reset, animations, MapLibre overrides
```

---

## Current Build State

| Feature | Status |
|---|---|
| Full-screen MapLibre map (satellite default) | ✅ Built |
| Module dashboard, 5 icons, lock/unlock | ✅ Built |
| Auth — email + Google OAuth + guest mode | ✅ Built |
| Prospecting gold layers (7 tiers + rock circles) | ✅ Built |
| WMS proxy layers (geochemistry + geology) | ✅ Built |
| LayerPanel right drawer | ✅ Built |
| DataSheet bottom sheet (tab bar + gold/mineral lists + spring gesture) | ✅ Built |
| SampleSheet detail (ppb, coords, waypoint save) | ✅ Built |
| MineralSheet detail (mineral name, category badge, townland, county, coords) | ✅ Built |
| Mineral localities layer (per-category circle layers, click → MineralSheet) | ✅ Built |
| BasemapPicker (outdoor / satellite / topo + 3D toggle) | ✅ Built |
| Basemap switching (setStyle + re-add layers) | ✅ Built |
| 3D terrain (MapTiler terrain-rgb-v2) | ✅ Built |
| UpgradeSheet paywall (feature list, monthly/annual) | ✅ Built |
| SettingsPanel (theme, account, sign out) | ✅ Built |
| Session trail on map (blue dots) | ✅ Built (mapStore + Map.jsx) |
| Session waypoints on map (gold dots) | ✅ Built (mapStore + Map.jsx) |
| Legal disclaimer | ✅ Built — centred popup, checkbox accept, Supabase upsert, no reappear on refresh |
| Stripe serverless functions | ✅ In correct /api root directory — checkout session + webhook handler |
| Google OAuth | ✅ Working with Vercel redirect — Supabase Site URL + redirect URLs set to Vercel domain |
| Supabase configuration | ✅ Site URL and redirect URLs set to Vercel production domain |
| Stripe checkout (wired) | ⚠️ Env vars required in Vercel — STRIPE_SECRET_KEY, STRIPE_PRICE_ID_MONTHLY/ANNUAL |
| Stripe webhook (wired) | ⚠️ Env vars required in Vercel — STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY |
| Splash screen (SplashScreen) | ✅ Built — 1.8s hold + 300ms fade, gold wordmark + tagline |
| GPS Go & Track (TrackOverlay) | ✅ Built — floating pill, completion summary, saves to Supabase |
| Waypoints full flow (WaypointSheet) | ✅ Built — add/view/delete, photo upload, two-step delete |
| StatusToast + OFFLINE badge | ✅ Built — animated stack, persistent offline detection |
| Find / Discover nearby (FindSheet) | ✅ Built — GPS + bounding-box query, Haversine sort, Pro gate |
| Route builder (basic) | ✅ Built — contextmenu long-press, gold polyline, save to Supabase routes |
| Offline map downloads (OfflineManager) | ⚠️ Stub |
| Weather layer | ⚠️ Stub |
| Capacitor native wrapper | ❌ Not started |
| Plausible analytics | ❌ Not started |

---

## Critical Rules — Known Bug Register (do not reintroduce)

1. **RLS policy** must say `to anon, authenticated` — not just `using (true)`
2. **MapLibre click handler** must filter to existing layers only before `queryRenderedFeatures`
3. **GeoJSON** must not be embedded inline in HTML/JS — load from Supabase
4. **encodeURIComponent()** required on all GSI WMS layer names (µ ¯ ¹ corrupt otherwise)
5. **useGoldSamples** loads in batches of 1000 — do not change to single query
6. **Legal disclaimer re-trigger** — use `legalFetchedFor` ref (implemented in useAuth.js). `onAuthStateChange` fires on tab focus — must not re-run profile fetch if user ID unchanged
7. **GSI layer names** — use `\u00b5` `\u00af` `\u00b9` Unicode escapes in mapConfig.js, not literal characters
8. **WMS proxy** — use `req._parsedUrl.query` not `URLSearchParams(req.query)` to pass query params. URLSearchParams re-encodes and corrupts layer names.
9. **node_modules** must be in `.gitignore` — do not commit
10. **viewport-fit=cover** required in HTML meta viewport tag for iOS safe area insets
11. **WMS tile URL builder** — must NOT use URLSearchParams for tile URL construction. The `{bbox-epsg-3857}` MapLibre placeholder must reach the template string unencoded. Build URL manually with string concatenation.
12. **Basemap style switch** — after `map.setStyle()`, all sources and layers are removed. Must call `addDataLayers(map)` inside `map.once('style.load', ...)` to re-add everything. Use `map.getSource(id)` guards to avoid double-add errors.
13. **syncLayerVisibility** — must read store state via `useMapStore.getState()` and `useUserStore.getState()` (not React props/closures) when called from `style.load` callbacks, otherwise reads stale values.
14. **`.gitignore` encoding** — was UTF-16 (git silently couldn't parse it, .env was not being ignored). Fixed to UTF-8. Verify encoding if recreating.
15. **Stripe HTML response** — serverless functions were placed in `src/api/`. Vercel only recognises serverless functions in a top-level `/api` directory at the project root. Moved to `api/create-checkout-session.js` and `api/stripe-webhook.js`. Any future serverless functions must go in root `/api/`, not `src/api/`.
16. **Google OAuth localhost redirect** — Supabase Site URL was unset (defaulted to localhost), causing OAuth to redirect to localhost after sign-in on Vercel. Fixed by setting Supabase Site URL and redirect URLs to the Vercel production domain in the Supabase dashboard.
17. **Stripe price ID not found** — `process.env` does not exist in the browser. Price IDs must use the `VITE_` prefix and be accessed via `import.meta.env` in the frontend. UpgradeSheet.jsx now resolves the price ID client-side (`import.meta.env.VITE_STRIPE_PRICE_ID_ANNUAL/MONTHLY`) and sends it in the POST body. The serverless function reads `priceId` directly from `req.body` and returns 400 if missing. Env vars in Vercel must be named `VITE_STRIPE_PRICE_ID_MONTHLY` and `VITE_STRIPE_PRICE_ID_ANNUAL`.
18. **isPro not set after Stripe checkout** — webhook was not updating `profiles.is_pro`. Fixed: `stripe-webhook.js` now updates `profiles` to set `is_pro = true` after a successful `checkout.session.completed` upsert to `subscriptions`. `useAuth.js` now selects `is_pro` from the profile on sign-in and calls `setIsPro(true)` if true. Requires `is_pro boolean` column in the `profiles` table in Supabase.
19. **Stripe webhook 'plan' column error** — old webhook code attempted to upsert a `plan` column that does not exist in the `subscriptions` table. Rewrote `api/stripe-webhook.js` from scratch: no `plan` column, no Stripe subscription retrieval call. Upsert contains only `user_id`, `stripe_subscription_id`, `stripe_customer_id`, `status`. Also added `invoice.payment_failed` handler setting `status: 'past_due'`. Uses `SUPABASE_URL` env var (not `VITE_SUPABASE_URL` — serverless functions have no Vite context). Added `/api` proxy to `vite.config.js` so local dev `/api` calls are not intercepted by Vite.
20. **WMS pills no Pro gate** — DataSheet WMS filter pills (`gold_heatmap`, `bedrock`) had zero `isPro` check. Free users could tap them, the store updated, the pill appeared active (blue), but `syncLayerVisibility` forced all WMS to `none` for non-Pro users — silent false feedback. Fixed: pills now gate on `isPro`. Non-Pro users see a PRO badge on the pill and tapping opens UpgradeSheet. The Map.jsx `syncLayerVisibility` logic for Pro WMS toggles was already correct end-to-end.
21. **Legal Disclaimer row in Settings not tappable** — `SettingsPanel` had `onPress={() => {}}` (empty no-op). Fixed: added `showLegal` local state. Row tap sets it true, rendering `LegalDisclaimerModal` with `forceShow=true`. `LegalDisclaimerModal` now accepts `forceShow` and `onClose` props — `forceShow` bypasses the `legalAccepted` early-return so the modal renders regardless of acceptance state. Already-accepted users see a Close button; users who haven't accepted see the normal checkbox flow, with `onClose` called after acceptance.
22. **DataSheet gesture clunky** — DataSheet used `height` CSS transitions between three states (60px/46vh/85vh). Replaced with `transform: translateY` physics-based spring gesture. Snap points: collapsed (80px peek = `translateY(h-80)`), half (`translateY(h*0.55)`), full (`translateY(h*0.08)`). Touch events attached directly on handle element with `{ passive: false }` on `touchmove` so `e.preventDefault()` works. During drag: 1:1 finger tracking, no transition. On release: `350ms cubic-bezier(0.32,0.72,0,1)` transition snaps to nearest point; release velocity (px/ms) influences target (fast flick up → full, fast flick down → collapsed). Handle bar is 32×4px `#2E3035`. External `dataSheetState` changes (e.g. from CornerControls) sync `translateY` via `useEffect`.
23. **WMS tiles returning XML instead of PNG** — Two causes: (a) `wmsRasterTileUrl` in `Map.jsx` did not include `STYLES=` in the URL. WMS 1.3.0 requires this parameter even when empty; omitting it causes GSI to return a `ServiceExceptionReport` XML document (`StylesNotDefined`) instead of a PNG tile. Fixed: `&STYLES=` added to `wmsRasterTileUrl`. (b) `index.js` in `~/wms-proxy/` used `new URLSearchParams(req.query).toString()` to forward the query string — Express decodes `req.query` values first, then URLSearchParams re-encodes them, which can corrupt Unicode characters in GSI layer names. Fixed: proxy now uses `req.originalUrl` to extract and pass the raw query string verbatim. Both fixes together ensure GSI returns `image/png` for all six WMS layers.
24. **Mineral tab/LayerPanel not in sync** — DataSheet tab changes were not updating which mineral circle layer was visible on the map. Fixed: `activeMineralCategory` (already in mapStore) is now written by DataSheet `selectTab` (null for Gold tab, category string for mineral tabs) and by LayerPanel `handleToggle` for `mineralCategory: true` layers. `syncLayerVisibility` reads `activeMineralCategory` from store and shows only the matching MINERAL_LAYERS entry — all others hidden. LayerPanel mineral toggles are exclusive (toggling on sets the category, toggling the active one off clears it). `activeMineralCategory` added to the `syncLayerVisibility` useEffect dependency array in Map.jsx.
25. **MAP_BOUNDS not set** — Map had no `maxBounds`, `minZoom`, or `maxZoom`. Added `MAP_BOUNDS` export to `mapConfig.js` (`maxBounds [[-12,49.5],[2.5,61.5]]`, `minZoom: 5`, `maxZoom: 18`) and spread it into the `maplibregl.Map` constructor options.
26. **GPS tracking architecture** — `useTracks` calls `navigator.geolocation.watchPosition` directly (not via `useGeolocation`). It reads/writes mapStore via `useMapStore.getState()` inside callbacks (safe — same pattern as `syncLayerVisibility`). `startTracking` clears `sessionTrail` and sets `isTracking=true`. `stopTracking` saves to Supabase, fires toast, returns summary. `TrackOverlay` reads `isTracking`/`sessionTrail` from mapStore directly — no prop drilling of live state. `calcTrailDistanceM` is a pure function exported for reuse.
27. **Trail polyline** — `session-line-src` source + `session-trail-line` line layer added to Map. Updated on every `sessionTrail` change and restored after basemap style switch. The existing `session-dots` layer renders on top of the line.
28. **WaypointSheet description + photo** — `addWaypoint` now accepts `{ description, photo }`. Photo is a File object; `useWaypoints` uploads it to Supabase Storage `waypoint-photos/{userId}/{ts}.ext` before insert. If upload fails, waypoint is saved without photo (graceful). ViewMode now shows `description` and first photo; has two-step confirm before delete. `icon` field added to `buildSavedWaypointGeoJSON` properties so ViewMode displays correct emoji.
29. **StatusToast offline detection** — `window.addEventListener('offline/online')` fires persistent toast (duration=0) when offline; dismisses it and fires 'Back online' on reconnect. `addToast` is called with `duration: 0` for persistent toasts — never auto-dismissed. Persistent offline toast is tappable to dismiss on desktop.
30. **Toast action dispatch from hooks** — `useWaypoints` and `useTracks` call `useMapStore.getState().addToast(...)` inside async callbacks. This is the correct pattern for dispatching actions from outside the React render tree (same as `syncLayerVisibility`). Do not use `useMapStore()` directly in async code.
31. **Basemap switch — terrain must be added FIRST** — In the `style.load` callback after `map.setStyle()`, the terrain source must be added (and `map.setTerrain()` called) BEFORE `addDataLayers()`. If terrain is added after data layers, MapLibre may fail to apply 3D terrain correctly. Order: (1) terrain source + setTerrain if is3DRef.current, (2) addDataLayers, (3) restore source data, (4) syncLayerVisibility.
32. **DataSheet bottom constraint** — DataSheet container uses `bottom: calc(64px + 24px + env(safe-area-inset-bottom))` to prevent overlap with the camera button. `getSnap()` uses `effectiveH = window.innerHeight - 88` so snap points align with the bounded container.
33. **useTracks split: stopTracking / saveTrack** — `stopTracking()` is now synchronous — it stops the GPS watch, computes stats, and returns the summary object without saving. `saveTrack(summary)` is a separate async function that persists to Supabase and fires the toast. TrackOverlay shows a Save/Discard choice before persisting. Map.jsx must pass both `onStop={stopTracking}` and `onSave={saveTrack}` to TrackOverlay.
34. **Elevation profile in mapStore** — `elevationProfile: [{elevation, distanceM}]` accumulates during tracking. Written by `useTracks` every 5th GPS point via MapTiler terrain-rgb-v2 tile + canvas pixel decode. Cleared by `startTracking`. Read by `TrackOverlay` for live graph and summary stats. `clearElevationProfile` must be called in `startTracking`.
35. **TrackOverlay full-screen overlay** — wrapper `div` has `pointer-events: none` so the map remains interactive during tracking. Only the top bar and bottom panel have `pointer-events: auto`. Top bar overlays CategoryHeader (same position, higher zIndex=45). Bottom panel is 220px high, contains 4 stat cells + SVG elevation graph + Stop button.
36. **showWaypoints toggle** — `mapStore.showWaypoints` (default true) gates `saved-waypoints-circles` layer visibility. `syncLayerVisibility` reads it via `useMapStore.getState()`. Must be in `useEffect` dependency array in Map.jsx alongside other visibility deps. LayerPanel exposes it under a "MY DATA" section at the top of the scrollable list.

---

## What's Next — Phase 2 Build Priority

**Done:**
1. ✅ Repo setup — Explore Eire brand, clean architecture
2. ✅ Core map view — MapLibre, satellite basemap, category header, corner controls
3. ✅ Module dashboard — 5 icons, lock/unlock, CTA
4. ✅ Auth — Supabase + Google OAuth + guest mode
5. ✅ Prospecting module — 7 tier layers, rock circles, WMS proxy layers
6. ✅ Subscription store + paywall UI (UpgradeSheet)
7. ✅ Basemap picker — 3 thumbnails, 2D/3D toggle
8. ✅ 3D terrain — MapTiler terrain-rgb-v2
9. ✅ Settings panel — theme switching (Dark/Light/Eire), account, sign out
10. ✅ Legal disclaimer — built, tappable from Settings, forceShow prop added
11. ✅ Mineral localities layer + MineralSheet + DataSheet tab bar (Gold | Copper | Lead | Uranium | Quartz | Silver | More)
12. ✅ Mineral tab/LayerPanel sync — DataSheet tab and LayerPanel mineral toggles share activeMineralCategory; map shows only selected category layer
13. ✅ MAP_BOUNDS — maxBounds, minZoom 5, maxZoom 18 added to map init
14. ✅ GPS tracking — TrackOverlay (floating pill, live distance/duration, Stop), useTracks (watchPosition, Supabase save), trail polyline on map
15. ✅ Waypoints full flow — WaypointSheet (add: GPS, name, description, icon, photo; view: photo, description, coords, confirm delete), useWaypoints (photo upload to Storage, toasts)
16. ✅ StatusToast — animated toast system (success/error/warning/info/offline), persistent offline badge, online/offline auto-detection
17. ✅ 3D terrain — verified correct, no changes needed

18. ✅ FindSheet — GPS + bounding-box query, Haversine sort, nearest 50 gold/minerals, Pro gate
19. ✅ RouteBuilder — contextmenu long-press, dashed gold polyline, numbered dots, save to Supabase routes
20. ✅ SplashScreen — 1.8s hold + 300ms fade, gold wordmark + tagline, mounted in App.jsx
21. ✅ Basemap switch bugfix — terrain source added first in style.load callback
22. ✅ DataSheet bottom — container bounded by camera button area (bottom: calc(64px+24px+safeArea)); snap points use effectiveH
23. ✅ CategoryHeader — Go & Track icon changed to stopwatch SVG
24. ✅ LayerPanel — MY DATA section added at top with "Saved waypoints" toggle (showWaypoints in mapStore)
25. ✅ TrackOverlay rebuild — full-screen overlay mode; top bar (accent dot, Tracking label, REC dot, time); bottom panel (4 stats, SVG elevation graph, Stop); completion summary with Save/Discard; trail gold dotted polyline
26. ✅ useTracks — elevation fetching from MapTiler terrain-rgb-v2 tiles (every 5th point); stopTracking now synchronous/non-saving; saveTrack() separate async function

**Next (in order):**
21. Stripe — wire create-checkout-session.js + stripe-webhook.js (stubs exist)
22. Offline maps — build OfflineManager.jsx (useOffline hook scaffolded)
23. Field Sports module — data sourcing required first
18. Hiking module — data sourcing required first
19. Archaeology module — NMS data integration
20. Coastal module — data sourcing required first
21. Route builder — build RouteBuilder.jsx
22. Weather layer — Met Éireann API
23. Capacitor — native iOS/Android wrapper
24. App Store submission
25. Custom domain — exploreeire.ie
