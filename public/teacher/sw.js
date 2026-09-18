/* Dev / fallback teacher SW. Production build may replace this with Workbox + importScripts. */
self.importScripts('/teacher/push-handlers.js')

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  const bypassHttpCache =
    request.mode === 'navigate' || url.pathname.includes('/rest/v1/rpc/')
  event.respondWith(fetch(request, bypassHttpCache ? { cache: 'no-store' } : undefined))
})
