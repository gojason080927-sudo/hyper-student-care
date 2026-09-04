/**
 * admission_strategy_posts 테이블 및 전용 RPC 적용 (additive)
 *
 *   DATABASE_URL=postgresql://...
 *   또는 SUPABASE_DB_PASSWORD + .env.local VITE_SUPABASE_URL
 *
 *   node scripts/apply-admission-strategy-posts.mjs
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim()

  const local = parseEnvFile('.env.local')
  const ref = (local.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  const password = process.env.SUPABASE_DB_PASSWORD?.trim() || local.SUPABASE_DB_PASSWORD?.trim()
  if (!ref || !password) return null

  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
}

const databaseUrl = resolveDatabaseUrl()
if (!databaseUrl) {
  console.error(
    'DATABASE_URL 또는 SUPABASE_DB_PASSWORD 가 필요합니다.\n' +
      'Supabase SQL Editor에서 supabase/admission-strategy-posts-migration.sql 실행도 가능합니다.',
  )
  process.exit(1)
}

const sql = readFileSync('supabase/admission-strategy-posts-migration.sql', 'utf8')
const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  console.log('Connected to database')
  await client.query(sql)
  await client.query(`NOTIFY pgrst, 'reload schema'`)

  const table = await client.query(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'admission_strategy_posts'
    order by ordinal_position
  `)
  console.log('\n=== admission_strategy_posts columns ===')
  for (const row of table.rows) {
    console.log(`- ${row.column_name} ${row.data_type} nullable=${row.is_nullable}`)
  }

  const fn = await client.query(`
    select proname
    from pg_proc
    join pg_namespace n on n.oid = pg_proc.pronamespace
    where n.nspname = 'public'
      and proname = 'get_parent_admission_strategy_posts'
  `)
  console.log('\n=== RPC ===')
  for (const row of fn.rows) console.log(`- ${row.proname}`)

  const bundle = await client.query(`
    select pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'get_parent_care_bundle'
    limit 1
  `)
  const bundleDef = bundle.rows[0]?.def ?? ''
  if (bundleDef.includes('admission_strategy_posts')) {
    throw new Error('get_parent_care_bundle unexpectedly references admission_strategy_posts')
  }
  console.log('\nget_parent_care_bundle unchanged (no admission_strategy_posts reference)')
  console.log('\nOK')
} finally {
  await client.end()
}
