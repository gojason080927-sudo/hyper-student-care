/// <reference types="node" />

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { toBankProblem, type BankProblem, type BankRow, type BankType } from '../src/lib/questionBank.js'

// 문제지 만들기용 문제은행 읽기(읽기 전용). 문제은행은 앱과 다른 Supabase 프로젝트라 서버에서만 그쪽 키로 읽는다.
// 강사(앱 Supabase 로그인 계정)만 통과. 학생·학부모는 로그인 토큰이 없어 401. 정답 글은 읽지도 돌려주지도 않는다.
export const config = { runtime: 'nodejs', maxDuration: 60 }

type Env = { appUrl: string; appAnonKey: string; bankUrl: string; bankKey: string }

const envFromProcess = (): Env => ({
  appUrl: (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.trim() ?? '',
  appAnonKey: (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '',
  bankUrl: process.env.QB_SUPABASE_URL?.trim() ?? '',
  bankKey: process.env.QB_SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '',
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' } })

/** 앱 로그인 토큰이 진짜 강사 계정인지 앱 Supabase에 묻는다(api/pdf-to-docx.ts와 같은 방식) */
export async function verifyTeacher(token: string, env: Env, f: typeof fetch = fetch): Promise<boolean> {
  if (!token || !env.appUrl || !env.appAnonKey) return false
  try {
    const r = await f(`${env.appUrl.replace(/\/$/, '')}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: env.appAnonKey } })
    if (!r.ok) return false
    const body = (await r.json()) as { id?: unknown }
    return typeof body.id === 'string' && body.id.length > 0
  } catch {
    return false
  }
}

const SELECT =
  'hyper_problem_type_id,problem_versions(id,problem_text,item_format,review_status,content_metadata,' +
  'problems!problem_versions_problem_id_fkey(public_code,review_status,archived_at,current_version_id),' +
  'problem_answers(id),problem_assets(storage_path),problem_classification_meta(difficulty_level),problem_difficulty(overall_difficulty))'

async function loadBank(env: Env) {
  const db = createClient(env.bankUrl, env.bankKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: tRows, error: tErr } = await db.from('hyper_problem_types').select('id,code,name,description').like('code', 'CM2T%').eq('active', true).order('code')
  if (tErr) throw tErr
  const types: BankType[] = (tRows ?? []).map((t) => ({ id: t.id, code: t.code, name: t.name, sub: /소단원 (\d\d-\d+)\)/.exec(t.description ?? '')?.[1] ?? '' }))
  const rows: BankRow[] = []
  for (let off = 0; ; off += 1000) {
    const { data, error } = await db
      .from('problem_type_assignments')
      .select(SELECT)
      .eq('is_primary', true)
      .in('hyper_problem_type_id', types.map((t) => t.id))
      .order('id')
      .range(off, off + 999)
    if (error) throw error
    rows.push(...((data ?? []) as unknown as BankRow[]))
    if (!data || data.length < 1000) break
  }
  const problems: BankProblem[] = []
  const excluded: Record<string, number> = {}
  for (const r of rows) {
    const p = toBankProblem(r)
    if (typeof p === 'string') excluded[p] = (excluded[p] ?? 0) + 1
    else problems.push(p)
  }
  const withImg = problems.filter((p) => p.image)
  if (withImg.length) {
    const { data } = await db.storage.from('question-bank-assets').createSignedUrls(withImg.map((p) => p.image!), 60 * 60 * 6)
    withImg.forEach((p, i) => (p.image = data?.[i]?.signedUrl ?? undefined))
  }
  return { types, problems, excluded }
}

export async function handleQuestionBank(request: Request, env = envFromProcess()): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  const token = /^Bearer\s+(\S+)/i.exec(request.headers.get('authorization') ?? '')?.[1] ?? ''
  if (!(await verifyTeacher(token, env))) return json({ error: 'unauthorized' }, 401)
  if (!env.bankUrl || !env.bankKey) return json({ error: 'not_configured', message: '문제은행 서버 키(QB_SUPABASE_URL, QB_SUPABASE_SERVICE_ROLE_KEY)가 없습니다.' }, 503)
  try {
    return json(await loadBank(env))
  } catch (e) {
    console.error('question-bank', e)
    return json({ error: 'load_failed', message: '문제은행을 읽지 못했습니다.' }, 502)
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
  const response = await handleQuestionBank(new Request(`http://local${req.url ?? '/'}`, { method: req.method, headers }))
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

export { loadBank as _loadBankForTest }
