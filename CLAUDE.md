# Explore Eire — Phase 2 Architect File
> Last updated: 14 April 2026
> For use with Claude Code, Cline, or any AI coding assistant
> DO NOT write a single line of code until you have read this file in full

---

## What We're Building

**Explore Eire** — Ireland's all-in-one outdoor platform. One app, one subscription, five modules covering everything the Irish outdoors enthusiast needs. The direct competitor to OnX Maps (US/AU) which does not serve Ireland or Europe.

**The core insight:** OnX built four separate apps for four audiences. We build one app with five modules. Same map engine, one subscription, everything included. Structurally better product.

**Target users:**
- Person A — Weekend warrior. Drives out Saturday morning. Plans the night before. Needs fast, offline-ready, confidence before leaving the house.
- Person B — Serious hobbyist. Cross-references data layers. Wants depth and precision.
- Person E — Local explorer. Location-aware curiosity. Discovers by exploring the map.

**Design philosophy:** Map first. Data rich. Location aware. Fast everywhere.

**Business model:** Free tier (limited) → Explorer €9.99/month → Annual €79/year

**Strategic direction:** Own the Irish outdoor market across all verticals before anyone else does. Gold/prospecting is the hero entry point and proven data foundation. Expand modules as data becomes available.

**Competitor:** OnX Maps (US) — 3M+ users, $35/month per app, does NOT serve Ireland or Europe. Entire market unserved.

---

## Platform Overview — 5 Modules

```
┌─────────────────────────────────────────────────────┐
│                   EXPLORE EIRE                       │
│              One app. One subscription.              │
├──────────┬──────────┬──────────┬──────────┬─────────┤
│Prospecting│Field     │ Hiking   │Archaeology│ Coastal │
│          │Sports    │& Trails  │          │& Beach  │
│ Gold     │Hunt &    │Looped    │Recorded  │Foreshore│
│ Minerals │Fish      │Walks     │Monuments │Access   │
│ GSI Data │Rivers    │Greenways │Ring Forts│Rock Pool│
└──────────┴──────────┴──────────┴──────────┴─────────┘
```

All modules share: map engine, waypoints, offline tiles, GPS tracking, 3D terrain, basemap system, auth, subscription.

---

## Live App (Phase 2 — Explore Eire)

- **GitHub repo:** https://github.com/swmofficial/Explore-Eire
- **Deployment:** Vercel — auto-deploys on every push to `main`
- **VPS (WMS proxy):** `187.124.212.83` / `srv1566939.hstgr.cloud`

Phase 1 (Ireland Gold) is archived at https://github.com/swmofficial/ireland-gold.

---

## Workflow

This project is built using **Claude Code** (on Hostinger VPS) and **Claude.ai** in conjunction.
- Claude.ai: groundworking, architecture decisions, planning, design
- Claude Code: implementation only, after decisions are fully mapped
- No code is written until decisions are documented in this file

---

## Brand & Design System

### Colour Palette

**Background scale (dark UI — map context):**
```
Void:    #0A0A0A  — deepest background, module dashboard
Base:    #111214  — primary app background
Surface: #1A1C20  — panels, drawers, sheets
Raised:  #242628  — cards, elevated elements
Border:  #2E3035  — all borders and dividers
Muted:   #6B7280  — secondary text, icons, placeholders
Primary: #E8EAF0  — primary text on dark bg
White:   #FFFFFF  — high emphasis text only
```

**Brand accent — Eire Gold:**
```
50:  #FFF8E7
200: #FFE99A
400: #E8C96A  ← PRIMARY ACCENT — active states, CTAs, highlights
500: #C9A84C
700: #A07830
900: #6B4F1A
```
Gold is used sparingly. Never as a background fill. Only for active states, CTAs, and brand moments.

**Module accent colours (one per module):**
```
Prospecting:  #E8C96A  — gold
Field Sports: #4A9E6B  — green
Hiking:       #5B8FD4  — blue
Archaeology:  #C47AC0  — purple
Coastal:      #3AACB8  — teal
```

**Semantic colours:**
```
Danger:  #E84B4B
Warning: #E8A84B
Success: #4BE87A
Info:    #4B8BE8
Offline: #FF4444  — persistent badge when no signal
Online:  #44DD88
```

### Themes

Three themes are implemented in `global.css` via `[data-theme]` on `<html>`. Map canvas stays dark regardless of theme.

```
dark  (default) — #0A0A0A void, #111214 base
light           — #E8EAF0 void, #FFFFFF base (glass buttons stay dark for legibility on map)
eire            — #0D1F0D void, #102010 base — deep forest green
```

Theme is stored in `userStore.theme`, applied in App.jsx via `document.documentElement.setAttribute('data-theme', theme)`. Selectable from SettingsPanel.

### Typography

```
Display:  28px / 700 / tracking -0.02em — app name, hero moments only
H1:       20px / 600 — screen titles, module names
H2:       16px / 500 — section headings, panel headers
Body:     14px / 400 — primary content, layer labels
Caption:  12px / 400 — metadata, secondary info
Label:    11px / 500 / uppercase / tracking 0.08em — category tabs, section labels
```

**Font: Plus Jakarta Sans** — loaded from Google Fonts. Fallback: system-ui / -apple-system / BlinkMacSystemFont. Loaded in `index.html` via preconnect + stylesheet link.

### Component Specifications

**Floating map buttons (glass style):**
```css
Standard:  52×52px, border-radius: 12px
Camera:    64×64px, border-radius: 16px
Background: rgba(10,10,10,0.88)
Border:    1px solid rgba(232,201,106,0.25)
Backdrop:  blur(12px), -webkit-backdrop-filter: blur(12px)
```

**Bottom sheets:**
```
Min height:    30% viewport
Max height:    85% viewport
Corner radius: 16px top only (border-radius: 16px 16px 0 0)
Handle:        32×4px, #2E3035, centered, margin-bottom: 12px
Background:    #111214 (var(--color-base))
Border-top:    1px solid #2E3035
```

**Layer panel (right drawer):**
```
Width:      80% screen, max 320px
Height:     full
Transition: transform 260ms ease-out (translateX)
Overlay:    rgba(0,0,0,0.5) behind, backdropFadeIn 200ms
```

**Category header strip:**
```
Height:     44px + safe-area-inset-top
Background: #0A0A0A solid (var(--color-void))
Content:    Home grid icon (left) + module name + accent dot (centre)
Border-bottom: 1px solid #2E3035
NOTE: No tabs — data/layer navigation moved to DataSheet bottom sheet
```

**Module icons (dashboard):**
```
Size:           80×80px
Corner radius:  20px
Background:     #1A1C20
Unlocked border: 1.5px solid [module accent colour]
Locked:         border: 1px solid #2E3035, opacity: 0.45
Label:          8px / 600 / uppercase, below icon
```

**Status badges / pills:**
```
Offline: background rgba(255,68,68,0.15), color #FF4444
Pro:     background rgba(232,201,106,0.15), color #C9A84C
New:     background rgba(91,143,212,0.15), color #3A6DB8
```

### Motion Principles

```
Bottom sheet open:  320ms cubic-bezier(0.32, 0.72, 0, 1)
Layer panel slide:  260ms ease-out
Modal overlay:      200ms ease-out (fade)
Map camera fly:     800ms ease-in-out (MapLibre flyTo)
Toast notification: 180ms slide down, 3s hold, 180ms slide up
Button press:       scale(0.97), 80ms
```

All animations respect `@media (prefers-reduced-motion: reduce)`.

### Design Rules (non-negotiable)

1. The map is always visible. Nothing replaces it as the primary surface.
2. Dark UI only in map context. No light mode for the map canvas itself.
3. All detail panels use bottom sheets — never full-screen modals when in map context.
4. No traditional navigation bars. Category header + floating buttons only.
5. Gold accent (#E8C96A) used sparingly — overuse kills its impact.
6. Every floating button uses glass style (rgba dark + border + backdrop-blur).
7. viewport-fit=cover is required in the HTML meta tag for iOS safe area to work.

---

## Information Architecture

### App Entry — First Open Flow

```
1. No splash screen yet (planned)
   → GPS permission fires on map load

2. Module dashboard — unauthenticated or authenticated
   → 5 module icons on #0A0A0A
   → Prospecting always unlocked (tap to enter map)
   → All other modules locked — tap opens UpgradeSheet
   → "Choose your adventure" headline
   → "Sign up free" CTA if !user; "Subscribe — Unlock all modules" if user && !isPro

3. Auth — triggered by CTA or "Sign up free"
   → Email + Google OAuth via Supabase
   → AuthModal has Sign In / Sign Up tabs
   → "Continue as guest" → isGuest=true, t6/t7 data only, no waypoints

4. Legal disclaimer (first login only) — NOT YET BUILT
   → Full screen scroll-to-accept
   → useAuth sets showLegalDisclaimer=true if profiles.legal_accepted = false
   → LegalDisclaimerModal.jsx is currently a stub

5. Map view — module context
   → Full screen satellite basemap (default)
   → CategoryHeader top strip
   → DataSheet collapsed at bottom (60px, tap/drag to expand)
   → LayerPanel accessible via Layers corner button (top right)
```

### Screen Inventory

**Primary screens (built):**
- Module dashboard — home base, always accessible
- Map view — primary surface, full screen satellite basemap
- LayerPanel — right drawer, filtered by active module
- SettingsPanel — left drawer, theme/account/legal
- DataSheet — three-state bottom sheet (layer filters + nearest samples)
- SampleSheet — detail sheet for gold sample tap
- AuthModal — sign in / sign up / guest
- BasemapPicker — 3 thumbnail basemap cards + 2D/3D toggle
- UpgradeSheet — paywall (feature list, monthly/annual, CTA)

**Stubs (file exists, returns null):**
- FindSheet — nearby discovery (DataSheet partially covers this for Prospecting)
- WaypointSheet — waypoint detail / add waypoint flow
- TrackOverlay — Go & Track mode full screen overlay
- RouteBuilder — route planning tool
- OfflineManager — offline map download manager
- StatusToast — system message toast + persistent OFFLINE badge
- LegalDisclaimerModal — first-login scroll-to-accept (useAuth triggers it but nothing renders it)

### Corner Controls Layout

```
┌─────────────────────────────┐
│  [⚙ Settings]  [≡ Layers]  │  ← top-left, top-right
│  (safe-area)   (safe-area)  │
│                             │
│       MAP — FULL SCREEN     │
│                             │
│           [📷 Camera]       │  ← bottom-centre
│ [🗺 Basemap]                │  ← bottom-left
│  (safe-area)   (safe-area)  │
└─────────────────────────────┘
```

- **Settings** → opens SettingsPanel (left drawer)
- **Layers** → opens LayerPanel (right drawer)
- **Basemap** → opens BasemapPicker (bottom sheet)
- **Camera** → opens UpgradeSheet for free/guest users; logs TODO for Pro users (waypoint flow not yet built)

### Component Composition

Map.jsx renders its own overlays internally:
- `CategoryHeader`, `CornerControls`, `DataSheet`, `SampleSheet`, `LayerPanel`, `BasemapPicker`

App.jsx renders:
- `ModuleDashboard` (dashboard view) or `MapView` (map view)
- `SettingsPanel`, `AuthModal`, `UpgradeSheet` (app-level, above map)

---

## Module Specifications

### Prospecting (Gold & Minerals)

**Data sources:**
- GSI Stream Sediment Survey: 8,796 samples (Supabase `gold_samples` table)
- GSI Lithogeochemistry SE Ireland: 517 rock samples (same table, `sample_type` contains "rock" or `survey` contains "litho")
- GSI WMS: Gold heatmap, Arsenic, Lead, Bedrock, Geological Lines, Boreholes (via VPS proxy)
- Mineral occurrences: PENDING DATA — do not build layer until data provided

**Map layers (implemented):**
- 7 separate MapLibre circle layers (`gold-t1` through `gold-t7`), rendered t7→t1 so higher tiers paint on top
- Rock samples as a separate `rock-circles` layer with white stroke to distinguish
- All 6 WMS raster layers added on map load with `visibility: none`, toggled via LayerPanel / DataSheet

**Free tier gate (implemented):** Non-Pro users see only `gold-t6` (low, ≥2ppb) and `gold-t7` (background, <2ppb). All WMS layers hidden for non-Pro regardless of toggle state.

**Layer panel sections:**
```
GOLD OCCURRENCES
  ├── Stream sediment samples (master toggle for all 7 tiers)
  └── Rock samples

GSI GEOCHEMISTRY  [Pro only]
  ├── Gold heatmap (WMS)
  ├── Arsenic (WMS)
  └── Lead (WMS)

GSI GEOLOGY  [Pro only]
  ├── Bedrock geology (WMS)
  ├── Geological lines (WMS)
  └── Boreholes (WMS)

MINERALS (placeholder — no data yet)
  ├── Quartz / Crystal
  ├── Amethyst
  ├── Connemara marble
  ├── Agate / Bloodstone
  └── Fluorite
```

**Gold tier colour scale:**
```javascript
const GOLD_TIERS = [
  { id: 't1', label: 'Exceptional', range: '>500 ppb',  min: 500, max: 1e9,  color: '#67000d' },
  { id: 't2', label: 'Very high',   range: '>100 ppb',  min: 100, max: 500,  color: '#cb181d' },
  { id: 't3', label: 'High',        range: '>50 ppb',   min: 50,  max: 100,  color: '#fc4e2a' },
  { id: 't4', label: 'Significant', range: '>10 ppb',   min: 10,  max: 50,   color: '#fd8d3c' },
  { id: 't5', label: 'Anomalous',   range: '>5 ppb',    min: 5,   max: 10,   color: '#fecc5c' },
  { id: 't6', label: 'Low',         range: '>2 ppb',    min: 2,   max: 5,    color: '#ffffb2' },
  { id: 't7', label: 'Background',  range: '<2 ppb',    min: 0,   max: 2,    color: '#74c476' },
]
```

**DataSheet tier filters:** "All" / "Exceptional (≥500)" / "High (≥50)" / "Significant (≥10)" — drives both MapLibre layer visibility and the sample list.

### Field Sports (Hunt & Fish)

**Status:** Layers defined in `layerCategories.js`, no data loaded yet. Module locked (`available: false`).

**Planned layers:**
```
FISHING
  ├── Fishing rivers (IFI data)
  ├── Salmon beats
  ├── Coarse fishing lakes
  └── Water access points

HUNTING
  ├── Public/private land boundaries
  ├── Game land
  └── Licensed shooting areas

REGULATIONS
  └── Seasons calendar (informational)
```

### Hiking & Trails

**Status:** Layers defined, no data, locked (`available: false`).

**Planned layers:**
```
TRAILS
  ├── Looped walks (Sport Ireland Trails data)
  ├── Long distance routes (Wicklow Way, Kerry Way etc)
  └── Greenways (Bord na Móna, local authorities)

FACILITIES
  ├── Trailheads / car parks
  ├── Campsites
  └── Picnic areas

DIFFICULTY
  └── Trail slope angle (colour coded green/yellow/orange/red)
```

### Archaeology

**Status:** Layers defined, no data, locked (`available: false`).

**Important:** It is a criminal offence to disturb a Recorded Monument. This layer is INFORMATIONAL only. Legal disclaimer must reinforce this.

**Planned layers:**
```
MONUMENTS
  ├── Recorded Monuments (National Monuments Service)
  ├── Ring forts
  ├── Standing stones
  ├── Megalithic tombs
  └── Holy wells

HISTORIC
  ├── Historic mines and workings
  ├── Burial sites
  └── Heritage trails

PROTECTED
  └── Architectural Conservation Areas
```

### Coastal & Beach

**Status:** Layers defined, no data, locked (`available: false`).

**Planned layers:**
```
ACCESS
  ├── Beach access points
  ├── Foreshore zones (State property)
  ├── Boat ramps
  └── Coastal walks

DISCOVERY
  ├── Rock pooling sites
  ├── Fossil locations
  └── Sea glass / mineral beaches

SAFETY
  └── Tidal information (future — Met Éireann API)
```

---

## Core Platform Features

### Status Overview

| Feature | Status |
|---|---|
| Full-screen MapLibre map (satellite default) | ✅ Built |
| Module dashboard, 5 icons, lock/unlock | ✅ Built |
| Auth — email + Google OAuth + guest mode | ✅ Built |
| Prospecting gold layers (7 tiers + rock circles) | ✅ Built |
| WMS proxy layers (geochemistry + geology) | ✅ Built |
| LayerPanel right drawer | ✅ Built |
| DataSheet bottom sheet (filters + sample list) | ✅ Built |
| SampleSheet detail (ppb, coords, waypoint save) | ✅ Built |
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
| GPS Go & Track (TrackOverlay) | ⚠️ Stub |
| Waypoints full flow (WaypointSheet) | ⚠️ Stub |
| Offline map downloads (OfflineManager) | ⚠️ Stub |
| Find / Discover nearby (FindSheet) | ⚠️ Stub |
| Route builder | ⚠️ Stub |
| Weather layer | ⚠️ Stub |
| StatusToast + OFFLINE badge | ⚠️ Stub |
| Capacitor native wrapper | ❌ Not started |
| Plausible analytics | ❌ Not started |

### 3D Terrain

**Implemented.** Toggle in BasemapPicker. MapTiler terrain-rgb-v2 source.

```javascript
// mapConfig.js
export const TERRAIN_SOURCE = {
  type: 'raster-dem',
  url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
  tileSize: 256,
}
export const TERRAIN_CONFIG = { source: 'terrain', exaggeration: 1.5 }
```

`mapStore.is3D` gates terrain on/off. Map.jsx `useEffect` watches `is3D` and calls `map.setTerrain(TERRAIN_CONFIG)` / `map.setTerrain(null)`. Terrain source is also re-added after basemap style switches if `is3D` was active.

### Basemap Switching

**Implemented.** Three basemaps defined in `mapConfig.js`:

```javascript
export const BASEMAPS = {
  satellite: { id: 'satellite', label: 'Satellite', styleUrl: `...maptiler.com/maps/satellite/...` },
  outdoor:   { id: 'outdoor',   label: 'Outdoor',   styleUrl: `...maptiler.com/maps/outdoor-v2/...` },
  topo:      { id: 'topo',      label: 'Topo',      styleUrl: `...maptiler.com/maps/topo-v2/...` },
}
```

**Default: `satellite`.** Stored in `mapStore.basemap`.

On style change: `map.setStyle(styleUrl)` → `map.once('style.load', ...)` → `addDataLayers(map)` re-adds all sources/layers (WMS rasters, gold tiers, rock circles, session trail, session waypoints) → `syncLayerVisibility(map)` re-applies current visibility state → terrain re-added if `is3D`.

### WMS Proxy

**Server:** `187.124.212.83` — Ubuntu 24.04 LTS
**Hostname:** `srv1566939.hstgr.cloud`
**Proxy URL (HTTPS via Traefik):** `https://srv1566939.hstgr.cloud`
**Health check:** `https://srv1566939.hstgr.cloud/health`

**Proxy endpoints:**
```
/wms/geo  → GSI Geochemistry WMS server
/wms/bed  → GSI Bedrock WMS server
/wms/bore → GSI Boreholes WMS server
```

**PM2 process:** `wms-proxy` — auto-restarts on crash, survives server reboots.

**Future:** Proxy becomes the auth enforcement layer for premium GSI layers. Add token verification middleware before forwarding requests.

### GSI WMS Layer Names (exact — special characters matter)

```
Gold heatmap:    C_FA_ICP-MS_Gold_(Au)_(µg_kg¯¹)59779
Arsenic:         C_XRFS_Arsenic_(As)_(mg_kg¯¹)41362
Lead:            C_XRFS_Lead_(Pb)_(mg_kg¯¹)35511
Bedrock geology: IE_GSI_Bedrock_Geology_100K_IE26_ITM
Geo lines:       IE_GSI_Geological_Lines_100K_IE26_ITM
Boreholes:       IE_GSI_Mineral_Exploration_Boreholes_50K_IE26_ITM
```

**CRITICAL:** Layer names use `\u00b5` `\u00af` `\u00b9` Unicode escapes in `mapConfig.js` (NOT literal characters — PowerShell and some editors corrupt them). Always `encodeURIComponent()` in tile URLs. Never use `URLSearchParams` for WMS tile URL construction — it re-encodes `{bbox-epsg-3857}`.

---

## Subscription & Paywall

### Tier Structure

**Free / Guest:**
- Prospecting module only
- Gold occurrences — low + background tiers only (t6 ≥2ppb, t7 <2ppb)
- No GSI WMS layers
- No waypoints (guest) / 3 waypoints (free account — not yet enforced)
- No offline maps, no GPS tracking
- Guest mode: `isGuest=true` in userStore, set via "Continue as guest" in AuthModal

**Explorer — €9.99/month:**
- All 5 modules fully unlocked
- Full gold occurrence data (all 7 tiers)
- All GSI WMS layers
- Unlimited waypoints + photos
- Offline map downloads
- GPS route tracking
- 3D terrain
- Weather layer (not yet built)
- Route builder (not yet built)

**Annual — €79/year:**
- Everything in Explorer
- ~34% saving vs monthly

### Paywall Implementation

- `userStore.showUpgradeSheet` boolean drives UpgradeSheet visibility
- UpgradeSheet is mounted in App.jsx (renders in both dashboard and map views)
- Triggered from: ModuleDashboard locked module tap, ModuleDashboard CTA if !user, CornerControls camera button for free/guest users
- `isPro` boolean in userStore gates all premium features; set by `useAuth` on subscription fetch
- Stripe checkout and webhook are stubs returning 501 — wire up before launch

### Stripe Setup (required in Vercel env vars)

```
VITE_STRIPE_PRICE_ID_MONTHLY=price_...
VITE_STRIPE_PRICE_ID_ANNUAL=price_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
APP_URL=https://exploreeire.ie
```
Note: price IDs use the `VITE_` prefix so Vite exposes them to the browser via `import.meta.env`.
The frontend resolves the price ID and sends it in the POST body — the serverless function uses it directly.

---

## Waypoints — Full Specification

**Add waypoint flow (not yet built — WaypointSheet is a stub):**
```
Option A (camera): Tap camera button → for Pro users → camera opens →
  take photo → confirmation sheet:
    - Photo thumbnail
    - Current GPS coords (from navigator.geolocation ONLY — never EXIF)
    - Name field
    - Icon picker (prospect | find | camp | hazard | note | custom)
    - Colour picker
  → Save → photo uploads to Supabase Storage

Option B (long press): Long press on map →
  "Add waypoint here?" sheet →
  Same confirmation sheet (no photo option)

Option C (detail sheet): On any SampleSheet →
  "Save Waypoint" button → currently saves to mapStore.sessionWaypoints only
  (Supabase persistence requires WaypointSheet to be built)
```

**DO NOT attempt EXIF GPS extraction — iOS strips location from photos.**

**GPS comes from `navigator.geolocation.getCurrentPosition()` only.**

**Photo storage:** `waypoint-photos/{user_id}/{timestamp}.jpg` in Supabase Storage

**Current state:** SampleSheet "Save Waypoint" button calls `mapStore.addSessionWaypoint()` which pins a gold circle on the map for the current session. Persistent save to Supabase is not yet implemented.

---

## Technical Stack

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

## Database Schema

### Existing tables (from phase 1)

**gold_samples** (9,313 rows — 8,796 stream sediment + 517 rock)
```sql
id, sample_id, lat, lng, au_ppb, as_mgkg, pb_mgkg, cu_mgkg,
easting_ing, northing_ing, sample_type, survey, survey_year,
rock_type, rock_desc, rock_age, created_at
```
*Note: `useGoldSamples` selects: id, sample_id, lat, lng, au_ppb, as_mgkg, pb_mgkg, sample_type, survey, easting_ing, northing_ing, rock_type, rock_desc (not cu_mgkg, survey_year, rock_age)*

**waypoints**
```sql
id, user_id, name, description, lat, lng,
icon, depth_m, weight_g, photos (text[]),
offline_created, synced_at, created_at
```

**subscriptions**
```sql
id, user_id, stripe_customer_id, stripe_subscription_id,
status ('free'|'active'|'cancelled'|'past_due'),
current_period_end, created_at
```

**profiles**
```sql
id, display_name, avatar_url,
legal_accepted (boolean), legal_accepted_at, created_at
```

### New tables (phase 2 — create in Supabase)

**tracks**
```sql
id              uuid PK
user_id         uuid FK → auth.users
name            text
module          text
geojson         jsonb   -- GeoJSON LineString with timestamps
distance_m      float
duration_s      integer
elevation_gain_m  float
elevation_loss_m  float
started_at      timestamp
ended_at        timestamp
created_at      timestamp
```

**routes**
```sql
id              uuid PK
user_id         uuid FK → auth.users
name            text
module          text
geojson         jsonb   -- GeoJSON LineString
distance_m      float
elevation_profile  jsonb  -- array of {distance, elevation} points
created_at      timestamp
```

**offline_regions**
```sql
id              uuid PK
user_id         uuid FK → auth.users
name            text
bbox            jsonb   -- {north, south, east, west}
resolution      text    -- 'high' | 'med' | 'low'
size_bytes      integer
downloaded_at   timestamp
expires_at      timestamp
created_at      timestamp
```

**module_access**
```sql
id              uuid PK
user_id         uuid FK → auth.users
module_id       text    -- 'prospecting' | 'field_sports' | etc.
granted_at      timestamp
source          text    -- 'subscription' | 'promo' | 'free_tier'
```

### RLS Policies

```sql
-- gold_samples: public read (anon + authenticated)
create policy "Public read gold_samples"
  on gold_samples for select
  to anon, authenticated using (true);

-- waypoints: user owns their own
create policy "Users own waypoints"
  on waypoints for all
  to authenticated using (auth.uid() = user_id);

-- tracks: user owns their own
create policy "Users own tracks"
  on tracks for all
  to authenticated using (auth.uid() = user_id);
```

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
    │   ├── BasemapPicker.jsx    ← Bottom sheet. 3 thumbnail cards + 2D/3D terrain toggle.
    │   ├── UpgradeSheet.jsx     ← Paywall. Feature list, monthly/annual pills, CTA (Stripe TODO).
    │   ├── AuthModal.jsx        ← Sign In/Up modal. Google OAuth + email/password + Continue as guest.
    │   ├── BottomSheet.jsx      ← Minimal reusable shell (no spring/drag yet)
    │   ├── FindSheet.jsx        ← STUB
    │   ├── WaypointSheet.jsx    ← STUB
    │   ├── TrackOverlay.jsx     ← STUB
    │   ├── OfflineManager.jsx   ← STUB
    │   ├── RouteBuilder.jsx     ← STUB
    │   ├── StatusToast.jsx      ← STUB
    │   └── LegalDisclaimerModal.jsx  ← Centred popup, 8 legal sections, checkbox accept, Supabase upsert
    ├── hooks/
    │   ├── useAuth.js           ← Auth state listener, legalFetchedFor ref, profile + sub fetch
    │   ├── useGoldSamples.js    ← Batched Supabase load (1000/batch, loop until exhausted)
    │   ├── useGeolocation.js    ← Device GPS: getCurrentPosition, watchPosition, stopWatching
    │   ├── useSubscription.js   ← STUB (subscription fetch handled by useAuth currently)
    │   ├── useTracks.js         ← Skeleton (state structure, all methods are TODO)
    │   ├── useWaypoints.js      ← Skeleton (state structure, all CRUD methods are TODO)
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

## Environment Variables

**Vercel (production — set in Vercel dashboard):**
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

## Legal Disclaimer Content

Must cover exactly these 8 topics (to implement in LegalDisclaimerModal.jsx):

1. **The Two-Day Rule** — Section 8 Minerals Development Act 2017. Up to 2 consecutive days at one location without a licence.
2. **Land Access** — Majority of Irish land is private. Must have landowner permission. No right to roam.
3. **Protected Areas** — SACs, SPAs, NHAs, National Parks. Prospecting may disturb protected habitats. Check npws.ie.
4. **Archaeological Sites** — Criminal offence to disturb a Recorded Monument. Check maps.archaeology.ie before any digging.
5. **Active Mineral Licences** — Some areas held by exploration companies. Check decc.gov.ie.
6. **Waterways** — River bed/banks may be privately owned. Panning generally tolerated but confirm.
7. **Foreshore** — Intertidal zone (beaches) is State property. Removing material may require foreshore licence.
8. **Disclaimer** — Explore Eire provides geological data for informational purposes only. User is responsible for verifying permissions. Explore Eire accepts no liability for trespass, environmental damage, or breach of any statutory provision.

Footer: "This is a summary for informational purposes only and does not constitute legal advice."

**Implementation requirements:**
- Full screen on first login, after email verification
- User must scroll to bottom before accept button activates
- Single checkbox: "I understand and accept my legal responsibilities"
- Stored: `profiles.legal_accepted = true`, `legal_accepted_at = now()`
- Permanent Legal page accessible from Settings panel at any time
- Once accepted: never shown again. Use `legalFetchedFor` ref pattern (already in useAuth.js) to prevent re-trigger on tab focus.
- `useAuth` already sets `showLegalDisclaimer = true` when `profiles.legal_accepted = false` — just need the component built and rendered.

---

## Known Bugs Fixed (do not reintroduce)

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

---

## Legal Attribution (required in app)

All GSI data CC BY 4.0:
"Contains Irish Public Sector Data (Geological Survey Ireland) licensed under CC BY 4.0"

Minerals Development Act 2017 — State owns all minerals.
Two-day rule applies for recreational prospecting without a licence.

---

## Parked Ideas (revisit post-launch)

- **Explore Eire Realty** — separate platform. Map-first property browsing: BIDx1 auctions, foreclosures, rentals, current sales. Same map engine. Separate codebase, brand, subscription.
- **Interactive globe view** — GPS-centred 3D globe transitioning to flat Ireland map. MapLibre globe projection. Non-trivial, not core to MVP.
- **Community finds** — user-submitted waypoints visible to all (with privacy controls). Requires moderation. Phase 3+.
- **CarPlay / Android Auto** — Phase 3+.
- **Trail reports** — user-submitted condition reports. Phase 3+.

---

## Phase 2 Build Priority — Remaining Work

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

**Next (in order):**
10. Legal disclaimer — build LegalDisclaimerModal.jsx (useAuth already triggers it)
11. Stripe — wire create-checkout-session.js + stripe-webhook.js (stubs exist)
12. Waypoints — build WaypointSheet.jsx (useTracks/useWaypoints hooks scaffolded)
13. GPS tracking — build TrackOverlay.jsx (useTracks hook scaffolded)
14. StatusToast — persistent OFFLINE badge + system messages
15. Offline maps — build OfflineManager.jsx (useOffline hook scaffolded)
16. Find / Discover — build FindSheet.jsx
17. Field Sports module — data sourcing required first
18. Hiking module — data sourcing required first
19. Archaeology module — NMS data integration
20. Coastal module — data sourcing required first
21. Route builder — build RouteBuilder.jsx
22. Weather layer — Met Éireann API
23. Capacitor — native iOS/Android wrapper
24. App Store submission
25. Custom domain — exploreeire.ie
