import type { DailyTestRecord, TestSessionResult } from '../../types/records.ts'
import {
  formatCumulativeVocabResult,
  usesCumulativeEnglishVocabTest,
} from '../englishVocabTest.ts'
import {
  formatHighRecoveryWeeklyFactLine,
  usesHighRecoveryMathDailyTest,
} from '../mathHighRecovery.ts'
import {
  getFinalPassSession,
  getSessionScoreOnFullScale,
  migrateSessionResults,
  TEST_SESSION_NUMBERS,
} from '../dailyTest.ts'
import {
  dailyWrongTypeCounts,
  emptyDailyWrongTypeCounts,
  normalizeDailyLearningDiagnosis,
  sumDailyWrongTypeCounts,
  type DailyWrongTypeCounts,
} from '../learningDiagnosis.ts'
import { addDaysInSeoul } from '../seoulDate.ts'
import { roundScore } from './constants.ts'
import { getFridayOfWeek, getMondayOfWeek } from './week.ts'

export const WEEKLY_FLOW_WEEKDAYS = ['monday', 'wednesday', 'friday'] as const
export type WeeklyFlowWeekday = (typeof WEEKLY_FLOW_WEEKDAYS)[number]

export const WEEKLY_FLOW_DAY_LABELS: Record<WeeklyFlowWeekday, string> = {
  monday: '월요일',
  wednesday: '수요일',
  friday: '금요일',
}

export const WEEKLY_FLOW_COLORS: Record<WeeklyFlowWeekday, string> = {
  monday: '#38bdf8',
  wednesday: '#ef4444',
  friday: '#86efac',
}

export type WeeklyFlowSessionPoint = {
  session: 1 | 2 | 3 | 4
  kind: 'score' | 'absent'
  score: number | null
  passed: boolean
}

export type WeeklyFlowDay = {
  weekday: WeeklyFlowWeekday
  date: string
  sessions: WeeklyFlowSessionPoint[]
}

export type DailyTestWeeklyFlowModel = {
  weekStart: string
  periodEnd: string
  subjects: string[]
  selectedSubject: string | null
  days: WeeklyFlowDay[]
  attemptedScores: number[]
  max: number | null
  min: number | null
  avg: number | null
  wrongTypes: DailyWrongTypeCounts
  wrongTypeTotal: number
  cumulativeResults: Array<{
    date: string
    totalWords: number
    wrongWords: number
    label: string
  }>
  highRecoveryResults: Array<{
    date: string
    label: string
  }>
}

const FALLBACK_SUBJECT = '일일테스트'

export function weeklyFlowSubjectLabel(subject: string | null | undefined): string {
  const trimmed = subject?.trim() ?? ''
  return trimmed || FALLBACK_SUBJECT
}

export function weeklyFlowDateForWeekday(weekStart: string, weekday: WeeklyFlowWeekday): string {
  const monday = getMondayOfWeek(weekStart)
  if (weekday === 'monday') return monday
  if (weekday === 'wednesday') return addDaysInSeoul(monday, 2)
  return addDaysInSeoul(monday, 4)
}

export function listWeeklyFlowSubjects(
  records: DailyTestRecord[],
  studentId: string,
  weekStart: string,
): string[] {
  const monday = getMondayOfWeek(weekStart)
  const dates = new Set(
    WEEKLY_FLOW_WEEKDAYS.map((weekday) => weeklyFlowDateForWeekday(monday, weekday)),
  )
  const subjects = new Set<string>()
  for (const record of records) {
    if (record.studentId !== studentId) continue
    if (!dates.has(record.date)) continue
    subjects.add(weeklyFlowSubjectLabel(record.subject))
  }
  return [...subjects].sort((a, b) => a.localeCompare(b, 'ko'))
}

export function pickWeeklyFlowDayRecord(
  records: DailyTestRecord[],
  studentId: string,
  date: string,
  subject: string,
): DailyTestRecord | null {
  const matches = records.filter(
    (record) =>
      record.studentId === studentId &&
      record.date === date &&
      weeklyFlowSubjectLabel(record.subject) === subject,
  )
  if (matches.length === 0) return null
  return [...matches].sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt),
  )[0]
}

function sessionDisplayScore(session: TestSessionResult): number | null {
  if (session.status === '미응시') return null
  const score = getSessionScoreOnFullScale(session)
  return score === '' ? null : score
}

export function buildWeeklyFlowDaySessions(
  record: DailyTestRecord | null,
): WeeklyFlowSessionPoint[] {
  if (!record || usesCumulativeEnglishVocabTest(record)) {
    return TEST_SESSION_NUMBERS.map((session) => ({
      session,
      kind: 'absent',
      score: null,
      passed: false,
    }))
  }

  const sessions = migrateSessionResults(record)
  const passSession = getFinalPassSession(sessions)
  return TEST_SESSION_NUMBERS.map((sessionNum) => {
    if (passSession != null && sessionNum > passSession) {
      return { session: sessionNum, kind: 'absent', score: null, passed: false }
    }
    const session = sessions.find((item) => item.session === sessionNum)
    const score = session ? sessionDisplayScore(session) : null
    if (score == null) {
      return { session: sessionNum, kind: 'absent', score: null, passed: false }
    }
    return {
      session: sessionNum,
      kind: 'score',
      score,
      passed: passSession === sessionNum,
    }
  })
}

export function weekDatesMondayToFriday(weekStart: string): string[] {
  const monday = getMondayOfWeek(weekStart)
  return [0, 1, 2, 3, 4].map((offset) => addDaysInSeoul(monday, offset))
}

export function pickLatestWeeklyTestRecords(
  records: DailyTestRecord[],
  studentId: string,
  weekStart: string,
): DailyTestRecord[] {
  const dates = new Set(weekDatesMondayToFriday(weekStart))
  const latest = new Map<string, DailyTestRecord>()
  for (const record of records) {
    if (record.studentId !== studentId) continue
    if (!dates.has(record.date)) continue
    const key = `${record.date}::${weeklyFlowSubjectLabel(record.subject)}`
    const current = latest.get(key)
    if (
      !current ||
      record.updatedAt.localeCompare(current.updatedAt) > 0 ||
      (record.updatedAt === current.updatedAt && record.createdAt.localeCompare(current.createdAt) > 0)
    ) {
      latest.set(key, record)
    }
  }
  return [...latest.values()]
}

export function buildWeeklyWrongAnalysis(input: {
  studentId: string
  weekStart: string
  dailyTests: DailyTestRecord[]
}): DailyWrongTypeCounts {
  const picked = pickLatestWeeklyTestRecords(input.dailyTests, input.studentId, input.weekStart)
  const totals = emptyDailyWrongTypeCounts()
  for (const record of picked) {
    const counts = dailyWrongTypeCounts(record.learningDiagnosis)
    totals.calculationError += counts.calculationError
    totals.conceptLack += counts.conceptLack
    totals.applicationLack += counts.applicationLack
    totals.comprehensionLack += counts.comprehensionLack
  }
  return totals
}

export function summarizeAttemptedScores(scores: number[]): {
  attemptedScores: number[]
  max: number | null
  min: number | null
  avg: number | null
} {
  if (scores.length === 0) {
    return { attemptedScores: [], max: null, min: null, avg: null }
  }
  const total = scores.reduce((sum, score) => sum + score, 0)
  return {
    attemptedScores: scores,
    max: Math.max(...scores),
    min: Math.min(...scores),
    avg: roundScore(total / scores.length, 1),
  }
}

export function buildDailyTestWeeklyFlow(input: {
  studentId: string
  weekStart: string
  dailyTests: DailyTestRecord[]
  subject?: string | null
}): DailyTestWeeklyFlowModel {
  const weekStart = getMondayOfWeek(input.weekStart)
  const periodEnd = getFridayOfWeek(weekStart)
  const subjects = listWeeklyFlowSubjects(input.dailyTests, input.studentId, weekStart)
  const selectedSubject =
    input.subject && subjects.includes(input.subject) ? input.subject : (subjects[0] ?? null)

  const days: WeeklyFlowDay[] = WEEKLY_FLOW_WEEKDAYS.map((weekday) => {
    const date = weeklyFlowDateForWeekday(weekStart, weekday)
    const record = selectedSubject
      ? pickWeeklyFlowDayRecord(input.dailyTests, input.studentId, date, selectedSubject)
      : null
    return {
      weekday,
      date,
      sessions: buildWeeklyFlowDaySessions(record),
    }
  })

  const attemptedScores = days.flatMap((day) =>
    day.sessions.flatMap((session) =>
      session.kind === 'score' && session.score != null ? [session.score] : [],
    ),
  )
  const wrongTypes = buildWeeklyWrongAnalysis({
    studentId: input.studentId,
    weekStart,
    dailyTests: input.dailyTests,
  })
  const weekRecords = pickLatestWeeklyTestRecords(input.dailyTests, input.studentId, weekStart)
  const cumulativeResults = weekRecords
    .filter(
      (record) =>
        usesCumulativeEnglishVocabTest(record) &&
        (selectedSubject == null || weeklyFlowSubjectLabel(record.subject) === selectedSubject),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((record) => {
      const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
      const totalWords = diagnosis.englishVocabTotalWords ?? 0
      const wrongWords = diagnosis.englishVocabWrongWords ?? 0
      return {
        date: record.date,
        totalWords,
        wrongWords,
        label: formatCumulativeVocabResult(totalWords, wrongWords),
      }
    })
  const highRecoveryResults = weekRecords
    .filter(
      (record) =>
        usesHighRecoveryMathDailyTest(record) &&
        (selectedSubject == null || weeklyFlowSubjectLabel(record.subject) === selectedSubject),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((record) => {
      const label = formatHighRecoveryWeeklyFactLine(record)
      return label ? [{ date: record.date, label }] : []
    })

  return {
    weekStart,
    periodEnd,
    subjects,
    selectedSubject,
    days,
    ...summarizeAttemptedScores(attemptedScores),
    wrongTypes,
    wrongTypeTotal: sumDailyWrongTypeCounts(wrongTypes),
    cumulativeResults,
    highRecoveryResults,
  }
}
