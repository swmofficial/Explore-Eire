// useOffline.js — Offline tile caching via the Cache API.
// Downloads MapTiler satellite tiles for a bbox + zoom range.
// Metadata (region list) stored in localStorage.
// The public/sw.js Service Worker intercepts all api.maptiler.com
// requests and serves from the same 'offline-tiles' Cache.
import { useState, useEffect, useCallback } from 'react'

export const OFFLINE_CACHE = 'offline-tiles'
const META_KEY = 'explore_eire_offline_regions'
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY

// ── Tile coordinate helpers ───────────────────────────────────────

function lngToTileX(lng, zoom) {
  return Math.floor((lng + 180) / 360 * Math.pow(2, zoom))
}

function latToTileY(lat, zoom) {
  const r = lat * Math.PI / 180
  return Math.floor(
    (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * Math.pow(2, zoom)
  )
}

function tilesForBboxZoom(bbox, zoom) {
  const n = Math.pow(2, zoom)
  const x0 = Math.max(0, lngToTileX(bbox.west,  zoom))
  const x1 = Math.min(n - 1, lngToTileX(bbox.east,  zoom))
  const y0 = Math.max(0, latToTileY(bbox.north, zoom)) // north → smaller y
  const y1 = Math.min(n - 1, latToTileY(bbox.south, zoom))
  const tiles = []
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      tiles.push({ z: zoom, x, y })
    }
  }
  return tiles
}

// Satellite tile URL — matches what MapLibre fetches from MapTiler satellite style
function tileUrl(z, x, y) {
  return `https://api.maptiler.com/tiles/satellite-v2/${z}/${x}/${y}.jpg?key=${MAPTILER_KEY}`
}

// ── Public helpers (used by OfflineManager for estimates) ─────────

export function estimateTileCount(bbox, minZoom = 5, maxZoom = 12) {
  let n = 0
  for (let z = minZoom; z <= maxZoom; z++) {
    n += tilesForBboxZoom(bbox, z).length
  }
  return n
}

export function estimateSizeBytes(tileCount) {
  return tileCount * 32 * 1024 // ~32 KB avg satellite tile
}

export function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ── Metadata helpers ──────────────────────────────────────────────

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '[]') } catch { return [] }
}

function saveMeta(regions) {
  try { localStorage.setItem(META_KEY, JSON.stringify(regions)) } catch { /* quota exceeded */ }
}

// ── Hook ──────────────────────────────────────────────────────────

export function useOffline() {
  const [isOnline,      setIsOnline]      = useState(navigator.onLine)
  const [regions,       setRegions]       = useState(() => loadMeta())
  const [downloading,   setDownloading]   = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [downloadError, setDownloadError] = useState(null)

  // Online / offline detection
  useEffect(() => {
    const up   = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online',  up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online',  up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // ── Download ────────────────────────────────────────────────────
  const downloadRegion = useCallback(async ({ name, bbox, minZoom = 5, maxZoom = 12 }) => {
    if (!('caches' in window)) {
      setDownloadError('Cache API not available in this browser.')
      return false
    }
    if (downloading) return false

    setDownloading(true)
    setProgress(0)
    setDownloadError(null)

    try {
      const cache = await caches.open(OFFLINE_CACHE)

      // Build full tile list
      const allTiles = []
      for (let z = minZoom; z <= maxZoom; z++) {
        allTiles.push(...tilesForBboxZoom(bbox, z))
      }

      let done = 0
      const total = allTiles.length
      let sizeBytes = 0
      const CONCURRENCY = 6

      for (let i = 0; i < total; i += CONCURRENCY) {
        const batch = allTiles.slice(i, i + CONCURRENCY)
        await Promise.all(
          batch.map(async ({ z, x, y }) => {
            const url = tileUrl(z, x, y)
            try {
              const existing = await cache.match(url)
              if (existing) {
                sizeBytes += 32768
              } else {
                const res = await fetch(url)
                if (res.ok) {
                  const cl = parseInt(res.headers.get('content-length') || '0', 10)
                  sizeBytes += cl || 32768
                  await cache.put(url, res)
                }
              }
            } catch { /* skip failed tile */ }
            done++
            setProgress(Math.round((done / total) * 100))
          })
        )
      }

      const entry = {
        name,
        bbox,
        minZoom,
        maxZoom,
        tileCount: total,
        sizeBytes,
        downloadedAt: new Date().toISOString(),
      }
      const updated = [...loadMeta().filter((r) => r.name !== name), entry]
      saveMeta(updated)
      setRegions(updated)
      setProgress(100)
      setDownloading(false)
      return true
    } catch (err) {
      console.error('[useOffline] download error:', err)
      setDownloadError('Download failed. Check your connection and try again.')
      setDownloading(false)
      return false
    }
  }, [downloading])

  // ── Delete ──────────────────────────────────────────────────────
  const deleteRegion = useCallback(async (name) => {
    const meta = loadMeta()
    const region = meta.find((r) => r.name === name)
    if (!region) return

    if ('caches' in window) {
      try {
        const cache = await caches.open(OFFLINE_CACHE)
        const delTiles = []
        for (let z = region.minZoom; z <= region.maxZoom; z++) {
          delTiles.push(...tilesForBboxZoom(region.bbox, z))
        }
        await Promise.all(
          delTiles.map(({ z, x, y }) => cache.delete(tileUrl(z, x, y)))
        )
      } catch (err) {
        console.warn('[useOffline] delete cache error:', err)
      }
    }

    const updated = meta.filter((r) => r.name !== name)
    saveMeta(updated)
    setRegions(updated)
  }, [])

  // ── Storage usage ───────────────────────────────────────────────
  const getStorageUsage = useCallback(async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate()
      return { usage, quota }
    }
    return { usage: 0, quota: 0 }
  }, [])

  return {
    isOnline,
    regions,
    downloading,
    progress,
    downloadError,
    downloadRegion,
    deleteRegion,
    getStorageUsage,
  }
}
