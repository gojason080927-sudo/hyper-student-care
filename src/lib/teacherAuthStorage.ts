import type { SupportedStorage } from '@supabase/supabase-js'

/** 강사용 모바일 PWA: 로그인 상태 유지 설정 (비밀번호와 분리) */
export const REMEMBER_LOGIN_KEY = 'hyper_teacher_remember_login'

export function getRememberLogin(): boolean {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem(REMEMBER_LOGIN_KEY)
  if (stored === null) return true
  return stored === 'true'
}

export function setRememberLogin(remember: boolean): void {
  localStorage.setItem(REMEMBER_LOGIN_KEY, remember ? 'true' : 'false')
}

/** Supabase Auth가 사용하는 storage key (프로젝트 ref 기준) */
export function getSupabaseAuthStorageKey(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  if (!url) return null
  try {
    const ref = new URL(url).hostname.split('.')[0]
    return ref ? `sb-${ref}-auth-token` : null
  } catch {
    return null
  }
}

/** 강사 인증 세션만 제거 (학부모 공개 링크·기타 localStorage 데이터는 유지) */
export function clearTeacherAuthSession(): void {
  const key = getSupabaseAuthStorageKey()
  if (!key) return
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

/** remember 설정에 따라 localStorage 또는 sessionStorage에 세션 저장 */
export function createTeacherAuthStorage(): SupportedStorage {
  return {
    getItem: (key: string) => {
      const store = getRememberLogin() ? localStorage : sessionStorage
      return store.getItem(key)
    },
    setItem: (key: string, value: string) => {
      if (getRememberLogin()) {
        sessionStorage.removeItem(key)
        localStorage.setItem(key, value)
      } else {
        localStorage.removeItem(key)
        sessionStorage.setItem(key, value)
      }
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    },
  }
}

/** 로그인 직전: 선택한 저장 방식과 반대쪽 storage의 stale 세션 제거 */
export function clearStaleAuthSessionForLogin(remember: boolean): void {
  const key = getSupabaseAuthStorageKey()
  if (!key) return
  if (remember) {
    sessionStorage.removeItem(key)
  } else {
    localStorage.removeItem(key)
  }
}
