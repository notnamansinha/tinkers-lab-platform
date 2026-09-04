// Tinkerers' Lab Platform — Service Worker
// Strategy: network-first for documents (never cache error pages), stale-
// while-revalidate for hashed assets, offline fallback to the app shell.
// Cache versioning: bump CACHE_VERSION to invalidate when the strategy
// changes (hashed asset filenames already self-invalidate content).

const CACHE_VERSION = 'tl-v2'
const CACHE_NAME = `tl-${CACHE_VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/'))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Prune every cache that isn't the current one — old hashed assets
      // would otherwise accumulate forever after each cache-version bump.
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses — never cache 4xx/5xx error pages.
          if (response.ok) {
            const clone = response.clone()
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            )
          }
          return response
        })
        .catch(async () => {
          // Offline: try the exact URL, then fall back to the app shell —
          // the SPA router renders the requested route from the cached shell.
          const hit = await caches.match(request)
          if (hit) return hit
          const shell = await caches.match('/')
          if (shell) return shell
          return new Response('Offline — please reconnect to use the app.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        })
    )
    return
  }

  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    // Stale-while-revalidate: hashed filenames make this safe — new deploys
    // reference new URLs, which miss the cache and hit the network.
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            }
            return response
          })
          .catch(() => cached ?? new Response('', { status: 503 }))
        return cached || fetched
      })
    )
  }
})