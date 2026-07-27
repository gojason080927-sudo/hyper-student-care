import { createSeedContentPosts } from '../data/seedContentPosts'
import { createSeedRecords } from '../data/seedRecords'
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '../storage/keys'
import { loadFromStorage, saveToStorage } from '../storage/storage'
import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ContentPost,
  DailyTestRecord,
  HomeworkRecord,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  ProgressRecord,
  QuestionRecord,
} from '../types/records'
import type { Student } from '../types/student'
import {
  calcCompletionRate,
  calcPercentage,
  calcProgressRate,
  getAssignmentStatusFromRate,
} from './calc'
import { normalizeDailyTestRecord } from './dailyTest'
import { getHomeworkContent, normalizeHomeworkRecord, normalizeHomeworkStatus } from './homework'
import {
  normalizeDifficultyBreakdown,
  normalizeMonthlyEvaluationRecord,
} from './monthlyEvaluation'
import { normalizeContentPostRecord } from './contentPost'
import { normalizeQuestionImages } from './questionImages'

function nowIso() {
  return new Date().toISOString()
}

function initRecords<T>(
  newKey: string,
  legacyKey: string,
  normalizer: (item: Record<string, unknown>) => T | null,
  seed: T[],
): T[] {
  const fromNew = loadFromStorage<unknown[]>(newKey, [])
  if (fromNew.length > 0) {
    return normalizeArray(fromNew, normalizer)
  }

  if (legacyKey) {
    const fromLegacy = loadFromStorage<unknown[]>(legacyKey, [])
    if (fromLegacy.length > 0) {
      const normalized = normalizeArray(fromLegacy, normalizer)
      saveToStorage(newKey, normalized)
      return normalized
    }
  }

  if (seed.length > 0) {
    saveToStorage(newKey, seed)
    return seed
  }

  return []
}

function normalizeAttendance(raw: Record<string, unknown>): AttendanceRecord | null {
  if (!raw.id || !raw.studentId || !raw.date || !raw.status) return null
  const ts = String(raw.createdAt ?? nowIso())
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    date: String(raw.date),
    status: raw.status as AttendanceRecord['status'],
    reason: String(raw.reason ?? ''),
    memo: String(raw.memo ?? ''),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

function normalizeHomework(raw: Record<string, unknown>): HomeworkRecord | null {
  if (!raw.id || !raw.studentId || !raw.date) return null
  const ts = String(raw.createdAt ?? nowIso())
  const title = String(raw.title ?? '')
  const description = String(raw.description ?? '')
  const content = getHomeworkContent({ title, description })
  let status = normalizeHomeworkStatus(raw.status)
  if (!raw.status && raw.completed === true) {
    status = '완료'
  } else if (!raw.status && raw.completed === false) {
    status = '미완료'
  }
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    date: String(raw.date),
    title: '',
    description: content,
    status,
    teacherMemo: String(raw.teacherMemo ?? raw.memo ?? ''),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

function normalizeAssignment(
  raw: Record<string, unknown>,
): AssignmentCompletionRecord | null {
  if (!raw.id || !raw.studentId || !raw.date) return null
  const ts = String(raw.createdAt ?? nowIso())
  const totalCount = Number(raw.totalCount ?? 10)
  const completedCount = Number(raw.completedCount ?? 0)
  const completionRate =
    raw.completionRate !== undefined
      ? Number(raw.completionRate)
      : calcCompletionRate(completedCount, totalCount)
  const legacyStatus = raw.status as string
  let status: AssignmentCompletionRecord['status']
  if (legacyStatus === '완료' || legacyStatus === '보충필요') {
    status = legacyStatus
  } else {
    status = getAssignmentStatusFromRate(completionRate)
  }
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    date: String(raw.date),
    assignmentName: String(raw.assignmentName ?? raw.content ?? ''),
    totalCount,
    completedCount,
    completionRate,
    status,
    memo: String(raw.memo ?? ''),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

function normalizeDailyTest(raw: Record<string, unknown>): DailyTestRecord | null {
  if (!raw.id || !raw.studentId || !raw.date) return null
  const ts = String(raw.createdAt ?? nowIso())

  let base: DailyTestRecord

  if (raw.score !== undefined && raw.totalScore !== undefined) {
    const score = Number(raw.score)
    const totalScore = Number(raw.totalScore)
    base = {
      id: String(raw.id),
      studentId: String(raw.studentId),
      date: String(raw.date),
      testName: String(raw.testName ?? '일일테스트'),
      subject: String(raw.subject ?? '수학'),
      score,
      totalScore,
      percentage: Number(raw.percentage ?? calcPercentage(score, totalScore)),
      incorrectCount: Number(raw.incorrectCount ?? 0),
      memo: String(raw.memo ?? ''),
      sessionResults: Array.isArray(raw.sessionResults)
        ? (raw.sessionResults as DailyTestRecord['sessionResults'])
        : [],
      createdAt: ts,
      updatedAt: String(raw.updatedAt ?? ts),
    }
  } else {
    const passRound = raw.passRound as number | null | undefined
    const score =
      passRound === null || passRound === undefined ? 0 : Math.min(passRound * 4, 20)
    const totalScore = 20
    base = {
      id: String(raw.id),
      studentId: String(raw.studentId),
      date: String(raw.date),
      testName: '일일테스트',
      subject: '수학',
      score,
      totalScore,
      percentage: calcPercentage(score, totalScore),
      incorrectCount: passRound === null ? 5 : Math.max(0, 5 - (passRound ?? 0)),
      memo: String(raw.memo ?? ''),
      sessionResults: [],
      createdAt: ts,
      updatedAt: String(raw.updatedAt ?? ts),
    }
  }

  return normalizeDailyTestRecord(base)
}

function normalizeMonthly(
  raw: Record<string, unknown>,
): MonthlyEvaluationRecord | null {
  if (!raw.id || !raw.studentId) return null
  const ts = String(raw.createdAt ?? nowIso())
  const score = Number(raw.score ?? 0)
  const totalScore = Number(raw.totalScore ?? 100)
  const base: MonthlyEvaluationRecord = {
    id: String(raw.id),
    studentId: String(raw.studentId),
    evaluationDate: String(raw.evaluationDate ?? ts.slice(0, 10)),
    year: Number(raw.year ?? new Date().getFullYear()),
    month: Number(raw.month ?? new Date().getMonth() + 1),
    subject: String(raw.subject ?? ''),
    score,
    totalScore,
    percentage: Number(raw.percentage ?? calcPercentage(score, totalScore)),
    difficultyBreakdown: normalizeDifficultyBreakdown(
      raw.difficultyBreakdown as Partial<MonthlyEvaluationRecord['difficultyBreakdown']>,
    ),
    teacherComment: String(raw.teacherComment ?? ''),
    strengths: String(raw.strengths ?? ''),
    improvements: String(raw.improvements ?? ''),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
  return normalizeMonthlyEvaluationRecord(base)
}

function normalizeProgress(raw: Record<string, unknown>): ProgressRecord | null {
  if (!raw.id || !raw.studentId) return null
  const ts = String(raw.createdAt ?? nowIso())
  const currentPage = Number(raw.currentPage ?? 0)
  const totalPage = Number(raw.totalPage ?? 1)
  const progressRate =
    raw.progressRate !== undefined
      ? Number(raw.progressRate)
      : calcProgressRate(currentPage, totalPage)
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    subject: String(raw.subject ?? ''),
    textbookName: String(raw.textbookName ?? ''),
    currentProgress: String(raw.currentProgress ?? ''),
    currentPage,
    totalPage,
    progressRate,
    lastStudyDate: String(raw.lastStudyDate ?? ts.slice(0, 10)),
    teacherMemo: String(raw.teacherMemo ?? ''),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

function normalizeMakeupPlan(raw: Record<string, unknown>): MakeupPlanRecord | null {
  if (!raw.id || !raw.studentId || !raw.scheduledDate) return null
  const ts = String(raw.createdAt ?? nowIso())
  const methodRaw = String(raw.method ?? '학원 보강')
  const method: MakeupPlanRecord['method'] =
    methodRaw === '영상 대체' ? '영상 대체' : '학원 보강'
  const statusRaw = String(raw.status ?? '예정')
  const status: MakeupPlanRecord['status'] =
    statusRaw === '완료' || statusRaw === '취소' ? statusRaw : '예정'
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    scheduledDate: String(raw.scheduledDate),
    scheduledTime: String(raw.scheduledTime ?? '19:00'),
    method,
    subject: String(raw.subject ?? ''),
    reason: String(raw.reason ?? ''),
    memo: String(raw.memo ?? ''),
    status,
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

function normalizeContentPost(raw: Record<string, unknown>): ContentPost | null {
  if (!raw.id || !raw.title) return null
  const ts = String(raw.createdAt ?? nowIso())
  const categoryRaw = String(raw.category ?? '공지사항')
  const category: ContentPost['category'] =
    categoryRaw === '학습정보' ? '학습정보' : '공지사항'
  const base: ContentPost = {
    id: String(raw.id),
    category,
    title: String(raw.title ?? ''),
    content: String(raw.content ?? ''),
    summary: String(raw.summary ?? ''),
    sourceName: String(raw.sourceName ?? ''),
    originalArticleTitle: String(raw.originalArticleTitle ?? ''),
    authorName: String(raw.authorName ?? ''),
    isPinned: Boolean(raw.isPinned),
    isPublished: raw.isPublished === undefined ? true : Boolean(raw.isPublished),
    publishedAt: String(raw.publishedAt ?? ts.slice(0, 10)),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
  return normalizeContentPostRecord(base)
}

function normalizeQuestion(raw: Record<string, unknown>): QuestionRecord | null {
  if (!raw.id || !raw.studentId || !raw.date) return null
  const ts = String(raw.createdAt ?? nowIso())
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    date: String(raw.date),
    category: (raw.category as QuestionRecord['category']) ?? '기타',
    title: String(raw.title ?? ''),
    content: String(raw.content ?? ''),
    answer: String(raw.answer ?? ''),
    questionImages: normalizeQuestionImages(raw.questionImages),
    answerImages: normalizeQuestionImages(raw.answerImages),
    status: (raw.status as QuestionRecord['status']) ?? '답변대기',
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

function normalizeArray<T>(
  raw: unknown[],
  normalizer: (item: Record<string, unknown>) => T | null,
): T[] {
  return raw
    .map((item) => normalizer(item as Record<string, unknown>))
    .filter((item): item is T => item !== null)
}

function migrateHomeworkStatuses(records: HomeworkRecord[]): HomeworkRecord[] {
  const normalized = records.map(normalizeHomeworkRecord)
  const changed = normalized.some((record, index) => {
    const original = records[index]
    return (
      record.status !== original.status ||
      record.description !== original.description ||
      record.title !== original.title
    )
  })
  if (changed) {
    saveHomework(normalized)
  }
  return normalized
}

export function loadAllRecords(students: Student[]) {
  const seeds = createSeedRecords(students)

  const attendance = initRecords(
    STORAGE_KEYS.attendance,
    LEGACY_STORAGE_KEYS.attendance,
    normalizeAttendance,
    seeds.attendance,
  )

  const homework = initRecords(
    STORAGE_KEYS.homework,
    LEGACY_STORAGE_KEYS.homework,
    normalizeHomework,
    seeds.homework,
  )

  const assignmentCompletion = initRecords(
    STORAGE_KEYS.assignmentCompletion,
    LEGACY_STORAGE_KEYS.assignmentCompletion,
    normalizeAssignment,
    seeds.assignments,
  )

  const dailyTests = initRecords(
    STORAGE_KEYS.dailyTests,
    LEGACY_STORAGE_KEYS.dailyTests,
    normalizeDailyTest,
    seeds.dailyTests,
  )

  const monthlyEvaluations = initRecords(
    STORAGE_KEYS.monthlyEvaluations,
    '',
    normalizeMonthly,
    seeds.monthlyEvaluations,
  )

  const questions = initRecords(
    STORAGE_KEYS.questions,
    '',
    normalizeQuestion,
    seeds.questions,
  )

  const progress = initRecords(
    STORAGE_KEYS.progress,
    '',
    normalizeProgress,
    seeds.progress,
  )

  const makeupPlans = initRecords(
    STORAGE_KEYS.makeupPlans,
    '',
    normalizeMakeupPlan,
    seeds.makeupPlans,
  )

  const contentPosts = initRecords(
    STORAGE_KEYS.contentPosts,
    '',
    normalizeContentPost,
    createSeedContentPosts(),
  )

  return {
    attendance,
    homework: migrateHomeworkStatuses(homework),
    assignmentCompletion,
    dailyTests,
    monthlyEvaluations,
    questions,
    progress,
    makeupPlans,
    contentPosts,
  }
}

export function saveAttendance(records: AttendanceRecord[]) {
  saveToStorage(STORAGE_KEYS.attendance, records)
}

export function saveHomework(records: HomeworkRecord[]) {
  saveToStorage(STORAGE_KEYS.homework, records)
}

export function saveAssignments(records: AssignmentCompletionRecord[]) {
  saveToStorage(STORAGE_KEYS.assignmentCompletion, records)
}

export function saveDailyTests(records: DailyTestRecord[]) {
  saveToStorage(STORAGE_KEYS.dailyTests, records)
}

export function saveMonthlyEvaluations(records: MonthlyEvaluationRecord[]) {
  saveToStorage(STORAGE_KEYS.monthlyEvaluations, records)
}

export function saveQuestions(records: QuestionRecord[]) {
  saveToStorage(STORAGE_KEYS.questions, records)
}

export function saveProgress(records: ProgressRecord[]) {
  saveToStorage(STORAGE_KEYS.progress, records)
}

export function saveMakeupPlans(records: MakeupPlanRecord[]) {
  saveToStorage(STORAGE_KEYS.makeupPlans, records)
}

export function saveContentPosts(records: ContentPost[]) {
  saveToStorage(STORAGE_KEYS.contentPosts, records)
}

export function createTimestamps() {
  const ts = nowIso()
  return { createdAt: ts, updatedAt: ts }
}

export function touchRecord<T extends { updatedAt: string }>(record: T): T {
  return { ...record, updatedAt: nowIso() }
}
