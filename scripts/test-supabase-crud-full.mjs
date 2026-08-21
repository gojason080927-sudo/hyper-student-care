/**
 * Supabase 상세 CRUD 테스트
 * 실행: node scripts/test-supabase-crud-full.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
  }
  return env
}

const env = loadEnvLocal()
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const now = new Date().toISOString()
const today = now.slice(0, 10)
const testStudentId = crypto.randomUUID()

const results = []

function log(result) {
  results.push(result)
  const status = result.ok ? 'OK  ' : 'FAIL'
  const detail = result.detail ? ` — ${result.detail}` : ''
  const err = result.error ? `: ${result.error}` : ''
  console.log(`${status} ${result.name}${detail}${err}`)
}

async function tryInsert(table, row) {
  const { data, error } = await supabase.from(table).insert(row).select().maybeSingle()
  return { data, error }
}

async function trySelect(table, filters) {
  let q = supabase.from(table).select('*')
  for (const [col, val] of Object.entries(filters)) {
    q = q.eq(col, val)
  }
  const { data, error } = await q
  return { data, error }
}

async function tryDelete(table, col, val) {
  return supabase.from(table).delete().eq(col, val)
}

// 1. 학생 추가
const studentRow = {
  id: testStudentId,
  name: 'CRUD검증학생',
  student_access_key: `crud-${Date.now()}`,
  school: '테스트중',
  grade: '중2',
  student_phone: '010-0000-0001',
  parent_phone: '010-0000-0002',
  class_name: 'CRUD반',
  subjects: ['수학'],
  teacher: '검증강사',
  enrollment_date: today,
  status: '재원',
  memo: 'CRUD test row',
  created_at: now,
  updated_at: now,
}

const studentInsert = await tryInsert('students', studentRow)
log({
  name: '1. 학생 INSERT (students)',
  ok: !studentInsert.error,
  error: studentInsert.error?.message,
  detail: studentInsert.error ? 'RLS 차단 가능' : `id=${testStudentId}`,
})

const studentExists = studentInsert.error
  ? null
  : (await trySelect('students', { id: testStudentId })).data?.[0]

log({
  name: '1b. 학생 SELECT (students)',
  ok: !!studentExists,
  error: studentExists ? undefined : 'insert 실패로 조회 불가',
})

// 2. 출결 저장 (student insert 성공 시만)
if (!studentInsert.error) {
  const attId = crypto.randomUUID()
  const attInsert = await tryInsert('attendance', {
    id: attId,
    student_id: testStudentId,
    date: today,
    status: '출석',
    reason: '',
    memo: 'CRUD 출결',
    created_at: now,
    updated_at: now,
  })
  log({
    name: '2. 출결 INSERT (attendance)',
    ok: !attInsert.error,
    error: attInsert.error?.message,
  })

  const attSelect = await trySelect('attendance', { student_id: testStudentId, date: today })
  log({
    name: '2b. 출결 SELECT (attendance)',
    ok: !attSelect.error && (attSelect.data?.length ?? 0) > 0,
    error: attSelect.error?.message,
    detail: `${attSelect.data?.length ?? 0} rows`,
  })

  await tryDelete('attendance', 'id', attId)
}

// 3. Today Report 관련 (student insert 성공 시)
if (!studentInsert.error) {
  const todayReportTests = [
    {
      name: '3a. 진도 INSERT (progress)',
      table: 'progress',
      row: {
        id: crypto.randomUUID(),
        student_id: testStudentId,
        subject: '수학',
        textbook_name: '테스트교재',
        current_progress: '1단원',
        current_page: 10,
        total_page: 100,
        progress_rate: 10,
        last_study_date: today,
        teacher_memo: '',
        created_at: now,
        updated_at: now,
      },
    },
    {
      name: '3b. 과제수행 INSERT (homework)',
      table: 'homework',
      row: {
        id: crypto.randomUUID(),
        student_id: testStudentId,
        date: today,
        title: '',
        description: 'CRUD 숙제',
        status: '완료',
        teacher_memo: '',
        created_at: now,
        updated_at: now,
      },
    },
    {
      name: '3c. 오늘의과제 INSERT (today_assignments)',
      table: 'today_assignments',
      row: {
        id: crypto.randomUUID(),
        student_id: testStudentId,
        date: today,
        assignment1: '과제1 CRUD',
        assignment2: '과제2 CRUD',
        created_at: now,
        updated_at: now,
      },
    },
    {
      name: '3d. 특이사항 INSERT (class_notes)',
      table: 'class_notes',
      row: {
        id: crypto.randomUUID(),
        student_id: testStudentId,
        date: today,
        has_class_note: true,
        note: 'CRUD 특이사항',
        created_at: now,
        updated_at: now,
      },
    },
    {
      name: '3e. 일일테스트 INSERT (daily_tests)',
      table: 'daily_tests',
      row: {
        id: crypto.randomUUID(),
        student_id: testStudentId,
        date: today,
        test_name: 'CRUD 테스트',
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
    },
  ]

  for (const test of todayReportTests) {
    const res = await tryInsert(test.table, test.row)
    log({
      name: test.name,
      ok: !res.error,
      error: res.error?.message,
    })
    if (!res.error) await tryDelete(test.table, 'id', test.row.id)
  }
}

// cleanup
if (!studentInsert.error) {
  const del = await tryDelete('students', 'id', testStudentId)
  log({
    name: '4. 학생 DELETE (students)',
    ok: !del.error,
    error: del.error?.message,
  })
}

console.log('\n--- Summary ---')
const passed = results.filter((r) => r.ok).length
const failed = results.filter((r) => !r.ok).length
console.log(`Passed: ${passed}, Failed: ${failed}`)
const rlsFailures = results.filter(
  (r) => !r.ok && r.error?.includes('row-level security'),
)
if (rlsFailures.length) {
  console.log('\nRLS blocked operations:')
  for (const r of rlsFailures) console.log(`  - ${r.name}`)
  console.log('\nFix: Supabase SQL Editor에서 supabase/rls-policies.sql 실행 필요')
}
process.exit(failed > 0 ? 1 : 0)
