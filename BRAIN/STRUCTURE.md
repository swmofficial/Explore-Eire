# Explore Eire — Project Structure & Infrastructure

> Full repo tree, Vercel environment variable list, stack reference,
> and current build-state matrix. Originally lived in CLAUDE.md
> (sessions 1–9). Moved here as part of the 2026-04-28 CLAUDE.md trim.
> Content is verbatim from the source sections — only the surrounding
> headers and this preamble are new.

> Read this file when you need to know where a file lives, what env var
> a feature requires, or whether a feature is already built. For the
> 44-rule bug register that used to follow this section, see
> `BRAIN/BUGS.md`. For state ownership, persistence, and offline
> behaviour, see `BRAIN/STATE_MAP.md`.

---

## Infrastructure

- **GitHub repo:** https://github.com/swmofficial/Explore-Eire
- **Deployment:** Vercel — auto-deploys on every push to `main`
- **VPS (WMS proxy):** `187.124.212.83` / `srv1566939.hstgr.cloud` — Ubuntu 24.04 LTS, PM2 `wms-proxy` process
- **Proxy URL (HTTPS via Traefik):** `https://srv1566939.hstgr.cloud` — Health check: `https://srv1566939.hstgr.cloud/health`
- **Proxy endpoints:** `/wms/geo` → GSI Geochemistry, `/wms/bed` → GSI Bedrock, `/wms/bore` → GSI Boreholes, `/wms/met` → Met Éireann WMS
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
| Payments | Stripe | `@stripe/stripe-js` v9 — checkout + webhook wired |
| State management | Zustand | v5 — mapStore, moduleStore, userStore |
| Font | Plus Jakarta Sans | Google Fonts — 400/500/600/700 |
| WMS Proxy | Hostinger VPS + Node | PM2 `wms-proxy` process |
| Offline tiles | MapLibre + Cache API | Service Worker intercepts MapTiler tiles |
| Native wrapper | Capacitor | **v8** — ios/ + android/ project dirs committed |
| Analytics | Plausible | Not yet started |
| Hosting | Vercel | Auto-deploy on push to main |


## Project Structure (actual current state)

```
explore-eire/
├── api/                         ← Vercel serverless functions — must be at root, not src/api/
│   ├── create-checkout-session.js  ← POST {priceId, userId} → {url} Stripe Checkout session
│   └── stripe-webhook.js           ← Vercel webhook handler — updates Supabase subscriptions
├── scripts/
│   └── seedArticles.js          ← Seeds learn_articles table. Requires SUPABASE_SERVICE_ROLE_KEY
│                                   passed as env var (or add to .env — loaded via process.loadEnvFile).
│                                   Deletes all prospecting rows then inserts 5 full articles.
│                                   Run: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/seedArticles.js
├── index.html                   ← viewport-fit=cover, Plus Jakarta Sans, theme-color
├── vite.config.js               ← React plugin, base: './' for Capacitor, /api proxy for local dev
├── package.json
├── capacitor.config.json        ← appId: ie.exploreeire.app, androidScheme: https
├── CLAUDE.md
├── ARCHITECTURE.md
├── .env                         ← never commit — in .gitignore
├── .gitignore                   ← UTF-8, covers node_modules + .env + dist
└── src/
    ├── main.jsx                 ← imports maplibre-gl CSS + global.css, renders App,
    │                               registers Service Worker (public/sw.js)
    ├── App.jsx                  ← dashboard↔map routing. Mounts SettingsPanel/AuthModal/
    │                               UpgradeSheet/Onboarding. showOnboarding from userStore,
    │                               initialised from localStorage 'ee_onboarded' on mount.
    │                               onEnterTour={() => enterModule('prospecting')} passed to
    │                               Onboarding so coach mark targets are in DOM.
    ├── store/
    │   ├── mapStore.js          ← map instance, basemap(satellite), layers, 3D, DataSheet state,
    │   │                           LayerPanel/Settings/BasemapPicker open states, selectedSample,
    │   │                           tierFilter, sessionTrail, sessionWaypoints, elevationProfile,
    │   │                           isTracking, userLocation, showWaypoints, weatherLastUpdated,
    │   │                           addFindSheetOpen, addToast (toast queue)
    │   ├── moduleStore.js       ← activeModule, accessibleModules, activeSurface, activeCategoryTab
    │   └── userStore.js         ← user, isGuest, isPro, subscriptionStatus, legalAccepted,
    │                               showLegalDisclaimer, showAuthModal, showUpgradeSheet,
    │                               showOnboarding, setShowOnboarding, theme
    ├── components/
    │   ├── Map.jsx              ← MapLibre map + overlay UI host. Renders: CategoryHeader,
    │   │                           CornerControls, DataSheet, SampleSheet, MineralSheet,
    │   │                           FindSheet, WaypointSheet, TrackOverlay, RouteBuilder,
    │   │                           LayerPanel, BasemapPicker, AddFindSheet.
    │   │                           Handles basemap switching, 3D terrain, WMS layers, gold tiers.
    │   ├── BottomNav.jsx        ← 5-tab navigation bar (Settings/Dashboard/Map/Learn/Profile).
    │   │                           zIndex: 40. MapPin tab centre-raised. Haptic feedback on tap.
    │   ├── DashboardView.jsx    ← Waypoint count, finds count, live map overview cards.
    │   ├── SettingsView.jsx     ← Settings screen: links to Profile, Password, Notifications, Premium
    │   │                           sub-pages. Theme switcher. Sign out.
    │   ├── ProfileView.jsx      ← User profile: avatar, display name, finds log, track history.
    │   ├── LearnView.jsx        ← Course library, progress summary, course detail → chapter reader.
    │   ├── settings/
    │   │   ├── ProfileSettings.jsx       ← Edit display name, avatar
    │   │   ├── PasswordSettings.jsx      ← Change password
    │   │   ├── NotificationSettings.jsx  ← Push notification preferences
    │   │   └── PremiumSettings.jsx       ← Subscription status, upgrade CTA
    │   ├── learn/
    │   │   ├── CourseDetail.jsx    ← Chapter list for a course, progress bar, start/continue
    │   │   ├── ChapterReader.jsx   ← Page-by-page content + optional quiz at end
    │   │   ├── CourseQuiz.jsx      ← Multiple-choice quiz flow
    │   │   └── CourseCertificate.jsx ← Completion certificate + share action
    │   ├── ModuleDashboard.jsx  ← 5 module icons, lock/unlock, CTA, renders AuthModal inline
    │   ├── CategoryHeader.jsx   ← ARCHIVED — replaced by BottomNav. Fixed top strip: home button
    │   │                           (id=tour-home-btn) + Map/Learn/Mine pill tabs + Go & Track.
    │   ├── LayerPanel.jsx       ← Right drawer (260ms slide). Layer toggles with Pro badges.
    │   │                           MY DATA section at top (showWaypoints toggle). WEATHER section.
    │   │                           Opened by Layers corner button. Filtered by activeModule.
    │   ├── SettingsPanel.jsx    ← Left drawer. Theme (Dark/Light/Eire), account, sign out,
    │   │                           Replay intro tour (sets ee_onboarded='false', showOnboarding=true),
    │   │                           Legal Disclaimer (forceShow modal).
    │   ├── CornerControls.jsx   ← 5 glass buttons. Settings→SettingsPanel, Layers→LayerPanel,
    │   │                           Basemap→BasemapPicker, Camera→AddFindSheet(mine)/WaypointSheet
    │   │                           (map)/UpgradeSheet(free), CentreOnMe→flyTo(userLocation).
    │   │                           LayersBtn id=tour-layers-btn, CameraBtn id=tour-camera-btn.
    │   ├── DataSheet.jsx        ← 3-state bottom sheet (60px peek/46vh/85vh). Spring gesture drag.
    │   │                           Tier filter pills, WMS toggle pills (Pro-gated), nearest sample list.
    │   ├── SampleSheet.jsx      ← Sample detail: ppb hero, data rows, upstream tip, Save Waypoint.
    │   ├── MineralSheet.jsx     ← Mineral locality detail: name H1, category badge, townland, county,
    │   │                           description, notes, coords.
    │   ├── LearnSurface.jsx     ← position:fixed zIndex:15. Shows when activeSurface==='learn'.
    │   │                           Renders article stub cards from ARTICLE_STUBS. Tap → setOpenArticle(slug).
    │   │                           {openArticle && <ArticleView slug onBack />} rendered inside.
    │   ├── ArticleView.jsx      ← Renders via createPortal(document.body) — escapes LearnSurface
    │   │                           stacking context (see bug #42). position:fixed zIndex:999,
    │   │                           overflowY:scroll. Back button: position:fixed top:16px left:16px
    │   │                           zIndex:9999 background:rgba(0,0,0,0.6). Fetches article body
    │   │                           from learn_articles by slug on mount.
    │   ├── MineSurface.jsx      ← position:fixed. Shows when activeSurface==='mine'.
    │   │                           Uses useFindsLog hook. Renders finds list + Add Find entry point.
    │   ├── AddFindSheet.jsx     ← Bottom sheet for logging finds. Fields: title, description, GPS coords
    │   │                           (auto from device), photo picker (uploads to finds-photos bucket),
    │   │                           weight (g). Calls useFindsLog.addFind() on submit.
    │   ├── BasemapPicker.jsx    ← Bottom sheet. 3 thumbnail cards + 2D/3D terrain toggle.
    │   ├── UpgradeSheet.jsx     ← Paywall. Feature list, monthly/annual pills. Resolves price ID
    │   │                           via import.meta.env, POSTs to /api/create-checkout-session.
    │   ├── AuthModal.jsx        ← Sign In/Up modal. Google OAuth + email/password + Continue as guest.
    │   ├── BottomSheet.jsx      ← Minimal reusable shell
    │   ├── FindSheet.jsx        ← GPS bounding-box query → Haversine sort → nearest 50 gold/minerals.
    │   │                           Gold tab free (t6/t7) / Pro (t1-t5). Minerals tab full Pro. Tab bar,
    │   │                           loading/error/empty states. Tap row → flyTo + open SampleSheet/MineralSheet.
    │   ├── WaypointSheet.jsx    ← Add/view/delete waypoints. Description, photo upload to Supabase Storage,
    │   │                           two-step confirm delete, photo display in view mode.
    │   ├── TrackOverlay.jsx     ← Full-screen overlay (pointer-events:none wrapper). Top bar + bottom
    │   │                           panel (4 stats, SVG elevation graph, Stop). Completion summary
    │   │                           with Save/Discard. Reads isTracking + sessionTrail from mapStore.
    │   ├── OfflineManager.jsx   ← Bottom sheet. Cache API download with 6-concurrent batching,
    │   │                           saved regions list, storage usage bar. SW intercepts MapTiler tiles.
    │   ├── RouteBuilder.jsx     ← Long-press (contextmenu) drops route points on map. Dashed gold polyline +
    │   │                           numbered dots. Panel: distance, point list, Clear + Save to Supabase routes.
    │   │                           Pro gate. Route sources: route-builder-src, route-points-src in Map.jsx.
    │   ├── SplashScreen.jsx     ← 1.8s branded hold + 300ms fade. Gold wordmark + grey tagline. Calls onDone.
    │   │                           Mounted in App.jsx with splashDone local state.
    │   ├── Onboarding.jsx       ← 7-step onboarding. Step 0: welcome splash (opaque, zIndex:100).
    │   │                           Steps 1–5: CoachMark overlay — transparent backdrop (zIndex:100) +
    │   │                           spotlight div (box-shadow cutout, zIndex:101) + tooltip card (zIndex:102).
    │   │                           Targets measured via getBoundingClientRect() in rAF callback.
    │   │                           Step 6: location permission screen (opaque, zIndex:100).
    │   │                           Completion: localStorage 'ee_onboarded'='true'. Replay from Settings.
    │   ├── StatusToast.jsx      ← Animated toast stack. Persistent OFFLINE badge. Monitors navigator.onLine.
    │   └── LegalDisclaimerModal.jsx  ← Centred popup, 8 legal sections, checkbox accept, Supabase upsert.
    │                               Accepts forceShow + onClose props for Settings replay.
    ├── pages/
    │   ├── SubscriptionSuccess.jsx  ← Stripe redirect landing page (/subscription/success).
    │   │                               Shows confirmation, links back to app.
    │   └── SubscriptionCancel.jsx   ← Stripe redirect landing page (/subscription/cancel).
    │                               Shows cancellation message, links back to app.
    ├── hooks/
    │   ├── useAuth.js           ← Auth state listener, legalFetchedFor ref, profile + sub fetch
    │   ├── useGoldSamples.js    ← Batched Supabase load (1000/batch, loop until exhausted)
    │   ├── useMineralLocalities.js ← Batched Supabase load of mineral_localities (1000/batch)
    │   ├── useGeolocation.js    ← Device GPS via @capacitor/geolocation. watchPosition returns
    │   │                           string CallbackID. clearWatch takes { id: string }.
    │   ├── useSubscription.js   ← STUB (subscription fetch handled by useAuth currently)
    │   ├── useTracks.js         ← Full GPS tracking. startTracking/stopTracking/saveTrack.
    │   │                           Elevation fetch every 5th point (MapTiler terrain-rgb-v2 tile decode).
    │   │                           Exports calcTrailDistanceM. Uses navigator.geolocation directly.
    │   ├── useWaypoints.js      ← Full CRUD. Photo upload to Supabase Storage waypoint-photos/{userId}/{ts}.ext.
    │   ├── useFindsLog.js       ← CRUD for finds_log table. addFind uploads photo to Supabase Storage
    │   │                           bucket 'finds-photos' at finds-photos/{userId}/{ts}.ext before insert.
    │   │                           Returns { finds, addFind, deleteFind, loading, error }.
    │   └── useOffline.js        ← Cache API download (6-concurrent batching), deleteRegion,
    │                               getStorageUsage, progress 0–100%, isOnline detection.
    ├── lib/
    │   ├── supabase.js          ← createClient with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
    │   ├── mapConfig.js         ← BASEMAPS, TERRAIN_SOURCE, TERRAIN_CONFIG, DEFAULT_CENTER/ZOOM,
    │   │                           GOLD_TIERS, GSI_LAYERS (Unicode-escaped), buildWmsUrl, MAP_BOUNDS
    │   ├── layerCategories.js   ← LAYER_CATEGORIES: module → [{id, label, layers:[{id,label,pro}]}]
    │   ├── moduleConfig.js      ← MODULES array (5 entries), getModule(id)
    │   └── haptics.js           ← triggerHaptic('light'|'medium'|'heavy') via @capacitor/haptics.
    │                               Async, callers fire-and-forget.
    └── styles/
        └── global.css           ← CSS vars (all 3 themes), reset, animations, MapLibre overrides
```

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
| SettingsPanel (theme, account, sign out, replay tour, legal) | ✅ Built |
| Session trail on map (blue dots + gold polyline) | ✅ Built (mapStore + Map.jsx) |
| Session waypoints on map (gold dots) | ✅ Built (mapStore + Map.jsx) |
| Legal disclaimer | ✅ Built — centred popup, checkbox accept, Supabase upsert, no reappear on refresh |
| Stripe serverless functions | ✅ In correct /api root directory — checkout session + webhook handler |
| Google OAuth | ✅ Working with Vercel redirect — Supabase Site URL + redirect URLs set to Vercel domain |
| Supabase configuration | ✅ Site URL and redirect URLs set to Vercel production domain |
| Stripe checkout (wired) | ⚠️ Env vars required in Vercel — STRIPE_SECRET_KEY, STRIPE_PRICE_ID_MONTHLY/ANNUAL |
| Stripe webhook (wired) | ⚠️ Env vars required in Vercel — STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY |
| Stripe redirect pages | ✅ Built — SubscriptionSuccess.jsx + SubscriptionCancel.jsx at /subscription/success|cancel |
| Splash screen (SplashScreen) | ✅ Built — 1.8s hold + 300ms fade, gold wordmark + tagline |
| GPS Go & Track (TrackOverlay) | ✅ Built — floating pill, completion summary with Save/Discard, saves to Supabase |
| Waypoints full flow (WaypointSheet) | ✅ Built — add/view/delete, photo upload, two-step delete |
| StatusToast + OFFLINE badge | ✅ Built — animated stack, persistent offline detection |
| Find / Discover nearby (FindSheet) | ✅ Built — GPS + bounding-box query, Haversine sort, Pro gate |
| Route builder (basic) | ✅ Built — contextmenu long-press, gold polyline, save to Supabase routes |
| Offline map downloads (OfflineManager) | ✅ Built — Cache API download, SW intercept, region list, storage bar |
| Weather layer (rainfall radar) | ✅ Built — Met Éireann WMS via VPS proxy, auto-refresh 5 min, timestamp |
| Capacitor native wrapper | ✅ Built — ios/ + android/ committed, haptics + geolocation wired |
| Learn surface (LearnSurface + ArticleView) | ✅ Built — article list, full-screen reader portalled to body, back button fixed |
| Prospecting articles seeded | ✅ 5 articles in learn_articles table (run scripts/seedArticles.js) |
| Mine surface (MineSurface + AddFindSheet + useFindsLog) | ✅ Built — finds log with GPS, photo upload to finds-photos bucket |
| Onboarding coach marks | ✅ Built — 7-step tour, spotlight cutout, tooltip cards, dynamic positioning via getBoundingClientRect |
| Replay intro tour (Settings) | ✅ Built — resets ee_onboarded, triggers showOnboarding via userStore |
| BottomNav 5-tab shell | ✅ Built — Settings/Dashboard/Map/Learn/Profile, zIndex 40, haptic feedback |
| DashboardView | ✅ Built — live waypoint + find counts, activity cards |
| SettingsView | ✅ Built — Profile/Password/Notifications/Premium sub-pages |
| ProfileView | ✅ Built — avatar, display name, finds + track history |
| LearnView + learning platform | ✅ Built — courses, chapters, quizzes, certificates (localStorage progress) |
| Plausible analytics | ❌ Not started |

