// mapConfig.js — WMS URLs, tier colours, basemap definitions

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
const WMS_PROXY = 'https://srv1566939.hstgr.cloud'

// ── Basemap tile styles ────────────────────────────────────────
export const BASEMAPS = {
  outdoor: {
    id: 'outdoor',
    label: 'Outdoor',
    styleUrl: `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`,
    thumbnail: null, // set once assets are available
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    styleUrl: `https://api.maptiler.com/maps/satellite/style.json?key=${MAPTILER_KEY}`,
    thumbnail: null,
  },
  topo: {
    id: 'topo',
    label: 'Topo',
    styleUrl: `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`,
    thumbnail: null,
  },
}

// ── Terrain source (MapLibre 3D) ───────────────────────────────
export const TERRAIN_SOURCE = {
  type: 'raster-dem',
  url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${MAPTILER_KEY}`,
  tileSize: 256,
}

export const TERRAIN_CONFIG = {
  source: 'terrain',
  exaggeration: 1.5,
}

// ── Ireland default view ───────────────────────────────────────
export const DEFAULT_CENTER = [-8.2, 53.4] // lon, lat
export const DEFAULT_ZOOM   = 7

// ── Map bounds — constrain to Ireland / British Isles area ─────
export const MAP_BOUNDS = {
  maxBounds: [[-12.0, 49.5], [2.5, 61.5]],
  minZoom: 5,
  maxZoom: 18,
}

// ── Gold tier colour scale ─────────────────────────────────────
export const GOLD_TIERS = [
  { id: 't1', label: 'Exceptional', range: '>500 ppb',  min: 500, max: 1e9,  color: '#67000d' },
  { id: 't2', label: 'Very high',   range: '>100 ppb',  min: 100, max: 500,  color: '#cb181d' },
  { id: 't3', label: 'High',        range: '>50 ppb',   min: 50,  max: 100,  color: '#fc4e2a' },
  { id: 't4', label: 'Significant', range: '>10 ppb',   min: 10,  max: 50,   color: '#fd8d3c' },
  { id: 't5', label: 'Anomalous',   range: '>5 ppb',    min: 5,   max: 10,   color: '#fecc5c' },
  { id: 't6', label: 'Low',         range: '>2 ppb',    min: 2,   max: 5,    color: '#ffffb2' },
  { id: 't7', label: 'Background',  range: '<2 ppb',    min: 0,   max: 2,    color: '#74c476' },
]

// ── GSI WMS layer names — must be encodeURIComponent() encoded in URLs ─
export const GSI_LAYERS = {
  goldHeatmap: 'C_FA_ICP-MS_Gold_(Au)_(\u00b5g_kg\u00af\u00b9)59779',
  arsenic:     'C_XRFS_Arsenic_(As)_(mg_kg\u00af\u00b9)41362',
  lead:        'C_XRFS_Lead_(Pb)_(mg_kg\u00af\u00b9)35511',
  bedrock:     'IE_GSI_Bedrock_Geology_100K_IE26_ITM',
  geoLines:    'IE_GSI_Geological_Lines_100K_IE26_ITM',
  boreholes:   'IE_GSI_Mineral_Exploration_Boreholes_50K_IE26_ITM',
}

// ── WMS proxy URL builder ──────────────────────────────────────
export function buildWmsUrl(endpoint, layerName, extraParams = {}) {
  const base = `${WMS_PROXY}${endpoint}`
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    LAYERS: encodeURIComponent(layerName),
    ...extraParams,
  })
  return `${base}?${params.toString()}`
}
