import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import {
  clearStaleAuthSessionForLogin,
  clearTeacherAuthSession,
  setRememberLogin,
} from '../lib/teacherAuthStorage'

type SignInOptions = {
  rememberMe?: boolean
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  isLoading: boolean
  signIn: (
    email: string,
    password: string,
    options?: SignInOptions,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * 공용 강사 계정 Auth
 *
 * - 동일 이메일/비밀번호로 여러 브라우저·기기에서 동시 로그인 가능 (Supabase 기본 다중 세션)
 * - 로그아웃은 scope: 'local' — 현재 기기만 종료, 다른 기기 세션 유지
 * - Single Session per User 기능을 사용·전제하지 않음
 * - 비밀번호 변경 또는 Supabase 관리자가 전체 세션을 폐기한 경우에만
 *   모든 기기에서 다시 로그인 필요
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false)
      return
    }

    const supabase = getSupabase()
    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (email: string, password: string, options?: SignInOptions) => {
      if (!isSupabaseConfigured()) {
        return { error: 'Supabase가 설정되지 않았습니다.' }
      }

      const rememberMe = options?.rememberMe ?? true
      setRememberLogin(rememberMe)
      clearStaleAuthSessionForLogin(rememberMe)

      // 다른 기기·브라우저의 기존 세션을 종료하지 않음 (동시 로그인 허용)
      const { error } = await getSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        return { error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
      }

      return { error: null }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured()) return
    // global 로그아웃 금지 — 현재 브라우저/기기만 종료, 다른 기기 세션 유지
    await getSupabase().auth.signOut({ scope: 'local' })
    clearTeacherAuthSession()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signIn,
      signOut,
    }),
    [isLoading, session, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
