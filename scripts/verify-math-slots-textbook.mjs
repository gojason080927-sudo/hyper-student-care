/**
 * 고1 수학A slot 1·2·3 교재명 저장·조회 검증
 * node scripts/verify-math-slots-textbook.mjs
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

function buildClassCommonRecord(params) {
  const { existing, timestamps, createId } = params
  let textbookName = existing?.textbookName?.trim() ?? ''
  if (params.textbookName !== undefined) {
    const trimmed = params.textbookName.trim()
    if (trimmed) textbookName = trimmed
  }
  return {
    id: params.id ?? existing?.id ?? crypto.randomUUID(),
    grade: params.grade,
    className: params.className,
    reportDate: params.reportDate,
    subject: params.subject,
    slotNumber: params.slotNumber,
    textbookName,
    currentProgress: params.currentProgress?.trim() ?? existing?.currentProgress ?? '',
    currentPage: params.currentPage ?? existing?.currentPage ?? 0,
    totalPage: params.totalPage ?? existing?.totalPage ?? 0,
    previousAssignment:
      params.previousAssignment?.trim() ?? existing?.previousAssignment ?? '',
    todayAssignment: params.todayAssignment?.trim() ?? existing?.todayAssignment ?? '',
    createdAt: existing?.createdAt ?? timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  }
}

const env = parseEnv('.env.local')
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const date = '2099-08-05'
const grade = '고1'
const classNames = ['고1 수학A', '고1 영수A']
const now = new Date().toISOString()
const names = { 1: '블랙라벨', 2: 'N제', 3: '개념원리-대수' }

console.log('=== Slot 1·2·3 textbook save test ===\n')

for (const slotNumber of [1, 2, 3]) {
  for (const className of classNames) {
    const record = buildClassCommonRecord({
      grade,
      className,
      reportDate: date,
      subject: '수학',
      slotNumber,
      textbookName: names[slotNumber],
      previousAssignment: slotNumber <= 2 ? `전과제${slotNumber}` : '',
      todayAssignment: '',
      timestamps: { createdAt: now, updatedAt: now },
      createId: () => crypto.randomUUID(),
    })
    const row = classTodayReportCommonToRow(record)
    const res = await sb
      .from('class_today_report_common')
      .upsert(row, { onConflict: 'grade,class_name,report_date,subject,slot_number' })
      .select('slot_number,class_name,textbook_name,previous_assignment')
      .single()
    console.log(
      slotNumber,
      className,
      res.error?.message ?? `OK textbook_name=${res.data?.textbook_name}`,
    )
  }
}

// homework-only save for slot 1 must NOT wipe textbook
const existing = await sb
  .from('class_today_report_common')
  .select('*')
  .match({ grade, class_name: '고1 수학A', report_date: date, subject: '수학', slot_number: 1 })
  .single()

const homeworkOnly = buildClassCommonRecord({
  grade,
  className: '고1 수학A',
  reportDate: date,
  subject: '수학',
  slotNumber: 1,
  textbookName: '',
  previousAssignment: '업데이트된 전과제',
  todayAssignment: '',
  existing: existing.data
    ? {
        id: existing.data.id,
        grade: existing.data.grade,
        className: existing.data.class_name,
        reportDate: existing.data.report_date,
        subject: existing.data.subject,
        slotNumber: existing.data.slot_number,
        textbookName: existing.data.textbook_name,
        currentProgress: existing.data.current_progress,
        currentPage: existing.data.current_page,
        totalPage: existing.data.total_page,
        previousAssignment: existing.data.previous_assignment,
        todayAssignment: existing.data.today_assignment,
        createdAt: existing.data.created_at,
        updatedAt: existing.data.updated_at,
      }
    : undefined,
  timestamps: { createdAt: now, updatedAt: now },
  createId: () => crypto.randomUUID(),
})

const hwRes = await sb
  .from('class_today_report_common')
  .upsert(classTodayReportCommonToRow(homeworkOnly), {
    onConflict: 'grade,class_name,report_date,subject,slot_number',
  })
  .select('textbook_name,previous_assignment')
  .single()

console.log(
  '\nHomework-only save preserves textbook:',
  hwRes.data?.textbook_name === '블랙라벨' &&
    hwRes.data?.previous_assignment === '업데이트된 전과제'
    ? 'OK'
    : `FAIL ${JSON.stringify(hwRes.data)}`,
)

await sb.from('class_today_report_common').delete().eq('grade', grade).eq('report_date', date)

console.log('\nDone')
