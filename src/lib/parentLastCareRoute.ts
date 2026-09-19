const LAST_ACCESS_KEY_STORAGE = 'hyper-parent-last-access-key'
const PARENT_MANIFEST_HREF = '/care/manifest.webmanifest?v=16-installable'
const PARENT_KEY_RE = /^[A-Za-z0-9_-]{12,128}$/

export function isParentPwaAccessKey(value: string): boolean {
  return PARENT_KEY_RE.test(value.trim())
}

export function rememberParentAccessKey(accessKey: string): void {
  const key = accessKey.trim()
  if (!isParentPwaAccessKey(key) || typeof localStorage === 'undefined') return
  localStorage.setItem(LAST_ACCESS_KEY_STORAGE, key)
}

export function readLastParentAccessKey(): string {
  if (typeof localStorage === 'undefined') return ''
  const key = localStorage.getItem(LAST_ACCESS_KEY_STORAGE)?.trim() ?? ''
  return isParentPwaAccessKey(key) ? key : ''
}

/** Unique Parent manifest URL so iOS A2HS can pin start_url to this student. */
export function parentPwaManifestHref(accessKey = ''): string {
  const key = accessKey.trim()
  if (!isParentPwaAccessKey(key)) return PARENT_MANIFEST_HREF
  return `${PARENT_MANIFEST_HREF}&start=${encodeURIComponent(`/care/${key}`)}`
}

export function parentTodayReportPath(accessKey: string): string {
  const key = accessKey.trim()
  return key ? `/care/${key}/today-report` : '/care'
}

export function parentCareHomePath(accessKey: string): string {
  const key = accessKey.trim()
  return key ? `/care/${key}` : '/care'
}
