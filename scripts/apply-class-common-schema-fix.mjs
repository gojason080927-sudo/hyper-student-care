/**
 * class_today_report_common textbook_name 컬럼 추가
 *
 * 환경 변수 (둘 중 하나):
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@...pooler.supabase.com:6543/postgres
 *   SUPABASE_DB_PASSWORD=[database password]  (+ VITE_SUPABASE_URL from .env.local)
 *
 * Usage:
 *   node scripts/apply-class-common-schema-fix.mjs
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

  // Session pooler (IPv4)
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
}

const sqlStatements = [
  `alter table public.class_today_report_common
     add column if not exists textbook_name text not null default ''`,
  `notify pgrst, 'reload schema'`,
]

const databaseUrl = resolveDatabaseUrl()
if (!databaseUrl) {
  console.error(
    'DATABASE_URL 또는 SUPABASE_DB_PASSWORD 환경 변수가 필요합니다.\n' +
      'Supabase Dashboard → Project Settings → Database → Connection string',
  )
  process.exit(1)
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  console.log('Connected to database')

  for (const sql of sqlStatements) {
    console.log('Executing:', sql.replace(/\s+/g, ' ').slice(0, 80), '...')
    await client.query(sql)
  }

  const verify = await client.query(`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'class_today_report_common'
    order by ordinal_position
  `)

  console.log('\n=== class_today_report_common columns after migration ===')
  for (const row of verify.rows) {
    console.log(
      `- ${row.column_name}: ${row.data_type} nullable=${row.is_nullable} default=${row.column_default ?? 'null'}`,
    )
  }

  const hasTextbook = verify.rows.some((r) => r.column_name === 'textbook_name')
  if (!hasTextbook) {
    console.error('FAIL: textbook_name column still missing')
    process.exit(1)
  }

  console.log('\nOK: textbook_name column exists, schema cache reload notified')
} catch (error) {
  console.error('Migration failed:', error.message)
  process.exit(1)
} finally {
  await client.end().catch(() => {})
}
