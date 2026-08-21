import { useEffect } from 'react'

const ICON_VERSION = '6'

type ParentPwaRegistrarProps = {
  /** Student access key — used for start_url / scope so each care link installs correctly */
  studentAccessKey: string
}

/**
 * Parent (/care) PWA install icons + per-student manifest.
 * Does not change in-app UI — only document head links.
 */
export function ParentPwaRegistrar({ studentAccessKey }: ParentPwaRegistrarProps) {
  useEffect(() => {
    const key = studentAccessKey.trim()
    if (!key) return

    const startUrl = `/care/${key}`
    const manifest = {
      id: startUrl,
      name: 'HYPER STUDENT CARE',
      short_name: 'HYPER CARE',
      description: '하이퍼 학생 관리 시스템 — 학부모용',
      start_url: startUrl,
      scope: startUrl,
      display: 'standalone',
      background_color: '#0B1F4A',
      theme_color: '#0B1F4A',
      orientation: 'portrait-primary',
      lang: 'ko',
      icons: [
        {
          src: `/care/hyper-icon-v${ICON_VERSION}-192.png`,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/care/hyper-icon-v${ICON_VERSION}-512.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: `/care/hyper-icon-v${ICON_VERSION}-maskable.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
        {
          src: `/care/hyper-icon-v${ICON_VERSION}-splash.png`,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
      ],
    }

    const blob = new Blob([JSON.stringify(manifest)], {
      type: 'application/manifest+json',
    })
    const manifestUrl = URL.createObjectURL(blob)

    let manifestLink = document.querySelector(
      'link[rel="manifest"][data-parent-pwa]',
    ) as HTMLLinkElement | null
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      manifestLink.setAttribute('data-parent-pwa', 'true')
      document.head.appendChild(manifestLink)
    }
    manifestLink.href = manifestUrl

    const theme = document.querySelector('meta[name="theme-color"]')
    if (theme) theme.setAttribute('content', '#0B1F4A')

    let appleIcon = document.querySelector(
      'link[rel="apple-touch-icon"]',
    ) as HTMLLinkElement | null
    if (!appleIcon) {
      appleIcon = document.createElement('link')
      appleIcon.rel = 'apple-touch-icon'
      document.head.appendChild(appleIcon)
    }
    appleIcon.href = `/care/hyper-icon-v${ICON_VERSION}-apple-touch.png?v=${ICON_VERSION}`

    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    if (favicon) {
      favicon.href = `/care/hyper-icon-v${ICON_VERSION}-favicon-32.png?v=${ICON_VERSION}`
      favicon.type = 'image/png'
    }

    let appleTitle = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]',
    ) as HTMLMetaElement | null
    if (!appleTitle) {
      appleTitle = document.createElement('meta')
      appleTitle.name = 'apple-mobile-web-app-title'
      document.head.appendChild(appleTitle)
    }
    appleTitle.content = 'HYPER STUDENT CARE'

    return () => {
      URL.revokeObjectURL(manifestUrl)
      manifestLink?.remove()
    }
  }, [studentAccessKey])

  return null
}
