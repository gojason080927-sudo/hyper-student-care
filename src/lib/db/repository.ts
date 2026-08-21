import { getSupabase } from '../supabase'
import { generateStudentAccessKey } from '../../utils/studentAccessKey'
import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ClassNoteRecord,
  ClassScheduleGrid,
  ClassTodayReportCommon,
  ContentPost,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  MonthlyLearningReportRecord,
  ProgressRecord,
  QuestionRecord,
  StudentTextbookSlot,
  TodayAssignmentRecord,
} from '../../types/records'
import type { Student } from '../../types/student'
import {
  assignmentCompletionFromRow,
  assignmentCompletionToRow,
  attendanceFromRow,
  attendanceToRow,
  classNoteFromRow,
  classNoteToRow,
  classScheduleGridFromRow,
  classScheduleGridToRow,
  classTodayReportCommonFromRow,
  classTodayReportCommonToRow,
  dailyTestFromRow,
  dailyTestToRow,
  homeworkFromRow,
  homeworkTextbookEntryFromRow,
  homeworkTextbookEntryToRow,
  homeworkToRow,
  makeupPlanFromRow,
  makeupPlanToRow,
  monthlyEvaluationFromRow,
  monthlyEvaluationToRow,
  monthlyLearningReportFromRow,
  monthlyLearningReportToRow,
  noticeFromRow,
  noticeToRow,
  progressFromRow,
  progressToRow,
  studentTextbookSlotFromRow,
  studentTextbookSlotToRow,
  questionFromRow,
  questionToRow,
  studentFromRow,
  studentToRow,
  todayAssignmentFromRow,
  todayAssignmentToRow,
  type AssignmentCompletionRow,
  type AttendanceRow,
  type ClassNoteRow,
  type ClassScheduleGridRow,
  type ClassTodayReportCommonRow,
  type DailyTestRow,
  type HomeworkRow,
  type HomeworkTextbookEntryRow,
  type MakeupPlanRow,
  type MonthlyEvaluationRow,
  type MonthlyLearningReportRow,
  type NoticeRow,
  type ProgressRow,
  type StudentTextbookSlotRow,
  type QuestionRow,
  type StudentRow,
  type TodayAssignmentRow,
} from './mappers'

export class RepositoryError extends Error {
  table: string
  cause?: unknown

  constructor(message: string, table: string, cause?: unknown) {
    super(message)
    this.name = 'RepositoryError'
    this.table = table
    this.cause = cause
  }
}

function throwIfError(
  error: { message: string; code?: string } | null,
  table: string,
  context: string,
): void {
  if (error) {
    throw new RepositoryError(`${context}: ${error.message}`, table, error)
  }
}

function isMissingColumnError(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? ''
  return (
    error.code === 'PGRST204' ||
    /could not find the .+ column/i.test(message) ||
    /column .+ does not exist/i.test(message)
  )
}

function isMissingTableError(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? ''
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist/i.test(message) ||
    /could not find the table/i.test(message)
  )
}

async function selectAll<T>(table: string): Promise<T[]> {
  const { data, error } = await getSupabase().from(table).select('*')
  throwIfError(error, table, `${table} 조회 실패`)
  return (data ?? []) as T[]
}

async function selectAllSafe<T>(table: string): Promise<T[]> {
  const { data, error } = await getSupabase().from(table).select('*')
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        `[Repository] ${table} table missing — returning empty list. Run supabase/textbook-slots-migration.sql in Supabase SQL Editor.`,
      )
      return []
    }
    throwIfError(error, table, `${table} 조회 실패`)
  }
  return (data ?? []) as T[]
}

async function selectByStudentIdSafe<T>(table: string, studentId: string): Promise<T[]> {
  const { data, error } = await getSupabase()
    .from(table)
    .select('*')
    .eq('student_id', studentId)
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(
        `[Repository] ${table} table missing — returning empty list. Run supabase/textbook-slots-migration.sql in Supabase SQL Editor.`,
      )
      return []
    }
    throwIfError(error, table, `${table} student_id 조회 실패`)
  }
  return (data ?? []) as T[]
}

async function selectByStudentId<T>(table: string, studentId: string): Promise<T[]> {
  const { data, error } = await getSupabase()
    .from(table)
    .select('*')
    .eq('student_id', studentId)
  throwIfError(error, table, `${table} student_id 조회 실패`)
  return (data ?? []) as T[]
}

async function selectByStudentAndDate<T>(
  table: string,
  studentId: string,
  date: string,
): Promise<T[]> {
  const { data, error } = await getSupabase()
    .from(table)
    .select('*')
    .eq('student_id', studentId)
    .eq('date', date)
  throwIfError(error, table, `${table} student_id+date 조회 실패`)
  return (data ?? []) as T[]
}

async function selectOneByStudentAndDate<T>(
  table: string,
  studentId: string,
  date: string,
): Promise<T | null> {
  const rows = await selectByStudentAndDate<T>(table, studentId, date)
  return rows[0] ?? null
}

async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabase().from(table).insert(row)
  throwIfError(error, table, `${table} 등록 실패`)
}

async function updateRow(
  table: string,
  id: string,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await getSupabase().from(table).update(row).eq('id', id)
  throwIfError(error, table, `${table} 수정 실패`)
}

async function upsertRow(table: string, row: Record<string, unknown>): Promise<void> {
  const { error } = await getSupabase().from(table).upsert(row, { onConflict: 'id' })
  throwIfError(error, table, `${table} 저장 실패`)
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await getSupabase().from(table).delete().eq('id', id)
  throwIfError(error, table, `${table} 삭제 실패`)
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

export async function fetchStudents(): Promise<Student[]> {
  const rows = await selectAll<StudentRow>('students')
  return rows.map(studentFromRow)
}

export async function fetchStudentById(id: string): Promise<Student | null> {
  const { data, error } = await getSupabase()
    .from('students')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  throwIfError(error, 'students', 'students id 조회 실패')
  return data ? studentFromRow(data as StudentRow) : null
}

export async function fetchStudentByAccessKey(accessKey: string): Promise<Student | null> {
  const normalizedKey = accessKey.trim()
  console.log('[ParentAccess] Supabase students query start', {
    column: 'student_access_key',
    keyPreview: normalizedKey ? `${normalizedKey.slice(0, 4)}…` : '(empty)',
  })

  const { data, error } = await getSupabase()
    .from('students')
    .select('*')
    .eq('student_access_key', normalizedKey)
    .maybeSingle()

  if (error) {
    console.error('[ParentAccess] Supabase students query error:', error)
    throwIfError(error, 'students', 'students access_key 조회 실패')
  }

  if (!data) {
    console.warn('[ParentAccess] Supabase students query: no matching row (RLS or key mismatch)')
    return null
  }

  const student = studentFromRow(data as StudentRow)
  console.log('[ParentAccess] Supabase students query success', {
    studentId: student.id,
    accessKeyActive: student.accessKeyActive,
    hasAccessKey: Boolean(student.studentAccessKey),
  })
  return student
}

function isStudentAccessKeyUniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === '23505' && /student_access_key/i.test(error.message ?? '')
}

const STUDENT_UPSERT_MAX_RETRIES = 8

export async function upsertStudent(student: Student): Promise<void> {
  let current = student
  for (let attempt = 0; attempt < STUDENT_UPSERT_MAX_RETRIES; attempt++) {
    const { error } = await getSupabase()
      .from('students')
      .upsert(studentToRow(current), { onConflict: 'id' })
    if (!error) return
    if (isStudentAccessKeyUniqueViolation(error) && attempt < STUDENT_UPSERT_MAX_RETRIES - 1) {
      current = { ...current, studentAccessKey: generateStudentAccessKey() }
      continue
    }
    throwIfError(error, 'students', 'students 저장 실패')
  }
}

export async function insertStudent(student: Student): Promise<void> {
  await insertRow('students', studentToRow(student))
}

export async function updateStudentRecord(student: Student): Promise<void> {
  await updateRow('students', student.id, studentToRow(student))
}

export async function deleteStudentById(id: string): Promise<void> {
  await deleteRow('students', id)
}

// ---------------------------------------------------------------------------
// All records
// ---------------------------------------------------------------------------

export type AllRecords = {
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  assignmentCompletion: AssignmentCompletionRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  monthlyLearningReports: MonthlyLearningReportRecord[]
  questions: QuestionRecord[]
  progress: ProgressRecord[]
  studentTextbookSlots: StudentTextbookSlot[]
  makeupPlans: MakeupPlanRecord[]
  contentPosts: ContentPost[]
  classScheduleGrids: ClassScheduleGrid[]
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
  classTodayReportCommon: ClassTodayReportCommon[]
}

export async function fetchAllRecords(): Promise<AllRecords> {
  const [
    attendanceRows,
    homeworkRows,
    homeworkTextbookEntryRows,
    assignmentRows,
    dailyTestRows,
    monthlyRows,
    monthlyLearningReportRows,
    questionRows,
    progressRows,
    studentTextbookSlotRows,
    makeupRows,
    noticeRows,
    classScheduleGridRows,
    todayAssignmentRows,
    classNoteRows,
    classTodayReportCommonRows,
  ] = await Promise.all([
    selectAll<AttendanceRow>('attendance'),
    selectAll<HomeworkRow>('homework'),
    selectAllSafe<HomeworkTextbookEntryRow>('homework_textbook_entries'),
    selectAll<AssignmentCompletionRow>('assignment_completions'),
    selectAll<DailyTestRow>('daily_tests'),
    selectAll<MonthlyEvaluationRow>('monthly_evaluations'),
    selectAllSafe<MonthlyLearningReportRow>('monthly_learning_reports'),
    selectAll<QuestionRow>('questions'),
    selectAll<ProgressRow>('progress'),
    selectAllSafe<StudentTextbookSlotRow>('student_textbook_slots'),
    selectAll<MakeupPlanRow>('makeup_plans'),
    selectAll<NoticeRow>('notices'),
    selectAllSafe<ClassScheduleGridRow>('class_schedule_grids'),
    selectAll<TodayAssignmentRow>('today_assignments'),
    selectAll<ClassNoteRow>('class_notes'),
    selectAllSafe<ClassTodayReportCommonRow>('class_today_report_common'),
  ])

  return {
    attendance: attendanceRows.map(attendanceFromRow),
    homework: homeworkRows.map(homeworkFromRow),
    homeworkTextbookEntries: homeworkTextbookEntryRows.map(homeworkTextbookEntryFromRow),
    assignmentCompletion: assignmentRows.map(assignmentCompletionFromRow),
    dailyTests: dailyTestRows.map(dailyTestFromRow),
    monthlyEvaluations: monthlyRows.map(monthlyEvaluationFromRow),
    monthlyLearningReports: monthlyLearningReportRows.map(monthlyLearningReportFromRow),
    questions: questionRows.map(questionFromRow),
    progress: progressRows.map(progressFromRow),
    studentTextbookSlots: studentTextbookSlotRows.map(studentTextbookSlotFromRow),
    makeupPlans: makeupRows.map(makeupPlanFromRow),
    contentPosts: noticeRows.map(noticeFromRow),
    classScheduleGrids: classScheduleGridRows.map(classScheduleGridFromRow),
    todayAssignments: todayAssignmentRows.map(todayAssignmentFromRow),
    classNotes: classNoteRows.map(classNoteFromRow),
    classTodayReportCommon: classTodayReportCommonRows.map(classTodayReportCommonFromRow),
  }
}

export async function fetchAllData(): Promise<{ students: Student[] } & AllRecords> {
  const [students, records] = await Promise.all([fetchStudents(), fetchAllRecords()])
  return { students, ...records }
}

// ---------------------------------------------------------------------------
// Today Report — student + date 기준 일괄 조회
// ---------------------------------------------------------------------------

export type TodayReportData = {
  attendance: AttendanceRecord | null
  progress: ProgressRecord[]
  assignmentCompletion: AssignmentCompletionRecord[]
  homework: HomeworkRecord | null
  homeworkTextbookEntries?: HomeworkTextbookEntry[]
  studentTextbookSlots?: StudentTextbookSlot[]
  todayAssignment: TodayAssignmentRecord | null
  classNote: ClassNoteRecord | null
  /** @deprecated Prefer dailyTests — kept for RPC/compat (첫 1건) */
  dailyTest: DailyTestRecord | null
  /** 같은 날짜 수학/영어 등 복수 일일테스트 */
  dailyTests?: DailyTestRecord[]
  classTodayReportCommon?: ClassTodayReportCommon[]
}

export async function fetchTodayReportData(
  studentId: string,
  date: string,
): Promise<TodayReportData> {
  const [
    attendanceRows,
    progressRows,
    assignmentRows,
    homeworkRows,
    homeworkTextbookEntryRows,
    studentTextbookSlotRows,
    todayAssignmentRow,
    classNoteRow,
    dailyTestRows,
  ] = await Promise.all([
    selectByStudentAndDate<AttendanceRow>('attendance', studentId, date),
    getSupabase()
      .from('progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('last_study_date', date)
      .then(({ data, error }) => {
        throwIfError(error, 'progress', 'progress last_study_date 조회 실패')
        return (data ?? []) as ProgressRow[]
      }),
    selectByStudentAndDate<AssignmentCompletionRow>(
      'assignment_completions',
      studentId,
      date,
    ),
    selectByStudentAndDate<HomeworkRow>('homework', studentId, date),
    selectByStudentAndDateSafe<HomeworkTextbookEntryRow>(
      'homework_textbook_entries',
      studentId,
      date,
    ),
    selectByStudentIdSafe<StudentTextbookSlotRow>('student_textbook_slots', studentId),
    selectOneByStudentAndDate<TodayAssignmentRow>('today_assignments', studentId, date),
    selectOneByStudentAndDate<ClassNoteRow>('class_notes', studentId, date),
    selectByStudentAndDate<DailyTestRow>('daily_tests', studentId, date),
  ])

  return {
    attendance: attendanceRows[0] ? attendanceFromRow(attendanceRows[0]) : null,
    progress: progressRows.map(progressFromRow),
    assignmentCompletion: assignmentRows.map(assignmentCompletionFromRow),
    homework: homeworkRows[0] ? homeworkFromRow(homeworkRows[0]) : null,
    homeworkTextbookEntries: homeworkTextbookEntryRows.map(homeworkTextbookEntryFromRow),
    studentTextbookSlots: studentTextbookSlotRows.map(studentTextbookSlotFromRow),
    todayAssignment: todayAssignmentRow
      ? todayAssignmentFromRow(todayAssignmentRow)
      : null,
    classNote: classNoteRow ? classNoteFromRow(classNoteRow) : null,
    dailyTests: dailyTestRows.map(dailyTestFromRow),
    dailyTest: dailyTestRows[0] ? dailyTestFromRow(dailyTestRows[0]) : null,
  }
}

async function selectByStudentAndDateSafe<T>(
  table: string,
  studentId: string,
  date: string,
): Promise<T[]> {
  const { data, error } = await getSupabase()
    .from(table)
    .select('*')
    .eq('student_id', studentId)
    .eq('date', date)
  if (error) {
    if (error.code === '42P01' || /does not exist/i.test(error.message ?? '')) {
      return []
    }
    throwIfError(error, table, `${table} student_id+date 조회 실패`)
  }
  return (data ?? []) as T[]
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export async function fetchAttendanceByStudent(studentId: string): Promise<AttendanceRecord[]> {
  const rows = await selectByStudentId<AttendanceRow>('attendance', studentId)
  return rows.map(attendanceFromRow)
}

export async function upsertAttendance(record: AttendanceRecord): Promise<void> {
  await upsertRow('attendance', attendanceToRow(record))
}

export async function deleteAttendance(id: string): Promise<void> {
  await deleteRow('attendance', id)
}

// ---------------------------------------------------------------------------
// Homework
// ---------------------------------------------------------------------------

export async function fetchHomeworkByStudent(studentId: string): Promise<HomeworkRecord[]> {
  const rows = await selectByStudentId<HomeworkRow>('homework', studentId)
  return rows.map(homeworkFromRow)
}

export async function upsertHomework(record: HomeworkRecord): Promise<void> {
  await upsertRow('homework', homeworkToRow(record))
}

export async function upsertHomeworkTextbookEntry(
  record: HomeworkTextbookEntry,
): Promise<void> {
  const { error } = await getSupabase()
    .from('homework_textbook_entries')
    .upsert(homeworkTextbookEntryToRow(record), {
      onConflict: 'student_id,date,subject,slot_number',
    })
  throwIfError(error, 'homework_textbook_entries', 'homework_textbook_entries 저장 실패')
}

export async function upsertClassTodayReportCommon(
  record: ClassTodayReportCommon,
): Promise<void> {
  const row = classTodayReportCommonToRow(record)
  const { error } = await getSupabase()
    .from('class_today_report_common')
    .upsert(row, {
      onConflict: 'grade,class_name,report_date,subject,slot_number',
    })
  if (error) {
    console.error('[Repository] class_today_report_common upsert failed', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      payloadKeys: Object.keys(row),
    })
    if (isMissingTableError(error)) {
      throw new RepositoryError(
        'class_today_report_common 테이블이 없습니다. Supabase SQL Editor에서 supabase/class-today-report-common-migration.sql을 실행해 주세요.',
        'class_today_report_common',
        error,
      )
    }
    throwIfError(error, 'class_today_report_common', '반별 공통 Today Report 저장 실패')
  }
}

function isUnifiedSlotConflictError(error: { message?: string }): boolean {
  return /unique or exclusion constraint/i.test(error.message ?? '')
}

export async function upsertStudentTextbookSlot(
  record: StudentTextbookSlot,
): Promise<void> {
  const row = studentTextbookSlotToRow(record)
  const supabase = getSupabase()

  const unified = await supabase.from('student_textbook_slots').upsert(row, {
    onConflict: 'student_id,subject,slot_number',
  })

  if (!unified.error) {
    return
  }

  if (isMissingTableError(unified.error)) {
    throw new RepositoryError(
      'student_textbook_slots 테이블이 없습니다. Supabase SQL Editor에서 supabase/textbook-slots-migration.sql을 실행해 주세요.',
      'student_textbook_slots',
      unified.error,
    )
  }

  if (!isUnifiedSlotConflictError(unified.error)) {
    console.error('[Repository] student_textbook_slots upsert failed', {
      row,
      code: unified.error.code,
      message: unified.error.message,
    })
    throwIfError(unified.error, 'student_textbook_slots', 'student_textbook_slots 저장 실패')
  }

  // category 분리 스키마(구버전): homework 행에 저장하고 progress 중복 행도 동기화
  const legacyRow = {
    ...row,
    category: 'homework',
  }
  const legacy = await supabase.from('student_textbook_slots').upsert(legacyRow, {
    onConflict: 'student_id,category,subject,slot_number',
  })
  if (legacy.error) {
    console.error('[Repository] student_textbook_slots legacy upsert failed', {
      row: legacyRow,
      code: legacy.error.code,
      message: legacy.error.message,
    })
    throwIfError(legacy.error, 'student_textbook_slots', 'student_textbook_slots 저장 실패')
  }

  await supabase
    .from('student_textbook_slots')
    .update({ textbook_name: row.textbook_name, updated_at: row.updated_at })
    .eq('student_id', row.student_id)
    .eq('subject', row.subject)
    .eq('slot_number', row.slot_number)
    .eq('category', 'progress')
}

export async function deleteHomework(id: string): Promise<void> {
  await deleteRow('homework', id)
}

// ---------------------------------------------------------------------------
// Assignment completions
// ---------------------------------------------------------------------------

export async function upsertAssignmentCompletion(
  record: AssignmentCompletionRecord,
): Promise<void> {
  await upsertRow('assignment_completions', assignmentCompletionToRow(record))
}

export async function deleteAssignmentCompletion(id: string): Promise<void> {
  await deleteRow('assignment_completions', id)
}

// ---------------------------------------------------------------------------
// Daily tests
// ---------------------------------------------------------------------------

export async function upsertDailyTest(record: DailyTestRecord): Promise<void> {
  const row = dailyTestToRow(record)
  const { error } = await getSupabase().from('daily_tests').upsert(row, { onConflict: 'id' })
  if (!error) return
  if (isMissingColumnError(error) && 'learning_diagnosis' in row) {
    console.warn(
      '[Repository] daily_tests.learning_diagnosis missing — saving without diagnosis fields. Run supabase/monthly-learning-diagnosis-migration.sql',
    )
    const { learning_diagnosis: _omit, ...legacyRow } = row
    await upsertRow('daily_tests', legacyRow)
    return
  }
  throwIfError(error, 'daily_tests', 'daily_tests 저장 실패')
}

export async function deleteDailyTest(id: string): Promise<void> {
  await deleteRow('daily_tests', id)
}

// ---------------------------------------------------------------------------
// Monthly evaluations
// ---------------------------------------------------------------------------

export async function upsertMonthlyEvaluation(
  record: MonthlyEvaluationRecord,
): Promise<void> {
  const row = monthlyEvaluationToRow(record)
  const { error } = await getSupabase()
    .from('monthly_evaluations')
    .upsert(row, { onConflict: 'id' })
  if (!error) return
  if (
    isMissingColumnError(error) &&
    ('wrong_answer_items' in row || 'question_total' in row)
  ) {
    console.warn(
      '[Repository] monthly_evaluations diagnosis columns missing — saving legacy fields only. Run supabase/monthly-learning-diagnosis-migration.sql',
    )
    const { wrong_answer_items: _w, question_total: _q, ...legacyRow } = row
    await upsertRow('monthly_evaluations', legacyRow)
    return
  }
  throwIfError(error, 'monthly_evaluations', 'monthly_evaluations 저장 실패')
}

export async function deleteMonthlyEvaluation(id: string): Promise<void> {
  await deleteRow('monthly_evaluations', id)
}

// ---------------------------------------------------------------------------
// Monthly learning reports (진단 REPORT snapshot)
// ---------------------------------------------------------------------------

export async function upsertMonthlyLearningReport(
  record: MonthlyLearningReportRecord,
): Promise<void> {
  // published snapshot 불변성 — 기존 published 행은 덮어쓰지 않음
  const { data: existingRow, error: existingError } = await getSupabase()
    .from('monthly_learning_reports')
    .select('id, status')
    .eq('student_id', record.studentId)
    .eq('year', record.year)
    .eq('month', record.month)
    .eq('subject', record.subject)
    .maybeSingle()

  if (existingError && !isMissingTableError(existingError)) {
    throwIfError(
      existingError,
      'monthly_learning_reports',
      'monthly_learning_reports 조회 실패',
    )
  }

  if (existingRow && (existingRow as { status?: string }).status === 'published') {
    throw new RepositoryError(
      '이미 확정·공개된 REPORT snapshot은 수정할 수 없습니다.',
      'monthly_learning_reports',
    )
  }

  const row = monthlyLearningReportToRow(record)
  const { error } = await getSupabase()
    .from('monthly_learning_reports')
    .upsert(row, { onConflict: 'id' })
  if (error) {
    if (isMissingTableError(error)) {
      throw new RepositoryError(
        'monthly_learning_reports 테이블이 없습니다. supabase/monthly-learning-diagnosis-migration.sql 을 실행해 주세요.',
        'monthly_learning_reports',
        error,
      )
    }
    throwIfError(error, 'monthly_learning_reports', 'monthly_learning_reports 저장 실패')
  }
}

export async function deleteMonthlyLearningReport(id: string): Promise<void> {
  await deleteRow('monthly_learning_reports', id)
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function fetchQuestionsByStudent(studentId: string): Promise<QuestionRecord[]> {
  const rows = await selectByStudentId<QuestionRow>('questions', studentId)
  return rows.map(questionFromRow)
}

export async function upsertQuestion(record: QuestionRecord): Promise<void> {
  await upsertRow('questions', questionToRow(record))
}

export async function deleteQuestion(id: string): Promise<void> {
  await deleteRow('questions', id)
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export async function upsertProgress(record: ProgressRecord): Promise<void> {
  await upsertRow('progress', progressToRow(record))
}

export async function deleteProgress(id: string): Promise<void> {
  await deleteRow('progress', id)
}

// ---------------------------------------------------------------------------
// Makeup plans
// ---------------------------------------------------------------------------

export async function upsertMakeupPlan(record: MakeupPlanRecord): Promise<void> {
  await upsertRow('makeup_plans', makeupPlanToRow(record))
}

export async function deleteMakeupPlan(id: string): Promise<void> {
  await deleteRow('makeup_plans', id)
}

// ---------------------------------------------------------------------------
// Notices (content posts)
// ---------------------------------------------------------------------------

export async function upsertNotice(record: ContentPost): Promise<void> {
  await upsertRow('notices', noticeToRow(record))
}

export async function deleteNotice(id: string): Promise<void> {
  await deleteRow('notices', id)
}

// ---------------------------------------------------------------------------
// Class schedules (반별 공통)
// ---------------------------------------------------------------------------

export async function upsertClassScheduleGrid(record: ClassScheduleGrid): Promise<void> {
  const row = classScheduleGridToRow(record)
  const { error } = await getSupabase()
    .from('class_schedule_grids')
    .upsert(row, { onConflict: 'grade,class_name' })
  if (error) {
    console.error('[class_schedule_grids] upsert failed', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      grade: row.grade,
      class_name: row.class_name,
      template_type: row.template_type,
      time_labels_count: Array.isArray(row.time_labels) ? row.time_labels.length : null,
      cells_keys: row.cells && typeof row.cells === 'object' ? Object.keys(row.cells).length : null,
    })
  }
  throwIfError(error, 'class_schedule_grids', 'class_schedule_grids 저장 실패')
}

export async function deleteClassScheduleGrid(id: string): Promise<void> {
  await deleteRow('class_schedule_grids', id)
}

// ---------------------------------------------------------------------------
// Today assignments & class notes
// ---------------------------------------------------------------------------

export async function upsertTodayAssignment(
  record: TodayAssignmentRecord,
): Promise<void> {
  const { error } = await getSupabase()
    .from('today_assignments')
    .upsert(todayAssignmentToRow(record), { onConflict: 'student_id,date' })
  throwIfError(error, 'today_assignments', 'today_assignments 저장 실패')
}

export async function upsertClassNote(record: ClassNoteRecord): Promise<void> {
  const { error } = await getSupabase()
    .from('class_notes')
    .upsert(classNoteToRow(record), { onConflict: 'student_id,date' })
  throwIfError(error, 'class_notes', 'class_notes 저장 실패')
}

// ---------------------------------------------------------------------------
// RLS 진단 (anon key로 테이블 접근 가능 여부)
// ---------------------------------------------------------------------------

export type RlsCheckResult = {
  table: string
  readable: boolean
  error?: string
}

export async function checkTableAccess(tables: string[]): Promise<RlsCheckResult[]> {
  const results: RlsCheckResult[] = []
  for (const table of tables) {
    const { error } = await getSupabase().from(table).select('id').limit(1)
    results.push({
      table,
      readable: !error,
      error: error?.message,
    })
  }
  return results
}
