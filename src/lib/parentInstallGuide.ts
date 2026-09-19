import {
  isAndroidUserAgent,
  isIosUserAgent,
  resolveHubInstallGuide,
  type HubInstallGuideKind,
} from '../hub/hubInstallEnv'
import { isParentPwaAccessKey, parentCareHomePath } from './parentLastCareRoute'

export type ParentInstallGuideKind = HubInstallGuideKind | 'kakao-android' | 'kakao-ios'

/** Production Parent PWA origin. Android Chrome intents never target any other host. */
export const PARENT_PWA_PRODUCTION_ORIGIN = 'https://hyper-student-care.vercel.app'

const PARENT_CARE_HOME_PATH_RE = /^\/care\/[A-Za-z0-9_-]{12,128}$/
const INTENT_SAFE_HOST_RE = /^[A-Za-z0-9.-]+$/

export function isKakaoTalkUserAgent(userAgent: string): boolean {
  return /KAKAOTALK/i.test(userAgent)
}

/** Same-origin /care/{key} only. No query, hash, or other paths. */
export function parentCareHomeAbsoluteUrl(origin: string, accessKey: string): string | null {
  const key = accessKey.trim()
  if (!isParentPwaAccessKey(key)) return null
  let base: URL
  try {
    base = new URL(origin)
  } catch {
    return null
  }
  if (base.protocol !== 'http:' && base.protocol !== 'https:') return null
  const path = parentCareHomePath(key)
  const url = new URL(path, `${base.origin}/`)
  if (url.origin !== base.origin) return null
  if (url.pathname !== path) return null
  if (url.search || url.hash || url.username || url.password) return null
  return `${url.origin}${url.pathname}`
}

function isProductionParentCareHomeUrl(url: URL, expectedOrigin: string): boolean {
  let expected: URL
  try {
    expected = new URL(expectedOrigin)
  } catch {
    return false
  }
  if (expected.username || expected.password || expected.search || expected.hash) return false
  if (expected.origin !== PARENT_PWA_PRODUCTION_ORIGIN) return false
  if (url.origin !== expected.origin) return false
  if (url.protocol !== 'https:') return false
  if (url.username || url.password || url.search || url.hash) return false
  if (url.port) return false
  if (!INTENT_SAFE_HOST_RE.test(url.hostname)) return false
  if (!PARENT_CARE_HOME_PATH_RE.test(url.pathname)) return false
  if (url.pathname.includes(';') || url.pathname.includes('#') || url.hostname.includes(';')) return false
  return true
}

/**
 * Android Kakao in-app → Chrome tab for the same /care/{key}.
 * Explicit Chrome package so an installed Parent WebAPK cannot intercept the HTTPS URL.
 * No fallback URL, Play Store, component, or other-app extras.
 */
export function parentAndroidChromeIntentHref(origin: string, accessKey: string): string | null {
  const care = parentCareHomeAbsoluteUrl(origin, accessKey)
  if (!care) return null
  let url: URL
  try {
    url = new URL(care)
  } catch {
    return null
  }
  if (!isProductionParentCareHomeUrl(url, origin)) return null
  return `intent://${url.hostname}${url.pathname}#Intent;scheme=https;package=com.android.chrome;end`
}

/**
 * iOS Kakao in-app → Safari/default browser. Same /care/{key} only.
 * Android must not use this: openExternal hands a bare HTTPS URL to the system resolver.
 */
export function kakaoOpenExternalHref(
  absoluteCareUrl: string,
  expectedOrigin: string,
): string | null {
  let care: URL
  let expected: URL
  try {
    care = new URL(absoluteCareUrl)
    expected = new URL(expectedOrigin)
  } catch {
    return null
  }
  if (care.origin !== expected.origin) return null
  if (care.protocol !== 'http:' && care.protocol !== 'https:') return null
  if (care.username || care.password || care.search || care.hash) return null
  if (!PARENT_CARE_HOME_PATH_RE.test(care.pathname)) return null
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(`${care.origin}${care.pathname}`)}`
}

export function resolveParentInstallGuide(input: {
  userAgent: string
  standalone: boolean
  canInstall: boolean
}): ParentInstallGuideKind {
  if (input.standalone) return 'hidden'
  if (input.canInstall && !isIosUserAgent(input.userAgent)) return 'android-install'

  const kakao = isKakaoTalkUserAgent(input.userAgent)
  if (kakao && isAndroidUserAgent(input.userAgent)) return 'kakao-android'
  if (kakao && isIosUserAgent(input.userAgent)) return 'kakao-ios'

  return resolveHubInstallGuide(input)
}
