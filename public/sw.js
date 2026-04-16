// sw.js — Service Worker for offline tile caching.
// Intercepts all api.maptiler.com tile requests.
// Serves from Cache API if cached; fetches and caches if online; returns placeholder if offline.

const CACHE_NAME = 'offline-tiles'
const MAPTILER_HOST = 'api.maptiler.com'

// 1×1 dark-grey PNG — shown when a tile is not cached and the device is offline
function placeholderTileResponse() {
  const b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return new Response(bytes, {
    status: 200,
    headers: { 'Content-Type': 'image/png' },
  })
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Only intercept MapTiler tile image requests — not style JSON, fonts, sprites, etc.
  if (url.hostname !== MAPTILER_HOST) return
  if (!/\/tiles\/[^/]+\/\d+\/\d+\/\d+\.(jpg|jpeg|png|webp)(\?.*)?$/.test(url.pathname + url.search)) return

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache-first: serve immediately if we already have this tile
      const cached = await cache.match(e.request)
      if (cached) return cached

      // Not cached — fetch from network and store for next time
      try {
        const response = await fetch(e.request)
        if (response.ok) {
          cache.put(e.request, response.clone())
        }
        return response
      } catch {
        // Offline and not cached — return 1×1 placeholder so MapLibre doesn't error
        return placeholderTileResponse()
      }
    })
  )
})
