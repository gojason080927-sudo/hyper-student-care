import type { DailyTestRecord, TestSessionResult } from '../../types/records.ts'
import {
  TEST_SESSION_NUMBERS,
  getFinalPassSession,
  getSessionPercentage,
  getSessionScoreOnFullScale,
  migrateSessionResults,
} from '../dailyTest.ts'
import { addDaysInSeoul } from '../seoulDate.ts'
import { getMondayOfWeek } from './week.ts'

export const DAILY_TEST_FLOW_WEEKDAYS = ['mon', 'wed', 'fri'] as const
export type DailyTestFlowWeekday = (typeof DAILY_TEST_FLOW_WEEKDAYS)[number]

export const DAILY_TEST_FLOW_WEEKDAY_LABELS: Record<DailyTestFlowWeekday, string> = {
  mon: '월요일',
  wed: '수요일',
  fri: '금요일',
}

export const DAILY_TEST_FLOW_WEEKDAY_OFFSET: Record<DailyTestFlowWeekday, number> = {
  mon: 0,
  wed: 2,
  fri: 4,
}

export type DailyTestFlowPointKind = 'score' | 'pass' | 'unattempted'

export type DailyTestFlowPoint = {
  weekday: DailyTestFlowWeekday
  date: string
  session: 1 | 2 | 3 | 4
  kind: DailyTestFlowPointKind
  score: number | null
  label: string
}

export type DailyTestFlowDay = {
  weekday: DailyTestFlowWeekday
  date: string
  recordId: string | null
  subject: string
  points: DailyTestFlowPoint[]
}

export type DailyTestWeeklyFlow = {
  weekStart: string
  days: DailyTestFlowDay[]
  points: DailyTestFlowPoint[]
  scored: DailyTestFlowPoint[]
  stats: {
    highest: number | null
    lowest: number | null
    average: number | null
  }
}

function attemptedSessionCount(sessions: TestSessionResult[]): number {
  return sessions.filter((session) => session.status !== '미응시' && sessionScore(session) != null)
    .length
}

export function sessionScore(session: TestSessionResult): number | null {
  if (session.status === '미응시') return null
  const full = getSessionScoreOnFullScale(session)
  if (full !== '') return Number(full)
  const percentage = getSessionPercentage(session)
  return percentage == null ? null : percentage
}

export function pickDailyTestForDate(
  tests: DailyTestRecord[],
  studentId: string,
  date: string,
): DailyTestRecord | null {
  const rows = tests.filter((item) => item.studentId === studentId && item.date === date)
  if (rows.length === 0) return null
  if (rows.length === 1) return rows[0]
  return [...rows].sort((a, b) => {
    const aSessions = migrateSessionResults(a)
    const bSessions = migrateSessionResults(b)
    const byAttempt = attemptedSessionCount(bSessions) - attemptedSessionCount(aSessions)
    if (byAttempt !== 0) return byAttempt
    return b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt)
  })[0]
}

export function pointsForDailyTest(
  weekday: DailyTestFlowWeekday,
  date: string,
  record: DailyTestRecord | null,
): DailyTestFlowPoint[] {
  const sessions = record ? migrateSessionResults(record) : []
  const passSession = record ? getFinalPassSession(sessions) : null

  return TEST_SESSION_NUMBERS.map((sessionNum) => {
    const session = sessions.find((item) => item.session === sessionNum)
    if (passSession != null && sessionNum > passSession) {
      return {
        weekday,
        date,
        session: sessionNum,
        kind: 'unattempted' as const,
        score: null,
        label: '',
      }
    }
    const score = session ? sessionScore(session) : null
    if (!session || session.status === '미응시' || score == null) {
      return {
        weekday,
        date,
        session: sessionNum,
        kind: 'unattempted' as const,
        score: null,
        label: '',
      }
    }
    if (session.status === '합격') {
      return {
        weekday,
        date,
        session: sessionNum,
        kind: 'pass' as const,
        score,
        label: `${sessionNum}차시 합격`,
      }
    }
    return {
      weekday,
      date,
      session: sessionNum,
      kind: 'score' as const,
      score,
      label: `${sessionNum}차시 ${Math.round(score)}`,
    }
  })
}

function roundStat(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10
}

export function buildDailyTestWeeklyFlow(
  tests: DailyTestRecord[],
  studentId: string,
  weekStartInput: string,
): DailyTestWeeklyFlow {
  const weekStart = getMondayOfWeek(weekStartInput)
  const days = DAILY_TEST_FLOW_WEEKDAYS.map((weekday) => {
    const date = addDaysInSeoul(weekStart, DAILY_TEST_FLOW_WEEKDAY_OFFSET[weekday])
    const record = pickDailyTestForDate(tests, studentId, date)
    return {
      weekday,
      date,
      recordId: record?.id ?? null,
      subject: record?.subject ?? '',
      points: pointsForDailyTest(weekday, date, record),
    }
  })
  const points = days.flatMap((day) => day.points)
  const scored = points.filter((point) => point.score != null)
  const scores = scored.map((point) => point.score as number)
  return {
    weekStart,
    days,
    points,
    scored,
    stats: {
      highest: scores.length > 0 ? roundStat(Math.max(...scores)) : null,
      lowest: scores.length > 0 ? roundStat(Math.min(...scores)) : null,
      average:
        scores.length > 0
          ? roundStat(scores.reduce((sum, value) => sum + value, 0) / scores.length)
          : null,
    },
  }
}
