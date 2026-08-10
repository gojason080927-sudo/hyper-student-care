import type {
  AttendanceRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  MonthlyEvaluationRecord,
  MonthlyLearningReportRecord,
  MonthlyLearningReportScores,
  MonthlyLearningRecordsSnapshot,
} from '../types/records'
import type { Student } from '../types/student'
import {
  clampScore,
  clampScoreInt,
  normalizeDailyLearningDiagnosis,
  type MathWrongCause,
} from './learningDiagnosis'
import { getDifficultyTotal } from './monthlyEvaluation'
import {
  aggregateMonthlyLearningCounts,
  isDateInYearMonth,
  type MonthlyLearningCounts,
} from './monthlyLearningProgress'
import { migrateSessionResults } from './dailyTest'

export type DiagnosisSubject = '수학' | '영어'

export type DiagnosisMetricKey =
  | 'metric1'
  | 'metric2'
  | 'metric3'
  | 'homeworkHabit'
  | 'wrongAnswerManagement'
  | 'learningSincerity'

export const MATH_METRIC_LABELS = {
  metric1: '개념 이해도',
  metric2: '계산 정확도',
  metric3: '문제 해석 능력',
  homeworkHabit: '과제 수행 습관',
  wrongAnswerManagement: '오답 관리 능력',
  learningSincerity: '학습 성실성',
} as const

export const ENGLISH_METRIC_LABELS = {
  metric1: '어휘 성취 능력',
  metric2: '문법 이해도',
  metric3: '독해 정확도',
  homeworkHabit: '과제 수행 습관',
  wrongAnswerManagement: '오답 관리 능력',
  learningSincerity: '학습 성실성',
} as const

export const SCORE_UNAVAILABLE_LABEL = '평가 전'

export function getMetricLabels(subject: DiagnosisSubject) {
  return subject === '수학' ? MATH_METRIC_LABELS : ENGLISH_METRIC_LABELS
}

export function formatDiagnosisScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return SCORE_UNAVAILABLE_LABEL
  return `${score}점`
}

function subjectMatches(recordSubject: string, subject: DiagnosisSubject): boolean {
  const value = recordSubject.trim()
  if (!value) return true
  if (subject === '수학') return value.includes('수학')
  return value.includes('영어')
}

function countCause(items: { cause: MathWrongCause }[], cause: MathWrongCause): number {
  return items.filter((item) => item.cause === cause).length
}

function scoreFromErrorRate(causeCount: number, totalQuestions: number): number | null {
  if (totalQuestions <= 0) return null
  const errorRate = causeCount / totalQuestions
  return clampScore(100 * (1 - errorRate))
}

function weightedScore(
  daily: number | null,
  monthly: number | null,
  dailyWeight = 0.6,
  monthlyWeight = 0.4,
): number | null {
  if (daily === null && monthly === null) return null
  if (daily === null) return monthly
  if (monthly === null) return daily
  return clampScore(daily * dailyWeight + monthly * monthlyWeight)
}

function hasHomeworkSourceInMonth(input: {
  studentId: string
  year: number
  month: number
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  homework?: HomeworkRecord[]
}): boolean {
  const { studentId, year, month, homeworkTextbookEntries, homework = [] } = input
  for (const entry of homeworkTextbookEntries) {
    if (entry.studentId !== studentId) continue
    if (!isDateInYearMonth(entry.date, year, month)) continue
    return true
  }
  const datesWithTextbook = new Set<string>()
  for (const entry of homeworkTextbookEntries) {
    if (entry.studentId !== studentId) continue
    if (!isDateInYearMonth(entry.date, year, month)) continue
    datesWithTextbook.add(entry.date)
  }
  for (const record of homework) {
    if (record.studentId !== studentId) continue
    if (!isDateInYearMonth(record.date, year, month)) continue
    if (datesWithTextbook.has(record.date)) continue
    return true
  }
  return false
}

function hasAttendanceInMonth(
  attendance: AttendanceRecord[],
  studentId: string,
  year: number,
  month: number,
): boolean {
  return attendance.some(
    (record) =>
      record.studentId === studentId && isDateInYearMonth(record.date, year, month),
  )
}

function hasDailyTestInMonth(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): boolean {
  return dailyTests.some((test) => {
    if (test.studentId !== studentId) return false
    if (!isDateInYearMonth(test.date, year, month)) return false
    const sessions = migrateSessionResults(test)
    return (
      sessions.some((session) => session.status !== '미응시') ||
      Boolean(test.memo?.trim()) ||
      normalizeDailyLearningDiagnosis(test.learningDiagnosis).wrongAnswerItems.length > 0
    )
  })
}

function computeMathCauseScore(
  dailyTests: DailyTestRecord[],
  monthlyEvaluations: MonthlyEvaluationRecord[],
  studentId: string,
  year: number,
  month: number,
  cause: MathWrongCause,
): number | null {
  let dailyWrong = 0
  let dailyTotal = 0
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, '수학')) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    dailyWrong += countCause(diagnosis.wrongAnswerItems, cause)
    dailyTotal += Math.max(diagnosis.questionTotal, 0)
  }

  let monthlyWrong = 0
  let monthlyTotal = 0
  for (const evaluation of monthlyEvaluations) {
    if (evaluation.studentId !== studentId) continue
    if (evaluation.year !== year || evaluation.month !== month) continue
    if (!subjectMatches(evaluation.subject, '수학')) continue
    const items = evaluation.wrongAnswerItems ?? []
    monthlyWrong += countCause(items, cause)
    const fromField = Math.max(0, evaluation.questionTotal ?? 0)
    const fromDifficulty = getDifficultyTotal(evaluation.difficultyBreakdown)
    monthlyTotal += fromField > 0 ? fromField : fromDifficulty
  }

  return weightedScore(
    scoreFromErrorRate(dailyWrong, dailyTotal),
    scoreFromErrorRate(monthlyWrong, monthlyTotal),
  )
}

function computeHomeworkHabitScore(
  counts: MonthlyLearningCounts,
  hasHomeworkData: boolean,
): number | null {
  if (!hasHomeworkData) return null
  const deduction = counts.partialHomeworkCount * 2 + counts.incompleteHomeworkCount * 4
  return clampScoreInt(100 - deduction)
}

function computeWrongAnswerManagementScore(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): number | null {
  let wrongAgain = 0
  let hasData = false
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.fridayRetestWrong === null && diagnosis.fridayRetestTotal === null) {
      continue
    }
    hasData = true
    wrongAgain += diagnosis.fridayRetestWrong ?? 0
  }
  if (!hasData) return null
  return clampScoreInt(100 - wrongAgain)
}

function computeLearningSincerityScore(
  counts: MonthlyLearningCounts,
  hasSourceData: boolean,
): number | null {
  if (!hasSourceData) return null
  const deduction =
    counts.lateCount * 2 +
    counts.absentCount * 5 +
    counts.partialHomeworkCount * 1 +
    counts.incompleteHomeworkCount * 2 +
    counts.testPass2Count * 1 +
    counts.testPass3Count * 2 +
    counts.testPass4Count * 3
  return clampScoreInt(100 - deduction)
}

function computeEnglishVocabScore(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): number | null {
  let pass = 0
  let total = 0
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, '영어')) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.englishVocabResult === null) continue
    total += 1
    if (diagnosis.englishVocabResult === '합격') pass += 1
  }
  if (total === 0) return null
  return clampScoreInt((pass / total) * 100)
}

function computeEnglishGrammarScore(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): number | null {
  let wrong = 0
  let hasData = false
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, '영어')) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.englishGrammarWrongCount === null) continue
    hasData = true
    wrong += diagnosis.englishGrammarWrongCount
  }
  if (!hasData) return null
  return clampScore(100 - wrong * 0.5)
}

function computeEnglishReadingScore(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): number | null {
  let wrong = 0
  let hasData = false
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, '영어')) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.englishReadingWrongCount === null) continue
    hasData = true
    wrong += diagnosis.englishReadingWrongCount
  }
  if (!hasData) return null
  return clampScoreInt(100 - wrong)
}

export type LiveDiagnosisResult = {
  subject: DiagnosisSubject
  year: number
  month: number
  scores: MonthlyLearningReportScores
  learningRecords: MonthlyLearningRecordsSnapshot
  metricLabels: ReturnType<typeof getMetricLabels>
}

export function computeLiveMonthlyLearningDiagnosis(input: {
  studentId: string
  year: number
  month: number
  subject: DiagnosisSubject
  attendance: AttendanceRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  homework?: HomeworkRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
}): LiveDiagnosisResult {
  const counts = aggregateMonthlyLearningCounts({
    studentId: input.studentId,
    year: input.year,
    month: input.month,
    attendance: input.attendance,
    homeworkTextbookEntries: input.homeworkTextbookEntries,
    homework: input.homework,
    dailyTests: input.dailyTests,
  })

  const learningRecords: MonthlyLearningRecordsSnapshot = {
    lateCount: counts.lateCount,
    absentCount: counts.absentCount,
    partialHomeworkCount: counts.partialHomeworkCount,
    incompleteHomeworkCount: counts.incompleteHomeworkCount,
    testPass2Count: counts.testPass2Count,
    testPass3Count: counts.testPass3Count,
    testPass4Count: counts.testPass4Count,
  }

  const hasHomeworkData = hasHomeworkSourceInMonth({
    studentId: input.studentId,
    year: input.year,
    month: input.month,
    homeworkTextbookEntries: input.homeworkTextbookEntries,
    homework: input.homework,
  })
  const hasSinceritySource =
    hasAttendanceInMonth(input.attendance, input.studentId, input.year, input.month) ||
    hasHomeworkData ||
    hasDailyTestInMonth(input.dailyTests, input.studentId, input.year, input.month)

  const homeworkHabit = computeHomeworkHabitScore(counts, hasHomeworkData)
  const wrongAnswerManagement = computeWrongAnswerManagementScore(
    input.dailyTests,
    input.studentId,
    input.year,
    input.month,
  )
  const learningSincerity = computeLearningSincerityScore(counts, hasSinceritySource)

  let metric1: number | null
  let metric2: number | null
  let metric3: number | null

  if (input.subject === '수학') {
    metric1 = computeMathCauseScore(
      input.dailyTests,
      input.monthlyEvaluations,
      input.studentId,
      input.year,
      input.month,
      '개념 부족',
    )
    metric2 = computeMathCauseScore(
      input.dailyTests,
      input.monthlyEvaluations,
      input.studentId,
      input.year,
      input.month,
      '계산 실수',
    )
    metric3 = computeMathCauseScore(
      input.dailyTests,
      input.monthlyEvaluations,
      input.studentId,
      input.year,
      input.month,
      '문제 이해 부족',
    )
  } else {
    metric1 = computeEnglishVocabScore(
      input.dailyTests,
      input.studentId,
      input.year,
      input.month,
    )
    metric2 = computeEnglishGrammarScore(
      input.dailyTests,
      input.studentId,
      input.year,
      input.month,
    )
    metric3 = computeEnglishReadingScore(
      input.dailyTests,
      input.studentId,
      input.year,
      input.month,
    )
  }

  const scores: MonthlyLearningReportScores = {
    metric1,
    metric2,
    metric3,
    homeworkHabit,
    wrongAnswerManagement,
    learningSincerity,
  }

  return {
    subject: input.subject,
    year: input.year,
    month: input.month,
    scores,
    learningRecords,
    metricLabels: getMetricLabels(input.subject),
  }
}

export function buildReportStudentMeta(student: Student): {
  studentName: string
  school: string
  grade: string
  className: string
  teacher: string
} {
  return {
    studentName: student.name,
    school: student.school,
    grade: student.grade,
    className: student.className,
    teacher: student.teacher,
  }
}

/** 값이 있는 지표만 평균. 전부면 null */
export function getReportAverageScore(
  scores: MonthlyLearningReportScores,
): number | null {
  const values = [
    scores.metric1,
    scores.metric2,
    scores.metric3,
    scores.homeworkHabit,
    scores.wrongAnswerManagement,
    scores.learningSincerity,
  ].filter((value): value is number => value !== null && value !== undefined)
  if (values.length === 0) return null
  const sum = values.reduce((acc, value) => acc + value, 0)
  return clampScoreInt(sum / values.length)
}

export function isPublishedReport(
  report: MonthlyLearningReportRecord | null | undefined,
): boolean {
  return report?.status === 'published'
}

export function pickReportForView(input: {
  published: MonthlyLearningReportRecord | null
  live: LiveDiagnosisResult
  mode: 'teacher' | 'parent'
}): {
  scores: MonthlyLearningReportScores
  learningRecords: MonthlyLearningRecordsSnapshot
  isSnapshot: boolean
  status: 'live' | 'draft' | 'published'
} {
  if (input.mode === 'parent') {
    if (input.published && isPublishedReport(input.published)) {
      return {
        scores: input.published.scores,
        learningRecords: input.published.learningRecords,
        isSnapshot: true,
        status: 'published',
      }
    }
    return {
      scores: input.live.scores,
      learningRecords: input.live.learningRecords,
      isSnapshot: false,
      status: 'live',
    }
  }

  if (input.published && isPublishedReport(input.published)) {
    return {
      scores: input.published.scores,
      learningRecords: input.published.learningRecords,
      isSnapshot: true,
      status: 'published',
    }
  }

  return {
    scores: input.live.scores,
    learningRecords: input.live.learningRecords,
    isSnapshot: false,
    status: input.published?.status === 'draft' ? 'draft' : 'live',
  }
}
