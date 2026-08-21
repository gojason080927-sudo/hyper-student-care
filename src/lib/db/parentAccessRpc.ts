import type { TodayReportData } from './repository'
import { getSupabase } from '../supabase'
import { getPreviousSeoulDateString } from '../../utils/seoulDate'
import { getMathSharedLinkedClassNames } from '../../utils/mathSharedGroup'
import { mergeClassTodayReportCommonRecords } from '../../utils/mergeClassTodayReportCommon'
import { filterNoticesForStudent } from '../../utils/noticeAudience'
import { filterScheduleGridsForStudent } from '../../utils/classScheduleAccess'
import type { LocalBackupData } from '../../storage/localBackup'
import type { Student } from '../../types/student'
import {
  attendanceFromRow,
  classNoteFromRow,
  classScheduleGridFromRow,
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

async function fetchClassScheduleGridsFallback(
  student: Student,
): Promise<ReturnType<typeof classScheduleGridFromRow>[]> {
  const { data, error } = await getSupabase()
    .from('class_schedule_grids')
    .select('*')
    .eq('is_active', true)
    .eq('grade', student.grade.trim())

  if (error) {
    console.error('[ParentAccess] fallback class_schedule_grids fetch failed', error)
    return []
  }

  const rows = mapRows<ClassScheduleGridRow, ReturnType<typeof classScheduleGridFromRow>>(
    data,
    classScheduleGridFromRow,
  )
  return filterScheduleGridsForStudent(rows, student)
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

async function fetchClassTodayReportCommonForClassNames(
  grade: string,
  classNames: string[],
  dates?: string[],
): Promise<ReturnType<typeof classTodayReportCommonFromRow>[]> {
  const trimmedGrade = grade.trim()
  const trimmedNames = classNames.map((name) => name.trim()).filter(Boolean)
  if (!trimmedGrade || trimmedNames.length === 0) return []

  let query = getSupabase()
    .from('class_today_report_common')
    .select('*')
    .eq('grade', trimmedGrade)
    .in('class_name', trimmedNames)

  if (dates && dates.length > 0) {
    query = query.in('report_date', dates)
  }

  const { data, error } = await query.order('report_date', { ascending: false })

  if (error) {
    console.error('[ParentAccess] class_today_report_common fetch failed', error)
    return []
  }

  return mapRows<ClassTodayReportCommonRow, ReturnType<typeof classTodayReportCommonFromRow>>(
    data,
    classTodayReportCommonFromRow,
  )
}

async function enrichStudentTextbookSlotsWithMathSharing(
  student: Student,
  slots: ReturnType<typeof studentTextbookSlotFromRow>[],
): Promise<ReturnType<typeof studentTextbookSlotFromRow>[]> {
  const linked = getMathSharedLinkedClassNames(student.grade, student.className)
  if (linked.length <= 1) return slots

  const extraClassNames = linked.filter((name) => name !== student.className.trim())
  if (extraClassNames.length === 0) return slots

  const { data: peers, error: peerError } = await getSupabase()
    .from('students')
    .select('id')
    .eq('grade', student.grade.trim())
    .in('class_name', extraClassNames)
    .eq('status', '재원')
    .limit(10)

  if (peerError || !peers?.length) return slots

  const peerIds = peers.map((peer) => String((peer as { id: string }).id))
  const { data: peerSlots, error: slotError } = await getSupabase()
    .from('student_textbook_slots')
    .select('*')
    .in('student_id', peerIds)
    .eq('subject', '수학')

  if (slotError || !peerSlots?.length) return slots

  const mapped = mapRows<StudentTextbookSlotRow, ReturnType<typeof studentTextbookSlotFromRow>>(
    peerSlots,
    studentTextbookSlotFromRow,
  )
  const existingKeys = new Set(
    slots.map((slot) => `${slot.studentId}:${slot.subject}:${slot.slotNumber}`),
  )
  const extra = mapped.filter(
    (slot) => !existingKeys.has(`${slot.studentId}:${slot.subject}:${slot.slotNumber}`),
  )
  return extra.length > 0 ? [...slots, ...extra] : slots
}

async function enrichParentStudentsWithMathSharingPeers(
  student: Student,
  students: Student[],
): Promise<Student[]> {
  const linked = getMathSharedLinkedClassNames(student.grade, student.className)
  if (linked.length <= 1) return students

  const extraClassNames = linked.filter((name) => name !== student.className.trim())
  if (extraClassNames.length === 0) return students

  const { data: peers, error } = await getSupabase()
    .from('students')
    .select('*')
    .eq('grade', student.grade.trim())
    .in('class_name', extraClassNames)
    .eq('status', '재원')
    .limit(10)

  if (error || !peers?.length) return students

  const mapped = mapRows<StudentRow, Student>(peers, studentFromRow)
  const existingIds = new Set(students.map((item) => item.id))
  const extra = mapped.filter((peer) => !existingIds.has(peer.id))
  return extra.length > 0 ? [...students, ...extra] : students
}

async function enrichClassTodayReportCommonWithMathSharing(
  student: Student,
  records: ReturnType<typeof classTodayReportCommonFromRow>[],
  dates?: string[],
): Promise<ReturnType<typeof classTodayReportCommonFromRow>[]> {
  const linked = getMathSharedLinkedClassNames(student.grade, student.className)
  if (linked.length <= 1) return records

  const extraClassNames = linked.filter((name) => name !== student.className.trim())
  if (extraClassNames.length === 0) return records

  const extra = await fetchClassTodayReportCommonForClassNames(
    student.grade,
    extraClassNames,
    dates,
  )
  return mergeClassTodayReportCommonRecords(records, extra)
}

async function fetchClassTodayReportCommonFallback(
  student: Student,
  dates?: string[],
): Promise<ReturnType<typeof classTodayReportCommonFromRow>[] | undefined> {
  const grade = student.grade.trim()
  const className = student.className.trim()
  if (!grade || !className) return []

  const linked = getMathSharedLinkedClassNames(grade, className)
  const classNames = linked.length > 1 ? linked : [className]

  const records = await fetchClassTodayReportCommonForClassNames(grade, classNames, dates)
  return records
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

  const [homeworkTextbookEntries, baseStudentTextbookSlots, classTodayReportCommon, classScheduleGridsRaw] =
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
      ? enrichClassTodayReportCommonWithMathSharing(
          student,
          mapRows<
            ClassTodayReportCommonRow,
            ReturnType<typeof classTodayReportCommonFromRow>
          >(bundle.class_today_report_common, classTodayReportCommonFromRow),
        )
      : fetchClassTodayReportCommonFallback(student).then((rows) => rows ?? []),
    bundle.class_schedule_grids !== undefined
      ? Promise.resolve(
          mapRows<ClassScheduleGridRow, ReturnType<typeof classScheduleGridFromRow>>(
            bundle.class_schedule_grids,
            classScheduleGridFromRow,
          ),
        )
      : fetchClassScheduleGridsFallback(student),
  ])

  const [students, studentTextbookSlots] = await Promise.all([
    enrichParentStudentsWithMathSharingPeers(student, [student]),
    enrichStudentTextbookSlotsWithMathSharing(student, baseStudentTextbookSlots),
  ])

  const rawNotices = mapRows<NoticeRow, ReturnType<typeof noticeFromRow>>(
    bundle.notices,
    noticeFromRow,
  )
  const contentPosts = filterNoticesForStudent(rawNotices, student)
  const classScheduleGrids = filterScheduleGridsForStudent(classScheduleGridsRaw, student)

  const result: LocalBackupData = {
    students,
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
    contentPosts,
    classScheduleGrids,
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
    classScheduleGridCount: result.classScheduleGrids?.length ?? 0,
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

  const [homeworkTextbookEntries, baseStudentTextbookSlots, classTodayReportCommon] =
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
    report.class_today_report_common !== undefined && student
      ? enrichClassTodayReportCommonWithMathSharing(
          student,
          mapRows<
            ClassTodayReportCommonRow,
            ReturnType<typeof classTodayReportCommonFromRow>
          >(report.class_today_report_common, classTodayReportCommonFromRow),
          [date, prevDate],
        )
      : student
        ? fetchClassTodayReportCommonFallback(student, [date, prevDate])
        : Promise.resolve(undefined),
  ])

  const studentTextbookSlots =
    student && baseStudentTextbookSlots
      ? await enrichStudentTextbookSlotsWithMathSharing(student, baseStudentTextbookSlots)
      : baseStudentTextbookSlots

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
    dailyTests: (() => {
      if (Array.isArray(report.daily_tests)) {
        return mapRows<DailyTestRow, ReturnType<typeof dailyTestFromRow>>(
          report.daily_tests,
          dailyTestFromRow,
        )
      }
      const one = mapOptionalRow<DailyTestRow, ReturnType<typeof dailyTestFromRow>>(
        report.daily_test,
        dailyTestFromRow,
      )
      return one ? [one] : []
    })(),
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

export async function rpcGetParentCategoryReads(
  accessKey: string,
): Promise<Record<string, string>> {
  const normalizedKey = accessKey.trim()
  const { data, error } = await getSupabase().rpc('get_parent_category_reads', {
    p_access_key: normalizedKey,
  })

  if (error) {
    console.error('[ParentAccess] rpc get_parent_category_reads error:', error)
    return {}
  }

  const parsed = parseRpcJson(data)
  if (!parsed) return {}

  const reads: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      reads[key] = value
    }
  }
  return reads
}

export async function rpcMarkParentCategoryRead(
  accessKey: string,
  category: string,
): Promise<string | null> {
  const normalizedKey = accessKey.trim()
  const { data, error } = await getSupabase().rpc('mark_parent_category_read', {
    p_access_key: normalizedKey,
    p_category: category.trim(),
  })

  if (error) {
    console.error('[ParentAccess] rpc mark_parent_category_read error:', error)
    throw error
  }

  return typeof data === 'string' ? data : null
}
