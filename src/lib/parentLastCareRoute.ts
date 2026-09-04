const LAST_ACCESS_KEY_STORAGE = 'hyper-parent-last-access-key'

export function rememberParentAccessKey(accessKey: string): void {
  const key = accessKey.trim()
  if (!key || typeof localStorage === 'undefined') return
  localStorage.setItem(LAST_ACCESS_KEY_STORAGE, key)
}

export function readLastParentAccessKey(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(LAST_ACCESS_KEY_STORAGE)?.trim() ?? ''
}

export function parentTodayReportPath(accessKey: string): string {
  const key = accessKey.trim()
  return key ? `/care/${key}/today-report` : '/care'
}

export function parentCareHomePath(accessKey: string): string {
  const key = accessKey.trim()
  return key ? `/care/${key}` : '/care'
}
