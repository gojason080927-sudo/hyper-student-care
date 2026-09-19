const LAST_HUB_KEY = 'hyper-hub-last-access-key'
const HUB_MANIFEST_HREF = '/hub/manifest.webmanifest?v=18-installable'
const HUB_KEY_RE = /^[A-Za-z0-9_-]{12,128}$/

export function rememberHubAccessKey(accessKey: string): void {
  const key = accessKey.trim()
  if (!key || typeof localStorage === 'undefined') return
  localStorage.setItem(LAST_HUB_KEY, key)
}

export function readLastHubAccessKey(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(LAST_HUB_KEY)?.trim() ?? ''
}

export function hubHomePath(accessKey: string): string {
  const key = accessKey.trim()
  return key ? `/hub/${key}` : '/hub'
}

/** Unique Hub manifest URL so iOS A2HS can pin start_url to this student without mixing cache. */
export function hubPwaManifestHref(accessKey = ''): string {
  const key = accessKey.trim()
  if (!HUB_KEY_RE.test(key)) return HUB_MANIFEST_HREF
  return `${HUB_MANIFEST_HREF}&start=${encodeURIComponent(`/hub/${key}`)}`
}
