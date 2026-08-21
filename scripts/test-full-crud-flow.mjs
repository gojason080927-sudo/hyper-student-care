/**
 * 전체 CRUD 플로우 테스트 (RLS 정책 적용 후 실행)
 * node scripts/test-full-crud-flow.mjs
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

const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const now = new Date().toISOString()
const today = now.slice(0, 10)

const results = []
function log(name, ok, detail = '', error = '') {
  results.push({ name, ok, detail, error })
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}${error ? `: ${error}` : ''}`)
}

// 1. 학생 INSERT
const studentId = crypto.randomUUID()
const accessKey = `flow-${Date.now()}`
const studentRow = {
  id: studentId,
  name: '플로우검증학생',
  student_access_key: accessKey,
  school: '플로우중',
  grade: '중2',
  student_phone: '010-1111-1111',
  parent_phone: '010-2222-2222',
  class_name: '중2 수학반',
  subjects: ['수학'],
  teacher: '플로우강사',
  enrollment_date: today,
  status: '재원',
  memo: 'CRUD flow test',
  created_at: now,
  updated_at: now,
}

const insStudent = await sb.from('students').insert(studentRow).select().single()
log('1. 학생 INSERT', !insStudent.error, studentId, insStudent.error?.message)

if (insStudent.error) {
  console.log('\n--- ABORT: RLS 정책 미적용 — supabase/rls-policies.sql 실행 필요 ---')
  process.exit(1)
}

// 2. 학생 SELECT (재조회)
const selStudent = await sb.from('students').select('*').eq('id', studentId).single()
log('2. 학생 SELECT', !selStudent.error && selStudent.data?.name === '플로우검증학생', selStudent.data?.name, selStudent.error?.message)

// 3. 출결 INSERT
const attId = crypto.randomUUID()
const insAtt = await sb.from('attendance').insert({
  id: attId,
  student_id: studentId,
  date: today,
  status: '출석',
  reason: '',
  memo: '플로우 출결',
  created_at: now,
  updated_at: now,
}).select().single()
log('3. 출결 INSERT', !insAtt.error, attId, insAtt.error?.message)

const selAtt = await sb.from('attendance').select('*').eq('student_id', studentId).eq('date', today)
log('4. 출결 SELECT', !selAtt.error && (selAtt.data?.length ?? 0) > 0, `${selAtt.data?.length ?? 0} rows`, selAtt.error?.message)

// 5. Today Report 데이터 INSERT
const todayReportRows = {
  progress: {
    id: crypto.randomUUID(),
    student_id: studentId,
    subject: '수학',
    textbook_name: '플로우교재',
    current_progress: '2단원',
    current_page: 20,
    total_page: 100,
    progress_rate: 20,
    last_study_date: today,
    teacher_memo: '진도 OK',
    created_at: now,
    updated_at: now,
  },
  homework: {
    id: crypto.randomUUID(),
    student_id: studentId,
    date: today,
    title: '',
    description: '과제 수행 완료',
    status: '완료',
    teacher_memo: '',
    created_at: now,
    updated_at: now,
  },
  today_assignments: {
    id: crypto.randomUUID(),
    student_id: studentId,
    date: today,
    assignment1: '오늘과제1',
    assignment2: '오늘과제2',
    created_at: now,
    updated_at: now,
  },
  class_notes: {
    id: crypto.randomUUID(),
    student_id: studentId,
    date: today,
    has_class_note: true,
    note: '특이사항 테스트',
    created_at: now,
    updated_at: now,
  },
  daily_tests: {
    id: crypto.randomUUID(),
    student_id: studentId,
    date: today,
    test_name: '플로우 일일테스트',
    subject: '수학',
    score: 18,
    total_score: 20,
    percentage: 90,
    incorrect_count: 2,
    memo: '',
    session_results: [],
    created_at: now,
    updated_at: now,
  },
}

for (const [table, row] of Object.entries(todayReportRows)) {
  const res = await sb.from(table).insert(row).select().single()
  log(`5. Today Report INSERT (${table})`, !res.error, row.id, res.error?.message)
}

// 6. Today Report SELECT (student+date)
const [att2, prog, hw, ta, cn, dt] = await Promise.all([
  sb.from('attendance').select('*').eq('student_id', studentId).eq('date', today),
  sb.from('progress').select('*').eq('student_id', studentId).eq('last_study_date', today),
  sb.from('homework').select('*').eq('student_id', studentId).eq('date', today),
  sb.from('today_assignments').select('*').eq('student_id', studentId).eq('date', today),
  sb.from('class_notes').select('*').eq('student_id', studentId).eq('date', today),
  sb.from('daily_tests').select('*').eq('student_id', studentId).eq('date', today),
])
log('6. Today Report SELECT (attendance)', (att2.data?.length ?? 0) > 0)
log('6. Today Report SELECT (progress)', (prog.data?.length ?? 0) > 0)
log('6. Today Report SELECT (homework)', (hw.data?.length ?? 0) > 0)
log('6. Today Report SELECT (today_assignments)', (ta.data?.length ?? 0) > 0)
log('6. Today Report SELECT (class_notes)', (cn.data?.length ?? 0) > 0)
log('6. Today Report SELECT (daily_tests)', (dt.data?.length ?? 0) > 0)

// 7. UPDATE 테스트
const upd = await sb.from('students').update({ memo: 'updated' }).eq('id', studentId).select().single()
log('7. 학생 UPDATE', !upd.error && upd.data?.memo === 'updated', '', upd.error?.message)

// 8. 새로고침 시뮬레이션 — 새 클라이언트로 재조회
const sb2 = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const refresh = await sb2.from('students').select('*').eq('id', studentId).single()
log('8. 새로고침 후 학생 유지', !refresh.error && refresh.data?.name === '플로우검증학생', refresh.data?.name, refresh.error?.message)

const refreshAtt = await sb2.from('attendance').select('*').eq('student_id', studentId).eq('date', today)
log('8. 새로고침 후 출결 유지', (refreshAtt.data?.length ?? 0) > 0)

// cleanup
await sb.from('students').delete().eq('id', studentId)
const afterDel = await sb.from('students').select('*').eq('id', studentId)
log('9. 학생 DELETE (cleanup)', (afterDel.data?.length ?? 0) === 0)

console.log('\n--- Summary ---')
const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length
console.log(`Passed: ${passed}, Failed: ${failed}`)
process.exit(failed > 0 ? 1 : 0)
