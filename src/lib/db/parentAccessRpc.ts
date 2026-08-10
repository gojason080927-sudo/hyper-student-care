import type { TodayReportData } from './repository'
import { getSupabase } from '../supabase'
import { getPreviousSeoulDateString } from '../../utils/seoulDate'
import type { LocalBackupData } from '../../storage/localBackup'
import type { Student } from '../../types/student'
import {
  attendanceFromRow,
  classNoteFromRow,
  classTodayReportCommonFromRow,
  dailyTestFromRow,
  homeworkFromRow,
  homeworkTextbookEntryFromRow,
  makeupPlanFromRow,
  monthlyEvaluationFromRow,
  monthlyLearningReportFromRow,
  noticeFromRow,
  progressFromRow,
  questionFromRow,
  studentFromRow,
  studentTextbookSlotFromRow,
  todayAssignmentFromRow,
  type AttendanceRow,
  type ClassNoteRow,
  type ClassTodayReportCommonRow,
  type DailyTestRow,
  type HomeworkRow,
  type HomeworkTextbookEntryRow,
  type MakeupPlanRow,
  type MonthlyEvaluationRow,
  type MonthlyLearningReportRow,
  type NoticeRow,
  type ProgressRow,
  type QuestionRow,
  type StudentRow,
  type StudentTextbookSlotRow,
  type TodayAssignmentRow,
} from './mappers'

function mapRows<T, R>(rows: unknown, map: (row: T) => R): R[] {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => map(row as T))
}

function mapOptionalRow<T, R>(row: unknown, map: (value: T) => R): R | null {
  if (!row || typeof row !== 'object') return null
  return map(row as T)
}

function parseRpcJson(value: unknown): Record<string, unknown> | null {
  if (value == null) return null
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

async function fetchHomeworkTextbookEntriesFallback(
  studentId: string,
  date?: string,
): Promise<ReturnType<typeof homeworkTextbookEntryFromRow>[] | undefined> {
  let query = getSupabase()
    .from('homework_textbook_entries')
    .select('*')
    .eq('student_id', studentId)
  if (date) {
    query = query.eq('date', date)
  } else {
    query = query.order('date', { ascending: false })
  }
  const { data, error } = await query
  if (error) {
    console.error('[ParentAccess] fallback homework_textbook_entries fetch failed', error)
    return undefined
  }
  return mapRows<HomeworkTextbookEntryRow, ReturnType<typeof homeworkTextbookEntryFromRow>>(
    data,
    homeworkTextbookEntryFromRow,
  )
}

async function fetchStudentTextbookSlotsFallback(
  studentId: string,
): Promise<ReturnType<typeof studentTextbookSlotFromRow>[] | undefined> {
  const { data, error } = await getSupabase()
    .from('student_textbook_slots')
    .select('*')
    .eq('student_id', studentId)
    .order('subject')
    .order('slot_number')
  if (error) {
    console.error('[ParentAccess] fallback student_textbook_slots fetch failed', error)
    return undefined
  }
  return mapRows<StudentTextbookSlotRow, ReturnType<typeof studentTextbookSlotFromRow>>(
    data,
    studentTextbookSlotFromRow,
  )
}

async function fetchClassTodayReportCommonFallback(
  student: Student,
  dates?: string[],
): Promise<ReturnType<typeof classTodayReportCommonFromRow>[] | undefined> {
  const grade = student.grade.trim()
  const className = student.className.trim()
  if (!grade || !className) return []

  let query = getSupabase()
    .from('class_today_report_common')
    .select('*')
    .eq('grade', grade)
    .eq('class_name', className)

  if (dates && dates.length > 0) {
    query = query.in('report_date', dates)
  }

  const { data, error } = await query.order('report_date', { ascending: false })

  if (error) {
    console.error('[ParentAccess] fallback class_today_report_common fetch failed', error)
    return undefined
  }

  return mapRows<ClassTodayReportCommonRow, ReturnType<typeof classTodayReportCommonFromRow>>(
    data,
    classTodayReportCommonFromRow,
  )
}

export async function rpcGetParentStudentByAccessKey(
  accessKey: string,
): Promise<Student | null> {
  const normalizedKey = accessKey.trim()
  console.log('[ParentAccess] rpc get_parent_student_by_access_key', {
    keyPreview: normalizedKey ? `${normalizedKey.slice(0, 4)}…` : '(empty)',
  })

  const { data, error } = await getSupabase().rpc('get_parent_student_by_access_key', {
    p_access_key: normalizedKey,
  })

  if (error) {
    console.error('[ParentAccess] rpc get_parent_student_by_access_key error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  const row = parseRpcJson(data)
  if (!row) {
    console.warn('[ParentAccess] rpc get_parent_student_by_access_key: no row', {
      dataType: typeof data,
    })
    return null
  }

  const student = studentFromRow(row as StudentRow)
  console.log('[ParentAccess] rpc get_parent_student_by_access_key success', {
    studentId: student.id,
    accessKeyActive: student.accessKeyActive,
  })
  return student
}

export async function rpcGetParentCareBundle(accessKey: string): Promise<LocalBackupData | null> {
  const normalizedKey = accessKey.trim()
  console.log('[ParentAccess] rpc get_parent_care_bundle step 3')

  const { data, error } = await getSupabase().rpc('get_parent_care_bundle', {
    p_access_key: normalizedKey,
  })

  if (error) {
    console.error('[ParentAccess] rpc get_parent_care_bundle error:', error)
    throw error
  }

  const bundle = parseRpcJson(data)
  if (!bundle) {
    console.error('[ParentAccess] rpc get_parent_care_bundle: null (invalid or inactive key)', {
      dataType: typeof data,
    })
    return null
  }
  const studentRow = bundle.student
  if (!studentRow || typeof studentRow !== 'object') {
    return null
  }

  const student = studentFromRow(studentRow as StudentRow)

  const [homeworkTextbookEntries, studentTextbookSlots, classTodayReportCommon] =
    await Promise.all([
    bundle.homework_textbook_entries !== undefined
      ? Promise.resolve(
          mapRows<HomeworkTextbookEntryRow, ReturnType<typeof homeworkTextbookEntryFromRow>>(
            bundle.homework_textbook_entries,
            homeworkTextbookEntryFromRow,
          ),
        )
      : fetchHomeworkTextbookEntriesFallback(student.id).then((rows) => rows ?? []),
    bundle.student_textbook_slots !== undefined
      ? Promise.resolve(
          mapRows<StudentTextbookSlotRow, ReturnType<typeof studentTextbookSlotFromRow>>(
            bundle.student_textbook_slots,
            studentTextbookSlotFromRow,
          ),
        )
      : fetchStudentTextbookSlotsFallback(student.id).then((rows) => rows ?? []),
    bundle.class_today_report_common !== undefined
      ? Promise.resolve(
          mapRows<
            ClassTodayReportCommonRow,
            ReturnType<typeof classTodayReportCommonFromRow>
          >(bundle.class_today_report_common, classTodayReportCommonFromRow),
        )
      : fetchClassTodayReportCommonFallback(student).then((rows) => rows ?? []),
  ])

  const result: LocalBackupData = {
    students: [student],
    attendance: mapRows<AttendanceRow, ReturnType<typeof attendanceFromRow>>(
      bundle.attendance,
      attendanceFromRow,
    ),
    progress: mapRows<ProgressRow, ReturnType<typeof progressFromRow>>(
      bundle.progress,
      progressFromRow,
    ),
    studentTextbookSlots,
    homework: mapRows<HomeworkRow, ReturnType<typeof homeworkFromRow>>(
      bundle.homework,
      homeworkFromRow,
    ),
    homeworkTextbookEntries,
    assignmentCompletion: [],
    dailyTests: mapRows<DailyTestRow, ReturnType<typeof dailyTestFromRow>>(
      bundle.daily_tests,
      dailyTestFromRow,
    ),
    monthlyEvaluations: mapRows<
      MonthlyEvaluationRow,
      ReturnType<typeof monthlyEvaluationFromRow>
    >(bundle.monthly_evaluations, monthlyEvaluationFromRow),
    monthlyLearningReports:
      bundle.monthly_learning_reports !== undefined
        ? mapRows<
            MonthlyLearningReportRow,
            ReturnType<typeof monthlyLearningReportFromRow>
          >(bundle.monthly_learning_reports, monthlyLearningReportFromRow)
        : [],
    questions: mapRows<QuestionRow, ReturnType<typeof questionFromRow>>(
      bundle.questions,
      questionFromRow,
    ),
    makeupPlans: mapRows<MakeupPlanRow, ReturnType<typeof makeupPlanFromRow>>(
      bundle.makeup_plans,
      makeupPlanFromRow,
    ),
    contentPosts: mapRows<NoticeRow, ReturnType<typeof noticeFromRow>>(
      bundle.notices,
      noticeFromRow,
    ),
    todayAssignments: mapRows<TodayAssignmentRow, ReturnType<typeof todayAssignmentFromRow>>(
      bundle.today_assignments,
      todayAssignmentFromRow,
    ),
    classNotes: mapRows<ClassNoteRow, ReturnType<typeof classNoteFromRow>>(
      bundle.class_notes,
      classNoteFromRow,
    ),
    classTodayReportCommon,
  }

  console.log('[ParentAccess] rpc get_parent_care_bundle success', {
    studentId: student.id,
    attendanceCount: result.attendance.length,
    homeworkTextbookEntryCount: result.homeworkTextbookEntries.length,
    studentTextbookSlotCount: result.studentTextbookSlots.length,
    classTodayReportCommonCount: result.classTodayReportCommon?.length ?? 0,
    questionsCount: result.questions.length,
  })
  return result
}

export async function rpcGetParentTodayReport(
  accessKey: string,
  date: string,
): Promise<TodayReportData | null> {
  const normalizedKey = accessKey.trim()
  console.log('[ParentAccess] rpc get_parent_today_report', { date })

  const { data, error } = await getSupabase().rpc('get_parent_today_report', {
    p_access_key: normalizedKey,
    p_date: date,
  })

  if (error) {
    console.error('[ParentAccess] rpc get_parent_today_report error:', error)
    return null
  }

  if (!data || typeof data !== 'object') {
    console.error('[ParentAccess] rpc get_parent_today_report: null (invalid or inactive key)')
    return null
  }

  const report = data as Record<string, unknown>
  const student = await rpcGetParentStudentByAccessKey(normalizedKey)
  const studentId = student?.id

  const prevDate = getPreviousSeoulDateString(date)

  const [homeworkTextbookEntries, studentTextbookSlots, classTodayReportCommon] =
    await Promise.all([
    report.homework_textbook_entries !== undefined
      ? Promise.resolve(
          mapRows<HomeworkTextbookEntryRow, ReturnType<typeof homeworkTextbookEntryFromRow>>(
            report.homework_textbook_entries,
            homeworkTextbookEntryFromRow,
          ),
        )
      : studentId
        ? fetchHomeworkTextbookEntriesFallback(studentId, date)
        : Promise.resolve(undefined),
    report.student_textbook_slots !== undefined
      ? Promise.resolve(
          mapRows<StudentTextbookSlotRow, ReturnType<typeof studentTextbookSlotFromRow>>(
            report.student_textbook_slots,
            studentTextbookSlotFromRow,
          ),
        )
      : studentId
        ? fetchStudentTextbookSlotsFallback(studentId)
        : Promise.resolve(undefined),
    report.class_today_report_common !== undefined
      ? Promise.resolve(
          mapRows<
            ClassTodayReportCommonRow,
            ReturnType<typeof classTodayReportCommonFromRow>
          >(report.class_today_report_common, classTodayReportCommonFromRow),
        )
      : student
        ? fetchClassTodayReportCommonFallback(student, [date, prevDate])
        : Promise.resolve(undefined),
  ])

  return {
    attendance: mapOptionalRow<AttendanceRow, ReturnType<typeof attendanceFromRow>>(
      report.attendance,
      attendanceFromRow,
    ),
    progress: mapRows<ProgressRow, ReturnType<typeof progressFromRow>>(
      report.progress,
      progressFromRow,
    ),
    assignmentCompletion: [],
    homework: mapOptionalRow<HomeworkRow, ReturnType<typeof homeworkFromRow>>(
      report.homework,
      homeworkFromRow,
    ),
    homeworkTextbookEntries,
    studentTextbookSlots,
    todayAssignment: mapOptionalRow<
      TodayAssignmentRow,
      ReturnType<typeof todayAssignmentFromRow>
    >(report.today_assignment, todayAssignmentFromRow),
    classNote: mapOptionalRow<ClassNoteRow, ReturnType<typeof classNoteFromRow>>(
      report.class_note,
      classNoteFromRow,
    ),
    dailyTest: mapOptionalRow<DailyTestRow, ReturnType<typeof dailyTestFromRow>>(
      report.daily_test,
      dailyTestFromRow,
    ),
    classTodayReportCommon,
  }
}

export async function rpcSubmitParentQuestion(
  accessKey: string,
  input: {
    date: string
    category: string
    title: string
    content: string
    questionImages: QuestionRow['question_images']
  },
): Promise<ReturnType<typeof questionFromRow> | null> {
  const { data, error } = await getSupabase().rpc('submit_parent_question', {
    p_access_key: accessKey.trim(),
    p_date: input.date,
    p_category: input.category,
    p_title: input.title,
    p_content: input.content,
    p_question_images: input.questionImages ?? [],
  })

  if (error) {
    console.error('[ParentAccess] rpc submit_parent_question error:', error)
    throw error
  }

  if (!data) return null
  return questionFromRow(data as QuestionRow)
}
