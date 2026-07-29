import { getSupabase } from '../supabase'
import { generateStudentAccessKey } from '../../utils/studentAccessKey'
import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ClassNoteRecord,
  ContentPost,
  DailyTestRecord,
  HomeworkRecord,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  ProgressRecord,
  QuestionRecord,
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
  dailyTestFromRow,
  dailyTestToRow,
  homeworkFromRow,
  homeworkToRow,
  makeupPlanFromRow,
  makeupPlanToRow,
  monthlyEvaluationFromRow,
  monthlyEvaluationToRow,
  noticeFromRow,
  noticeToRow,
  progressFromRow,
  progressToRow,
  questionFromRow,
  questionToRow,
  studentFromRow,
  studentToRow,
  todayAssignmentFromRow,
  todayAssignmentToRow,
  type AssignmentCompletionRow,
  type AttendanceRow,
  type ClassNoteRow,
  type DailyTestRow,
  type HomeworkRow,
  type MakeupPlanRow,
  type MonthlyEvaluationRow,
  type NoticeRow,
  type ProgressRow,
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

async function selectAll<T>(table: string): Promise<T[]> {
  const { data, error } = await getSupabase().from(table).select('*')
  throwIfError(error, table, `${table} 조회 실패`)
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
  assignmentCompletion: AssignmentCompletionRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  questions: QuestionRecord[]
  progress: ProgressRecord[]
  makeupPlans: MakeupPlanRecord[]
  contentPosts: ContentPost[]
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
}

export async function fetchAllRecords(): Promise<AllRecords> {
  const [
    attendanceRows,
    homeworkRows,
    assignmentRows,
    dailyTestRows,
    monthlyRows,
    questionRows,
    progressRows,
    makeupRows,
    noticeRows,
    todayAssignmentRows,
    classNoteRows,
  ] = await Promise.all([
    selectAll<AttendanceRow>('attendance'),
    selectAll<HomeworkRow>('homework'),
    selectAll<AssignmentCompletionRow>('assignment_completions'),
    selectAll<DailyTestRow>('daily_tests'),
    selectAll<MonthlyEvaluationRow>('monthly_evaluations'),
    selectAll<QuestionRow>('questions'),
    selectAll<ProgressRow>('progress'),
    selectAll<MakeupPlanRow>('makeup_plans'),
    selectAll<NoticeRow>('notices'),
    selectAll<TodayAssignmentRow>('today_assignments'),
    selectAll<ClassNoteRow>('class_notes'),
  ])

  return {
    attendance: attendanceRows.map(attendanceFromRow),
    homework: homeworkRows.map(homeworkFromRow),
    assignmentCompletion: assignmentRows.map(assignmentCompletionFromRow),
    dailyTests: dailyTestRows.map(dailyTestFromRow),
    monthlyEvaluations: monthlyRows.map(monthlyEvaluationFromRow),
    questions: questionRows.map(questionFromRow),
    progress: progressRows.map(progressFromRow),
    makeupPlans: makeupRows.map(makeupPlanFromRow),
    contentPosts: noticeRows.map(noticeFromRow),
    todayAssignments: todayAssignmentRows.map(todayAssignmentFromRow),
    classNotes: classNoteRows.map(classNoteFromRow),
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
  todayAssignment: TodayAssignmentRecord | null
  classNote: ClassNoteRecord | null
  dailyTest: DailyTestRecord | null
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
    selectOneByStudentAndDate<TodayAssignmentRow>('today_assignments', studentId, date),
    selectOneByStudentAndDate<ClassNoteRow>('class_notes', studentId, date),
    selectByStudentAndDate<DailyTestRow>('daily_tests', studentId, date),
  ])

  return {
    attendance: attendanceRows[0] ? attendanceFromRow(attendanceRows[0]) : null,
    progress: progressRows.map(progressFromRow),
    assignmentCompletion: assignmentRows.map(assignmentCompletionFromRow),
    homework: homeworkRows[0] ? homeworkFromRow(homeworkRows[0]) : null,
    todayAssignment: todayAssignmentRow
      ? todayAssignmentFromRow(todayAssignmentRow)
      : null,
    classNote: classNoteRow ? classNoteFromRow(classNoteRow) : null,
    dailyTest: dailyTestRows[0] ? dailyTestFromRow(dailyTestRows[0]) : null,
  }
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
  await upsertRow('daily_tests', dailyTestToRow(record))
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
  await upsertRow('monthly_evaluations', monthlyEvaluationToRow(record))
}

export async function deleteMonthlyEvaluation(id: string): Promise<void> {
  await deleteRow('monthly_evaluations', id)
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
