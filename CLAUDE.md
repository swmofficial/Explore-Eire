# Explore Eire — Phase 2 Architect File
> Last updated: April 2026
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

## Live App (Phase 1 — Ireland Gold)

- **Production URL:** https://ireland-gold-tau.vercel.app
- **GitHub repo:** https://github.com/swmofficial/ireland-gold
- **Vercel project:** ireland-gold (swmofficial's projects)
- **Deployment:** Auto-deploys on every push to `main`

Phase 2 will be a new repo under the Explore Eire brand.

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

### Typography

```
Display:  28px / 700 / tracking -0.02em — app name, hero moments only
H1:       20px / 600 — screen titles, module names
H2:       16px / 500 — section headings, panel headers
Body:     14px / 400 — primary content, layer labels
Caption:  12px / 400 — metadata, secondary info
Label:    11px / 500 / uppercase / tracking 0.08em — category tabs, section labels
```

Font: system-ui / -apple-system stack. No custom font dependency.

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
Background:    #111214
Border-top:    1px solid #2E3035
```

**Layer panel (right drawer):**
```
Width:      80% screen, max 320px
Height:     full
Animation:  slideInRight 260ms ease-out
Overlay:    rgba(0,0,0,0.5) behind, overlayFadeIn 200ms
```

**Category header strip:**
```
Height:     44px + safe-area-inset-top
Background: #0A0A0A solid
Tab font:   11px / 600 / uppercase
Active tab: #E8C96A, 2px gold underline
Inactive:   #6B7280
Border-bottom: 1px solid #2E3035
```

**Module icons (dashboard):**
```
Size:           80×80px
Corner radius:  20px
Background:     #1A1C20
Unlocked border: 1.5px solid [module accent colour]
Locked:         border: 1px solid #2E3035, opacity: 0.4
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
Bottom sheet open:  350ms / spring(stiffness: 300, damping: 30)
Layer panel slide:  260ms / ease-out
Modal overlay:      200ms / ease-out (fade + scale 0.96→1)
Map camera fly:     800ms / ease-in-out (MapLibre flyTo)
Toast notification: 180ms slide down, 3s hold, 180ms slide up
Tab content switch: 150ms / ease crossfade
Button press:       scale(0.97), 80ms
```

All animations respect `@media (prefers-reduced-motion: reduce)`.

### Design Rules (non-negotiable)

1. The map is always visible. Nothing replaces it as the primary surface.
2. Dark UI only in map context. No light mode for the map view.
3. All detail panels use bottom sheets — never full-screen modals when in map context.
4. No traditional navigation bars. Category header + floating buttons only.
5. Gold accent (#E8C96A) used sparingly — overuse kills its impact.
6. Every floating button uses glass style (rgba dark + border + backdrop-blur).
7. viewport-fit=cover is required in the HTML meta tag for iOS safe area to work.

---

## Information Architecture

### App Entry — First Open Flow

```
1. Splash screen (1.5s max)
   → GPS permission request fires here
   
2. Module dashboard — unauthenticated
   → 5 module icons on #0A0A0A
   → All locked with padlock
   → "Choose your adventure" headline
   → "Sign up free" CTA
   
3. Auth — sign up / sign in
   → Email + Google OAuth
   → Minimal form, no username required
   
4. Legal disclaimer (first login only)
   → Full screen scroll-to-accept
   → Covers: Two-Day Rule, Land Access, Protected Areas,
     Archaeological Sites, Mineral Licences, Waterways,
     Foreshore, Disclaimer
   → Accept button activates only at bottom of scroll
   → Stored: profiles.legal_accepted = true
   
5. Module dashboard — authenticated
   → Unlocked modules show accent colour + active border
   → Locked modules show padlock + greyed
   → Tap unlocked → enters module map
   → Tap locked → paywall / upgrade sheet
   
6. Map view — module context
   → Full screen map
   → Category header shows module tabs
   → Layer panel pre-filtered to active module
```

### Screen Inventory

**Primary screens:**
- Module dashboard — home base, always accessible
- Map view — primary surface, full screen
- Layer panel — right drawer, filtered by category
- Settings panel — left drawer
- Find / Discover — bottom sheet, nearby data
- Plan / Waypoints list — bottom sheet
- Go & Track mode — full screen tracking overlay
- Offline maps manager — bottom sheet

**Detail sheets (bottom sheets):**
- Sample detail (ppb, tier, IDs, arsenic, lead, coords)
- Waypoint detail (name, icon, photos, GPS, edit/delete/share)
- Add waypoint (camera → photo → GPS → name → icon → save)
- Route detail (distance, elevation profile, navigate, export)
- Basemap picker (3 visual thumbnails + 2D/3D toggle)
- Upgrade / paywall (feature list + price + subscribe CTA)

**Persistent UI (always on screen in map view):**
- Category header strip (top)
- Corner controls × 4 (floating glass buttons)
- GPS blue dot (map layer)
- Status toast (slides from top for system messages)
- OFFLINE badge (persistent red when no signal)

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

---

## Module Specifications

### Prospecting (Gold & Minerals)

**Data sources:**
- GSI Stream Sediment Survey: 8,796 samples (Supabase)
- GSI Lithogeochemistry SE Ireland: 517 rock samples (Supabase)
- GSI WMS: Gold heatmap, Arsenic, Lead, Bedrock, Boreholes (via proxy)
- Mineral occurrences: PENDING DATA — do not build layer until data provided

**Layer panel sections:**
```
GOLD OCCURRENCES
  ├── Stream sediment samples (7 tier sub-toggles)
  └── Rock samples

GSI GEOCHEMISTRY
  ├── Gold heatmap (WMS — Pro only)
  ├── Arsenic (WMS — Pro only)
  └── Lead (WMS — Pro only)

GSI GEOLOGY
  ├── Bedrock geology (WMS — Pro only)
  ├── Geological lines (WMS — Pro only)
  └── Boreholes (WMS — Pro only)

MINERALS (placeholder — no data)
  ├── Quartz / Crystal
  ├── Amethyst
  ├── Connemara marble
  ├── Agate / Bloodstone
  └── Fluorite
```

**Gold tier colour scale:**
```javascript
const TIERS = [
  { id: 't1', label: 'Exceptional', range: '>500 ppb',  min: 500, max: 1e9,  color: '#67000d' },
  { id: 't2', label: 'Very high',   range: '>100 ppb',  min: 100, max: 500,  color: '#cb181d' },
  { id: 't3', label: 'High',        range: '>50 ppb',   min: 50,  max: 100,  color: '#fc4e2a' },
  { id: 't4', label: 'Significant', range: '>10 ppb',   min: 10,  max: 50,   color: '#fd8d3c' },
  { id: 't5', label: 'Anomalous',   range: '>5 ppb',    min: 5,   max: 10,   color: '#fecc5c' },
  { id: 't6', label: 'Low',         range: '>2 ppb',    min: 2,   max: 5,    color: '#ffffb2' },
  { id: 't7', label: 'Background',  range: '<2 ppb',    min: 0,   max: 2,    color: '#74c476' },
]
```

### Field Sports (Hunt & Fish)

**Concept:** Combined hunting and angling module. Irish overlap between these communities is significant.

**Planned layers (data sourcing required):**
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

**Data sources to investigate:**
- Inland Fisheries Ireland (IFI) — river and lake data
- NPWS — protected areas (no fishing/hunting zones)
- OSi — land boundaries

### Hiking & Trails

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

**Data sources to investigate:**
- Sport Ireland Trails database
- Fáilte Ireland trail data
- OSi for greenways

### Archaeology

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

**Data sources:**
- National Monuments Service — maps.archaeology.ie (public data)
- Historic Environment Viewer

**Important:** It is a criminal offence to disturb a Recorded Monument. This layer is INFORMATIONAL only. Legal disclaimer must reinforce this.

### Coastal & Beach

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

## Core Platform Features (Phase 2 Priority Order)

### 1. Offline Map Downloads

**How it works:**
- User draws bounding box on map
- Chooses resolution: High (5 miles, ~100-400MB), Med (10 miles, ~30-100MB), Low (150 miles, ~5-30MB)
- Estimated download size shown before confirming
- Download on WiFi recommended
- Named regions saved (e.g. "Wicklow Mountains August")
- Green indicator = downloaded, red = not downloaded
- Works for all basemaps (satellite, outdoor, topo)

**Implementation:**
- MapLibre offline tile cache via `maplibre-gl-offline` or custom IndexedDB tile store
- Supabase stores region metadata (`offline_regions` table)
- Tiles stored in device storage, not Supabase

### 2. GPS Tracking — Go & Track

**How it works:**
- Tap track button → begins recording
- Red dot trail draws on map as user moves
- Live stats overlay: distance (km), time (h:mm), elevation gain (m)
- Pause / Resume / Stop controls
- On stop: name the track → saves to `tracks` table as GeoJSON LineString
- View elevation profile after saving
- Export as GPX file
- Tracks visible on map as saved layer

**Data stored per track:**
```
geojson LineString with timestamps
distance_m, duration_s
elevation_gain_m, elevation_loss_m
module context
```

### 3. 3D Terrain

**How it works:**
- MapLibre v3+ globe/3D using terrain-rgb tiles from MapTiler
- 2D/3D toggle lives in the basemap picker sheet
- Mobile: two-finger tilt and rotate, pinch zoom
- Desktop: Ctrl+drag to tilt, right-click+drag to pan
- North-up reset: tap compass
- Returns to 2D: tap 3D button

**MapLibre terrain config:**
```javascript
map.addSource('terrain', {
  type: 'raster-dem',
  url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
  tileSize: 256,
})
map.setTerrain({ source: 'terrain', exaggeration: 1.5 })
```

### 4. Route Builder

**How it works:**
- Tap route builder tool → enters route mode
- Tap map points → snaps to trails where available
- Straight line option for off-trail routes
- Shows: total distance, estimated elevation change
- Save with name → stored as `routes` table
- Navigate along saved route
- Export as GPX

### 5. Find — Nearby Discovery

**How it works:**
- Accessible from floating button or bottom nav
- Bottom sheet shows nearest data points for active module
- Prospecting: nearest high-ppb samples sorted by distance
- Hiking: nearest trailheads
- Sorted by GPS proximity
- Tap any result → map flies to location + shows detail sheet

### 6. Weather Layer

**How it works:**
- Persistent weather chip in top-right corner of map
- Shows: temperature, wind speed, condition icon
- Tap → expands to 5-day forecast sheet
- Data source: Met Éireann API (Irish government, free, relevant)
- Falls back to OpenWeatherMap if Met Éireann unavailable

---

## Waypoints — Full Specification

**Add waypoint flow:**
```
Option A (camera): Tap camera button → camera opens →
  take photo → confirmation sheet shows:
    - Photo thumbnail
    - Current GPS coords (from device API, NOT EXIF)
    - Name field
    - Icon picker (prospect | find | camp | hazard | note | custom)
    - Colour picker
  → Save → photo uploads to Supabase Storage

Option B (long press): Long press on map →
  "Add waypoint here?" sheet →
  Same confirmation sheet as above (no photo option)

Option C (detail sheet): On any data point detail →
  "+ Add waypoint" button → same flow
```

**DO NOT attempt EXIF GPS extraction — iOS strips location from photos.**

**GPS comes from device `navigator.geolocation.getCurrentPosition()` only.**

**Photo storage:** `waypoint-photos/{user_id}/{timestamp}.jpg` in Supabase Storage

---

## Subscription & Paywall

### Tier Structure

**Free:**
- Map view — Ireland only
- Gold occurrences — background + low tier only (t6, t7)
- 3 waypoints maximum
- No offline maps
- No GSI WMS layers
- No GPS tracking
- 1 module only (Prospecting, limited)

**Explorer — €9.99/month:**
- All 5 modules fully unlocked
- Full gold occurrence data (all 7 tiers)
- All GSI WMS layers
- Unlimited waypoints + photos
- Offline map downloads
- GPS route tracking
- 3D terrain
- Weather layer
- Route builder

**Annual — €79/year:**
- Everything in Explorer
- ~33% saving vs monthly
- Priority support
- Early access to new modules

### Paywall Implementation

- Free users see PRO badge on locked layers/features
- Tapping a locked feature opens the upgrade sheet
- Upgrade sheet: feature list + price + "Subscribe" CTA → Stripe checkout
- On successful subscription: `subscriptions` table updated, `module_access` rows created
- `useSubscription` hook checks status on app load and after payment
- `isPro` boolean gates all premium features throughout app

### Stripe Setup (required in Vercel env vars)

```
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
APP_URL=https://exploreeire.ie
```

---

## WMS Proxy — Hostinger VPS

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

**Why this exists:** GSI WMS servers don't include CORS headers for external domains. The proxy sits between the browser and GSI, bypassing CORS. Vercel (HTTPS) → Proxy (HTTPS via Traefik) → GSI (HTTPS). Mixed content is not an issue.

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

**CRITICAL:** Layer names must be `encodeURIComponent()` encoded in all WMS URLs. The µ ¯ ¹ characters corrupt if not encoded.

---

## Technical Stack

| Component | Decision | Notes |
|---|---|---|
| Frontend | React + Vite | Keep from phase 1 |
| Maps | MapLibre GL JS v4+ | Upgrade for 3D terrain |
| Basemap tiles | MapTiler | Keep — add terrain-rgb |
| Database | Supabase | Keep — add new tables |
| Auth | Supabase Auth | Add Google OAuth |
| Payments | Stripe | Keep — fix webhook |
| State management | Zustand | Replace useState sprawl |
| WMS Proxy | Hostinger VPS + Node | Keep — add caching |
| Offline tiles | MapLibre + IndexedDB | New in phase 2 |
| Native wrapper | Capacitor | New in phase 2 |
| Analytics | Plausible | New — GDPR native |
| Hosting | Vercel | Keep — add custom domain |

---

## Database Schema

### Existing tables (from phase 1)

**gold_samples** (9,313 rows)
```sql
id, sample_id, lat, lng, au_ppb, as_mgkg, pb_mgkg, cu_mgkg,
easting_ing, northing_ing, sample_type, survey, survey_year,
rock_type, rock_desc, rock_age, created_at
```

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

### New tables (phase 2)

**tracks**
```sql
id              uuid PK
user_id         uuid FK → auth.users
name            text
module          text    -- 'prospecting' | 'field_sports' | etc.
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

## Project Structure (Phase 2)

```
explore-eire/
├── index.html
├── vite.config.js
├── package.json
├── CLAUDE.md
├── capacitor.config.ts          ← Capacitor native config
└── src/
    ├── main.jsx
    ├── App.jsx                  ← Root, module routing, global state
    ├── store/
    │   ├── mapStore.js          ← Zustand: map state, layers, basemap
    │   ├── moduleStore.js       ← Zustand: active module, access
    │   └── userStore.js         ← Zustand: auth, subscription, legal
    ├── components/
    │   ├── Map.jsx              ← MapLibre map, all layers
    │   ├── ModuleDashboard.jsx  ← 5 icons, home screen
    │   ├── CategoryHeader.jsx   ← Top strip, module tabs
    │   ├── LayerPanel.jsx       ← Right drawer, filtered by module
    │   ├── SettingsPanel.jsx    ← Left drawer
    │   ├── CornerControls.jsx   ← 4 floating glass buttons
    │   ├── BottomSheet.jsx      ← Reusable sheet component
    │   ├── FindSheet.jsx        ← Nearby discovery
    │   ├── WaypointSheet.jsx    ← Waypoint detail / add
    │   ├── SampleSheet.jsx      ← Data point detail
    │   ├── BasemapPicker.jsx    ← Thumbnail basemap selector
    │   ├── TrackOverlay.jsx     ← Go & Track mode
    │   ├── OfflineManager.jsx   ← Download regions
    │   ├── RouteBuilder.jsx     ← Route planning
    │   ├── UpgradeSheet.jsx     ← Paywall
    │   ├── AuthModal.jsx        ← Sign in / sign up
    │   ├── LegalDisclaimerModal.jsx
    │   └── StatusToast.jsx
    ├── hooks/
    │   ├── useAuth.js
    │   ├── useSubscription.js
    │   ├── useGoldSamples.js    ← Batched Supabase load
    │   ├── useWaypoints.js      ← CRUD + offline queue
    │   ├── useTracks.js         ← GPS recording + save
    │   ├── useOffline.js        ← Tile download management
    │   └── useGeolocation.js    ← Device GPS
    ├── lib/
    │   ├── supabase.js
    │   ├── mapConfig.js         ← WMS URLs, tier colours, basemaps
    │   ├── layerCategories.js   ← Module → layer mapping
    │   └── moduleConfig.js      ← Module definitions, colours, icons
    ├── api/
    │   ├── create-checkout-session.js  ← Vercel serverless
    │   └── stripe-webhook.js           ← Vercel serverless
    └── styles/
        └── global.css           ← CSS variables, base, animations
```

---

## Environment Variables

**Vercel (production):**
```
VITE_MAPTILER_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
STRIPE_PRICE_ID_MONTHLY
STRIPE_PRICE_ID_ANNUAL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

**Local `.env` (never commit):**
```
VITE_MAPTILER_KEY=HPJlwqR1pNmrR3Eyirrv
VITE_SUPABASE_URL=https://dozgrffjwxdzixpfnica.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Legal Disclaimer Content

Must cover exactly these 8 topics:

1. **The Two-Day Rule** — Section 8 Minerals Development Act 2017. Up to 2 consecutive days at one location without a licence.
2. **Land Access** — Majority of Irish land is private. Must have landowner permission. No right to roam.
3. **Protected Areas** — SACs, SPAs, NHAs, National Parks. Prospecting may disturb protected habitats. Check npws.ie.
4. **Archaeological Sites** — Criminal offence to disturb a Recorded Monument. Check maps.archaeology.ie before any digging.
5. **Active Mineral Licences** — Some areas held by exploration companies. Check decc.gov.ie.
6. **Waterways** — River bed/banks may be privately owned. Panning generally tolerated but confirm.
7. **Foreshore** — Intertidal zone (beaches) is State property. Removing material may require foreshore licence.
8. **Disclaimer** — Explore Eire provides geological data for informational purposes only. User is responsible for verifying permissions. Explore Eire accepts no liability for trespass, environmental damage, or breach of any statutory provision.

Footer line: "This is a summary for informational purposes only and does not constitute legal advice."

**Implementation:**
- Full screen on first login, after email verification
- User must scroll to bottom before accept button activates
- Single checkbox: "I understand and accept my legal responsibilities"
- Stored: `profiles.legal_accepted = true`, `legal_accepted_at = now()`
- Permanent Legal page accessible from Settings panel at any time
- Once accepted: never shown again. Not on tab switch, not on refresh. Use `legalFetchedFor` ref pattern to prevent re-fetch loops.

---

## Known Bugs Fixed (do not reintroduce)

1. **RLS policy** must say `to anon, authenticated` — not just `using (true)`
2. **MapLibre click handler** must filter to existing layers only before `queryRenderedFeatures`
3. **GeoJSON** must not be embedded inline in HTML/JS — load from Supabase
4. **encodeURIComponent()** required on all GSI WMS layer names (µ ¯ ¹ corrupt otherwise)
5. **useGoldSamples** loads in batches of 1000 — do not change to single query
6. **Legal disclaimer re-trigger** — use `legalFetchedFor` ref. `onAuthStateChange` fires on tab focus — must not re-run profile fetch if user ID unchanged
7. **GSI layer names** — use `\u00b5` `\u00af` `\u00b9` Unicode escapes, not literal characters (PowerShell corrupts literal special chars when editing)
8. **WMS proxy** — use `req._parsedUrl.query` not `URLSearchParams(req.query)` to pass query params. URLSearchParams re-encodes and corrupts layer names.
9. **node_modules** must be in `.gitignore` — do not commit. Vercel build fails with wrong file permissions.
10. **viewport-fit=cover** required in HTML meta viewport tag for iOS safe area insets to work

---

## Legal Attribution (required in app)

All GSI data CC BY 4.0:
"Contains Irish Public Sector Data (Geological Survey Ireland) licensed under CC BY 4.0"

Minerals Development Act 2017 — State owns all minerals.
Two-day rule applies for recreational prospecting without a licence.

---

## Parked Ideas (revisit post-launch)

- **Explore Eire Realty** — separate platform. Consolidates BIDx1 auction properties, recent foreclosures, full rentals, current sales, room rentals. Map-first property browsing. Uses same map engine. Separate codebase, separate brand, separate subscription. Bank repossessions going to public auction are public record. BIDx1 publishes catalogue openly. Courts Service publishes repossession orders.

- **Interactive globe view** — GPS-centred 3D globe that transitions into flat Ireland map on click. MapLibre v3 globe projection. Parked — non-trivial, not core to MVP.

- **Community finds** — user-submitted waypoints visible to all (with privacy controls). Requires moderation. Phase 3+.

- **CarPlay / Android Auto** — vehicle navigation integration. Phase 3+.

- **Trail reports** — user-submitted condition reports on trails. Phase 3+.

---

## Phase 2 Build Priority Order

1. New repo setup — Explore Eire brand, clean architecture
2. Core map view — full screen, category header, corner controls
3. Module dashboard — 5 icons, lock/unlock logic
4. Auth — Supabase + Google OAuth
5. Legal disclaimer — scroll-to-accept, stored in profiles
6. Prospecting module — migrate all phase 1 gold data and layers
7. Subscription — Stripe, two tiers, paywall gates
8. Waypoints — full flow, camera + GPS + photos
9. GPS tracking — Go & Track
10. 3D terrain — MapLibre terrain-rgb
11. Offline maps — tile download + IndexedDB
12. Find / Discover — nearby data points
13. Basemap picker — visual thumbnails
14. Field Sports module — data sourcing required first
15. Hiking module — data sourcing required first
16. Archaeology module — NMS data integration
17. Coastal module — data sourcing required first
18. Route builder
19. Weather layer
20. Capacitor — native iOS/Android wrapper
21. App Store submission
22. Custom domain — exploreeire.ie
