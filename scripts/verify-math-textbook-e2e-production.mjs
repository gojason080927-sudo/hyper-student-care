/**
 * Production 교재명 표시·저장 end-to-end 검증 (고1 수학A)
 * node scripts/verify-math-textbook-e2e-production.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

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

function getMathSharedLinkedClassNames(grade, className) {
  const g = grade.trim()
  const c = className.trim()
  const map = {
    '고1 수학A': ['고1 수학A', '고1 영수A'],
    '고1 영수A': ['고1 수학A', '고1 영수A'],
    '고1 수학B': ['고1 수학B', '고1 영수B'],
    '고1 영수B': ['고1 수학B', '고1 영수B'],
  }
  return map[c] ?? [c]
}

function buildClassCommonRecord(params) {
  const { existing, timestamps } = params
  let textbookName = existing?.textbook_name?.trim() ?? ''
  if (params.textbookName !== undefined) {
    const trimmed = params.textbookName.trim()
    if (trimmed) textbookName = trimmed
  }
  return {
    id: params.id ?? existing?.id ?? randomUUID(),
    grade: params.grade,
    class_name: params.className,
    report_date: params.reportDate,
    subject: params.subject,
    slot_number: params.slotNumber,
    textbook_name: textbookName,
    current_progress: params.currentProgress?.trim() ?? existing?.current_progress ?? '',
    current_page: params.currentPage ?? existing?.current_page ?? 0,
    total_page: params.totalPage ?? existing?.total_page ?? 0,
    previous_assignment:
      params.previousAssignment?.trim() ?? existing?.previous_assignment ?? '',
    today_assignment: params.todayAssignment?.trim() ?? existing?.today_assignment ?? '',
    created_at: existing?.created_at ?? timestamps.createdAt,
    updated_at: timestamps.updatedAt,
  }
}

function resolveDisplayTextbookName({
  commonRows,
  legacySlots,
  peerStudentIds,
  studentId,
  grade,
  className,
  date,
  subject,
  slotNumber,
}) {
  const common = commonRows.find(
    (r) =>
      r.grade === grade &&
      r.class_name === className &&
      r.report_date === date &&
      r.subject === subject &&
      r.slot_number === slotNumber,
  )
  const commonName = common?.textbook_name?.trim()
  if (commonName) return commonName

  for (const peerId of peerStudentIds) {
    const slot = legacySlots.find(
      (s) =>
        s.student_id === peerId &&
        s.subject === subject &&
        s.slot_number === slotNumber,
    )
    const name = slot?.textbook_name?.trim()
    if (name) return name
  }

  const own = legacySlots.find(
    (s) =>
      s.student_id === studentId &&
      s.subject === subject &&
      s.slot_number === slotNumber,
  )
  return own?.textbook_name?.trim() || '교재명 미입력'
}

const env = parseEnv('.env.local')
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const date = '2026-08-01'
const grade = '고1'
const className = '고1 수학A'
const linkedClasses = getMathSharedLinkedClassNames(grade, className)
const now = new Date().toISOString()

const results = []
function ok(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? `: ${detail}` : ''}`)
}

console.log('\n=== Math slot 1·2·3 textbook E2E (Production DB) ===\n')

const { data: students, error: stErr } = await sb
  .from('students')
  .select('id,name,grade,class_name,status')
  .eq('grade', grade)
  .in('class_name', linkedClasses)
if (stErr) throw stErr

const mathAStudents = students.filter((s) => s.class_name === className && s.status === '재원')
const peerIds = students
  .filter((s) => s.status === '재원' && linkedClasses.includes(s.class_name))
  .map((s) => s.id)

const studentA = mathAStudents.find((s) => s.name === '강나경') ?? mathAStudents[0]
const studentB = mathAStudents.find((s) => s.name !== studentA.name) ?? mathAStudents[1]

const { data: commonRows } = await sb
  .from('class_today_report_common')
  .select('*')
  .eq('grade', grade)
  .in('class_name', linkedClasses)
  .eq('report_date', date)
  .eq('subject', '수학')

const { data: legacySlots } = await sb
  .from('student_textbook_slots')
  .select('*')
  .in('student_id', peerIds)
  .eq('subject', '수학')

// READ: student B should see slot3 common + slot1·2 peer legacy (before common backfill)
for (const slot of [1, 2, 3]) {
  const name = resolveDisplayTextbookName({
    commonRows: commonRows ?? [],
    legacySlots: legacySlots ?? [],
    peerStudentIds: peerIds,
    studentId: studentB.id,
    grade,
    className,
    date,
    subject: '수학',
    slotNumber: slot,
  })
  if (slot === 3) {
    ok(`READ slot ${slot} (student B) common first`, name === '개념원리-대수', name)
  } else {
    ok(
      `READ slot ${slot} (student B) peer legacy fallback`,
      name !== '교재명 미입력' && name.length > 0,
      name,
    )
  }
}

// SAVE: slot 1·2·3 textbook names via fixed buildClassCommonRecord + dual-write
const saveNames = { 1: '블랙라벨', 2: 'N제', 3: '개념원리-대수' }
for (const slotNumber of [1, 2, 3]) {
  for (const targetClass of linkedClasses) {
    const existingRes = await sb
      .from('class_today_report_common')
      .select('*')
      .match({
        grade,
        class_name: targetClass,
        report_date: date,
        subject: '수학',
        slot_number: slotNumber,
      })
      .maybeSingle()

    const record = buildClassCommonRecord({
      grade,
      className: targetClass,
      reportDate: date,
      subject: '수학',
      slotNumber,
      textbookName: saveNames[slotNumber],
      existing: existingRes.data ?? undefined,
      timestamps: { createdAt: now, updatedAt: now },
    })

    const res = await sb
      .from('class_today_report_common')
      .upsert(record, {
        onConflict: 'grade,class_name,report_date,subject,slot_number',
      })
      .select('class_name,textbook_name')
      .single()

    ok(
      `SAVE slot ${slotNumber} → ${targetClass}`,
      !res.error && res.data?.textbook_name === saveNames[slotNumber],
      res.error?.message ?? res.data?.textbook_name ?? '',
    )
  }
}

// Homework-only save must NOT wipe slot 1 textbook
const slot1Existing = await sb
  .from('class_today_report_common')
  .select('*')
  .match({
    grade,
    class_name: className,
    report_date: date,
    subject: '수학',
    slot_number: 1,
  })
  .single()

const hwOnly = buildClassCommonRecord({
  grade,
  className,
  reportDate: date,
  subject: '수학',
  slotNumber: 1,
  textbookName: '',
  previousAssignment: '개념쎈 P 163까지',
  todayAssignment: '',
  existing: slot1Existing.data ?? undefined,
  timestamps: { createdAt: now, updatedAt: now },
})

const hwRes = await sb
  .from('class_today_report_common')
  .upsert(hwOnly, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
  .select('textbook_name,previous_assignment')
  .single()

ok(
  'Homework-only save preserves slot 1 textbook',
  hwRes.data?.textbook_name === '블랙라벨',
  JSON.stringify(hwRes.data),
)

// READ after save: student B + 영수A student
const { data: commonAfter } = await sb
  .from('class_today_report_common')
  .select('*')
  .eq('grade', grade)
  .in('class_name', linkedClasses)
  .eq('report_date', date)
  .eq('subject', '수학')

for (const slot of [1, 2, 3]) {
  const nameB = resolveDisplayTextbookName({
    commonRows: commonAfter ?? [],
    legacySlots: legacySlots ?? [],
    peerStudentIds: peerIds,
    studentId: studentB.id,
    grade,
    className,
    date,
    subject: '수학',
    slotNumber: slot,
  })
  ok(`POST-SAVE slot ${slot} student B (${studentB.name})`, nameB === saveNames[slot], nameB)
}

const engStudent = students.find((s) => s.class_name === '고1 영수A' && s.status === '재원')
if (engStudent) {
  for (const slot of [1, 2, 3]) {
    const name = resolveDisplayTextbookName({
      commonRows: commonAfter ?? [],
      legacySlots: legacySlots ?? [],
      peerStudentIds: peerIds,
      studentId: engStudent.id,
      grade,
      className: '고1 영수A',
      date,
      subject: '수학',
      slotNumber: slot,
    })
    ok(`POST-SAVE slot ${slot} 영수A (${engStudent.name})`, name === saveNames[slot], name)
  }
}

// B group isolation
const { data: mathBCommon } = await sb
  .from('class_today_report_common')
  .select('textbook_name,slot_number')
  .eq('grade', grade)
  .in('class_name', ['고1 수학B', '고1 영수B'])
  .eq('report_date', date)
  .eq('subject', '수학')

const bHasANames = (mathBCommon ?? []).some((r) =>
  Object.values(saveNames).includes(r.textbook_name?.trim()),
)
ok('Math B group NOT affected', !bHasANames, bHasANames ? 'found A names in B' : '')

const passed = results.filter((r) => r.pass).length
const total = results.length
console.log(`\n=== ${passed}/${total} passed ===\n`)
process.exit(passed === total ? 0 : 1)
