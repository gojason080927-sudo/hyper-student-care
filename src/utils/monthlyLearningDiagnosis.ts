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
import { getFinalPassSession, migrateSessionResults } from './dailyTest'

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

/**
 * 학습 역량 원점수 → 진단점수 변환.
 * 학습 관리 지표에는 적용하지 않는다.
 */
export function toDiagnosticAbilityScore(raw: number | null): number | null {
  if (raw === null || raw === undefined) return null
  const value = Number(raw)
  if (!Number.isFinite(value)) return null

  let diagnostic: number
  if (value >= 85) {
    diagnostic = 82 + (value - 85) * 0.8
  } else if (value >= 70) {
    diagnostic = 70 + (value - 70) * 0.8
  } else {
    // 45~69.999 및 45 미만: 같은 기울기로 연장 (음수 금지는 clamp)
    diagnostic = 55 + (value - 45) * 0.6
  }
  return clampScoreInt(diagnostic)
}

/** 학습 역량 진단점수 등급 문구 (점수 계산과 무관) */
export function getAbilityGradeLabel(score: number | null | undefined): string | null {
  if (score === null || score === undefined) return null
  if (score >= 90) return '매우 우수'
  if (score >= 82) return '우수'
  if (score >= 70) return '보통'
  if (score >= 55) return '보완 필요'
  return '집중 보완'
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
  return clampScore(100 - (causeCount / totalQuestions) * 100)
}

function weightedRawScore(
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
    return sessions.some((session) => session.status !== '미응시')
  })
}

function computeMathCauseRawScore(
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

  return weightedRawScore(
    scoreFromErrorRate(dailyWrong, dailyTotal),
    scoreFromErrorRate(monthlyWrong, monthlyTotal),
  )
}

/** 과제 수행 습관 / 과제 성실도 공통 감점 (최대 -10) */
function computeHomeworkDeduction(counts: MonthlyLearningCounts): number {
  return Math.min(
    counts.partialHomeworkCount * 0.5 + counts.incompleteHomeworkCount * 1,
    10,
  )
}

function computeHomeworkHabitScore(
  counts: MonthlyLearningCounts,
  hasHomeworkData: boolean,
): number | null {
  if (!hasHomeworkData) return null
  return clampScore(100 - computeHomeworkDeduction(counts))
}

function aggregateFridayRetest(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): { total: number; wrong: number; hasData: boolean } {
  let total = 0
  let wrong = 0
  let hasData = false
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.fridayRetestWrong === null && diagnosis.fridayRetestTotal === null) {
      continue
    }
    hasData = true
    total += diagnosis.fridayRetestTotal ?? 0
    wrong += diagnosis.fridayRetestWrong ?? 0
  }
  return { total, wrong, hasData }
}

function computeWrongAnswerManagementScore(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): number | null {
  const { wrong, hasData } = aggregateFridayRetest(dailyTests, studentId, year, month)
  if (!hasData) return null
  const deduction = Math.min(wrong * 0.5, 8)
  return clampScore(100 - deduction)
}

/** 일일테스트 최종 미통과(응시했으나 합격 차시 없음) 횟수 */
function countDailyTestFinalFail(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): number {
  const seenDates = new Set<string>()
  let count = 0
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (seenDates.has(test.date)) continue
    seenDates.add(test.date)
    const sessions = migrateSessionResults(test)
    const attempted = sessions.some((session) => session.status !== '미응시')
    if (!attempted) continue
    if (getFinalPassSession(sessions) === null) count += 1
  }
  return count
}

function computeAttendanceSincerityScore(
  counts: MonthlyLearningCounts,
  hasAttendance: boolean,
): number | null {
  if (!hasAttendance) return null
  // 지각 -1 / 결석(status==='결석') -3. reason 미사용.
  return clampScore(100 - counts.lateCount * 1 - counts.absentCount * 3)
}

function computeHomeworkSincerityScore(
  counts: MonthlyLearningCounts,
  hasHomeworkData: boolean,
): number | null {
  if (!hasHomeworkData) return null
  return clampScore(100 - computeHomeworkDeduction(counts))
}

function computeDailyTestSincerityScore(
  counts: MonthlyLearningCounts,
  finalFailCount: number,
  hasDailyTest: boolean,
): number | null {
  if (!hasDailyTest) return null
  // 1차 통과 0 / 2차 -0.5 / 3차 -1 / 4차 -1.5 / 최종 미통과 -2, 월 최대 -10
  const deduction = Math.min(
    counts.testPass2Count * 0.5 +
      counts.testPass3Count * 1 +
      counts.testPass4Count * 1.5 +
      finalFailCount * 2,
    10,
  )
  return clampScore(100 - deduction)
}

/**
 * 학습 성실성 = 출결 30% + 과제 40% + 일일테스트 30%
 * 데이터 있는 영역만 가중치를 재정규화하여 평균.
 */
function computeLearningSincerityScore(input: {
  counts: MonthlyLearningCounts
  hasAttendance: boolean
  hasHomeworkData: boolean
  hasDailyTest: boolean
  finalFailCount: number
}): number | null {
  const parts: Array<{ score: number; weight: number }> = []
  const attendance = computeAttendanceSincerityScore(input.counts, input.hasAttendance)
  if (attendance !== null) parts.push({ score: attendance, weight: 0.3 })
  const homework = computeHomeworkSincerityScore(input.counts, input.hasHomeworkData)
  if (homework !== null) parts.push({ score: homework, weight: 0.4 })
  const daily = computeDailyTestSincerityScore(
    input.counts,
    input.finalFailCount,
    input.hasDailyTest,
  )
  if (daily !== null) parts.push({ score: daily, weight: 0.3 })

  if (parts.length === 0) return null
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0)
  const weighted =
    parts.reduce((sum, part) => sum + part.score * part.weight, 0) / weightSum
  return clampScoreInt(weighted)
}

function hasMathMonthlyEvaluationInMonth(
  monthlyEvaluations: MonthlyEvaluationRecord[],
  studentId: string,
  year: number,
  month: number,
): boolean {
  return monthlyEvaluations.some((evaluation) => {
    if (evaluation.studentId !== studentId) return false
    if (evaluation.year !== year || evaluation.month !== month) return false
    if (!subjectMatches(evaluation.subject, '수학')) return false
    const items = evaluation.wrongAnswerItems ?? []
    const fromField = Math.max(0, evaluation.questionTotal ?? 0)
    const fromDifficulty = getDifficultyTotal(evaluation.difficultyBreakdown)
    return items.length > 0 || fromField > 0 || fromDifficulty > 0 || evaluation.totalScore > 0
  })
}

function computeEnglishVocabRawScore(
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
  return clampScore((pass / total) * 100)
}

function computeEnglishGrammarRawScore(
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

function computeEnglishReadingRawScore(
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
  // 독해 오답 1개당 -0.5점
  return clampScore(100 - wrong * 0.5)
}

export type LiveDiagnosisResult = {
  subject: DiagnosisSubject
  year: number
  month: number
  scores: MonthlyLearningReportScores
  learningRecords: MonthlyLearningRecordsSnapshot
  metricLabels: ReturnType<typeof getMetricLabels>
  /** 수학: 월말평가 데이터가 반영되었는지 (강사 화면 안내용) */
  mathMonthlyEvaluationIncluded: boolean
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

  const fridayRetest = aggregateFridayRetest(
    input.dailyTests,
    input.studentId,
    input.year,
    input.month,
  )
  const learningRecords: MonthlyLearningRecordsSnapshot = {
    lateCount: counts.lateCount,
    absentCount: counts.absentCount,
    partialHomeworkCount: counts.partialHomeworkCount,
    incompleteHomeworkCount: counts.incompleteHomeworkCount,
    testPass2Count: counts.testPass2Count,
    testPass3Count: counts.testPass3Count,
    testPass4Count: counts.testPass4Count,
    fridayRetestTotalCount: fridayRetest.hasData ? fridayRetest.total : null,
    fridayRetestWrongCount: fridayRetest.hasData ? fridayRetest.wrong : null,
  }

  const hasHomeworkData = hasHomeworkSourceInMonth({
    studentId: input.studentId,
    year: input.year,
    month: input.month,
    homeworkTextbookEntries: input.homeworkTextbookEntries,
    homework: input.homework,
  })
  const hasAttendance = hasAttendanceInMonth(
    input.attendance,
    input.studentId,
    input.year,
    input.month,
  )
  const hasDailyTest = hasDailyTestInMonth(
    input.dailyTests,
    input.studentId,
    input.year,
    input.month,
  )
  const finalFailCount = countDailyTestFinalFail(
    input.dailyTests,
    input.studentId,
    input.year,
    input.month,
  )

  const homeworkHabit = computeHomeworkHabitScore(counts, hasHomeworkData)
  const wrongAnswerManagement = computeWrongAnswerManagementScore(
    input.dailyTests,
    input.studentId,
    input.year,
    input.month,
  )
  const learningSincerity = computeLearningSincerityScore({
    counts,
    hasAttendance,
    hasHomeworkData,
    hasDailyTest,
    finalFailCount,
  })
  const mathMonthlyEvaluationIncluded =
    input.subject === '수학' &&
    hasMathMonthlyEvaluationInMonth(
      input.monthlyEvaluations,
      input.studentId,
      input.year,
      input.month,
    )

  let rawMetric1: number | null
  let rawMetric2: number | null
  let rawMetric3: number | null

  if (input.subject === '수학') {
    rawMetric1 = computeMathCauseRawScore(
      input.dailyTests,
      input.monthlyEvaluations,
      input.studentId,
      input.year,
      input.month,
      '개념 부족',
    )
    rawMetric2 = computeMathCauseRawScore(
      input.dailyTests,
      input.monthlyEvaluations,
      input.studentId,
      input.year,
      input.month,
      '계산 실수',
    )
    rawMetric3 = computeMathCauseRawScore(
      input.dailyTests,
      input.monthlyEvaluations,
      input.studentId,
      input.year,
      input.month,
      '문제 이해 부족',
    )
  } else {
    rawMetric1 = computeEnglishVocabRawScore(
      input.dailyTests,
      input.studentId,
      input.year,
      input.month,
    )
    rawMetric2 = computeEnglishGrammarRawScore(
      input.dailyTests,
      input.studentId,
      input.year,
      input.month,
    )
    rawMetric3 = computeEnglishReadingRawScore(
      input.dailyTests,
      input.studentId,
      input.year,
      input.month,
    )
  }

  const scores: MonthlyLearningReportScores = {
    metric1: toDiagnosticAbilityScore(rawMetric1),
    metric2: toDiagnosticAbilityScore(rawMetric2),
    metric3: toDiagnosticAbilityScore(rawMetric3),
    homeworkHabit,
    wrongAnswerManagement,
    learningSincerity,
    rawMetric1,
    rawMetric2,
    rawMetric3,
  }

  return {
    subject: input.subject,
    year: input.year,
    month: input.month,
    scores,
    learningRecords,
    metricLabels: getMetricLabels(input.subject),
    mathMonthlyEvaluationIncluded,
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

/** @deprecated 대표 평균점수는 사용하지 않음. 호환용으로만 유지 */
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
    // 학부모: published snapshot만 노출. 월중 예상점수 금지.
    if (input.published && isPublishedReport(input.published)) {
      return {
        scores: input.published.scores,
        learningRecords: input.published.learningRecords,
        isSnapshot: true,
        status: 'published',
      }
    }
    return {
      scores: {
        metric1: null,
        metric2: null,
        metric3: null,
        homeworkHabit: null,
        wrongAnswerManagement: null,
        learningSincerity: null,
        rawMetric1: null,
        rawMetric2: null,
        rawMetric3: null,
      },
      learningRecords: {
        lateCount: 0,
        absentCount: 0,
        partialHomeworkCount: 0,
        incompleteHomeworkCount: 0,
        testPass2Count: 0,
        testPass3Count: 0,
        testPass4Count: 0,
        fridayRetestTotalCount: null,
        fridayRetestWrongCount: null,
      },
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
