import { useEffect } from 'react'
import { rememberParentAccessKey } from '../../lib/parentLastCareRoute'
import { registerParentServiceWorker } from '../../lib/parentPushClient'

const MANIFEST_VERSION = '5'
const PARENT_MANIFEST_HREF = `/care/manifest.webmanifest?v=${MANIFEST_VERSION}-installable`

type ParentPwaRegistrarProps = {
  studentAccessKey?: string
}

/**
 * 학부모 /care PWA — 정적 manifest + /care/sw.js 등록.
 * start_url은 학생 ID를 하드코딩하지 않고 /care/ 를 사용한다.
 */
export function ParentPwaRegistrar({ studentAccessKey = '' }: ParentPwaRegistrarProps) {
  useEffect(() => {
    const key = studentAccessKey.trim()
    if (key) rememberParentAccessKey(key)

    let manifestLink = document.querySelector(
      'link[rel="manifest"]',
    ) as HTMLLinkElement | null
    if (!manifestLink) {
      manifestLink = document.createElement('link')
      manifestLink.rel = 'manifest'
      manifestLink.id = 'app-manifest'
      document.head.appendChild(manifestLink)
    }
    manifestLink.href = PARENT_MANIFEST_HREF

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
    appleIcon.href = `/care/hyper-parent-icon-192-v5.png?v=${MANIFEST_VERSION}`

    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null
    if (favicon) {
      favicon.href = `/care/hyper-parent-icon-192-v5.png?v=${MANIFEST_VERSION}`
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

    void registerParentServiceWorker().catch((error) => {
      console.warn('[ParentPWA] service worker register failed', error)
    })
  }, [studentAccessKey])

  return null
}
