/**
 * Supabase CRUD 연동 테스트 (Node.js)
 * 실행: node scripts/test-supabase-crud.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  const raw = readFileSync(path, 'utf8')
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
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('FAIL: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing in .env.local')
  process.exit(1)
}

const supabase = createClient(url, key)
const tables = [
  'students',
  'attendance',
  'homework',
  'daily_tests',
  'monthly_evaluations',
  'makeup_plans',
  'notices',
  'questions',
  'assignment_completions',
  'progress',
  'today_assignments',
  'class_notes',
]

const results = []

async function testTableRead(table) {
  const { data, error } = await supabase.from(table).select('*').limit(5)
  return {
    op: 'SELECT',
    table,
    ok: !error,
    count: data?.length ?? 0,
    error: error?.message,
  }
}

async function testStudentCrud() {
  const testId = crypto.randomUUID()
  const accessKey = `test-${Date.now()}`
  const now = new Date().toISOString()
  const today = now.slice(0, 10)

  const row = {
    id: testId,
    name: 'CRUD테스트학생',
    student_access_key: accessKey,
    school: '테스트학교',
    grade: '중1',
    student_phone: '',
    parent_phone: '',
    class_name: '테스트반',
    subjects: ['수학'],
    teacher: '테스트강사',
    enrollment_date: today,
    status: '재원',
    memo: 'auto crud test — safe to delete',
    created_at: now,
    updated_at: now,
  }

  const insert = await supabase.from('students').insert(row)
  if (insert.error) {
    return { op: 'STUDENT_CRUD', ok: false, error: insert.error.message }
  }

  const select = await supabase
    .from('students')
    .select('*')
    .eq('student_access_key', accessKey)
    .maybeSingle()
  if (select.error || !select.data) {
    await supabase.from('students').delete().eq('id', testId)
    return {
      op: 'STUDENT_CRUD',
      ok: false,
      error: select.error?.message ?? 'select after insert failed',
    }
  }

  const update = await supabase
    .from('students')
    .update({ memo: 'updated by crud test', updated_at: new Date().toISOString() })
    .eq('id', testId)
  if (update.error) {
    await supabase.from('students').delete().eq('id', testId)
    return { op: 'STUDENT_CRUD', ok: false, error: update.error.message }
  }

  const attendanceRow = {
    id: crypto.randomUUID(),
    student_id: testId,
    date: today,
    status: '출석',
    reason: '',
    memo: 'crud test',
    created_at: now,
    updated_at: now,
  }
  const attInsert = await supabase.from('attendance').insert(attendanceRow)
  if (attInsert.error) {
    await supabase.from('students').delete().eq('id', testId)
    return { op: 'STUDENT_CRUD', ok: false, error: attInsert.error.message }
  }

  const attSelect = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', testId)
    .eq('date', today)
  if (attSelect.error || !attSelect.data?.length) {
    await supabase.from('students').delete().eq('id', testId)
    return {
      op: 'STUDENT_CRUD',
      ok: false,
      error: attSelect.error?.message ?? 'attendance select failed',
    }
  }

  const delStudent = await supabase.from('students').delete().eq('id', testId)
  if (delStudent.error) {
    return { op: 'STUDENT_CRUD', ok: false, error: delStudent.error.message }
  }

  return {
    op: 'STUDENT_CRUD',
    ok: true,
    detail: `insert/update/select/delete OK (test student ${testId})`,
  }
}

console.log('Supabase CRUD Test')
console.log('URL:', url)

for (const table of tables) {
  results.push(await testTableRead(table))
}

results.push(await testStudentCrud())

let allOk = true
for (const r of results) {
  const label = r.table ? `${r.op} ${r.table}` : r.op
  if (r.ok) {
    console.log(`OK  ${label}${r.count !== undefined ? ` (${r.count} rows)` : ''}${r.detail ? ` — ${r.detail}` : ''}`)
  } else {
    allOk = false
    console.error(`FAIL ${label}: ${r.error}`)
  }
}

process.exit(allOk ? 0 : 1)
