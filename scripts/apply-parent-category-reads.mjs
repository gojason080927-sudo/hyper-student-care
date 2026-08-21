/**
 * parent_category_reads 테이블 및 RPC 적용
 *
 * 환경 변수 (둘 중 하나):
 *   DATABASE_URL=postgresql://...
 *   SUPABASE_DB_PASSWORD=[database password] (+ VITE_SUPABASE_URL in .env.local)
 *
 * Usage:
 *   node scripts/apply-parent-category-reads.mjs
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
  const password = process.env.SUPABASE_DB_PASSWORD?.trim()
  if (!ref || !password) return null

  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
}

const databaseUrl = resolveDatabaseUrl()
if (!databaseUrl) {
  console.error(
    'DATABASE_URL 또는 SUPABASE_DB_PASSWORD 환경 변수가 필요합니다.\n' +
      'Supabase Dashboard → SQL Editor에서 supabase/parent-category-reads-migration.sql 실행도 가능합니다.',
  )
  process.exit(1)
}

const sql = readFileSync('supabase/parent-category-reads-migration.sql', 'utf8')

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  console.log('Connected to database')
  await client.query(sql)
  await client.query(`NOTIFY pgrst, 'reload schema'`)

  const functions = await client.query(`
    select proname
    from pg_proc
    join pg_namespace n on n.oid = pg_proc.pronamespace
    where n.nspname = 'public'
      and proname in ('get_parent_category_reads', 'mark_parent_category_read')
    order by proname
  `)

  console.log('\n=== parent category read RPCs ===')
  for (const row of functions.rows) {
    console.log(`- ${row.proname}`)
  }

  console.log('\nMigration applied successfully.')
} catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
} finally {
  await client.end()
}
