/* 학생 /hub PWA service worker. 학부모 /care/sw.js · 강사 /teacher/sw.js 와 스코프가 다릅니다.
 * preview-signed-v1: 같은 origin 의 navigate·RPC만 no-store.
 * 다른 origin signed URL 열기/다운로드, Storage 이미지, worker, /api 는 가로채지 않는다. */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  const bypassHttpCache =
    request.mode === 'navigate' || url.pathname.includes('/rest/v1/rpc/')
  if (!bypassHttpCache) return
  event.respondWith(fetch(request, { cache: 'no-store' }))
})
