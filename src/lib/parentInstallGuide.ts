import {
  isAndroidUserAgent,
  isIosUserAgent,
  resolveHubInstallGuide,
  type HubInstallGuideKind,
} from '../hub/hubInstallEnv'
import { isParentPwaAccessKey, parentCareHomePath } from './parentLastCareRoute'

export type ParentInstallGuideKind = HubInstallGuideKind | 'kakao-android' | 'kakao-ios'

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

/**
 * Kakao in-app → default browser. Same /care/{key} only.
 * Uses Kakao's openExternal scheme, not an Android intent URI or Chrome package.
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
  if (!/^\/care\/[A-Za-z0-9_-]{12,128}$/.test(care.pathname)) return null
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
