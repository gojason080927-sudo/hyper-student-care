/**
 * 월간 학습진단 REPORT 표시 전용 헬퍼.
 * 점수 산식/변환식은 수정하지 않으며, 이미 산출된 scores와 원본 기록으로 UI 문구만 만든다.
 */
import type {
  DailyTestRecord,
  MonthlyEvaluationRecord,
  MonthlyLearningRecordsSnapshot,
  MonthlyLearningReportScores,
} from '../types/records'
import {
  formatDiagnosisScore,
  getAbilityGradeLabel,
  getMetricLabels,
  SCORE_UNAVAILABLE_LABEL,
  type DiagnosisSubject,
} from './monthlyLearningDiagnosis'
import { normalizeDailyLearningDiagnosis } from './learningDiagnosis'
import { getDifficultyTotal } from './monthlyEvaluation'
import { getFinalPassSession, migrateSessionResults } from './dailyTest'
import { isDateInYearMonth } from './monthlyLearningProgress'

export type ReportRadarPoint = {
  axis: string
  shortAxis: string
  value: number
  displayScore: string
  hasScore: boolean
}

export type ReportScoreTableRow = {
  key: string
  area: string
  group: '학습 역량' | '학습 관리'
  score: number | null
  scoreLabel: string
  gradeLabel: string
}

export type ReportDetailStatItem = {
  label: string
  value: string
}

export type ReportDetailCard = {
  title: string
  items: ReportDetailStatItem[]
}

function subjectMatches(recordSubject: string, subject: DiagnosisSubject): boolean {
  const value = recordSubject.trim()
  if (!value) return true
  if (subject === '수학') return value.includes('수학')
  return value.includes('영어')
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator <= 0) return SCORE_UNAVAILABLE_LABEL
  return `${Math.round((numerator / denominator) * 1000) / 10}%`
}

function formatOptionalCount(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return '데이터 없음'
  return `${value}${suffix}`
}

function shortenAxisLabel(label: string): string {
  if (label.length <= 5) return label
  return label.replace(' 능력', '').replace(' 습관', '').replace(' 정확도', '정확').trim()
}

/** Radar: null(평가 전)은 차트 오류 방지를 위해 값 0으로만 넣고, 라벨은 평가 전으로 표시 */
export function buildReportRadarPoints(
  subject: DiagnosisSubject,
  scores: MonthlyLearningReportScores,
): ReportRadarPoint[] {
  const labels = getMetricLabels(subject)
  const entries: Array<{ key: keyof MonthlyLearningReportScores; label: string }> = [
    { key: 'metric1', label: labels.metric1 },
    { key: 'metric2', label: labels.metric2 },
    { key: 'metric3', label: labels.metric3 },
    { key: 'homeworkHabit', label: labels.homeworkHabit },
    { key: 'wrongAnswerManagement', label: labels.wrongAnswerManagement },
    { key: 'learningSincerity', label: labels.learningSincerity },
  ]

  return entries.map(({ key, label }) => {
    const score = scores[key]
    const hasScore = score !== null && score !== undefined
    return {
      axis: label,
      shortAxis: shortenAxisLabel(label),
      value: hasScore ? Math.max(0, Math.min(100, Number(score))) : 0,
      displayScore: hasScore ? String(score) : SCORE_UNAVAILABLE_LABEL,
      hasScore,
    }
  })
}

export function buildReportScoreTableRows(
  subject: DiagnosisSubject,
  scores: MonthlyLearningReportScores,
): ReportScoreTableRow[] {
  const labels = getMetricLabels(subject)
  const ability: ReportScoreTableRow[] = (
    [
      ['metric1', labels.metric1],
      ['metric2', labels.metric2],
      ['metric3', labels.metric3],
    ] as const
  ).map(([key, area]) => ({
    key,
    area,
    group: '학습 역량',
    score: scores[key],
    scoreLabel: formatDiagnosisScore(scores[key]),
    gradeLabel: getAbilityGradeLabel(scores[key]) ?? '-',
  }))

  const management: ReportScoreTableRow[] = (
    [
      ['homeworkHabit', labels.homeworkHabit],
      ['wrongAnswerManagement', labels.wrongAnswerManagement],
      ['learningSincerity', labels.learningSincerity],
    ] as const
  ).map(([key, area]) => ({
    key,
    area,
    group: '학습 관리',
    score: scores[key],
    scoreLabel: formatDiagnosisScore(scores[key]),
    // 학습 관리는 실력 등급을 강제하지 않음
    gradeLabel: scores[key] === null ? '-' : '',
  }))

  return [...ability, ...management]
}

function buildFridayRetestCard(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
  subject: DiagnosisSubject,
  learningRecords: MonthlyLearningRecordsSnapshot,
): ReportDetailCard {
  let attemptDays = 0
  let total = 0
  let wrong = 0
  let hasData = false

  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, subject)) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.fridayRetestTotal === null && diagnosis.fridayRetestWrong === null) continue
    hasData = true
    attemptDays += 1
    total += diagnosis.fridayRetestTotal ?? 0
    wrong += diagnosis.fridayRetestWrong ?? 0
  }

  if (!hasData) {
    // snapshot에만 있는 경우 (원본 일자 집계 불가)
    if (
      learningRecords.fridayRetestTotalCount !== null ||
      learningRecords.fridayRetestWrongCount !== null
    ) {
      const snapTotal = learningRecords.fridayRetestTotalCount ?? 0
      const snapWrong = learningRecords.fridayRetestWrongCount ?? 0
      const correct = Math.max(0, snapTotal - snapWrong)
      return {
        title: '오답 재시험 현황',
        items: [
          { label: '응시 횟수', value: '데이터 없음' },
          { label: '재시험 총 문제 수', value: formatOptionalCount(snapTotal, '문제') },
          { label: '재오답 문제 수', value: formatOptionalCount(snapWrong, '문제') },
          {
            label: '재시험 정답률',
            value: snapTotal > 0 ? formatPercent(correct, snapTotal) : '데이터 없음',
          },
        ],
      }
    }
    return {
      title: '오답 재시험 현황',
      items: [
        { label: '응시 횟수', value: '평가 전' },
        { label: '재시험 총 문제 수', value: '평가 전' },
        { label: '재오답 문제 수', value: '평가 전' },
        { label: '재시험 정답률', value: '평가 전' },
      ],
    }
  }

  const correct = Math.max(0, total - wrong)
  return {
    title: '오답 재시험 현황',
    items: [
      { label: '응시 횟수', value: `${attemptDays}회` },
      { label: '재시험 총 문제 수', value: `${total}문제` },
      { label: '재오답 문제 수', value: `${wrong}문제` },
      { label: '재시험 정답률', value: total > 0 ? formatPercent(correct, total) : '데이터 없음' },
    ],
  }
}

function buildMathDailyTestCard(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): ReportDetailCard {
  let recordedDays = 0
  let attemptedDays = 0
  let firstPassDays = 0
  let totalQuestions = 0
  let wrongQuestions = 0
  let hasQuestionTotal = false

  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, '수학')) continue
    recordedDays += 1
    const sessions = migrateSessionResults(test)
    const attempted = sessions.some((session) => session.status !== '미응시')
    if (attempted) {
      attemptedDays += 1
      if (getFinalPassSession(sessions) === 1) firstPassDays += 1
    }
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.questionTotal > 0) {
      hasQuestionTotal = true
      totalQuestions += diagnosis.questionTotal
      wrongQuestions += diagnosis.wrongAnswerItems.length
    }
  }

  if (recordedDays === 0) {
    return {
      title: '일일테스트 현황',
      items: [
        { label: '응시율', value: '평가 전' },
        { label: '1차시 통과율', value: '평가 전' },
        { label: '총 응시 문제 수', value: '평가 전' },
        { label: '통과 문제 수', value: '평가 전' },
      ],
    }
  }

  const passedQuestions = Math.max(0, totalQuestions - wrongQuestions)
  return {
    title: '일일테스트 현황',
    items: [
      { label: '응시율', value: formatPercent(attemptedDays, recordedDays) },
      {
        label: '1차시 통과율',
        value: attemptedDays > 0 ? formatPercent(firstPassDays, attemptedDays) : '데이터 없음',
      },
      {
        label: '총 응시 문제 수',
        value: hasQuestionTotal ? `${totalQuestions}문제` : '데이터 없음',
      },
      {
        label: '통과 문제 수',
        value: hasQuestionTotal ? `${passedQuestions}문제` : '데이터 없음',
      },
    ],
  }
}

function buildMathMonthlyEvaluationCard(
  monthlyEvaluations: MonthlyEvaluationRecord[],
  studentId: string,
  year: number,
  month: number,
): ReportDetailCard {
  const evaluations = monthlyEvaluations.filter(
    (evaluation) =>
      evaluation.studentId === studentId &&
      evaluation.year === year &&
      evaluation.month === month &&
      subjectMatches(evaluation.subject, '수학'),
  )

  if (evaluations.length === 0) {
    return {
      title: '월말평가 현황',
      items: [
        { label: '실시 여부', value: '미실시' },
        { label: '총점/정답률', value: '미실시' },
        { label: '총 문제 수', value: '미실시' },
        { label: '오답 수', value: '미실시' },
      ],
    }
  }

  let scoreSum = 0
  let totalScoreSum = 0
  let questionTotal = 0
  let wrongCount = 0
  for (const evaluation of evaluations) {
    scoreSum += evaluation.score
    totalScoreSum += evaluation.totalScore
    const fromField = Math.max(0, evaluation.questionTotal ?? 0)
    const fromDifficulty = getDifficultyTotal(evaluation.difficultyBreakdown)
    questionTotal += fromField > 0 ? fromField : fromDifficulty
    wrongCount += (evaluation.wrongAnswerItems ?? []).length
  }

  const rate =
    totalScoreSum > 0 ? formatPercent(scoreSum, totalScoreSum) : SCORE_UNAVAILABLE_LABEL

  return {
    title: '월말평가 현황',
    items: [
      { label: '실시 여부', value: '실시' },
      {
        label: '총점/정답률',
        value: `${scoreSum}/${totalScoreSum}점 · ${rate}`,
      },
      {
        label: '총 문제 수',
        value: questionTotal > 0 ? `${questionTotal}문제` : '데이터 없음',
      },
      { label: '오답 수', value: `${wrongCount}문제` },
    ],
  }
}

function buildEnglishVocabCard(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): ReportDetailCard {
  let attempts = 0
  let passes = 0
  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, '영어')) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.englishVocabResult === null) continue
    attempts += 1
    if (diagnosis.englishVocabResult === '합격') passes += 1
  }

  if (attempts === 0) {
    return {
      title: '단어시험 현황',
      items: [
        { label: '응시 횟수', value: '평가 전' },
        { label: '합격 횟수', value: '평가 전' },
        { label: '합격률', value: '평가 전' },
      ],
    }
  }

  return {
    title: '단어시험 현황',
    items: [
      { label: '응시 횟수', value: `${attempts}회` },
      { label: '합격 횟수', value: `${passes}회` },
      { label: '합격률', value: formatPercent(passes, attempts) },
    ],
  }
}

function buildEnglishGrammarReadingCard(
  dailyTests: DailyTestRecord[],
  studentId: string,
  year: number,
  month: number,
): ReportDetailCard {
  let grammarWrong = 0
  let readingWrong = 0
  let hasGrammar = false
  let hasReading = false

  for (const test of dailyTests) {
    if (test.studentId !== studentId) continue
    if (!isDateInYearMonth(test.date, year, month)) continue
    if (!subjectMatches(test.subject, '영어')) continue
    const diagnosis = normalizeDailyLearningDiagnosis(test.learningDiagnosis)
    if (diagnosis.englishGrammarWrongCount !== null) {
      hasGrammar = true
      grammarWrong += diagnosis.englishGrammarWrongCount
    }
    if (diagnosis.englishReadingWrongCount !== null) {
      hasReading = true
      readingWrong += diagnosis.englishReadingWrongCount
    }
  }

  if (!hasGrammar && !hasReading) {
    return {
      title: '문법/독해 현황',
      items: [
        { label: '문법 오답 수', value: '평가 전' },
        { label: '독해 오답 수', value: '평가 전' },
      ],
    }
  }

  return {
    title: '문법/독해 현황',
    items: [
      {
        label: '문법 오답 수',
        value: hasGrammar ? `${grammarWrong}개` : '데이터 없음',
      },
      {
        label: '독해 오답 수',
        value: hasReading ? `${readingWrong}개` : '데이터 없음',
      },
    ],
  }
}

/** 월간 세부 현황 카드 3개 — 표시용 집계만 수행 (점수 산식과 무관) */
export function buildMonthlyDetailCards(input: {
  subject: DiagnosisSubject
  studentId: string
  year: number
  month: number
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  learningRecords: MonthlyLearningRecordsSnapshot
}): ReportDetailCard[] {
  const friday = buildFridayRetestCard(
    input.dailyTests,
    input.studentId,
    input.year,
    input.month,
    input.subject,
    input.learningRecords,
  )

  if (input.subject === '수학') {
    return [
      buildMathDailyTestCard(
        input.dailyTests,
        input.studentId,
        input.year,
        input.month,
      ),
      buildMathMonthlyEvaluationCard(
        input.monthlyEvaluations,
        input.studentId,
        input.year,
        input.month,
      ),
      friday,
    ]
  }

  return [
    buildEnglishVocabCard(input.dailyTests, input.studentId, input.year, input.month),
    buildEnglishGrammarReadingCard(
      input.dailyTests,
      input.studentId,
      input.year,
      input.month,
    ),
    friday,
  ]
}

export function getReportTheme(subject: DiagnosisSubject) {
  if (subject === '영어') {
    return {
      accent: '#7C3AED',
      accentSoft: 'rgba(124, 58, 237, 0.12)',
      chartStroke: '#6D28D9',
      chartFill: 'rgba(124, 58, 237, 0.28)',
      strengthBg: '#F5F3FF',
      strengthTitle: '#5B21B6',
      improveBg: '#F8F5FF',
      improveTitle: '#6B21A8',
      badgeBg: 'rgba(124, 58, 237, 0.12)',
      badgeText: '#5B21B6',
    }
  }
  return {
    accent: '#28C7B7',
    accentSoft: 'rgba(40, 199, 183, 0.14)',
    chartStroke: '#0F766E',
    chartFill: 'rgba(40, 199, 183, 0.30)',
    strengthBg: '#F7FBFA',
    strengthTitle: '#0F766E',
    improveBg: '#F8F5F2',
    improveTitle: '#9A3412',
    badgeBg: 'rgba(40, 199, 183, 0.14)',
    badgeText: '#0F766E',
  }
}
