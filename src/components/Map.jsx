// Map.jsx — Full screen MapLibre GL map.
// Renders gold sample circle markers split into 7 per-tier layers + rock-circles.
// Renders WMS raster overlays: gold heatmap, arsenic, lead, bedrock, geo lines, boreholes.
// Renders session GPS trail and pinned session waypoints.
// Click on any gold layer → opens SampleSheet via mapStore.selectedSample.
// Handles basemap switching and 3D terrain toggle from mapStore.
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import useModuleStore from '../store/moduleStore'
import { useGoldSamples } from '../hooks/useGoldSamples'
import { useMineralLocalities } from '../hooks/useMineralLocalities'
import { useWaypoints } from '../hooks/useWaypoints'
import { useTracks } from '../hooks/useTracks'
import {
  BASEMAPS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  GOLD_TIERS,
  GSI_LAYERS,
  TERRAIN_SOURCE,
  TERRAIN_CONFIG,
  MAP_BOUNDS,
} from '../lib/mapConfig'
import CornerControls from './CornerControls'
import DataSheet from './DataSheet'
import SampleSheet from './SampleSheet'
import MineralSheet from './MineralSheet'
import LayerPanel from './LayerPanel'
import BasemapPicker from './BasemapPicker'
import WaypointSheet from './WaypointSheet'
import TrackOverlay from './TrackOverlay'
import FindSheet from './FindSheet'
import RouteBuilder from './RouteBuilder'
import AddFindSheet from './AddFindSheet'

const WMS_PROXY = 'https://srv1566939.hstgr.cloud'

// ── WMS tile URL builder ───────────────────────────────────────────
// Must NOT use URLSearchParams — it would encode {bbox-epsg-3857}.
// STYLES= must be present (even empty) — WMS 1.3.0 requires it; omitting it
// causes GSI to return a ServiceException XML document instead of a PNG tile.
function wmsRasterTileUrl(endpoint, layerName) {
  const L = encodeURIComponent(layerName)
  return (
    `${WMS_PROXY}${endpoint}` +
    `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
    `&FORMAT=image%2Fpng&TRANSPARENT=true` +
    `&LAYERS=${L}&STYLES=` +
    `&WIDTH=256&HEIGHT=256` +
    `&CRS=EPSG%3A3857` +
    `&BBOX={bbox-epsg-3857}`
  )
}

// ── Weather (Met Éireann rainfall radar) tile URL ─────────────────
// bust: optional cache-buster appended as _t=<timestamp> to force re-fetch
function weatherTileUrl(bust = '') {
  return (
    `${WMS_PROXY}/wms/met` +
    `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
    `&FORMAT=image%2Fpng&TRANSPARENT=true` +
    `&LAYERS=rainfall_radar&STYLES=` +
    `&WIDTH=256&HEIGHT=256` +
    `&CRS=EPSG%3A3857` +
    `&BBOX={bbox-epsg-3857}` +
    (bust ? `&_t=${bust}` : '')
  )
}

// Removes and re-adds the rainfall radar source+layer with a fresh cache-bust URL.
// Called by the auto-refresh interval so MapLibre fetches updated tiles.
function refreshWeatherLayer(map) {
  const visible = map.getLayer('wms-rainfall-radar')
  if (visible) map.removeLayer('wms-rainfall-radar')
  if (map.getSource('src-rainfall-radar')) map.removeSource('src-rainfall-radar')

  map.addSource('src-rainfall-radar', {
    type: 'raster',
    tiles: [weatherTileUrl(Date.now())],
    tileSize: 256,
  })
  map.addLayer({
    id: 'wms-rainfall-radar',
    type: 'raster',
    source: 'src-rainfall-radar',
    layout: { visibility: 'visible' },
    paint: { 'raster-opacity': 0.7 },
  })
  useMapStore.getState().setWeatherLastUpdated(new Date().toISOString())
}

// ── Tier config — 7 layers, each with a MapLibre filter expression ─
const TIER_LAYERS = [
  {
    id: 'gold-t1',
    color: '#67000d',
    filter: ['>=', ['get', 'au_ppb'], 500],
  },
  {
    id: 'gold-t2',
    color: '#cb181d',
    filter: ['all', ['>=', ['get', 'au_ppb'], 100], ['<', ['get', 'au_ppb'], 500]],
  },
  {
    id: 'gold-t3',
    color: '#fc4e2a',
    filter: ['all', ['>=', ['get', 'au_ppb'], 50], ['<', ['get', 'au_ppb'], 100]],
  },
  {
    id: 'gold-t4',
    color: '#fd8d3c',
    filter: ['all', ['>=', ['get', 'au_ppb'], 10], ['<', ['get', 'au_ppb'], 50]],
  },
  {
    id: 'gold-t5',
    color: '#fecc5c',
    filter: ['all', ['>=', ['get', 'au_ppb'], 5], ['<', ['get', 'au_ppb'], 10]],
  },
  {
    id: 'gold-t6',
    color: '#ffffb2',
    filter: ['all', ['>=', ['get', 'au_ppb'], 2], ['<', ['get', 'au_ppb'], 5]],
  },
  {
    id: 'gold-t7',
    color: '#74c476',
    filter: ['<', ['get', 'au_ppb'], 2],
  },
]

// Which tier layers are shown for each filter state
const TIER_FILTER_GROUPS = {
  all:         ['gold-t1', 'gold-t2', 'gold-t3', 'gold-t4', 'gold-t5', 'gold-t6', 'gold-t7'],
  exceptional: ['gold-t1', 'gold-t2'],
  high:        ['gold-t3', 'gold-t4'],
  significant: ['gold-t4', 'gold-t5'],
}

// WMS store key → map layer id
const WMS_LAYER_MAP = {
  gold_heatmap: 'wms-gold-heatmap',
  arsenic:      'wms-arsenic',
  lead:         'wms-lead',
  bedrock:      'wms-bedrock',
  geo_lines:    'wms-geo-lines',
  boreholes:    'wms-boreholes',
}

const WMS_SOURCES = {
  gold_heatmap: { sourceId: 'src-gold-heatmap', endpoint: '/wms/geo', layerName: GSI_LAYERS.goldHeatmap, opacity: 0.75 },
  arsenic:      { sourceId: 'src-arsenic',      endpoint: '/wms/geo', layerName: GSI_LAYERS.arsenic,    opacity: 0.75 },
  lead:         { sourceId: 'src-lead',          endpoint: '/wms/geo', layerName: GSI_LAYERS.lead,       opacity: 0.75 },
  bedrock:      { sourceId: 'src-bedrock',       endpoint: '/wms/bed', layerName: GSI_LAYERS.bedrock,    opacity: 0.65 },
  geo_lines:    { sourceId: 'src-geo-lines',     endpoint: '/wms/bed', layerName: GSI_LAYERS.geoLines,   opacity: 0.75 },
  boreholes:    { sourceId: 'src-boreholes',     endpoint: '/wms/bore', layerName: GSI_LAYERS.boreholes, opacity: 0.85 },
}

// ── Mineral locality layers — one per category ─────────────────────
const MINERAL_LAYERS = [
  { id: 'mineral-gold',      category: 'gold',      color: '#E8C96A' },
  { id: 'mineral-copper',    category: 'copper',    color: '#E8844A' },
  { id: 'mineral-lead',      category: 'lead',      color: '#9B9B9B' },
  { id: 'mineral-uranium',   category: 'uranium',   color: '#7FBA00' },
  { id: 'mineral-quartz',    category: 'quartz',    color: '#E8EAF0' },
  { id: 'mineral-silver',    category: 'silver',    color: '#C0C0C0' },
  { id: 'mineral-marble',    category: 'marble',    color: '#4AC0A0' },
  { id: 'mineral-fluorspar', category: 'fluorspar', color: '#A06BE8' },
  { id: 'mineral-other',     category: null,        color: '#6B7280' },
]

const MINERAL_KNOWN_CATEGORIES = ['gold', 'copper', 'lead', 'uranium', 'quartz', 'silver', 'marble', 'fluorspar']

// ── GeoJSON helpers ────────────────────────────────────────────────

function isRockSample(s) {
  return (
    (s.sample_type && s.sample_type.toLowerCase().includes('rock')) ||
    (s.survey && s.survey.toLowerCase().includes('litho'))
  )
}

function sampleProperties(s) {
  return {
    id: s.id,
    sample_id: s.sample_id ?? null,
    au_ppb: s.au_ppb ?? 0,
    as_mgkg: s.as_mgkg ?? null,
    pb_mgkg: s.pb_mgkg ?? null,
    sample_type: s.sample_type ?? null,
    survey: s.survey ?? null,
    easting_ing: s.easting_ing ?? null,
    northing_ing: s.northing_ing ?? null,
    rock_type: s.rock_type ?? null,
    rock_desc: s.rock_desc ?? null,
    lat: s.lat,
    lng: s.lng,
  }
}

function buildStreamGeoJSON(samples) {
  return {
    type: 'FeatureCollection',
    features: samples
      .filter((s) => !isRockSample(s))
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: sampleProperties(s),
      })),
  }
}

function buildRockGeoJSON(samples) {
  return {
    type: 'FeatureCollection',
    features: samples
      .filter((s) => isRockSample(s))
      .map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
        properties: sampleProperties(s),
      })),
  }
}

function buildTrailGeoJSON(trail) {
  return {
    type: 'FeatureCollection',
    features: trail.map((pt) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
      properties: {},
    })),
  }
}

function buildTrailLineGeoJSON(trail) {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: trail.length >= 2 ? trail.map((p) => [p.lng, p.lat]) : [],
    },
  }
}

function buildWaypointGeoJSON(waypoints) {
  return {
    type: 'FeatureCollection',
    features: waypoints.map((wp) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
      properties: { name: wp.name ?? '' },
    })),
  }
}

function buildMineralGeoJSON(localities) {
  return {
    type: 'FeatureCollection',
    features: localities
      .filter((loc) => loc.lat != null && loc.lng != null)
      .map((loc) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
        properties: {
          id: loc.id,
          minlocno: loc.minlocno ?? null,
          mineral: loc.mineral ?? null,
          mineral_category: loc.mineral_category ?? null,
          townland: loc.townland ?? null,
          county: loc.county ?? null,
          description: loc.description ?? null,
          notes: loc.notes ?? null,
          lat: loc.lat,
          lng: loc.lng,
        },
      })),
  }
}

function buildSavedWaypointGeoJSON(waypoints) {
  return {
    type: 'FeatureCollection',
    features: waypoints.map((wp) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
      properties: {
        id: wp.id,
        name: wp.name ?? '',
        icon: wp.icon ?? 'prospect',
        description: wp.description ?? '',
        lat: wp.lat,
        lng: wp.lng,
        photos_json: JSON.stringify(wp.photos ?? []),
      },
    })),
  }
}

// ── addDataLayers ──────────────────────────────────────────────────
// Adds all sources + layers to the map. Safe to call after setStyle()
// because style.load clears all sources/layers, so getSource checks
// will always pass through after a style change.
function addDataLayers(map, initialSamples = [], initialSavedWaypoints = []) {
  // WMS raster sources + layers (all initially hidden)
  for (const [key, cfg] of Object.entries(WMS_SOURCES)) {
    const { sourceId, endpoint, layerName, opacity } = cfg
    const layerId = WMS_LAYER_MAP[key]
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'raster',
        tiles: [wmsRasterTileUrl(endpoint, layerName)],
        tileSize: 256,
      })
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'raster',
        source: sourceId,
        layout: { visibility: 'none' },
        paint: { 'raster-opacity': opacity },
      })
    }
  }

  // Stream sediment source
  if (!map.getSource('stream-samples')) {
    map.addSource('stream-samples', {
      type: 'geojson',
      data: buildStreamGeoJSON(initialSamples),
    })
  }

  // 7 tier circle layers — added t7→t1 so higher tiers render on top
  for (let i = TIER_LAYERS.length - 1; i >= 0; i--) {
    const t = TIER_LAYERS[i]
    if (!map.getLayer(t.id)) {
      map.addLayer({
        id: t.id,
        type: 'circle',
        source: 'stream-samples',
        filter: t.filter,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            5, 2.5,
            10, 5,
            14, 9,
          ],
          'circle-color': t.color,
          'circle-stroke-color': 'rgba(0,0,0,0.35)',
          'circle-stroke-width': 0.75,
          'circle-opacity': 0.92,
        },
        layout: { visibility: 'visible' },
      })
    }
  }

  // Rock samples source + layer
  if (!map.getSource('rock-samples')) {
    map.addSource('rock-samples', {
      type: 'geojson',
      data: buildRockGeoJSON(initialSamples),
    })
  }
  if (!map.getLayer('rock-circles')) {
    map.addLayer({
      id: 'rock-circles',
      type: 'circle',
      source: 'rock-samples',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, 3,
          10, 6,
          14, 10,
        ],
        'circle-color': [
          'step', ['get', 'au_ppb'],
          '#74c476', 2, '#ffffb2', 5, '#fecc5c', 10, '#fd8d3c',
          50, '#fc4e2a', 100, '#cb181d', 500, '#67000d',
        ],
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 1.5,
        'circle-opacity': 0.88,
      },
      layout: { visibility: 'none' },
    })
  }

  // Session trail polyline (LineString connecting GPS points)
  if (!map.getSource('session-line-src')) {
    map.addSource('session-line-src', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
    })
  }
  if (!map.getLayer('session-trail-line')) {
    map.addLayer({
      id: 'session-trail-line',
      type: 'line',
      source: 'session-line-src',
      paint: {
        'line-color': '#E8C96A',
        'line-width': 3,
        'line-opacity': 0.9,
        'line-dasharray': [2, 3],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
  }

  // Session trail (individual GPS point dots — render on top of the line)
  if (!map.getSource('session-trail')) {
    map.addSource('session-trail', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('session-dots')) {
    map.addLayer({
      id: 'session-dots',
      type: 'circle',
      source: 'session-trail',
      paint: {
        'circle-radius': 4,
        'circle-color': '#E8C96A',
        'circle-stroke-color': 'rgba(0,0,0,0.3)',
        'circle-stroke-width': 1,
        'circle-opacity': 0.88,
      },
    })
  }

  // Session waypoints
  if (!map.getSource('session-waypoints-src')) {
    map.addSource('session-waypoints-src', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('session-waypoints')) {
    map.addLayer({
      id: 'session-waypoints',
      type: 'circle',
      source: 'session-waypoints-src',
      paint: {
        'circle-radius': 8,
        'circle-color': '#E8C96A',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2,
        'circle-opacity': 1,
      },
    })
  }

  // Saved (persisted) waypoints — tappable, distinct from session dots
  if (!map.getSource('saved-waypoints-src')) {
    map.addSource('saved-waypoints-src', {
      type: 'geojson',
      data: buildSavedWaypointGeoJSON(initialSavedWaypoints),
    })
  }
  if (!map.getLayer('saved-waypoints-circles')) {
    map.addLayer({
      id: 'saved-waypoints-circles',
      type: 'circle',
      source: 'saved-waypoints-src',
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          5, 6, 10, 10, 14, 14,
        ],
        'circle-color': '#E8C96A',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2.5,
        'circle-opacity': 1,
      },
    })
  }

  // Route builder — dashed gold polyline + numbered point dots
  if (!map.getSource('route-builder-src')) {
    map.addSource('route-builder-src', {
      type: 'geojson',
      data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } },
    })
  }
  if (!map.getLayer('route-builder-line')) {
    map.addLayer({
      id: 'route-builder-line',
      type: 'line',
      source: 'route-builder-src',
      paint: {
        'line-color': '#E8C96A',
        'line-width': 2.5,
        'line-opacity': 0.9,
        'line-dasharray': [4, 2],
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    })
  }
  if (!map.getSource('route-points-src')) {
    map.addSource('route-points-src', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  if (!map.getLayer('route-builder-dots')) {
    map.addLayer({
      id: 'route-builder-dots',
      type: 'circle',
      source: 'route-points-src',
      paint: {
        'circle-radius': 7,
        'circle-color': '#E8C96A',
        'circle-stroke-color': '#FFFFFF',
        'circle-stroke-width': 2,
        'circle-opacity': 1,
      },
    })
  }

  // Weather — Met Éireann rainfall radar (no Pro gate, available to all users)
  if (!map.getSource('src-rainfall-radar')) {
    map.addSource('src-rainfall-radar', {
      type: 'raster',
      tiles: [weatherTileUrl()],
      tileSize: 256,
    })
  }
  if (!map.getLayer('wms-rainfall-radar')) {
    map.addLayer({
      id: 'wms-rainfall-radar',
      type: 'raster',
      source: 'src-rainfall-radar',
      layout: { visibility: 'none' },
      paint: { 'raster-opacity': 0.7 },
    })
  }

  // Mineral locality source + one circle layer per category
  if (!map.getSource('mineral-localities')) {
    map.addSource('mineral-localities', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }
  for (const layer of MINERAL_LAYERS) {
    if (!map.getLayer(layer.id)) {
      const filter = layer.category
        ? ['==', ['downcase', ['coalesce', ['get', 'mineral_category'], '']], layer.category]
        : ['!', ['in', ['downcase', ['coalesce', ['get', 'mineral_category'], '']], ['literal', MINERAL_KNOWN_CATEGORIES]]]
      map.addLayer({
        id: layer.id,
        type: 'circle',
        source: 'mineral-localities',
        filter,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            5, 3,
            10, 5,
            14, 8,
          ],
          'circle-color': layer.color,
          'circle-stroke-color': 'rgba(0,0,0,0.35)',
          'circle-stroke-width': 0.75,
          'circle-opacity': 0.8,
        },
        layout: { visibility: 'none' },
      })
    }
  }
}

// ── syncLayerVisibility ────────────────────────────────────────────
// Reads current state from Zustand directly so it can be called from
// style.load callbacks where React state closures are stale.
function syncLayerVisibility(map) {
  const { layerVisibility, tierFilter } = useMapStore.getState()
  const { isPro } = useUserStore.getState()

  const streamOn = layerVisibility.stream_sediment !== false

  if (!isPro) {
    const FREE_TIERS = new Set(['gold-t6', 'gold-t7'])
    for (const t of TIER_LAYERS) {
      if (!map.getLayer(t.id)) continue
      map.setLayoutProperty(
        t.id,
        'visibility',
        streamOn && FREE_TIERS.has(t.id) ? 'visible' : 'none'
      )
    }
    for (const layerId of Object.values(WMS_LAYER_MAP)) {
      if (!map.getLayer(layerId)) continue
      map.setLayoutProperty(layerId, 'visibility', 'none')
    }
  } else {
    const visibleTiers = TIER_FILTER_GROUPS[tierFilter] ?? TIER_FILTER_GROUPS.all
    for (const t of TIER_LAYERS) {
      if (!map.getLayer(t.id)) continue
      map.setLayoutProperty(
        t.id,
        'visibility',
        streamOn && visibleTiers.includes(t.id) ? 'visible' : 'none'
      )
    }
    for (const [storeKey, layerId] of Object.entries(WMS_LAYER_MAP)) {
      if (!map.getLayer(layerId)) continue
      map.setLayoutProperty(
        layerId,
        'visibility',
        layerVisibility[storeKey] === true ? 'visible' : 'none'
      )
    }
  }

  if (map.getLayer('rock-circles')) {
    map.setLayoutProperty(
      'rock-circles',
      'visibility',
      layerVisibility.rock_samples === true ? 'visible' : 'none'
    )
  }

  // Saved waypoints visibility toggle
  const { showWaypoints } = useMapStore.getState()
  if (map.getLayer('saved-waypoints-circles')) {
    map.setLayoutProperty('saved-waypoints-circles', 'visibility', showWaypoints ? 'visible' : 'none')
  }

  // Rainfall radar — no Pro gate, available to all users
  if (map.getLayer('wms-rainfall-radar')) {
    map.setLayoutProperty(
      'wms-rainfall-radar',
      'visibility',
      layerVisibility.rainfall_radar === true ? 'visible' : 'none'
    )
  }

  // Mineral locality layers — only show the active category, and only in prospecting module
  const { activeModule } = useModuleStore.getState()
  const { activeMineralCategory } = useMapStore.getState()
  for (const layer of MINERAL_LAYERS) {
    if (!map.getLayer(layer.id)) continue
    let visible = false
    if (activeModule === 'prospecting' && activeMineralCategory !== null) {
      if (layer.category === null) {
        // 'other' catches categories not in the known list
        visible = !MINERAL_KNOWN_CATEGORIES.includes(activeMineralCategory)
      } else {
        visible = layer.category === activeMineralCategory
      }
    }
    map.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none')
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function Map() {
  const containerRef        = useRef(null)
  const mapRef              = useRef(null)
  const mapLoadedRef        = useRef(false)
  const locationMarkerRef   = useRef(null)
  const locationWatchRef    = useRef(null)
  const samplesRef             = useRef([])
  const sessionTrailRef        = useRef([])
  const sessionWaypointsRef    = useRef([])
  const savedWaypointsRef      = useRef([])
  const mineralLocalitiesRef   = useRef([])
  const routePointsRef         = useRef([])
  const is3DRef                = useRef(false)
  const weatherRefreshRef      = useRef(null)

  const {
    setMapInstance, setUserLocation,
    layerVisibility,
    tierFilter,
    sessionTrail,
    sessionWaypoints,
    setSelectedSample,
    setSelectedMineral,
    basemap,
    is3D,
    activeMineralCategory,
    routePoints,
    routeBuilderOpen,
    showWaypoints,
    addFindSheetOpen,
    setAddFindSheetOpen,
    isTracking,
  } = useMapStore()
  const { isPro, isGuest, setShowUpgradeSheet } = useUserStore()
  const { activeModule } = useModuleStore()

  const { samples } = useGoldSamples()
  const { localities } = useMineralLocalities()
  const { savedWaypoints, addWaypoint, deleteWaypoint } = useWaypoints()
  const { startTracking, stopTracking, saveTrack } = useTracks()

  // Keep refs in sync for use in style.load callbacks
  samplesRef.current = samples
  sessionTrailRef.current = sessionTrail
  sessionWaypointsRef.current = sessionWaypoints
  savedWaypointsRef.current = savedWaypoints
  mineralLocalitiesRef.current = localities
  routePointsRef.current = routePoints
  is3DRef.current = is3D

  // ── Map initialisation (runs once) ────────────────────────────
  useEffect(() => {
    if (mapRef.current) return

    const initialStyle =
      BASEMAPS[useMapStore.getState().basemap]?.styleUrl ?? BASEMAPS.outdoor.styleUrl

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
      ...MAP_BOUNDS,
    })

    map.on('error', (e) => {
      console.error('[Map] error:', e.error?.message ?? e)
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    // Custom user location dot — always visible once GPS acquired
    const markerEl = document.createElement('div')
    markerEl.className = 'user-location-marker'
    markerEl.style.display = 'none'
    const ring = document.createElement('div')
    ring.className = 'user-location-dot-ring'
    const dot = document.createElement('div')
    dot.className = 'user-location-dot-inner'
    markerEl.appendChild(ring)
    markerEl.appendChild(dot)
    const locationMarker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
      .setLngLat([0, 0])
      .addTo(map)
    locationMarkerRef.current = locationMarker

    locationWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        locationMarkerRef.current?.setLngLat([longitude, latitude])
        markerEl.style.display = 'block'
        useMapStore.getState().setUserLocation({ lat: latitude, lng: longitude })
      },
      (err) => { console.warn('[Map] geolocation:', err.message) },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )

    map.on('load', () => {
      addDataLayers(map, samplesRef.current)
      mapLoadedRef.current = true
      setMapInstance(map)
      syncLayerVisibility(map)

      // ── Click handler ─────────────────────────────────────────
      const clickableLayers = [...TIER_LAYERS.map((t) => t.id), 'rock-circles']
      const mineralLayerIds = MINERAL_LAYERS.map((l) => l.id)

      map.on('click', (e) => {
        // Saved waypoints take priority (rendered on top of sample circles)
        if (map.getLayer('saved-waypoints-circles')) {
          const wpFeatures = map.queryRenderedFeatures(e.point, { layers: ['saved-waypoints-circles'] })
          if (wpFeatures.length) {
            const p = wpFeatures[0].properties
            useMapStore.getState().setWaypointSheet({
              mode: 'view',
              waypoint: {
                id: p.id,
                name: p.name,
                icon: p.icon,
                description: p.description,
                lat: p.lat,
                lng: p.lng,
                photos: JSON.parse(p.photos_json || '[]'),
              },
            })
            return
          }
        }

        // Mineral locality layers
        const existingMineralLayers = mineralLayerIds.filter((id) => map.getLayer(id))
        if (existingMineralLayers.length) {
          const mineralFeatures = map.queryRenderedFeatures(e.point, { layers: existingMineralLayers })
          if (mineralFeatures.length) {
            const p = mineralFeatures[0].properties
            useMapStore.getState().setSelectedMineral({
              id: p.id,
              minlocno: p.minlocno,
              mineral: p.mineral,
              mineral_category: p.mineral_category,
              townland: p.townland,
              county: p.county,
              description: p.description,
              notes: p.notes,
              lat: p.lat,
              lng: p.lng,
            })
            return
          }
        }

        // Gold sample layers
        const existing = clickableLayers.filter((id) => map.getLayer(id))
        if (!existing.length) return
        const features = map.queryRenderedFeatures(e.point, { layers: existing })
        if (!features.length) return
        const p = features[0].properties
        setSelectedSample({
          id: p.id,
          sample_id: p.sample_id,
          au_ppb: p.au_ppb ?? 0,
          as_mgkg: p.as_mgkg,
          pb_mgkg: p.pb_mgkg,
          sample_type: p.sample_type,
          survey: p.survey,
          easting_ing: p.easting_ing,
          northing_ing: p.northing_ing,
          rock_type: p.rock_type,
          rock_desc: p.rock_desc,
          lat: p.lat,
          lng: p.lng,
        })
      })

      for (const id of [...clickableLayers, 'saved-waypoints-circles', ...mineralLayerIds]) {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
      }

      // Long-press (contextmenu) drops a route point when RouteBuilder is open
      map.on('contextmenu', (e) => {
        const { routeBuilderOpen: isBuilding, addRoutePoint } = useMapStore.getState()
        const { isPro: pro } = useUserStore.getState()
        if (!isBuilding || !pro) return
        e.preventDefault()
        addRoutePoint({ lat: e.lngLat.lat, lng: e.lngLat.lng, id: crypto.randomUUID() })
      })

    })

    mapRef.current = map

    return () => {
      if (locationWatchRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchRef.current)
        locationWatchRef.current = null
      }
      locationMarkerRef.current?.remove()
      locationMarkerRef.current = null
      setMapInstance(null)
      mapLoadedRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [setMapInstance, setSelectedSample, setUserLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Basemap switching ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    const styleUrl = BASEMAPS[basemap]?.styleUrl
    if (!styleUrl) return

    mapLoadedRef.current = false
    map.setStyle(styleUrl)

    map.once('style.load', () => {
      // Re-add terrain source FIRST if 3D was active (must precede data layers)
      if (is3DRef.current) {
        if (!map.getSource('terrain')) {
          map.addSource('terrain', TERRAIN_SOURCE)
        }
        map.setTerrain(TERRAIN_CONFIG)
      }

      addDataLayers(map, samplesRef.current, savedWaypointsRef.current)

      // Restore current data into sources
      map.getSource('stream-samples')?.setData(buildStreamGeoJSON(samplesRef.current))
      map.getSource('rock-samples')?.setData(buildRockGeoJSON(samplesRef.current))
      map.getSource('session-trail')?.setData(buildTrailGeoJSON(sessionTrailRef.current))
      map.getSource('session-line-src')?.setData(buildTrailLineGeoJSON(sessionTrailRef.current))
      map.getSource('session-waypoints-src')?.setData(buildWaypointGeoJSON(sessionWaypointsRef.current))
      map.getSource('saved-waypoints-src')?.setData(buildSavedWaypointGeoJSON(savedWaypointsRef.current))
      map.getSource('mineral-localities')?.setData(buildMineralGeoJSON(mineralLocalitiesRef.current))
      map.getSource('route-builder-src')?.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routePointsRef.current.length >= 2
            ? routePointsRef.current.map((p) => [p.lng, p.lat])
            : [],
        },
      })
      map.getSource('route-points-src')?.setData({
        type: 'FeatureCollection',
        features: routePointsRef.current.map((pt) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
          properties: { id: pt.id },
        })),
      })

      syncLayerVisibility(map)
      mapLoadedRef.current = true
    })
  }, [basemap]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 3D terrain toggle ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    if (is3D) {
      if (!map.getSource('terrain')) {
        map.addSource('terrain', TERRAIN_SOURCE)
      }
      map.setTerrain(TERRAIN_CONFIG)
    } else {
      map.setTerrain(null)
    }
  }, [is3D])

  // ── Update sample sources when data loads ──────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    map.getSource('stream-samples')?.setData(buildStreamGeoJSON(samples))
    map.getSource('rock-samples')?.setData(buildRockGeoJSON(samples))
  }, [samples])

  // ── Update mineral locality source when data loads ─────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    map.getSource('mineral-localities')?.setData(buildMineralGeoJSON(localities))
  }, [localities])

  // ── Sync all layer visibility ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    syncLayerVisibility(map)
  }, [layerVisibility, tierFilter, isPro, activeModule, activeMineralCategory, showWaypoints])

  // ── Update session trail (dots + connecting polyline) ─────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    map.getSource('session-trail')?.setData(buildTrailGeoJSON(sessionTrail))
    map.getSource('session-line-src')?.setData(buildTrailLineGeoJSON(sessionTrail))
  }, [sessionTrail])

  // ── Update session waypoints ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    map.getSource('session-waypoints-src')?.setData(buildWaypointGeoJSON(sessionWaypoints))
  }, [sessionWaypoints])

  // ── Sync saved (persisted) waypoints to map source ─────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    map.getSource('saved-waypoints-src')?.setData(buildSavedWaypointGeoJSON(savedWaypoints))
  }, [savedWaypoints])

  // ── Update route builder sources when points change ────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    map.getSource('route-builder-src')?.setData({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: routePoints.length >= 2 ? routePoints.map((p) => [p.lng, p.lat]) : [],
      },
    })
    map.getSource('route-points-src')?.setData({
      type: 'FeatureCollection',
      features: routePoints.map((pt) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [pt.lng, pt.lat] },
        properties: { id: pt.id },
      })),
    })
  }, [routePoints])

  // ── Weather auto-refresh (every 5 minutes while layer is on) ───
  useEffect(() => {
    const radarOn = layerVisibility.rainfall_radar === true
    if (!radarOn) {
      clearInterval(weatherRefreshRef.current)
      weatherRefreshRef.current = null
      return
    }
    // Record "now" as the initial fetch time when the layer is switched on
    useMapStore.getState().setWeatherLastUpdated(new Date().toISOString())
    weatherRefreshRef.current = setInterval(() => {
      const m = mapRef.current
      if (m && mapLoadedRef.current) refreshWeatherLayer(m)
    }, 5 * 60 * 1000)
    return () => {
      clearInterval(weatherRefreshRef.current)
      weatherRefreshRef.current = null
    }
  }, [layerVisibility.rainfall_radar]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTrackPress() {
    if (!isPro || isGuest) {
      setShowUpgradeSheet(true)
    } else {
      startTracking()
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '64px' }}
      />

      {/* Floating Go & Track pill — top centre, below category header */}
      {!isTracking && (
        <button
          onClick={handleTrackPress}
          aria-label="Go & Track"
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#E8C96A',
            color: '#1A1D2E',
            border: 'none',
            borderRadius: 24,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(232,201,106,0.45)',
            WebkitTapHighlightColor: 'transparent',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="10" r="5" stroke="#1A1D2E" strokeWidth="1.4"/>
            <path d="M6 1.5h4" stroke="#1A1D2E" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M8 1.5v2.5" stroke="#1A1D2E" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M8 10V7.5" stroke="#1A1D2E" strokeWidth="1.4" strokeLinecap="round"/>
            <path d="M8 10l1.8 1.1" stroke="#1A1D2E" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Go &amp; Track
        </button>
      )}

      <CornerControls />
      <TrackOverlay onStop={stopTracking} onSave={saveTrack} />
      <DataSheet />
      <SampleSheet />
      <MineralSheet />
      <LayerPanel />
      <BasemapPicker />
      <WaypointSheet addWaypoint={addWaypoint} deleteWaypoint={deleteWaypoint} />
      <FindSheet />
      <RouteBuilder />
      {addFindSheetOpen && <AddFindSheet onClose={() => setAddFindSheetOpen(false)} />}
    </div>
  )
}
