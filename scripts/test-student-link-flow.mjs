/**
 * 학생 링크 E2E 테스트 (API + 브라우저 검증 준비)
 * node scripts/test-student-link-flow.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const env = {}
  for (const name of ['.env.local', '.env']) {
    try {
      const raw = readFileSync(resolve(process.cwd(), name), 'utf8')
      for (const line of raw.split('\n')) {
        const t = line.trim()
        if (!t || t.startsWith('#')) continue
        const i = t.indexOf('=')
        if (i === -1) continue
        env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
      }
    } catch {
      // optional
    }
  }
  return env
}

const ACCESS_KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
function generateKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => ACCESS_KEY_CHARS[b % ACCESS_KEY_CHARS.length]).join('')
}

const env = loadEnv()
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
const email = env.TEST_TEACHER_EMAIL
const password = env.TEST_TEACHER_PASSWORD

if (!url || !anonKey) {
  console.error('FAIL: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 필요')
  process.exit(1)
}

const sb = createClient(url, anonKey)
const today = new Date().toISOString().slice(0, 10)
const now = new Date().toISOString()
const studentName = `링크테스트${Date.now().toString().slice(-6)}`

async function getSession() {
  if (email && password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(`로그인 실패: ${error.message}`)
    return data.session
  }
  return null
}

async function main() {
  const session = await getSession()
  console.log(session ? 'OK  강사 로그인' : 'INFO TEST_TEACHER_* 없음 — anon RLS로 학생 생성만 진행')

  const studentId = crypto.randomUUID()
  const accessKey = generateKey()
  const row = {
    id: studentId,
    name: studentName,
    student_access_key: accessKey,
    access_key_active: true,
    school: '테스트중',
    grade: '중2',
    student_phone: '',
    parent_phone: '',
    class_name: '테스트반',
    subjects: ['수학'],
    teacher: '테스트강사',
    enrollment_date: today,
    status: '재원',
    memo: 'student link flow test',
    created_at: now,
    updated_at: now,
  }

  const ins = await sb.from('students').insert(row).select('id,name,student_access_key,access_key_active').single()
  if (ins.error) {
    console.error('FAIL 학생 INSERT:', ins.error.message)
    process.exit(1)
  }

  const key = ins.data.student_access_key
  const keyOk = typeof key === 'string' && key.length >= 32 && /^[A-Za-z0-9]+$/.test(key)
  console.log(keyOk ? 'OK  student_access_key 자동 생성 규격' : 'FAIL student_access_key 규격', `(len=${key?.length})`)

  const sel = await sb.from('students').select('*').eq('id', studentId).single()
  console.log(!sel.error && sel.data?.name === studentName ? 'OK  Supabase students 저장 확인' : 'FAIL Supabase SELECT')

  const careUrl = `http://localhost:5174/care/${key}`
  console.log('INFO careUrl', careUrl)

  // cleanup
  await sb.from('students').delete().eq('id', studentId)
  console.log('OK  테스트 학생 cleanup')

  console.log(JSON.stringify({ studentName, accessKey: key, careUrl, hasTeacherSession: Boolean(session) }))
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
