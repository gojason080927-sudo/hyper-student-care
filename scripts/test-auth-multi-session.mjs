/**
 * 공용 강사 계정 다중 세션 테스트
 * node scripts/test-auth-multi-session.mjs
 *
 * .env.local 에 TEST_TEACHER_EMAIL, TEST_TEACHER_PASSWORD 설정 필요
 * (실제 공용 계정 — 코드에 하드코딩하지 않음)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

function createMemoryStorage() {
  const store = {}
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = value
    },
    removeItem: (key) => {
      delete store[key]
    },
  }
}

function createIsolatedClient(url, key, storage) {
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage,
    },
  })
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

if (!email || !password) {
  console.error('SKIP: TEST_TEACHER_EMAIL / TEST_TEACHER_PASSWORD 가 .env.local에 없음')
  console.error('      Supabase Dashboard에서 생성한 공용 계정 정보를 .env.local에 추가 후 재실행')
  process.exit(0)
}

const storageA = createMemoryStorage()
const storageB = createMemoryStorage()
const clientA = createIsolatedClient(url, anonKey, storageA)
const clientB = createIsolatedClient(url, anonKey, storageB)

const results = []
function log(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// Test A: 동시 로그인
const loginA = await clientA.auth.signInWithPassword({ email, password })
log('A1. 브라우저 A 로그인', !loginA.error, loginA.error?.message ?? '')

const loginB = await clientB.auth.signInWithPassword({ email, password })
log('A2. 브라우저 B 로그인', !loginB.error, loginB.error?.message ?? '')

const sessA = (await clientA.auth.getSession()).data.session
const sessB = (await clientB.auth.getSession()).data.session
log('A3. A 세션 존재', !!sessA)
log('A4. B 세션 존재', !!sessB)
log('A5. A/B access token 독립', sessA?.access_token !== sessB?.access_token)

// Test B: A만 local 로그아웃
const signOutA = await clientA.auth.signOut({ scope: 'local' })
log('B1. A local signOut', !signOutA.error, signOutA.error?.message ?? '')

const afterA = (await clientA.auth.getSession()).data.session
const afterB = (await clientB.auth.getSession()).data.session
log('B2. A 세션 없음', !afterA)
log('B3. B 세션 유지', !!afterB)

// Re-login A for test C
await clientA.auth.signInWithPassword({ email, password })

// Test C: 두 클라이언트에서 각각 데이터 저장
const today = new Date().toISOString().slice(0, 10)
const now = new Date().toISOString()

const { data: students } = await clientA.from('students').select('id,name').limit(2)
if (!students || students.length < 1) {
  log('C. 학생 데이터 저장', false, '테스트할 학생 없음')
} else {
  const s1 = students[0]
  const s2 = students[1] ?? students[0]

  const attA = {
    id: crypto.randomUUID(),
    student_id: s1.id,
    date: today,
    status: '출석',
    reason: '',
    memo: 'multi-session-test-A',
    created_at: now,
    updated_at: now,
  }
  const insA = await clientA.from('attendance').upsert(attA, { onConflict: 'student_id,date' }).select().single()
  log('C1. A 출결 저장', !insA.error, insA.error?.message ?? s1.name)

  const attB = {
    id: crypto.randomUUID(),
    student_id: s2.id,
    date: today,
    status: '지각',
    reason: '',
    memo: 'multi-session-test-B',
    created_at: now,
    updated_at: now,
  }
  const insB = await clientB.from('attendance').upsert(attB, { onConflict: 'student_id,date' }).select().single()
  log('C2. B 출결 저장', !insB.error, insB.error?.message ?? s2.name)

  const verifyA = await clientA.from('attendance').select('memo').eq('student_id', s1.id).eq('date', today).single()
  const verifyB = await clientB.from('attendance').select('memo').eq('student_id', s2.id).eq('date', today).single()
  log('C3. A 저장 Supabase 유지', verifyA.data?.memo === 'multi-session-test-A')
  log('C4. B 저장 Supabase 유지', verifyB.data?.memo === 'multi-session-test-B')

  // cleanup test memos - restore or delete
  if (s1.id !== s2.id) {
    await clientA.from('attendance').delete().eq('id', attA.id)
    await clientB.from('attendance').delete().eq('id', attB.id)
  }
}

// Test D: 세션 refresh simulation
const refreshA = await clientA.auth.getSession()
const refreshB = await clientB.auth.getSession()
log('D1. A getSession 유지', !!refreshA.data.session)
log('D2. B getSession 유지', !!refreshB.data.session)

console.log('\n--- Summary ---')
const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length
console.log(`Passed: ${passed}, Failed: ${failed}`)
process.exit(failed > 0 ? 1 : 0)
