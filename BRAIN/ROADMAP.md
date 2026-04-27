# Explore Eire — Roadmap & Vision
Last updated: 2026-04-24

## Product Vision

**Explore Eire** — Ireland's all-in-one outdoor platform. One app, one subscription, five modules covering everything the Irish outdoors enthusiast needs. The direct competitor to OnX Maps (US/AU) which does not serve Ireland or Europe.

**The core insight:** OnX built four separate apps for four audiences. We build one app with five modules. Same map engine, one subscription, everything included. Structurally better product.

**Business model:** Free tier (limited) → Explorer €9.99/month → Annual €79/year

**Competitor:** OnX Maps (US) — 3M+ users, $35/month per app, does NOT serve Ireland or Europe. Entire market unserved.

**Strategic direction:** Own the Irish outdoor market across all verticals before anyone else does. Gold/prospecting is the hero entry point and proven data foundation. Expand modules as data becomes available.

## Current Sprint — What's Next

**Next (in order):**
1. Stripe — wire env vars in Vercel (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, APP_URL, VITE_STRIPE_PRICE_ID_MONTHLY/ANNUAL)
2. App Store submission — requires macOS + Apple Developer account
3. Custom domain — exploreeire.ie
4. Field Sports module — data sourcing required first
5. Hiking module — data sourcing required first
6. Archaeology module — NMS data integration
7. Coastal module — data sourcing required first
8. Plausible analytics

## Completed Features

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

## Done Sessions Log

**Done (sessions 1–9):**
1. ✅ Repo setup — Explore Eire brand, clean architecture
2. ✅ Core map view — MapLibre, satellite basemap, category header, corner controls
3. ✅ Module dashboard — 5 icons, lock/unlock, CTA
4. ✅ Auth — Supabase + Google OAuth + guest mode
5. ✅ Prospecting module — 7 tier layers, rock circles, WMS proxy layers
6. ✅ Subscription store + paywall UI (UpgradeSheet)
7. ✅ Basemap picker — 3 thumbnails, 2D/3D toggle
8. ✅ 3D terrain — MapTiler terrain-rgb-v2
9. ✅ Settings panel — theme switching (Dark/Light/Eire), account, sign out, replay tour
10. ✅ Legal disclaimer — built, tappable from Settings, forceShow prop added
11. ✅ Mineral localities layer + MineralSheet + DataSheet tab bar
12. ✅ Mineral tab/LayerPanel sync
13. ✅ MAP_BOUNDS — maxBounds, minZoom 5, maxZoom 18
14. ✅ GPS tracking — TrackOverlay, useTracks, trail polyline on map
15. ✅ Waypoints full flow — WaypointSheet, useWaypoints, photo upload
16. ✅ StatusToast — animated stack, persistent offline badge
17. ✅ FindSheet — GPS + bounding-box query, Haversine sort, Pro gate
18. ✅ RouteBuilder — contextmenu long-press, dashed gold polyline, save to Supabase
19. ✅ SplashScreen — 1.8s hold + 300ms fade
20. ✅ Offline maps — OfflineManager, useOffline, Service Worker
21. ✅ Weather layer — Met Éireann rainfall radar, auto-refresh 5 min
22. ✅ Capacitor native wrapper — iOS + Android, haptics, geolocation
23. ✅ Learn surface — LearnSurface, ArticleView (portal), 5 articles seeded
24. ✅ Mine surface — MineSurface, AddFindSheet, useFindsLog, finds-photos bucket
25. ✅ Onboarding coach marks — spotlight tour, getBoundingClientRect positioning
26. ✅ Replay intro tour from Settings
27. ✅ Stripe redirect pages — SubscriptionSuccess, SubscriptionCancel
28. ✅ BottomNav 5-tab navigation shell
29. ✅ DashboardView with live waypoint + find counts
30. ✅ SettingsView with Profile, Password, Notifications, Premium sub-pages
31. ✅ ProfileView with finds + track history
32. ✅ LearnView + full learning platform (courses, chapters, quizzes, certificates)
