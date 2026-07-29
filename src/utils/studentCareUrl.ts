import { hasStudentAccessKey } from './studentAccessKey'

const CARE_PATH_PREFIX = '/care/'

/** Vite가 빌드/ dev 서버 시작 시 주입하는 공개 앱 URL */
const VITE_PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL

/** env·URL 문자열에서 따옴표·공백·줄바꿈 제거 */
export function sanitizeUrlString(raw: string): string {
  return raw
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/[\r\n\t]/g, '')
    .replace(/\s+/g, '')
}

/** import.meta.env.VITE_PUBLIC_APP_URL (유효한 값이 있을 때만) */
export function readVitePublicAppUrl(): string | undefined {
  if (VITE_PUBLIC_APP_URL == null) {
    return undefined
  }
  const sanitized = sanitizeUrlString(String(VITE_PUBLIC_APP_URL))
  return sanitized || undefined
}

/** 환경변수 미설정 시에만 사용 — 직접 호출하지 말 것 */
function getBrowserOriginFallback(): string {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return ''
  }
  return sanitizeUrlString(window.location.origin).replace(/\/+$/, '')
}

/** 배포/개발 공용 앱 base URL (끝 슬래시 제거) */
export function getPublicAppBaseUrl(): string {
  const fromEnv = readVitePublicAppUrl()
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, '')
  }
  return getBrowserOriginFallback()
}

/** 공개 정적 자산 URL */
export function getPublicAssetUrl(path: string): string {
  const base = getPublicAppBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

function normalizeCareAccessKey(studentAccessKey: string): string {
  return studentAccessKey.trim()
}

/** 완성된 학부모 링크 — 앞뒤 공백·따옴표 없음 */
export function normalizeStudentCareUrl(url: string): string {
  const cleaned = sanitizeUrlString(url)
  const parsed = new URL(cleaned)
  const segments = parsed.pathname.split('/').filter(Boolean)
  const keyIndex = segments.indexOf('care')
  if (keyIndex >= 0 && segments[keyIndex + 1]) {
    segments[keyIndex + 1] = normalizeCareAccessKey(segments[keyIndex + 1])
    parsed.pathname = `/${segments.join('/')}`
  }
  const path = parsed.pathname.replace(/\/+$/, '')
  return `${parsed.origin}${path}`
}

/**
 * 학부모 링크 생성 — 복사·카카오 공유·재발급 복사 공통 함수
 *
 * 우선순위: VITE_PUBLIC_APP_URL → (없을 때만) window.location.origin
 * 결과: https://{domain}/care/{accessKey}
 */
export function getStudentCareUrl(studentAccessKey: string): string {
  if (!hasStudentAccessKey(studentAccessKey)) {
    throw new Error('유효하지 않은 학생 접근 키입니다.')
  }

  const baseUrl = getPublicAppBaseUrl()
  if (!baseUrl) {
    throw new Error('앱 URL을 확인할 수 없습니다. VITE_PUBLIC_APP_URL 환경변수를 설정해 주세요.')
  }

  const key = normalizeCareAccessKey(studentAccessKey)
  return normalizeStudentCareUrl(`${baseUrl}${CARE_PATH_PREFIX}${key}`)
}

export function tryGetStudentCareUrl(studentAccessKey: string): string | null {
  try {
    return getStudentCareUrl(studentAccessKey)
  } catch {
    return null
  }
}

/** 카카오톡·Web Share·클립보드 공유용 문구 (URL은 독립된 줄) */
export function buildStudentCareShareMessage(careUrl: string): string {
  const url = normalizeStudentCareUrl(careUrl)
  return `[Hyper Student Care]\n학생 학습관리 내용을 확인해주세요.\n${url}`
}

export function maskStudentAccessKey(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

export function maskStudentCareUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const keyIndex = segments.indexOf('care')
    if (keyIndex >= 0 && segments[keyIndex + 1]) {
      segments[keyIndex + 1] = maskStudentAccessKey(segments[keyIndex + 1])
      parsed.pathname = `/${segments.join('/')}`
    }
    return parsed.toString()
  } catch {
    return '••••••••'
  }
}

/** @deprecated getStudentCareUrl 사용 */
export function buildStudentCareUrl(studentAccessKey: string): string {
  return getStudentCareUrl(studentAccessKey)
}
