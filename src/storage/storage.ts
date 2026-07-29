export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 백업 저장 실패는 앱 동작을 막지 않음
  }
}

export function hasStorageKey(key: string): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(key) !== null
}
