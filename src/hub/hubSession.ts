const LAST_HUB_KEY = 'hyper-hub-last-access-key'

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
