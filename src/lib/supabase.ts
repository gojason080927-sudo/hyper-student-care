import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
}

function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
}

/** .env.local에 URL과 anon key가 모두 설정되었는지 확인 */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}

/** /care/:key 라우트에서 URL accessKey 정규화 */
export function normalizeRouteAccessKey(raw: string): string {
  try {
    return decodeURIComponent(raw).trim()
  } catch {
    return raw.trim()
  }
}

export function isParentCarePathname(pathname: string): boolean {
  return /^\/care\/[^/?#]+/.test(pathname)
}

export function getParentAccessKeyFromPath(pathname?: string): string | null {
  const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  const match = path.match(/^\/care\/([^/?#]+)/)
  return match ? normalizeRouteAccessKey(match[1]) : null
}

function createSupabaseClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

/**
 * Supabase 클라이언트 (싱글톤)
 * 환경변수가 없으면 오류를 던집니다. 호출 전 isSupabaseConfigured()로 확인하세요.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase 환경변수가 설정되지 않았습니다. .env.local에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 입력해 주세요.',
    )
  }

  if (!client) {
    client = createSupabaseClient()
  }

  return client
}
