/**
 * Production class_today_report_common 전체 검증
 * node scripts/verify-class-common-production.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function parseEnv(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

const env = parseEnv('.env.local')
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const ref = env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] ?? '?'

const results = []
function ok(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`)
}

console.log(`\n=== Production Supabase ref: ${ref} ===\n`)

// 1. textbook_name column via sample + upsert
const sample = await sb.from('class_today_report_common').select('*').limit(1)
const cols = sample.data?.[0] ? Object.keys(sample.data[0]) : []
ok('1. sample row readable', !sample.error, sample.error?.message ?? '')
ok('1. textbook_name in columns', cols.includes('textbook_name'), cols.join(', '))

const testDate = '2099-08-01'
const base = {
  grade: '__E2E__',
  class_name: '__E2E_MATH_A__',
  report_date: testDate,
  subject: '수학',
  slot_number: 1,
}

const payload = {
  ...base,
  textbook_name: 'E2E개념교재',
  current_progress: 'E2E진도1',
  current_page: 30,
  total_page: 100,
  previous_assignment: 'E2E전과제',
  today_assignment: 'E2E오늘과제',
}

const upsert = await sb
  .from('class_today_report_common')
  .upsert(payload, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
  .select('*')
  .single()

ok(
  '2. upsert with textbook_name (no PGRST204)',
  !upsert.error,
  upsert.error ? `${upsert.error.code} ${upsert.error.message}` : '',
)
ok(
  '2. saved textbook_name value',
  upsert.data?.textbook_name === 'E2E개념교재',
  upsert.data?.textbook_name ?? '',
)
ok(
  '2. saved homework fields',
  upsert.data?.previous_assignment === 'E2E전과제' &&
    upsert.data?.today_assignment === 'E2E오늘과제',
)
ok(
  '2. saved progress fields',
  upsert.data?.current_progress === 'E2E진도1' &&
    upsert.data?.current_page === 30 &&
    upsert.data?.total_page === 100,
)

// 3. Same class read (simulate student B reading same key)
const readSame = await sb
  .from('class_today_report_common')
  .select('*')
  .match(base)
  .single()
ok(
  '3. same-class read textbook_name',
  readSame.data?.textbook_name === 'E2E개념교재',
  readSame.data?.textbook_name ?? readSame.error?.message ?? '',
)

// 6. Math A ↔ Eng A dual-write (linked class_name)
const linkedPayload = {
  grade: '__E2E__',
  class_name: '__E2E_ENG_A__',
  report_date: testDate,
  subject: '수학',
  slot_number: 1,
  textbook_name: 'E2E수학A연동',
  current_progress: 'E2E수학A진도',
  current_page: 40,
  total_page: 100,
  previous_assignment: 'E2E수학A전',
  today_assignment: 'E2E수학A오늘',
}
const linkedUpsert = await sb
  .from('class_today_report_common')
  .upsert(linkedPayload, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
  .select('*')
  .single()
ok(
  '6. 영수A row upsert (math subject)',
  !linkedUpsert.error,
  linkedUpsert.error?.message ?? '',
)

const readEngA = await sb
  .from('class_today_report_common')
  .select('*')
  .match({
    grade: '__E2E__',
    class_name: '__E2E_ENG_A__',
    report_date: testDate,
    subject: '수학',
    slot_number: 1,
  })
  .single()
ok(
  '6. 영수A math slot readable',
  readEngA.data?.textbook_name === 'E2E수학A연동',
  readEngA.data?.textbook_name ?? '',
)

// 7. Math B row (separate from A)
const mathBPayload = {
  grade: '__E2E__',
  class_name: '__E2E_MATH_B__',
  report_date: testDate,
  subject: '수학',
  slot_number: 1,
  textbook_name: 'E2E수학B교재',
  current_progress: 'E2E수학B진도',
  current_page: 50,
  total_page: 100,
  previous_assignment: 'E2E수학B전',
  today_assignment: 'E2E수학B오늘',
}
const mathBUpsert = await sb
  .from('class_today_report_common')
  .upsert(mathBPayload, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
  .select('*')
  .single()
ok('7. 수학B upsert', !mathBUpsert.error, mathBUpsert.error?.message ?? '')

const engBPayload = { ...mathBPayload, class_name: '__E2E_ENG_B__', textbook_name: 'E2E영수B수학연동' }
const engBUpsert = await sb
  .from('class_today_report_common')
  .upsert(engBPayload, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
  .select('*')
  .single()
ok('7. 영수B upsert', !engBUpsert.error, engBUpsert.error?.message ?? '')

// A should NOT see B data
const crossRead = await sb
  .from('class_today_report_common')
  .select('textbook_name')
  .match({
    grade: '__E2E__',
    class_name: '__E2E_MATH_A__',
    report_date: testDate,
    subject: '수학',
    slot_number: 1,
  })
  .single()
ok(
  '7. 수학A ≠ 수학B isolation',
  crossRead.data?.textbook_name === 'E2E개념교재' &&
    crossRead.data?.textbook_name !== 'E2E수학B교재',
  crossRead.data?.textbook_name ?? '',
)

// English subject only in eng class (not shared with math-only class name)
const engOnlyPayload = {
  grade: '__E2E__',
  class_name: '__E2E_ENG_A__',
  report_date: testDate,
  subject: '영어',
  slot_number: 1,
  textbook_name: 'E2E영어문법',
  current_progress: 'E2E영어진도',
  current_page: 10,
  total_page: 50,
  previous_assignment: 'E2E영어전',
  today_assignment: 'E2E영어오늘',
}
const engOnly = await sb
  .from('class_today_report_common')
  .upsert(engOnlyPayload, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
  .select('*')
  .single()
ok('5. 영어 공통 저장', !engOnly.error, engOnly.error?.message ?? '')

// cleanup
await sb.from('class_today_report_common').delete().eq('grade', '__E2E__')

const failed = results.filter((r) => !r.pass)
console.log(`\n=== Summary: ${results.length - failed.length}/${results.length} passed ===`)
if (failed.length > 0) {
  console.error('FAILED:', failed.map((f) => f.name).join(', '))
  process.exit(1)
}
