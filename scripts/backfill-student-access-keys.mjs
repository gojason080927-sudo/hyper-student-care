/**
 * 접근 키가 없거나 12자 미만인 기존 학생에게만 키를 일괄 생성합니다.
 *
 * ⚠️ 자동 실행하지 마세요. 원장 확인 후 수동 실행:
 *   node scripts/backfill-student-access-keys.mjs
 *
 * 환경 변수: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (또는 SUPABASE_SERVICE_ROLE_KEY)
 * service role 사용 시 RLS를 우회합니다 (권장).
 */
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnvFile(name) {
  try {
    const text = readFileSync(join(root, name), 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const ACCESS_KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const GENERATED_LENGTH = 32
const LEGACY_MIN = 12
const MAX_RETRIES = 8

function generateKey() {
  const bytes = randomBytes(GENERATED_LENGTH)
  return Array.from(bytes, (b) => ACCESS_KEY_CHARS[b % ACCESS_KEY_CHARS.length]).join('')
}

function hasValidKey(key) {
  return typeof key === 'string' && key.trim().length >= LEGACY_MIN
}

const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
const key = serviceKey ?? anonKey

if (!url || !key) {
  console.error('VITE_SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY(또는 anon key)가 필요합니다.')
  process.exit(1)
}

const supabase = createClient(url, key)

async function main() {
  const { data: students, error } = await supabase.from('students').select('id, name, student_access_key')
  if (error) {
    console.error('students 조회 실패:', error.message)
    process.exit(1)
  }

  const targets = (students ?? []).filter((s) => !hasValidKey(s.student_access_key))
  if (targets.length === 0) {
    console.log('키가 없는 학생이 없습니다.')
    return
  }

  console.log(`키 생성 대상: ${targets.length}명 (기존 유효 키는 변경하지 않습니다)`)

  let updated = 0
  for (const student of targets) {
    let saved = false
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const nextKey = generateKey()
      const { error: updateError } = await supabase
        .from('students')
        .update({ student_access_key: nextKey, access_key_active: true })
        .eq('id', student.id)

      if (!updateError) {
        console.log(`✓ ${student.name}: 키 생성 완료`)
        updated++
        saved = true
        break
      }
      if (updateError.code !== '23505') {
        console.error(`✗ ${student.name}: ${updateError.message}`)
        break
      }
    }
    if (!saved) console.error(`✗ ${student.name}: 고유 키 생성 실패`)
  }

  console.log(`완료: ${updated}/${targets.length}명 처리`)
}

main()
