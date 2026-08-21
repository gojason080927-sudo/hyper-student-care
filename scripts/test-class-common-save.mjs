/**
 * class_today_report_common 스키마 확인 + 반 공통 저장 검증
 * node scripts/test-class-common-save.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const raw = readFileSync('.env.local', 'utf8')
const env = {}
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

function ok(label, pass, detail = '') {
  console.log(`${pass ? '✓' : '✗'} ${label}${detail ? `: ${detail}` : ''}`)
  return pass
}

// 1. 스키마 확인 — 샘플 행에서 컬럼 추출
const sample = await sb.from('class_today_report_common').select('*').limit(1)
if (sample.error) {
  console.error('테이블 조회 실패:', sample.error.message)
  process.exit(1)
}

const columns = sample.data?.[0] ? Object.keys(sample.data[0]) : []
console.log('\n=== class_today_report_common 컬럼 ===')
console.log(columns.join(', '))

ok('textbook_name 컬럼 없음', !columns.includes('textbook_name'))
ok('book_name 등 대체 컬럼 없음', !columns.some((c) =>
  ['book_name', 'textbook', 'material_name', 'title', 'name'].includes(c),
))

// 2. textbook_name 없이 upsert 가능한지
const testKey = {
  grade: '__TEST__',
  class_name: '__TEST_CLASS__',
  report_date: '2099-01-01',
  subject: '수학',
  slot_number: 1,
}
const upsertPayload = {
  ...testKey,
  current_progress: '테스트진도',
  current_page: 10,
  total_page: 100,
  previous_assignment: '테스트전과제',
  today_assignment: '테스트오늘과제',
}

const upsert = await sb
  .from('class_today_report_common')
  .upsert(upsertPayload, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
  .select('*')
  .single()

ok('textbook_name 없이 upsert 성공', !upsert.error, upsert.error?.message ?? '')

// 3. 조회 후 값 확인
const read = await sb
  .from('class_today_report_common')
  .select('*')
  .match(testKey)
  .single()

ok(
  '숙제·진도 공통값 저장 확인',
  read.data?.today_assignment === '테스트오늘과제' &&
    read.data?.current_progress === '테스트진도',
)

// 4. textbook_name 포함 upsert는 실패해야 함
const badUpsert = await sb
  .from('class_today_report_common')
  .upsert({ ...upsertPayload, textbook_name: 'bad' })
  .select('*')

ok(
  'textbook_name 포함 upsert 거부',
  Boolean(badUpsert.error),
  badUpsert.error?.message ?? 'unexpected success',
)

// 5. student_textbook_slots 교재명 저장 (반 공유용 테이블)
const students = await sb.from('students').select('id,grade,class_name,status').eq('status', '재원').limit(5)
const peerIds = students.data?.slice(0, 2).map((s) => s.id) ?? []
if (peerIds.length >= 2) {
  const testName = `반공통테스트_${Date.now()}`
  for (const studentId of peerIds) {
    await sb.from('student_textbook_slots').upsert(
      {
        student_id: studentId,
        subject: '수학',
        slot_number: 1,
        textbook_name: testName,
      },
      { onConflict: 'student_id,subject,slot_number' },
    )
  }
  const slots = await sb
    .from('student_textbook_slots')
    .select('student_id,textbook_name')
    .in('student_id', peerIds)
    .eq('subject', '수학')
    .eq('slot_number', 1)

  const allMatch = slots.data?.every((s) => s.textbook_name === testName)
  ok('student_textbook_slots 반 학생 교재명 동기화', Boolean(allMatch))
} else {
  ok('student_textbook_slots 반 학생 교재명 동기화', true, '재원 학생 2명 미만 — 스킵')
}

// cleanup test row
await sb.from('class_today_report_common').delete().match(testKey)

console.log('\n완료')
