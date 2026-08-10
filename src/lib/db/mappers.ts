import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ClassNoteRecord,
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
import {
  normalizeDailyLearningDiagnosis,
  normalizeWrongAnswerItems,
} from '../../utils/learningDiagnosis'
import type { Student } from '../../types/student'
import { normalizeHomeworkStatus } from '../../utils/homework'

export type StudentRow = {
  id: string
  name: string
  student_access_key: string
  access_key_active?: boolean
  school: string
  grade: string
  student_phone: string
  parent_phone: string
  class_name: string
  subjects: string[]
  teacher: string
  enrollment_date: string
  status: string
  memo: string
  created_at: string
  updated_at: string
}

export type AttendanceRow = {
  id: string
  student_id: string
  date: string
  status: string
  reason: string
  memo: string
  created_at: string
  updated_at: string
}

export type HomeworkRow = {
  id: string
  student_id: string
  date: string
  title: string
  description: string
  status: string
  teacher_memo: string
  created_at: string
  updated_at: string
}

export type DailyTestRow = {
  id: string
  student_id: string
  date: string
  test_name: string
  subject: string
  score: number
  total_score: number
  percentage: number
  incorrect_count: number
  memo: string
  session_results: DailyTestRecord['sessionResults']
  learning_diagnosis?: DailyTestRecord['learningDiagnosis'] | null
  created_at: string
  updated_at: string
}

export type MonthlyEvaluationRow = {
  id: string
  student_id: string
  evaluation_date: string
  year: number
  month: number
  subject: string
  score: number
  total_score: number
  percentage: number
  difficulty_breakdown: MonthlyEvaluationRecord['difficultyBreakdown']
  teacher_comment: string
  strengths: string
  improvements: string
  wrong_answer_items?: MonthlyEvaluationRecord['wrongAnswerItems'] | null
  question_total?: number | null
  created_at: string
  updated_at: string
}

export type MonthlyLearningReportRow = {
  id: string
  student_id: string
  year: number
  month: number
  subject: string
  status: string
  published_at: string | null
  scores: MonthlyLearningReportRecord['scores']
  learning_records: MonthlyLearningReportRecord['learningRecords']
  strengths: string
  improvements: string
  teacher_overall_comment: string
  created_at: string
  updated_at: string
}

export type MakeupPlanRow = {
  id: string
  student_id: string
  scheduled_date: string
  scheduled_time: string
  method: string
  subject: string
  reason: string
  memo: string
  status: string
  created_at: string
  updated_at: string
}

export type QuestionRow = {
  id: string
  student_id: string
  date: string
  category: string
  title: string
  content: string
  answer: string
  question_images: QuestionRecord['questionImages']
  answer_images: QuestionRecord['answerImages']
  status: string
  created_at: string
  updated_at: string
}

export type NoticeRow = {
  id: string
  category: string
  title: string
  content: string
  summary: string
  source_name: string
  original_article_title: string
  author_name: string
  is_pinned: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

export type AssignmentCompletionRow = {
  id: string
  student_id: string
  date: string
  assignment_name: string
  total_count: number
  completed_count: number
  completion_rate: number
  status: string
  memo: string
  created_at: string
  updated_at: string
}

export type ProgressRow = {
  id: string
  student_id: string
  subject: string
  slot_number?: number
  textbook_name: string
  current_progress: string
  current_page: number
  total_page: number
  progress_rate: number
  last_study_date: string
  teacher_memo: string
  created_at: string
  updated_at: string
}

export type StudentTextbookSlotRow = {
  id: string
  student_id: string
  category?: string
  subject: string
  slot_number: number
  textbook_name: string
  created_at: string
  updated_at: string
}

export type HomeworkTextbookEntryRow = {
  id: string
  student_id: string
  date: string
  subject: string
  slot_number: number
  previous_assignment: string
  today_assignment: string
  status: string
  created_at: string
  updated_at: string
}

export type TodayAssignmentRow = {
  id: string
  student_id: string
  date: string
  assignment1: string
  assignment2: string
  created_at: string
  updated_at: string
}

export type ClassNoteRow = {
  id: string
  student_id: string
  date: string
  has_class_note: boolean
  note: string
  created_at: string
  updated_at: string
}

export type ClassTodayReportCommonRow = {
  id: string
  grade: string
  class_name: string
  report_date: string
  subject: string
  slot_number: number
  current_progress: string
  current_page: number
  total_page: number
  previous_assignment: string
  today_assignment: string
  created_at: string
  updated_at: string
}

export function studentToRow(student: Student): StudentRow {
  return {
    id: student.id,
    name: student.name,
    student_access_key: student.studentAccessKey,
    access_key_active: student.accessKeyActive,
    school: student.school,
    grade: student.grade,
    student_phone: student.studentPhone,
    parent_phone: student.parentPhone,
    class_name: student.className,
    subjects: student.subjects,
    teacher: student.teacher,
    enrollment_date: student.enrollmentDate,
    status: student.status,
    memo: student.memo,
    created_at: student.createdAt,
    updated_at: student.updatedAt,
  }
}

export function studentFromRow(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    studentAccessKey: row.student_access_key,
    accessKeyActive: row.access_key_active ?? true,
    school: row.school,
    grade: row.grade as Student['grade'],
    studentPhone: row.student_phone,
    parentPhone: row.parent_phone,
    className: row.class_name,
    subjects: row.subjects ?? [],
    teacher: row.teacher,
    enrollmentDate: row.enrollment_date,
    status: row.status as Student['status'],
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function attendanceToRow(record: AttendanceRecord): AttendanceRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    status: record.status,
    reason: record.reason,
    memo: record.memo,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function attendanceFromRow(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    status: row.status as AttendanceRecord['status'],
    reason: row.reason,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function homeworkToRow(record: HomeworkRecord): HomeworkRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    title: record.title,
    description: record.description,
    status: record.status,
    teacher_memo: record.teacherMemo,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function homeworkFromRow(row: HomeworkRow): HomeworkRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    title: row.title,
    description: row.description,
    status: normalizeHomeworkStatus(row.status),
    teacherMemo: row.teacher_memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function dailyTestToRow(record: DailyTestRecord): DailyTestRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    test_name: record.testName,
    subject: record.subject,
    score: record.score,
    total_score: record.totalScore,
    percentage: record.percentage,
    incorrect_count: record.incorrectCount,
    memo: record.memo,
    session_results: record.sessionResults,
    learning_diagnosis: normalizeDailyLearningDiagnosis(record.learningDiagnosis),
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function dailyTestFromRow(row: DailyTestRow): DailyTestRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    testName: row.test_name,
    subject: row.subject,
    score: row.score,
    totalScore: row.total_score,
    percentage: Number(row.percentage),
    incorrectCount: row.incorrect_count,
    memo: row.memo,
    sessionResults: row.session_results ?? [],
    learningDiagnosis: normalizeDailyLearningDiagnosis(row.learning_diagnosis),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function monthlyEvaluationToRow(
  record: MonthlyEvaluationRecord,
): MonthlyEvaluationRow {
  return {
    id: record.id,
    student_id: record.studentId,
    evaluation_date: record.evaluationDate,
    year: record.year,
    month: record.month,
    subject: record.subject,
    score: record.score,
    total_score: record.totalScore,
    percentage: record.percentage,
    difficulty_breakdown: record.difficultyBreakdown,
    teacher_comment: record.teacherComment,
    strengths: record.strengths,
    improvements: record.improvements,
    wrong_answer_items: normalizeWrongAnswerItems(record.wrongAnswerItems),
    question_total: Math.max(0, Math.floor(Number(record.questionTotal ?? 0))),
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function monthlyEvaluationFromRow(
  row: MonthlyEvaluationRow,
): MonthlyEvaluationRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    evaluationDate: row.evaluation_date,
    year: row.year,
    month: row.month,
    subject: row.subject,
    score: row.score,
    totalScore: row.total_score,
    percentage: Number(row.percentage),
    difficultyBreakdown: row.difficulty_breakdown,
    teacherComment: row.teacher_comment,
    strengths: row.strengths,
    improvements: row.improvements,
    wrongAnswerItems: normalizeWrongAnswerItems(row.wrong_answer_items),
    questionTotal: Math.max(0, Math.floor(Number(row.question_total ?? 0))),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const EMPTY_REPORT_SCORES: MonthlyLearningReportRecord['scores'] = {
  metric1: null,
  metric2: null,
  metric3: null,
  homeworkHabit: null,
  wrongAnswerManagement: null,
  learningSincerity: null,
  rawMetric1: null,
  rawMetric2: null,
  rawMetric3: null,
}

const EMPTY_LEARNING_RECORDS: MonthlyLearningReportRecord['learningRecords'] = {
  lateCount: 0,
  absentCount: 0,
  partialHomeworkCount: 0,
  incompleteHomeworkCount: 0,
  testPass2Count: 0,
  testPass3Count: 0,
  testPass4Count: 0,
  fridayRetestTotalCount: null,
  fridayRetestWrongCount: null,
}

function normalizeNullableScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

function normalizeReportScores(
  raw: MonthlyLearningReportRecord['scores'] | null | undefined,
): MonthlyLearningReportRecord['scores'] {
  if (!raw) return { ...EMPTY_REPORT_SCORES }
  const legacy = raw as MonthlyLearningReportRecord['scores'] & {
    rawMetric1?: number | null
    rawMetric2?: number | null
    rawMetric3?: number | null
  }
  return {
    metric1: normalizeNullableScore(raw.metric1),
    metric2: normalizeNullableScore(raw.metric2),
    metric3: normalizeNullableScore(raw.metric3),
    homeworkHabit: normalizeNullableScore(raw.homeworkHabit),
    wrongAnswerManagement: normalizeNullableScore(raw.wrongAnswerManagement),
    learningSincerity: normalizeNullableScore(raw.learningSincerity),
    rawMetric1: normalizeNullableScore(legacy.rawMetric1),
    rawMetric2: normalizeNullableScore(legacy.rawMetric2),
    rawMetric3: normalizeNullableScore(legacy.rawMetric3),
  }
}

function normalizeNullableNonNegInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n)
}

function normalizeLearningRecords(
  raw: MonthlyLearningReportRecord['learningRecords'] | null | undefined,
): MonthlyLearningReportRecord['learningRecords'] {
  if (!raw) return { ...EMPTY_LEARNING_RECORDS }
  const legacy = raw as MonthlyLearningReportRecord['learningRecords'] & {
    fridayRetestTotalCount?: number | null
    fridayRetestWrongCount?: number | null
  }
  return {
    lateCount: Math.max(0, Math.floor(Number(raw.lateCount ?? 0))),
    absentCount: Math.max(0, Math.floor(Number(raw.absentCount ?? 0))),
    partialHomeworkCount: Math.max(0, Math.floor(Number(raw.partialHomeworkCount ?? 0))),
    incompleteHomeworkCount: Math.max(
      0,
      Math.floor(Number(raw.incompleteHomeworkCount ?? 0)),
    ),
    testPass2Count: Math.max(0, Math.floor(Number(raw.testPass2Count ?? 0))),
    testPass3Count: Math.max(0, Math.floor(Number(raw.testPass3Count ?? 0))),
    testPass4Count: Math.max(0, Math.floor(Number(raw.testPass4Count ?? 0))),
    fridayRetestTotalCount: normalizeNullableNonNegInt(legacy.fridayRetestTotalCount),
    fridayRetestWrongCount: normalizeNullableNonNegInt(legacy.fridayRetestWrongCount),
  }
}

export function monthlyLearningReportToRow(
  record: MonthlyLearningReportRecord,
): MonthlyLearningReportRow {
  return {
    id: record.id,
    student_id: record.studentId,
    year: record.year,
    month: record.month,
    subject: record.subject,
    status: record.status,
    published_at: record.publishedAt,
    scores: normalizeReportScores(record.scores),
    learning_records: normalizeLearningRecords(record.learningRecords),
    strengths: record.strengths,
    improvements: record.improvements,
    teacher_overall_comment: record.teacherOverallComment,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function monthlyLearningReportFromRow(
  row: MonthlyLearningReportRow,
): MonthlyLearningReportRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    year: row.year,
    month: row.month,
    subject: row.subject === '영어' ? '영어' : '수학',
    status: row.status === 'published' ? 'published' : 'draft',
    publishedAt: row.published_at,
    scores: normalizeReportScores(row.scores),
    learningRecords: normalizeLearningRecords(row.learning_records),
    strengths: row.strengths ?? '',
    improvements: row.improvements ?? '',
    teacherOverallComment: row.teacher_overall_comment ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function makeupPlanToRow(record: MakeupPlanRecord): MakeupPlanRow {
  return {
    id: record.id,
    student_id: record.studentId,
    scheduled_date: record.scheduledDate,
    scheduled_time: record.scheduledTime,
    method: record.method,
    subject: record.subject,
    reason: record.reason,
    memo: record.memo,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function makeupPlanFromRow(row: MakeupPlanRow): MakeupPlanRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    method: row.method as MakeupPlanRecord['method'],
    subject: row.subject,
    reason: row.reason,
    memo: row.memo,
    status: row.status as MakeupPlanRecord['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function questionToRow(record: QuestionRecord): QuestionRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    category: record.category,
    title: record.title,
    content: record.content,
    answer: record.answer,
    question_images: record.questionImages,
    answer_images: record.answerImages,
    status: record.status,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function questionFromRow(row: QuestionRow): QuestionRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    category: row.category as QuestionRecord['category'],
    title: row.title,
    content: row.content,
    answer: row.answer,
    questionImages: row.question_images ?? [],
    answerImages: row.answer_images ?? [],
    status: row.status as QuestionRecord['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function noticeToRow(record: ContentPost): NoticeRow {
  return {
    id: record.id,
    category: record.category,
    title: record.title,
    content: record.content,
    summary: record.summary,
    source_name: record.sourceName,
    original_article_title: record.originalArticleTitle,
    author_name: record.authorName,
    is_pinned: record.isPinned,
    is_published: record.isPublished,
    published_at: record.publishedAt || null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function noticeFromRow(row: NoticeRow): ContentPost {
  return {
    id: row.id,
    category: row.category as ContentPost['category'],
    title: row.title,
    content: row.content,
    summary: row.summary,
    sourceName: row.source_name,
    originalArticleTitle: row.original_article_title,
    authorName: row.author_name,
    isPinned: row.is_pinned,
    isPublished: row.is_published,
    publishedAt: row.published_at ?? row.created_at.slice(0, 10),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function assignmentCompletionToRow(
  record: AssignmentCompletionRecord,
): AssignmentCompletionRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    assignment_name: record.assignmentName,
    total_count: record.totalCount,
    completed_count: record.completedCount,
    completion_rate: record.completionRate,
    status: record.status,
    memo: record.memo,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function assignmentCompletionFromRow(
  row: AssignmentCompletionRow,
): AssignmentCompletionRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    assignmentName: row.assignment_name,
    totalCount: row.total_count,
    completedCount: row.completed_count,
    completionRate: Number(row.completion_rate),
    status: row.status as AssignmentCompletionRecord['status'],
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function progressToRow(record: ProgressRecord): ProgressRow {
  return {
    id: record.id,
    student_id: record.studentId,
    subject: record.subject,
    slot_number: record.slotNumber ?? 1,
    textbook_name: record.textbookName,
    current_progress: record.currentProgress,
    current_page: record.currentPage,
    total_page: record.totalPage,
    progress_rate: record.progressRate,
    last_study_date: record.lastStudyDate,
    teacher_memo: record.teacherMemo,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function progressFromRow(row: ProgressRow): ProgressRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    subject: row.subject,
    slotNumber: row.slot_number ?? 1,
    textbookName: row.textbook_name,
    currentProgress: row.current_progress,
    currentPage: row.current_page,
    totalPage: row.total_page,
    progressRate: Number(row.progress_rate),
    lastStudyDate: row.last_study_date,
    teacherMemo: row.teacher_memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function studentTextbookSlotToRow(record: StudentTextbookSlot): StudentTextbookSlotRow {
  return {
    id: record.id,
    student_id: record.studentId,
    subject: record.subject,
    slot_number: record.slotNumber,
    textbook_name: record.textbookName,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function studentTextbookSlotFromRow(row: StudentTextbookSlotRow): StudentTextbookSlot {
  return {
    id: row.id,
    studentId: row.student_id,
    subject: row.subject as StudentTextbookSlot['subject'],
    slotNumber: row.slot_number as StudentTextbookSlot['slotNumber'],
    textbookName: row.textbook_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function homeworkTextbookEntryToRow(
  record: HomeworkTextbookEntry,
): HomeworkTextbookEntryRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    subject: record.subject,
    slot_number: record.slotNumber,
    previous_assignment: record.previousAssignment,
    today_assignment: record.todayAssignment,
    status: record.status ? normalizeHomeworkStatus(record.status) : '',
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function homeworkTextbookEntryFromRow(
  row: HomeworkTextbookEntryRow,
): HomeworkTextbookEntry {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    subject: row.subject as HomeworkTextbookEntry['subject'],
    slotNumber: row.slot_number as HomeworkTextbookEntry['slotNumber'],
    previousAssignment: row.previous_assignment,
    todayAssignment: row.today_assignment,
    status: row.status ? normalizeHomeworkStatus(row.status) : '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function todayAssignmentToRow(
  record: TodayAssignmentRecord,
): TodayAssignmentRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    assignment1: record.assignment1,
    assignment2: record.assignment2,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function todayAssignmentFromRow(row: TodayAssignmentRow): TodayAssignmentRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    assignment1: row.assignment1,
    assignment2: row.assignment2,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function classNoteToRow(record: ClassNoteRecord): ClassNoteRow {
  return {
    id: record.id,
    student_id: record.studentId,
    date: record.date,
    has_class_note: record.hasClassNote,
    note: record.note,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function classNoteFromRow(row: ClassNoteRow): ClassNoteRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    hasClassNote: row.has_class_note,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function classTodayReportCommonToRow(
  record: ClassTodayReportCommon,
): ClassTodayReportCommonRow {
  return {
    id: record.id,
    grade: record.grade,
    class_name: record.className,
    report_date: record.reportDate,
    subject: record.subject,
    slot_number: record.slotNumber,
    current_progress: record.currentProgress,
    current_page: record.currentPage,
    total_page: record.totalPage,
    previous_assignment: record.previousAssignment,
    today_assignment: record.todayAssignment,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function classTodayReportCommonFromRow(
  row: ClassTodayReportCommonRow,
): ClassTodayReportCommon {
  return {
    id: row.id,
    grade: row.grade,
    className: row.class_name,
    reportDate: row.report_date,
    subject: row.subject as ClassTodayReportCommon['subject'],
    slotNumber: row.slot_number as ClassTodayReportCommon['slotNumber'],
    currentProgress: row.current_progress,
    currentPage: row.current_page ?? 0,
    totalPage: row.total_page ?? 0,
    previousAssignment: row.previous_assignment,
    todayAssignment: row.today_assignment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
