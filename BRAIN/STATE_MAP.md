# Explore Eire — State Map
> Factual map of all state flows in the application.
> Source of truth for the UX Agent's architectural foresight.
> Last updated: 2026-04-28

---

## 1. Store Ownership Map

Three Zustand stores. All three use Zustand `persist` middleware (added task-001, commit d84b479).
Persisted fields survive page reload. Unpersisted fields are in-memory and are destroyed on reload.

**Persisted fields by store:**
- `userStore` → `isPro`, `subscriptionStatus` (key: `ee-user-prefs`, version: 1; `theme` uses manual `ee_theme` key instead)
- `mapStore` → `basemap`, `layerVisibility` (key: `ee-map-prefs`)
  - `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002)
  - `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006)
- `moduleStore` → `activeModule` via `ee_active_module` (manual IIFE + write pattern, task-013; Zustand persist removed)

**Note on isPro offline:** `useAuth.onAuthStateChange` resets `isPro` to false on any null session,
including offline JWT-expiry scenarios. Task-005 fixes this by scoping the reset to `SIGNED_OUT`
events when online. Until task-005 ships, V10 remains partially active despite persist middleware.

### mapStore (src/store/mapStore.js)

| State Key | Type | Default | Written By | Read By |
|---|---|---|---|---|
| mapInstance | MapLibre Map | null | Map.jsx onLoad | Map.jsx, syncLayerVisibility |
| basemap | string | 'satellite' | BasemapPicker | Map.jsx |
| is3D | boolean | false | BasemapPicker | Map.jsx |
| layerVisibility | object | { stream_sediment: true } | LayerPanel, DataSheet | Map.jsx syncLayerVisibility |
| dataSheetState | string | 'collapsed' | DataSheet gesture, CornerControls | DataSheet, CornerControls |
| layerPanelOpen | boolean | false | CornerControls | LayerPanel |
| settingsPanelOpen | boolean | false | CornerControls | SettingsPanel |
| basemapPickerOpen | boolean | false | CornerControls | BasemapPicker |
| selectedFeature | object | null | Map.jsx click handler | Map.jsx |
| selectedSample | object | null | Map.jsx click handler, FindSheet | SampleSheet |
| tierFilter | string | 'all' | DataSheet | Map.jsx, DataSheet |
| sessionTrail | array | [] | useTracks watchPosition callback | Map.jsx, TrackOverlay |
| sessionWaypoints | array | [] | SampleSheet "Save Waypoint" | Map.jsx |
| waypointSheet | object | null | CornerControls, SampleSheet | WaypointSheet |
| selectedMineral | object | null | Map.jsx click handler, FindSheet | MineralSheet |
| activeMineralCategory | string | null | DataSheet, LayerPanel | Map.jsx syncLayerVisibility |
| findSheetOpen | boolean | false | CornerControls | FindSheet |
| addFindSheetOpen | boolean | false | MineSurface | AddFindSheet |
| routeBuilderOpen | boolean | false | CornerControls | RouteBuilder |
| routePoints | array | [] | Map.jsx contextmenu handler | RouteBuilder, Map.jsx |
| isTracking | boolean | false | useTracks | Map.jsx, TrackOverlay, CornerControls |
| elevationProfile | array | [] | useTracks (every 5th GPS point) | TrackOverlay |
| showWaypoints | boolean | true | LayerPanel | Map.jsx syncLayerVisibility |
| showOfflineManager | boolean | false | CornerControls | OfflineManager |
| weatherLastUpdated | string | null | Map.jsx refresh interval | LayerPanel |
| userLocation | object | null | Map.jsx watchPosition | CornerControls (centre-on-me), FindSheet |
| toasts | array | [] | addToast from any hook/component | StatusToast |

**Critical note:** `sessionTrail`, `sessionWaypoints`, `elevationProfile`, `routePoints` accumulate during active user sessions. None are persisted anywhere until the user explicitly saves. If the app crashes, the browser tab closes, or connectivity drops during a Supabase write — all accumulated data is lost.

### userStore (src/store/userStore.js)

| State Key | Type | Default | Written By | Read By |
|---|---|---|---|---|
| user | object | null | useAuth (Supabase session) | Everything (auth gates) |
| isGuest | boolean | false | AuthModal "Continue as guest" | useWaypoints, useFindsLog, useTracks, CornerControls |
| isPro | boolean | false | useAuth (profiles.is_pro), useSubscription | LayerPanel, DataSheet, CornerControls, UpgradeSheet, all Pro gates |
| subscriptionStatus | string | 'free' | useAuth, useSubscription | SettingsView, PremiumSettings |
| legalAccepted | boolean | false | useAuth (profiles.legal_accepted) | LegalDisclaimerModal gate |
| showLegalDisclaimer | boolean | false | useAuth (when !legal_accepted) | App.jsx → LegalDisclaimerModal |
| showAuthModal | boolean | false | ModuleDashboard, CornerControls | App.jsx → AuthModal |
| authModalDefaultTab | string | 'signin' | Various CTA buttons | AuthModal |
| authModalOnSuccess | function | null | Pre-set before showing modal | AuthModal on success |
| showUpgradeSheet | boolean | false | CornerControls, ModuleDashboard, LayerPanel | App.jsx → UpgradeSheet |
| showOnboarding | boolean | false | App.jsx mount (from localStorage), SettingsPanel replay | App.jsx → Onboarding |
| showNotifPrePrompt | boolean | false | triggerNotifPrePromptIfNeeded() | App.jsx → NotificationPrePrompt |
| theme | string | 'dark' | SettingsView theme picker | App.jsx (data-theme attr) |

**Critical note:** `user`, `isPro`, `subscriptionStatus`, `legalAccepted` are hydrated from Supabase on every auth state change. `isPro` and `subscriptionStatus` are also persisted to localStorage via the persist middleware (task-001). `theme` is also persisted. However, `useAuth.onAuthStateChange` may overwrite `isPro` to false on offline JWT expiry — task-005 addresses this.

### moduleStore (src/store/moduleStore.js)

| State Key | Type | Default | Written By | Read By |
|---|---|---|---|---|
| activeModule | string | 'prospecting' | ModuleDashboard | LayerPanel, useTracks, RouteBuilder |
| accessibleModules | array | [] | Never populated (stub) | ModuleDashboard (checks available flag on MODULES config instead) |
| activeCategoryTab | string | null | DataSheet tab bar | DataSheet |
| activeSurface | string | 'map' | App.jsx (synced to activeTab) | CornerControls (hide when not map) |

---

## 2. Persistence Map — localStorage

Every localStorage key in the app, what writes it, and when.

| Key | Value | Written When | Read When | Component |
|---|---|---|---|---|
| `ee_onboarded` | 'true' / 'false' | Onboarding completion (step 7) | App.jsx mount (once) | Onboarding.jsx, SettingsPanel.jsx |
| `ee_progress` | JSON array of chapter IDs | `markChapterComplete()` — on every chapter completion | `useProgress()` initial state (useState initialiser) | useLearn.js |
| `ee_certificates` | JSON array of course IDs | `markChapterComplete()` (when all chapters done) or `issueCertificate()` | `useProgress()` initial state (useState initialiser) | useLearn.js |
| `ee_notif_asked` | 'true' | User taps "Enable" in pre-prompt, or taps enable in NotificationSettings | `shouldShowPrePrompt()` | useNotifications.js |
| `ee_notif_snooze` | timestamp string | User taps "Not Now" in pre-prompt | `shouldShowPrePrompt()` (7-day expiry) | useNotifications.js |
| `ee_notif_first_wp` | 'true' | After first waypoint is saved | `notifyAfterWaypointSave()` | useNotifications.js |
| `ee_notif_first_ch` | 'true' | After first chapter is completed | `notifyAfterChapterComplete()` | useNotifications.js |
| `ee_learn_last_open` | timestamp string | `recordLearnHubVisit()` | `runOnOpenChecks()` (5-day nudge) | useNotifications.js |
| `ee_app_last_open` | timestamp string | `runOnOpenChecks()` on every app open | `runOnOpenChecks()` (7-day re-engagement) | useNotifications.js |
| `ee_last_summary_month` | 'YYYY-MM' string | `runOnOpenChecks()` monthly summary | `runOnOpenChecks()` | useNotifications.js |
| `ee_last_course_count` | number string | `runOnOpenChecks()` | `runOnOpenChecks()` (new course detection) | useNotifications.js |
| `ee_legal_notif_sent` | 'true' | After 5th track (one-time legal reminder) | `runOnOpenChecks()` | useNotifications.js |
| `ee_notif_locality_{name}` | timestamp string | `notifyNearbyMineral()` (24h cooldown) | `notifyNearbyMineral()` | useNotifications.js |
| `ee_push_notifications` | 'true' / 'false' | NotificationSettings toggle | NotificationSettings mount | NotificationSettings.jsx |
| `ee_notif_type_{key}` | 'true' / 'false' | NotificationSettings per-type toggles | NotificationSettings mount | NotificationSettings.jsx |
| `explore_eire_offline_regions` | JSON array of region metadata | After offline download completes, after delete | `useOffline()` initial state, OfflineManager | useOffline.js |

**Persist middleware keys:**
- `ee-user-prefs` → `isPro`, `subscriptionStatus` (version: 1; `theme` was removed in task-012 migration)
- `ee-map-prefs` → `basemap`, `layerVisibility`

**Manual localStorage keys (IIFE read + setItem on write — proven reliable pattern):**
- `ee_theme` → `userStore.theme` (manual pattern, task-008)
- `ee_active_module` → `moduleStore.activeModule` (manual pattern, task-013; replaces abandoned `ee-module-prefs` Zustand persist key)
- `ee_guest_waypoints` → `sessionWaypoints` (manual pattern, task-002)
- `ee_session_trail` → `sessionTrail` (manual pattern, task-006)

**What is still NOT persisted (genuine vulnerabilities):**
- `is3D` — resets to false on page reload (low priority)
- Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)

---

## 3. Supabase Write Map

Every point where user data is written to the database, and what happens on failure.

### Auth Writes

| Operation | Table/Service | Trigger | Offline Behaviour |
|---|---|---|---|
| Sign up | `auth.signUp` | AuthModal submit | **Fails silently** — Supabase returns error, user sees error message |
| Sign in (password) | `auth.signInWithPassword` | AuthModal submit | **Fails silently** |
| Sign in (Google) | `auth.signInWithOAuth` | AuthModal Google button | **Fails** — redirect to Google requires connectivity |
| Update email | `auth.updateUser` | EmailChangeModal | **Fails silently** |
| Update password | `auth.updateUser` | PasswordSettings | **Fails silently** |
| Update display name | `auth.updateUser` | ProfileSettings | **Fails silently** |
| Sign out | `auth.signOut` | SettingsView, SettingsPanel | **Fails** — user state lingers |

### Data Writes

| Operation | Table | Trigger | Offline Behaviour | Data Lost? |
|---|---|---|---|---|
| Save waypoint | `waypoints` INSERT | WaypointSheet "Save" | **Fails** — toast "Could not save waypoint". Photo upload also fails. | YES — waypoint data gone. Guest waypoints are memory-only regardless. |
| Delete waypoint | `waypoints` DELETE | WaypointSheet delete confirm | **Fails** — toast "Could not delete waypoint" | No (item stays) |
| Save track | `tracks` INSERT | TrackOverlay "Save" button | **Fails** — toast "Could not save track" | YES — entire GPS trail, distance, elevation, duration gone. sessionTrail still in mapStore until cleared. |
| Save find | `finds_log` INSERT | AddFindSheet submit | **Fails** — optimistic row rolled back, toast "Failed to save find". Photo upload also fails. | YES — find data + photo gone |
| Delete find | `finds_log` DELETE | ProfileView delete | **Fails** — toast "Failed to delete find" | No (item stays) |
| Save route | `routes` INSERT | RouteBuilder "Save" | **Fails** — console.error only, no toast | YES — route points gone |
| Accept legal | `profiles` UPSERT | LegalDisclaimerModal accept | **Fails** — acceptance not recorded, modal will re-appear next session | No (just annoying) |

### Storage Uploads

| Operation | Bucket | Trigger | Offline Behaviour |
|---|---|---|---|
| Waypoint photo | `waypoint-photos` | WaypointSheet save (if photo attached) | **Fails** — waypoint saved WITHOUT photo (graceful degradation) |
| Find photo | `finds-photos` | AddFindSheet submit (if photo attached) | **Fails** — entire find insert fails (photo upload is pre-insert) |
| Avatar upload | `avatars` | ProfileSettings avatar change | **Fails** — error toast |

### Read Queries (affected by offline)

| Query | Table | Trigger | Offline Behaviour |
|---|---|---|---|
| Gold samples (9,313 rows) | `gold_samples` | App mount (useGoldSamples) | **No data loads** — map shows zero gold markers |
| Mineral localities | `mineral_localities` | App mount (useMineralLocalities) | **No data loads** — map shows zero mineral markers |
| User waypoints | `waypoints` | User sign-in / tab change | **No data loads** — waypoint list empty |
| User finds | `finds_log` | User sign-in / tab change | **No data loads** — finds list empty |
| Profile + legal status | `profiles` | Auth state change | **Fails** — isPro/legalAccepted stuck at defaults |
| Subscription status | `subscriptions` | Auth state change + mount | **Fails** — isPro stuck false, Pro features locked |
| Track count | `tracks` SELECT count | useTracks mount | **Returns 0** — track limit check is wrong |

---

## 4. Component Lifecycle Map

What happens when the user taps each BottomNav tab.

### Tab Architecture (App.jsx)

```
Map tab:       ALWAYS MOUNTED — visibility toggled via CSS
               visibility: hidden + pointerEvents: none when not active
               WebGL context preserved (never unmounted)

Dashboard tab: ALWAYS MOUNTED — display:none + pointerEvents:none when not active (task-003)
Settings tab:  ALWAYS MOUNTED — display:none + pointerEvents:none when not active (task-003)
Learn tab:     ALWAYS MOUNTED — display:none + pointerEvents:none when not active (task-003)
Profile tab:   ALWAYS MOUNTED — display:none + pointerEvents:none when not active (task-003)
```

All five tabs are now keep-alive. Component state (scroll position, sub-page
navigation, in-progress form values) survives tab switches. V13 (Learn tab
state loss on switch) is resolved.

### What Dies On Tab Switch

| From → To | What is Destroyed | What Survives |
|---|---|---|
| Any → Map | Nothing destroyed — all tabs always mounted. | All component state. Zustand stores intact. |
| Map → Any | Map stays mounted (hidden). | Map WebGL context, all map layers, GPS watch (if tracking). |
| Learn → Any | Nothing destroyed (always mounted). | Component state including scroll position, current chapter. |
| Settings → Any | Nothing destroyed (always mounted). | Sub-page state. |
| Dashboard → Any | Nothing destroyed (always mounted). | Waypoint/find counts (no re-fetch needed). |
| Profile → Any | Nothing destroyed (always mounted). | Finds list, track history component state. |

### What Happens During GPS Tracking + Tab Switch

| Scenario | Result |
|---|---|
| Tracking active → tap Learn tab | `isTracking` remains true in mapStore. `navigator.geolocation.watchPosition` continues (it's a browser API, not tied to React). sessionTrail keeps accumulating in mapStore. TrackOverlay is inside Map.jsx which stays mounted. **Tracking continues correctly.** |
| Tracking active → tap Dashboard tab | Same — tracking continues. User can return to Map tab and see TrackOverlay with current stats. |
| Tracking active → close browser tab | **Everything lost.** sessionTrail, elevationProfile gone. No auto-save mechanism. |
| Tracking active → app goes to background (mobile) | watchPosition may be throttled or stopped by OS. sessionTrail in memory may be cleared by OS memory pressure. **Data at risk.** |

---

## 5. Seam Map — Where Domains Touch

Points where two or more systems interact. Highest risk for bugs.

### Seam 1: Auth ↔ Data Access
- **Flow:** Supabase auth state change → useAuth fetches profile → sets isPro → all Pro gates react
- **Risk:** If profile fetch fails (offline), isPro stays false. User appears to lose Pro status. All Pro features lock. WMS layers hidden. Tier filter restricted to t6/t7.
- **Risk:** onAuthStateChange fires on tab focus. legalFetchedFor ref prevents redundant fetches, but if the ref is cleared (page reload), profile is re-fetched.

### Seam 2: Stripe Webhook ↔ Profile.is_pro
- **Flow:** Stripe checkout.session.completed → webhook → upserts subscriptions + sets profiles.is_pro=true
- **Risk:** Webhook fails → is_pro never set → user paid but doesn't get Pro access
- **Risk:** User returns from Stripe redirect → useSubscription.refresh() runs → but if webhook hasn't processed yet, status is still 'free'

### Seam 3: GPS Tracking ↔ Supabase Save
- **Flow:** watchPosition accumulates in mapStore.sessionTrail → user taps Stop → stopTracking() returns summary → user taps Save → saveTrack() writes to Supabase
- **Risk:** Between Stop and Save, data lives only in the summary object passed to saveTrack(). If the user navigates away before tapping Save, TrackOverlay is inside Map.jsx (always mounted) so it survives tab switches. But if the user closes the app — data lost.
- **Risk:** saveTrack() fails offline → toast "Could not save track" → user discards → trail data lost forever

### Seam 4: Tab Switch ↔ Component State
- **Flow:** User switches tabs in BottomNav → non-map tabs conditionally render → unmount destroys all useState
- **Risk:** Any component using useState for data that the user expects to persist (form inputs, scroll position, open/close states, list selections) will reset.
- **Affected:** Learn course detail position, settings sub-page state, profile scroll position, find log scroll position

### Seam 5: Offline Tile Cache ↔ Live Map Data
- **Flow:** Service Worker caches MapTiler tiles in 'offline-tiles'. Map renders cached tiles offline. But gold_samples and mineral_localities load from Supabase on mount.
- **Risk:** User downloads offline tiles → goes to rural area → has map tiles but ZERO data markers. The map looks correct (basemap renders) but all gold dots, mineral dots, WMS layers are missing. The user thinks they have offline capability but actually has an empty map.

### Seam 6: Optimistic UI ↔ Network Failure
- **Flow:** useFindsLog uses optimistic insert (show row immediately, replace with server response)
- **Risk:** If Supabase insert fails, optimistic row is removed. User sees their find appear and then disappear. No retry mechanism. No offline queue.
- **Not affected:** useWaypoints does NOT use optimistic inserts — it waits for server response before showing the waypoint.

### Seam 7: Theme ↔ Page Reload
- **Flow:** User selects theme in SettingsView → userStore.theme updated → App.jsx sets data-theme on <html>
- **Risk:** theme is not persisted to localStorage. On page reload, resets to 'dark'. User's preference is lost. Minor but breaks trust.

### Seam 8: Guest Mode ↔ Data Boundaries
- **Flow:** User continues as guest → isGuest=true → useWaypoints keeps data in useState only → useFindsLog blocks all writes → useTracks blocks saves
- **Risk:** Guest accumulates session waypoints in mapStore.sessionWaypoints. If they later sign up, those session waypoints are NOT migrated to their account. They're memory-only pins that vanish on reload.

---

## 6. Known Vulnerability List

Ranked by user impact (highest first).

### CRITICAL — Data Loss

| # | Vulnerability | Root Cause | User Impact |
|---|---|---|---|
| V1 | **GPS track lost on crash/close** | sessionTrail lives in Zustand (no persist). No auto-save during tracking. | User hikes 3 hours, app crashes → entire track gone. No recovery. |
| V2 | **Offline = no data** | gold_samples and mineral_localities load from Supabase on mount only. No local cache of query data (only tiles are cached). | User downloads offline region, goes to field, opens app → sees basemap with zero data points. Appears broken. |
| V3 | **Waypoint save fails offline silently** | useWaypoints.addWaypoint() calls supabase.insert() with no offline queue. Failure shows toast but data is gone. | User finds gold, saves waypoint, no signal → waypoint lost. Cannot recover. |
| V4 | **Track save fails offline** | saveTrack() calls supabase.insert() with no offline queue. User already stopped tracking — summary object is the only copy. | User finishes hike in no-signal area, taps Save → fails → taps Discard (only option) → track gone. |
| V5 | **Find save fails offline** | useFindsLog.addFind() uploads photo then inserts. Photo upload fails first → entire save fails. Optimistic row removed. | User logs a find with photo in field → both photo and find data lost. |
| V6 | **Route save fails silently** | RouteBuilder.saveRoute() has no toast on failure — only console.error. | User builds a route, saves, thinks it worked → data never persisted. No feedback. |

### HIGH — State Loss

| # | Vulnerability | Root Cause | User Impact |
|---|---|---|---|
| V7 | **Theme resets on reload** | userStore.theme not persisted to localStorage. | Minor annoyance. User must re-select theme every session. |
| V8 | **Layer preferences reset on reload** | layerVisibility not persisted. Always resets to { stream_sediment: true }. | User who always uses bedrock geology layer must re-enable it every session. |
| V9 | **Basemap preference resets on reload** | mapStore.basemap not persisted. Always resets to 'satellite'. | User who prefers outdoor basemap must re-select every session. |
| V10 | **Pro status lost on offline reload** | isPro hydrated from Supabase on auth state change. If offline, fetch fails → isPro=false. | Paying user opens app offline → appears as free user. Pro features locked. Cannot access own data layers. |

### MEDIUM — UX Friction

| # | Vulnerability | Root Cause | User Impact |
|---|---|---|---|
| V11 | **Guest data not migrated on signup** | sessionWaypoints in mapStore are fire-and-forget pins. No migration path to persistent waypoints table. | Guest explores, pins interesting spots, then signs up → all pins gone. |
| V12 | **Offline map = empty map** | Users don't understand that "offline maps" = tiles only, not data. No warning in OfflineManager UI. | False expectation of full offline capability. Trust-breaking. |
| V13 | **Tab switch scroll position loss** | Non-map tabs unmount → scroll position destroyed. | User scrolls through long course list, switches to map to check something, comes back → list scrolled to top. |
| V14 | **No connectivity check before writes** | Supabase calls are fire-and-hope. No navigator.onLine check before attempting writes. | User in spotty signal gets unpredictable success/failure without clear feedback. |
| V15 | **activeModule resets on reload** | Not persisted. Always 'prospecting'. | Only matters when other modules launch — user must re-select module every session. |
