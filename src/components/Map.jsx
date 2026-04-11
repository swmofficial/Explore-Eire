// Map.jsx — Full screen MapLibre GL map.
// Renders gold sample circle markers split into 7 per-tier layers + rock-circles.
// Renders WMS raster overlays: gold heatmap, arsenic, lead, bedrock, geo lines, boreholes.
// Renders session GPS trail and pinned session waypoints.
// Click on any gold layer → opens SampleSheet via mapStore.selectedSample.
import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import useMapStore from '../store/mapStore'
import useUserStore from '../store/userStore'
import { useGoldSamples } from '../hooks/useGoldSamples'
import { GOLD_TIERS, GSI_LAYERS } from '../lib/mapConfig'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY
const SATELLITE_STYLE = `https://api.maptiler.com/maps/hybrid-v4/style.json?key=${MAPTILER_KEY}`
const WMS_PROXY = 'https://srv1566939.hstgr.cloud'

// ── WMS tile URL builder ───────────────────────────────────────────
// Must NOT use URLSearchParams — it would encode {bbox-epsg-3857}
function wmsRasterTileUrl(endpoint, layerName) {
  const L = encodeURIComponent(layerName)
  return (
    `${WMS_PROXY}${endpoint}` +
    `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap` +
    `&FORMAT=image%2Fpng&TRANSPARENT=true` +
    `&LAYERS=${L}` +
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
  all:         ['gold-t1','gold-t2','gold-t3','gold-t4','gold-t5','gold-t6','gold-t7'],
  exceptional: ['gold-t1','gold-t2'],
  high:        ['gold-t3','gold-t4'],
  significant: ['gold-t4','gold-t5'],
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

// ── Helpers ────────────────────────────────────────────────────────

function tierColor(ppb) {
  const t = GOLD_TIERS.find((x) => ppb >= x.min && ppb < x.max)
  return t ? t.color : '#74c476'
}

function tierLabel(ppb) {
  const t = GOLD_TIERS.find((x) => ppb >= x.min && ppb < x.max)
  return t ? t.label : 'Background'
}

function isRockSample(s) {
  return (
    (s.sample_type && s.sample_type.toLowerCase().includes('rock')) ||
    (s.survey && s.survey.toLowerCase().includes('litho'))
  )
}

// ── GeoJSON builders ───────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────

export default function Map() {
  const containerRef  = useRef(null)
  const mapRef        = useRef(null)
  const geolocateRef  = useRef(null)
  const mapLoadedRef  = useRef(false)
  const samplesRef    = useRef([])

  const {
    setMapInstance,
    layerVisibility,
    tierFilter,
    sessionTrail,
    sessionWaypoints,
    setSelectedSample,
  } = useMapStore()
  const { isPro } = useUserStore()

  const { samples } = useGoldSamples()

  // Keep samplesRef current so map load callback can read it
  samplesRef.current = samples

  // ── Map initialisation (runs once) ────────────────────────────
  useEffect(() => {
    if (mapRef.current) return

    console.log('[Map] VITE_MAPTILER_KEY present:', !!MAPTILER_KEY)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: SATELLITE_STYLE,
      center: [-8.0, 53.5],
      zoom: 7,
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
      mapLoadedRef.current = true
      setMapInstance(map)

      // ── WMS raster sources + layers ───────────────────────────
      // Added first so they appear beneath circle layers

      const wmsConfigs = [
        {
          sourceId: 'src-gold-heatmap',
          layerId: 'wms-gold-heatmap',
          url: wmsRasterTileUrl('/wms/geo', GSI_LAYERS.goldHeatmap),
          opacity: 0.75,
        },
        {
          sourceId: 'src-arsenic',
          layerId: 'wms-arsenic',
          url: wmsRasterTileUrl('/wms/geo', GSI_LAYERS.arsenic),
          opacity: 0.75,
        },
        {
          sourceId: 'src-lead',
          layerId: 'wms-lead',
          url: wmsRasterTileUrl('/wms/geo', GSI_LAYERS.lead),
          opacity: 0.75,
        },
        {
          sourceId: 'src-bedrock',
          layerId: 'wms-bedrock',
          url: wmsRasterTileUrl('/wms/bed', GSI_LAYERS.bedrock),
          opacity: 0.65,
        },
        {
          sourceId: 'src-geo-lines',
          layerId: 'wms-geo-lines',
          url: wmsRasterTileUrl('/wms/bed', GSI_LAYERS.geoLines),
          opacity: 0.75,
        },
        {
          sourceId: 'src-boreholes',
          layerId: 'wms-boreholes',
          url: wmsRasterTileUrl('/wms/bore', GSI_LAYERS.boreholes),
          opacity: 0.85,
        },
      ]

      for (const cfg of wmsConfigs) {
        map.addSource(cfg.sourceId, {
          type: 'raster',
          tiles: [cfg.url],
          tileSize: 256,
        })
        map.addLayer({
          id: cfg.layerId,
          type: 'raster',
          source: cfg.sourceId,
          layout: { visibility: 'none' },
          paint: { 'raster-opacity': cfg.opacity },
        })
      }

      // ── Stream sediment source ────────────────────────────────
      map.addSource('stream-samples', {
        type: 'geojson',
        data: buildStreamGeoJSON(samplesRef.current),
      })

      // 7 tier circle layers (t1 highest, t7 background)
      // Added t7→t1 so higher tiers render on top
      for (let i = TIER_LAYERS.length - 1; i >= 0; i--) {
        const t = TIER_LAYERS[i]
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

      // ── Rock samples source + layer ───────────────────────────
      map.addSource('rock-samples', {
        type: 'geojson',
        data: buildRockGeoJSON(samplesRef.current),
      })

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
        layout: { visibility: 'none' }, // off by default
      })

      // ── Click handlers — all gold layers open SampleSheet ─────
      const clickableLayers = [...TIER_LAYERS.map((t) => t.id), 'rock-circles']

      map.on('click', (e) => {
        const existingLayers = clickableLayers.filter((id) => map.getLayer(id))
        if (!existingLayers.length) return

        const features = map.queryRenderedFeatures(e.point, {
          layers: existingLayers,
        })
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

      for (const id of clickableLayers) {
        map.on('mouseenter', id, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', id, () => {
          map.getCanvas().style.cursor = ''
        })
      }

      // ── Session trail source ──────────────────────────────────
      map.addSource('session-trail', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

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

      // ── Session waypoints source ──────────────────────────────
      map.addSource('session-waypoints-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

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

      // GPS
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

  // ── Update sample sources when data loads ──────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    const streamSrc = map.getSource('stream-samples')
    if (streamSrc) streamSrc.setData(buildStreamGeoJSON(samples))
    const rockSrc = map.getSource('rock-samples')
    if (rockSrc) rockSrc.setData(buildRockGeoJSON(samples))
  }, [samples])

  // ── Sync all layer visibility ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return

    const streamOn = layerVisibility.stream_sediment !== false

    // Free/guest tier gate — non-pro users see t6+t7 (low + background) only
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
      // Pro users only for WMS — keep all hidden for non-pro
      for (const layerId of Object.values(WMS_LAYER_MAP)) {
        if (!map.getLayer(layerId)) continue
        map.setLayoutProperty(layerId, 'visibility', 'none')
      }
    } else {
      // Pro: respect tierFilter + individual layerVisibility toggles
      const visibleTiers = TIER_FILTER_GROUPS[tierFilter] ?? TIER_FILTER_GROUPS.all
      for (const t of TIER_LAYERS) {
        if (!map.getLayer(t.id)) continue
        const vis = streamOn && visibleTiers.includes(t.id) ? 'visible' : 'none'
        map.setLayoutProperty(t.id, 'visibility', vis)
      }
      for (const [storeKey, layerId] of Object.entries(WMS_LAYER_MAP)) {
        if (!map.getLayer(layerId)) continue
        const vis = layerVisibility[storeKey] === true ? 'visible' : 'none'
        map.setLayoutProperty(layerId, 'visibility', vis)
      }
    }

    // Rock circles — available regardless of tier (own toggle)
    if (map.getLayer('rock-circles')) {
      const vis = layerVisibility.rock_samples === true ? 'visible' : 'none'
      map.setLayoutProperty('rock-circles', 'visibility', vis)
    }
  }, [layerVisibility, tierFilter, isPro])

  // ── Update session trail ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    const src = map.getSource('session-trail')
    if (src) src.setData(buildTrailGeoJSON(sessionTrail))
  }, [sessionTrail])

  // ── Update session waypoints ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return
    const src = map.getSource('session-waypoints-src')
    if (src) src.setData(buildWaypointGeoJSON(sessionWaypoints))
  }, [sessionWaypoints])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  )
}
