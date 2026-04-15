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
import { useGoldSamples } from '../hooks/useGoldSamples'
import { useWaypoints } from '../hooks/useWaypoints'
import {
  BASEMAPS,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  GOLD_TIERS,
  GSI_LAYERS,
  TERRAIN_SOURCE,
  TERRAIN_CONFIG,
} from '../lib/mapConfig'
import CategoryHeader from './CategoryHeader'
import CornerControls from './CornerControls'
import DataSheet from './DataSheet'
import SampleSheet from './SampleSheet'
import LayerPanel from './LayerPanel'
import BasemapPicker from './BasemapPicker'
import WaypointSheet from './WaypointSheet'

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

function buildSavedWaypointGeoJSON(waypoints) {
  return {
    type: 'FeatureCollection',
    features: waypoints.map((wp) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [wp.lng, wp.lat] },
      properties: {
        id: wp.id,
        name: wp.name ?? '',
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

  // Session trail
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
        'circle-color': '#4B8BE8',
        'circle-stroke-color': 'rgba(255,255,255,0.45)',
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
}

// ── Component ──────────────────────────────────────────────────────

export default function Map({ onHome }) {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const geolocateRef  = useRef(null)
  const mapLoadedRef  = useRef(false)
  const samplesRef          = useRef([])
  const sessionTrailRef     = useRef([])
  const sessionWaypointsRef = useRef([])
  const savedWaypointsRef   = useRef([])
  const is3DRef       = useRef(false)

  const {
    setMapInstance,
    layerVisibility,
    tierFilter,
    sessionTrail,
    sessionWaypoints,
    setSelectedSample,
    basemap,
    is3D,
  } = useMapStore()
  const { isPro } = useUserStore()

  const { samples } = useGoldSamples()
  const { savedWaypoints, addWaypoint, deleteWaypoint } = useWaypoints()

  // Keep refs in sync for use in style.load callbacks
  samplesRef.current = samples
  sessionTrailRef.current = sessionTrail
  sessionWaypointsRef.current = sessionWaypoints
  savedWaypointsRef.current = savedWaypoints
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
    })

    map.on('error', (e) => {
      console.error('[Map] error:', e.error?.message ?? e)
    })

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    })
    map.addControl(geolocate, 'bottom-right')
    geolocateRef.current = geolocate

    map.on('load', () => {
      addDataLayers(map, samplesRef.current)
      mapLoadedRef.current = true
      setMapInstance(map)
      syncLayerVisibility(map)

      // ── Click handler ─────────────────────────────────────────
      const clickableLayers = [...TIER_LAYERS.map((t) => t.id), 'rock-circles']

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
                description: p.description,
                lat: p.lat,
                lng: p.lng,
                photos: JSON.parse(p.photos_json || '[]'),
              },
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

      for (const id of [...clickableLayers, 'saved-waypoints-circles']) {
        map.on('mouseenter', id, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', id, () => { map.getCanvas().style.cursor = '' })
      }

      try { geolocate.trigger() } catch { /* GPS unavailable */ }
    })

    mapRef.current = map

    return () => {
      setMapInstance(null)
      mapLoadedRef.current = false
      map.remove()
      mapRef.current = null
    }
  }, [setMapInstance, setSelectedSample]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Basemap switching ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    const styleUrl = BASEMAPS[basemap]?.styleUrl
    if (!styleUrl) return

    mapLoadedRef.current = false
    map.setStyle(styleUrl)

    map.once('style.load', () => {
      addDataLayers(map, samplesRef.current, savedWaypointsRef.current)

      // Restore current data into sources
      map.getSource('stream-samples')?.setData(buildStreamGeoJSON(samplesRef.current))
      map.getSource('rock-samples')?.setData(buildRockGeoJSON(samplesRef.current))
      map.getSource('session-trail')?.setData(buildTrailGeoJSON(sessionTrailRef.current))
      map.getSource('session-waypoints-src')?.setData(buildWaypointGeoJSON(sessionWaypointsRef.current))
      map.getSource('saved-waypoints-src')?.setData(buildSavedWaypointGeoJSON(savedWaypointsRef.current))

      syncLayerVisibility(map)

      // Re-apply terrain if 3D was active
      if (is3DRef.current) {
        if (!map.getSource('terrain')) {
          map.addSource('terrain', TERRAIN_SOURCE)
        }
        map.setTerrain(TERRAIN_CONFIG)
      }

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

  // ── Sync all layer visibility ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    syncLayerVisibility(map)
  }, [layerVisibility, tierFilter, isPro])

  // ── Update session trail ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    map.getSource('session-trail')?.setData(buildTrailGeoJSON(sessionTrail))
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

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      <CategoryHeader onHome={onHome} />
      <CornerControls />
      <DataSheet />
      <SampleSheet />
      <LayerPanel />
      <BasemapPicker />
      <WaypointSheet addWaypoint={addWaypoint} deleteWaypoint={deleteWaypoint} />
    </div>
  )
}
