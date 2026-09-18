/* Shared teacher Web Push handlers. Imported by /teacher/sw.js. */
self.addEventListener('push', (event) => {
  let payload = { title: 'HYPER Teacher', body: '', url: '/teacher/mobile' }
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) }
  } catch {
    if (event.data) {
      payload.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'HYPER Teacher', {
      body: payload.body || '새로운 학생 업무가 등록되었습니다.',
      icon: '/teacher/hyper-teacher-icon-v10-192.png',
      badge: '/teacher/hyper-teacher-icon-v10-192.png',
      data: { url: payload.url || '/teacher/mobile' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/teacher/mobile'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = client.url || ''
        if (url.includes('/teacher/') && 'focus' in client) {
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
