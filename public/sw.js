// Outfit PWA service worker.
// Strategy: network-first for navigations (with offline fallback),
// stale-while-revalidate for build static assets. Never touches API/auth
// requests (non-GET, cross-origin, or Supabase) — those pass straight through.

const VERSION = 'outfit-v1'
const STATIC_CACHE = `${VERSION}-static`
const OFFLINE_URL = '/offline.html'
const PRECACHE = [OFFLINE_URL, '/icon.svg', '/manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests; let everything else (POST, Supabase, etc.) pass through.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Navigations: network-first, fall back to cached offline page.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then(r => r || Response.error()))
    )
    return
  }

  // Build assets & icons: stale-while-revalidate.
  if (url.pathname.startsWith('/_next/static') || PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then(res => {
            if (res && res.status === 200) cache.put(request, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
})
