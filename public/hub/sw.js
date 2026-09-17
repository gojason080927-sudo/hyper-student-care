/* 학생 /hub PWA service worker. 학부모 /care/sw.js · 강사 /teacher/sw.js 와 스코프가 다릅니다. */

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
