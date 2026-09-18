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

self.addEventListener('push', (event) => {
  let payload = { title: 'HYPER Student Hub', body: '', url: '/hub/' }
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) }
  } catch {
    if (event.data) {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'HYPER Student Hub', {
      body: payload.body || '학생 학습 알림이 도착했습니다.',
      icon: '/hub/hyper-hub-icon-v1-192.png',
      badge: '/hub/hyper-hub-icon-v1-192.png',
      data: { url: payload.url || '/hub/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/hub/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = client.url || ''
        if (url.includes('/hub/') && 'focus' in client) {
          if ('navigate' in client && typeof client.navigate === 'function') {
            return client.navigate(targetUrl).then((navigated) => navigated || client.focus())
          }
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
