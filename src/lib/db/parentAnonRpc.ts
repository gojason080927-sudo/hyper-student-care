import { getSupabase } from '../supabase'

/**
 * 학부모 anon RPC를 HTTP 캐시 없이 호출한다.
 * 카카오 인앱 웹뷰가 동일 RPC URL의 이전 JSON을 재사용하지 않도록 cache: 'no-store'를 강제한다.
 */
export async function fetchParentAnonRpc(
  fn: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  getSupabase()
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '')
    .trim()
    .replace(/\/$/, '')
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const url = `${base}/rest/v1/rpc/${encodeURIComponent(fn)}`
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    let message = `${fn} 호출에 실패했습니다.`
    try {
      const payload = (await res.json()) as { message?: string }
      if (payload?.message) message = payload.message
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text) as unknown
}
