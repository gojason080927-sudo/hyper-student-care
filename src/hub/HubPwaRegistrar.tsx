import { useEffect } from 'react'
import { rememberHubAccessKey } from './hubSession'

const MANIFEST_HREF = '/hub/manifest.webmanifest?v=1-installable'

export function HubPwaRegistrar({ accessKey = '' }: { accessKey?: string }) {
  useEffect(() => {
    const key = accessKey.trim()
    if (key) rememberHubAccessKey(key)

    let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      manifestLink.id = 'app-manifest'
      document.head.appendChild(manifestLink)
    }
    manifestLink.href = MANIFEST_HREF

    const theme = document.querySelector('meta[name="theme-color"]')
    if (theme) theme.setAttribute('content', '#0B1F4A')

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = '/hub/hyper-hub-icon-v1-192.png'

    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    if (favicon) {
      favicon.href = '/hub/hyper-hub-icon-v1-192.png'
      favicon.type = 'image/png'
    }

    let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]') as HTMLMetaElement | null
    if (!appleTitle) {
      appleTitle = document.createElement('meta')
      appleTitle.name = 'apple-mobile-web-app-title'
      document.head.appendChild(appleTitle)
    }
    appleTitle.content = 'HYPER STUDENT HUB'

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/hub/sw.js', { scope: '/hub/' }).catch(() => {})
    }
  }, [accessKey])

  return null
}
