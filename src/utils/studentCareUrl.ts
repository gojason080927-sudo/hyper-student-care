import { isValidStudentAccessKey } from './studentAccessKey'

/** 배포/개발 공용 앱 base URL (끝 슬래시 제거) */
export function getPublicAppBaseUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_APP_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return ''
}

/** 공개 정적 자산 URL */
export function getPublicAssetUrl(path: string): string {
  const base = getPublicAppBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

/** 학생 개인 HYPER CARE 페이지 URL */
export function getStudentCareUrl(studentAccessKey: string): string {
  if (!isValidStudentAccessKey(studentAccessKey)) {
    throw new Error('유효하지 않은 학생 접근 키입니다.')
  }
  const baseUrl = getPublicAppBaseUrl()
  if (!baseUrl) {
    throw new Error('앱 URL을 확인할 수 없습니다.')
  }
  return `${baseUrl}/care/${studentAccessKey}`
}

/** @deprecated getStudentCareUrl 사용 권장 */
export function buildStudentCareUrl(studentAccessKey: string): string {
  return getStudentCareUrl(studentAccessKey)
}
