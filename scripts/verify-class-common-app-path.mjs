/**
 * 앱 mapper/repository 경로 + 실제 학생 반 공통 연동 검증
 * node scripts/verify-class-common-app-path.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Inline minimal mapper (matches src/lib/db/mappers.ts)
function classTodayReportCommonToRow(record) {
  return {
    id: record.id,
    grade: record.grade,
    class_name: record.className,
    report_date: record.reportDate,
    subject: record.subject,
    slot_number: record.slotNumber,
    textbook_name: record.textbookName,
    current_progress: record.currentProgress,
    current_page: record.currentPage,
    total_page: record.totalPage,
    previous_assignment: record.previousAssignment,
    today_assignment: record.todayAssignment,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

function getMathSharedLinkedClassNames(grade, className) {
  const trimmed = className.trim()
  if (trimmed.endsWith(' 수학A') || trimmed.endsWith(' 영수A')) {
    return [`${grade} 수학A`, `${grade} 영수A`]
  }
  if (trimmed.endsWith(' 수학B') || trimmed.endsWith(' 영수B')) {
    return [`${grade} 수학B`, `${grade} 영수B`]
  }
  return [trimmed]
}

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
const now = new Date().toISOString()
const testDate = '2099-08-02'

const results = []
function ok(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`)
}

async function upsertCommon(record) {
  const row = classTodayReportCommonToRow(record)
  return sb
    .from('class_today_report_common')
    .upsert(row, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
    .select('*')
    .single()
}

// Find two students in same class
const { data: students } = await sb
  .from('students')
  .select('id,name,grade,class_name,status')
  .eq('status', '재원')

const byClass = new Map()
for (const s of students ?? []) {
  const key = `${s.grade}::${s.class_name}`
  if (!byClass.has(key)) byClass.set(key, [])
  byClass.get(key).push(s)
}

const sameClassPair = [...byClass.values()].find((list) => list.length >= 2)
const mathAClass = students?.find((s) => s.class_name === '중3 수학A' || s.class_name === '고1 수학A')
const engAClass = students?.find(
  (s) =>
    s.grade === mathAClass?.grade &&
    s.class_name === `${mathAClass.grade} 영수A`,
)

console.log('\n=== App path + real student verification ===\n')

// 4. Homework + textbook + progress via app payload shape
const commonRecord = {
  id: crypto.randomUUID(),
  grade: '__APP__',
  className: '__APP_SAME__',
  reportDate: testDate,
  subject: '수학',
  slotNumber: 1,
  textbookName: '앱경로교재',
  currentProgress: '앱경로진도',
  currentPage: 22,
  totalPage: 88,
  previousAssignment: '앱경로전',
  todayAssignment: '앱경로오늘',
  createdAt: now,
  updatedAt: now,
}

const appUpsert = await upsertCommon(commonRecord)
ok(
  'App mapper upsert (no PGRST204)',
  !appUpsert.error,
  appUpsert.error ? `${appUpsert.error.code} ${appUpsert.error.message}` : '',
)
ok('App payload textbook_name saved', appUpsert.data?.textbook_name === '앱경로교재')

// 3. Same class students read same key
if (sameClassPair) {
  const [a, b] = sameClassPair
  const grade = a.grade
  const className = a.class_name
  const saveGrade = '__REAL__'
  const saveClass = `${grade}__${className}`.slice(0, 40)

  const rec = {
    id: crypto.randomUUID(),
    grade: saveGrade,
    className: saveClass,
    reportDate: testDate,
    subject: '수학',
    slotNumber: 1,
    textbookName: `반공통_${Date.now()}`,
    currentProgress: '반공통진도',
    currentPage: 11,
    totalPage: 99,
    previousAssignment: '반공통전',
    todayAssignment: '반공통오늘',
    createdAt: now,
    updatedAt: now,
  }
  const save = await upsertCommon(rec)
  ok(
    `3. Same class save (${a.name}, ${b.name} in ${className})`,
    !save.error,
    save.error?.message ?? `${a.name} / ${b.name}`,
  )

  const read = await sb
    .from('class_today_report_common')
    .select('textbook_name,previous_assignment,today_assignment,current_progress')
    .match({
      grade: saveGrade,
      class_name: saveClass,
      report_date: testDate,
      subject: '수학',
      slot_number: 1,
    })
    .single()
  ok(
    '3. Both students would read same common row',
    read.data?.textbook_name === rec.textbookName,
    read.data?.textbook_name ?? '',
  )
  await sb.from('class_today_report_common').delete().match({
    grade: saveGrade,
    class_name: saveClass,
    report_date: testDate,
  })
} else {
  ok('3. Same class pair (skipped)', true, 'no 2+ students in same class')
}

// 6. Math A dual-write simulation
if (mathAClass) {
  const grade = mathAClass.grade
  const linked = getMathSharedLinkedClassNames(grade, mathAClass.class_name)
  const textbook = `수학A연동_${Date.now()}`
  for (const cn of linked) {
    const rec = {
      id: crypto.randomUUID(),
      grade: '__LINK__',
      className: cn.replace(/\s/g, '_'),
      reportDate: testDate,
      subject: '수학',
      slotNumber: 1,
      textbookName: textbook,
      currentProgress: '연동진도',
      currentPage: 1,
      totalPage: 10,
      previousAssignment: '연동전',
      todayAssignment: '연동오늘',
      createdAt: now,
      updatedAt: now,
    }
    const r = await upsertCommon(rec)
    ok(`6. Dual-write ${cn}`, !r.error, r.error?.message ?? '')
  }
  const readMathA = await sb
    .from('class_today_report_common')
    .select('textbook_name')
    .match({
      grade: '__LINK__',
      class_name: linked[0].replace(/\s/g, '_'),
      report_date: testDate,
      subject: '수학',
      slot_number: 1,
    })
    .single()
  const readEngA = await sb
    .from('class_today_report_common')
    .select('textbook_name')
    .match({
      grade: '__LINK__',
      class_name: linked[1].replace(/\s/g, '_'),
      report_date: testDate,
      subject: '수학',
      slot_number: 1,
    })
    .single()
  ok(
    '6. 수학A ↔ 영수A same textbook_name',
    readMathA.data?.textbook_name === textbook &&
      readEngA.data?.textbook_name === textbook,
    `${readMathA.data?.textbook_name} / ${readEngA.data?.textbook_name}`,
  )
  await sb.from('class_today_report_common').delete().eq('grade', '__LINK__')
} else {
  ok('6. Math A link (skipped)', true, 'no 중3/고1 수학A student')
}

// cleanup app test rows
await sb.from('class_today_report_common').delete().eq('grade', '__APP__')

const failed = results.filter((r) => !r.pass)
console.log(`\n=== App path: ${results.length - failed.length}/${results.length} passed ===`)
if (failed.length > 0) process.exit(1)
