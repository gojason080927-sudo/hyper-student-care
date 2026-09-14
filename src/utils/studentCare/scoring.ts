import type {
  AttendanceExcuseKind,
  AttendanceRecord,
  AttendanceStatus,
  ClassAttitudeIssue,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  MaterialPrepStatus,
  StudentDailyCareRecord,
  TestSessionResult,
} from '../../types/records.ts'
import { classifyHomeworkStatus } from '../homework.ts'
import {
  ATTENDANCE_INDEX,
  ATTITUDE_BASE_INDEX,
  ATTITUDE_INDEX_FLOOR,
  ATTITUDE_ISSUE_PENALTY,
  DAILY_TEST_AVG_WEIGHT,
  DAILY_TEST_PASS_RATE_WEIGHT,
  DAILY_TEST_PASS_SCORE,
  HOMEWORK_INDEX,
  MATERIAL_INDEX,
  roundScore,
} from './constants.ts'

export type AttendanceMeaning =
  | '출석'
  | '인정 지각'
  | '무단 지각'
  | '인정 결석'
  | '무단 결석'
  | '조퇴'
  | '지각'
  | '결석'

export function normalizeExcuseKind(
  value: AttendanceExcuseKind | string | null | undefined,
): AttendanceExcuseKind | null {
  if (value === '인정' || value === '무단') return value
  return null
}

export function attendanceMeaning(
  status: AttendanceStatus | string | null | undefined,
  excuseKind?: AttendanceExcuseKind | string | null,
): AttendanceMeaning | null {
  if (!status) return null
  const excuse = normalizeExcuseKind(excuseKind)
  if (status === '출석') return '출석'
  if (status === '조퇴') return '조퇴'
  if (status === '지각') {
    if (excuse === '인정') return '인정 지각'
    if (excuse === '무단') return '무단 지각'
    return '지각'
  }
  if (status === '결석') {
    if (excuse === '인정') return '인정 결석'
    if (excuse === '무단') return '무단 결석'
    return '결석'
  }
  return null
}

export function attendanceDisplayLabel(
  status: AttendanceStatus | string | null | undefined,
  excuseKind?: AttendanceExcuseKind | string | null,
): string {
  return attendanceMeaning(status, excuseKind) ?? ''
}

/** 주간 출결 지수. 레거시 지각/결석(excuse 없음)은 무단으로 변환하지 않고 감점 없음. */
export function attendanceIndex(record: Pick<AttendanceRecord, 'status' | 'excuseKind'>): number | null {
  const meaning = attendanceMeaning(record.status, record.excuseKind)
  if (!meaning) return null
  switch (meaning) {
    case '출석':
    case '인정 지각':
    case '인정 결석':
    case '조퇴':
    case '지각':
    case '결석':
      return ATTENDANCE_INDEX.present
    case '무단 지각':
      return ATTENDANCE_INDEX.unexcusedLate
    case '무단 결석':
      return ATTENDANCE_INDEX.unexcusedAbsent
    default:
      return null
  }
}

export function isUnexcusedAbsent(
  record: Pick<AttendanceRecord, 'status' | 'excuseKind'> | undefined,
): boolean {
  if (!record) return false
  return attendanceMeaning(record.status, record.excuseKind) === '무단 결석'
}

export function isUnexcusedLate(
  record: Pick<AttendanceRecord, 'status' | 'excuseKind'> | undefined,
): boolean {
  if (!record) return false
  return attendanceMeaning(record.status, record.excuseKind) === '무단 지각'
}

export function materialPrepIndex(status: MaterialPrepStatus | null | undefined): number | null {
  if (status === '지참') return MATERIAL_INDEX.brought
  if (status === '부분 지참') return MATERIAL_INDEX.partial
  return null
}

export function homeworkDayIndex(
  slotStatuses: Array<HomeworkTextbookEntry['status'] | HomeworkRecord['status'] | '' | null>,
): number | null {
  const categories = slotStatuses
    .map((status) => classifyHomeworkStatus(status))
    .filter((category) => category !== 'none')
  if (categories.length === 0) return null
  if (categories.some((category) => category === 'incomplete')) return HOMEWORK_INDEX.incomplete
  if (categories.some((category) => category === 'partial')) return HOMEWORK_INDEX.partial
  if (categories.some((category) => category === 'complete')) return HOMEWORK_INDEX.complete
  return null
}

export function homeworkDayCategory(
  slotStatuses: Array<HomeworkTextbookEntry['status'] | HomeworkRecord['status'] | '' | null>,
): 'complete' | 'partial' | 'incomplete' | null {
  const index = homeworkDayIndex(slotStatuses)
  if (index === HOMEWORK_INDEX.complete) return 'complete'
  if (index === HOMEWORK_INDEX.partial) return 'partial'
  if (index === HOMEWORK_INDEX.incomplete) return 'incomplete'
  return null
}

function sessionAttemptScore(session: TestSessionResult): number | null {
  if (session.status === '미응시') return null
  if (session.score != null && session.totalScore && session.totalScore > 0) {
    return (session.score / session.totalScore) * 100
  }
  if (session.score != null && session.totalScore == null) {
    return session.score
  }
  return null
}

export function dailyTestRecordScore(record: DailyTestRecord): number | null {
  const sessions: TestSessionResult[] = Array.isArray(record.sessionResults)
    ? record.sessionResults
    : []
  const attemptedScores = sessions
    .map(sessionAttemptScore)
    .filter((score): score is number => score != null)
  if (attemptedScores.length > 0) {
    return attemptedScores.reduce((sum, score) => sum + score, 0) / attemptedScores.length
  }
  const attempted = sessions.some((session) => session.status && session.status !== '미응시')
  if (!attempted) {
    const percentage = Number(record.percentage)
    const hasLegacyScore = Number(record.score) > 0 || (Number.isFinite(percentage) && percentage > 0)
    return hasLegacyScore ? percentage : null
  }
  const percentage = Number(record.percentage)
  if (Number.isFinite(percentage)) return percentage
  return null
}

export function dailyTestDayScore(records: DailyTestRecord[]): number | null {
  const scores = records
    .map(dailyTestRecordScore)
    .filter((score): score is number => score != null)
  if (scores.length === 0) return null
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

export function dailyTestPassed(score: number | null): boolean | null {
  if (score == null) return null
  return score >= DAILY_TEST_PASS_SCORE
}

export function weeklyTestIndex(scores: number[]): number | null {
  if (scores.length === 0) return null
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const passRate = scores.filter((score) => score >= DAILY_TEST_PASS_SCORE).length / scores.length
  return average * DAILY_TEST_AVG_WEIGHT + passRate * 100 * DAILY_TEST_PASS_RATE_WEIGHT
}

export function attitudeLessonIndex(issues: ClassAttitudeIssue[] | null | undefined): number {
  const count = issues?.length ?? 0
  const deducted = ATTITUDE_BASE_INDEX - count * ATTITUDE_ISSUE_PENALTY
  return Math.max(ATTITUDE_INDEX_FLOOR, deducted)
}

export function averageIndex(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function scaleIndex(index: number | null, max: number): number | null {
  if (index == null) return null
  return roundScore((index / 100) * max)
}

export function findDailyCare(
  records: StudentDailyCareRecord[],
  studentId: string,
  date: string,
): StudentDailyCareRecord | undefined {
  return records.find((record) => record.studentId === studentId && record.date === date)
}
