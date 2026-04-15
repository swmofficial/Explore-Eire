# Explore Eire — Architecture & Design Reference
> Read this file before working on any new component or module.
> For infrastructure, stack, project structure, build state and bug register see CLAUDE.md.

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

**Target users:**
- Person A — Weekend warrior. Drives out Saturday morning. Plans the night before. Needs fast, offline-ready, confidence before leaving the house.
- Person B — Serious hobbyist. Cross-references data layers. Wants depth and precision.
- Person E — Local explorer. Location-aware curiosity. Discovers by exploring the map.

**Design philosophy:** Map first. Data rich. Location aware. Fast everywhere.

**Workflow:** This project is built using **Claude Code** (on Hostinger VPS) and **Claude.ai** in conjunction.
- Claude.ai: groundworking, architecture decisions, planning, design
- Claude Code: implementation only, after decisions are fully mapped
- No code is written until decisions are documented in CLAUDE.md

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
Snap points:   collapsed (peek 80px) → half (45vh) → full (92vh)
Gesture:       transform: translateY — 1:1 drag, 350ms cubic-bezier(0.32,0.72,0,1) snap
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

**GSI WMS Layer Names (exact — special characters matter):**
```
Gold heatmap:    C_FA_ICP-MS_Gold_(Au)_(µg_kg¯¹)59779
Arsenic:         C_XRFS_Arsenic_(As)_(mg_kg¯¹)41362
Lead:            C_XRFS_Lead_(Pb)_(mg_kg¯¹)35511
Bedrock geology: IE_GSI_Bedrock_Geology_100K_IE26_ITM
Geo lines:       IE_GSI_Geological_Lines_100K_IE26_ITM
Boreholes:       IE_GSI_Mineral_Exploration_Boreholes_50K_IE26_ITM
```

**CRITICAL:** Layer names use `\u00b5` `\u00af` `\u00b9` Unicode escapes in `mapConfig.js` (NOT literal characters — PowerShell and some editors corrupt them). Always `encodeURIComponent()` in tile URLs. Never use `URLSearchParams` for WMS tile URL construction — it re-encodes `{bbox-epsg-3857}`.

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
legal_accepted (boolean), legal_accepted_at,
is_pro (boolean),   ← set true by stripe-webhook on checkout.session.completed
created_at
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
