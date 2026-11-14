/**
 * Read-only snapshot of existing V1 sessions. Does not modify rows.
 */
import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

function parseEnvFile(path) {
  const raw = readFileSync(path, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim()
  const local = parseEnvFile('.env.local')
  const vercel = (() => {
    try {
      return parseEnvFile('.env.vercel.production')
    } catch {
      return {}
    }
  })()
  const url = local.VITE_SUPABASE_URL || vercel.VITE_SUPABASE_URL || ''
  const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  const password =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    local.SUPABASE_DB_PASSWORD?.trim() ||
    vercel.SUPABASE_DB_PASSWORD?.trim()
  if (!ref || !password) return null
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
}

const client = new Client({
  connectionString: resolveDatabaseUrl(),
  ssl: { rejectUnauthorized: false },
})

const PROTECTED_SESSION_ID = '6401e930-d7d2-4349-9b33-b6a0b1d4d595'

await client.connect()
const sessions = await client.query(`
  SELECT
    s.id,
    s.status,
    s.assessment_version,
    s.expected_question_count,
    (
      SELECT count(*)::int FROM public.career_assessment_responses r WHERE r.session_id = s.id
    ) AS answered_count,
    (
      SELECT count(*)::int FROM public.career_assessment_results res WHERE res.session_id = s.id
    ) AS result_count
  FROM public.career_assessment_sessions s
  ORDER BY s.created_at DESC
`)
const questions = await client.query(`
  SELECT count(*)::int AS n FROM public.career_assessment_questions
`)
const protectedRow = sessions.rows.find((row) => row.id === PROTECTED_SESSION_ID)
console.log(JSON.stringify({
  questionCount: questions.rows[0].n,
  sessionCount: sessions.rows.length,
  protected: protectedRow ?? null,
  open: sessions.rows.filter((row) => row.status !== 'completed').map((row) => ({
    id: row.id,
    status: row.status,
    assessment_version: row.assessment_version,
    expected_question_count: row.expected_question_count,
    answered_count: row.answered_count,
  })),
  completed: sessions.rows.filter((row) => row.status === 'completed').map((row) => ({
    id: row.id,
    answered_count: row.answered_count,
    result_count: row.result_count,
    assessment_version: row.assessment_version,
  })),
}, null, 2))
await client.end()
