# Explore Eire — Phase 2 Roadmap

> Phase 2 build priority. Originally section "What's Next — Phase 2
> Build Priority" in CLAUDE.md (lines 330–374). Moved here as part of
> the 2026-04-28 CLAUDE.md trim. Content is verbatim — only this
> preamble is new.

> Done items at the top, next items in order. Update this file (not
> CLAUDE.md) when items move from Next to Done.

---

## What's Next — Phase 2 Build Priority

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

**Next (in order):**
1. Stripe — wire env vars in Vercel (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, APP_URL, VITE_STRIPE_PRICE_ID_MONTHLY/ANNUAL)
2. App Store submission — requires macOS + Apple Developer account
3. Custom domain — exploreeire.ie
4. Field Sports module — data sourcing required first
5. Hiking module — data sourcing required first
6. Archaeology module — NMS data integration
7. Coastal module — data sourcing required first
8. Plausible analytics

