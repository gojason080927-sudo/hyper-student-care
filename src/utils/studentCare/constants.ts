import type { ClassAttitudeIssue, WeeklySummaryGrade } from '../../types/records'

export const ATTENDANCE_WEEKLY_MAX = 20
export const MATERIAL_WEEKLY_MAX = 10
export const HOMEWORK_WEEKLY_MAX = 25
export const DAILY_TEST_WEEKLY_MAX = 30
export const ATTITUDE_WEEKLY_MAX = 15
export const WEEKLY_SUMMARY_TOTAL_MAX = 100

export const ATTENDANCE_INDEX = {
  present: 100,
  excusedLate: 100,
  excusedAbsent: 100,
  unexcusedLate: 70,
  unexcusedAbsent: 0,
  earlyLeave: 100,
  legacyLate: 100,
  legacyAbsent: 100,
} as const

export const MATERIAL_INDEX = {
  brought: 100,
  partial: 50,
} as const

export const HOMEWORK_INDEX = {
  complete: 100,
  partial: 50,
  incomplete: 0,
} as const

export const DAILY_TEST_PASS_SCORE = 85
export const DAILY_TEST_AVG_WEIGHT = 0.7
export const DAILY_TEST_PASS_RATE_WEIGHT = 0.3

export const ATTITUDE_BASE_INDEX = 100
export const ATTITUDE_ISSUE_PENALTY = 20
export const ATTITUDE_INDEX_FLOOR = 60

export const RISK_UNEXCUSED_LATE = 2
export const RISK_PARTIAL_MATERIAL = 1
export const RISK_PARTIAL_HOMEWORK = 2
export const RISK_TEST_80_84 = 1
export const RISK_TEST_70_79 = 2
export const RISK_TEST_BELOW_70 = 3
export const RISK_ATTITUDE_PER_ISSUE = 1
export const RISK_ATTITUDE_PER_LESSON_CAP = 2
export const RISK_WINDOW_LESSONS = 3

export const WEEKLY_GRADE_EXCELLENT = 90
export const WEEKLY_GRADE_GOOD = 80
export const WEEKLY_GRADE_FAIR = 70

export const CLASS_ATTITUDE_ISSUE_LIST: ClassAttitudeIssue[] = [
  '집중 저하',
  '졸음',
  '잡담',
  '수업방해',
  '태도 불량',
]

export function weeklyGradeFromScore(score: number | null): WeeklySummaryGrade | null {
  if (score == null || Number.isNaN(score)) return null
  if (score >= WEEKLY_GRADE_EXCELLENT) return '우수'
  if (score >= WEEKLY_GRADE_GOOD) return '양호'
  if (score >= WEEKLY_GRADE_FAIR) return '보통'
  return '미흡'
}

export function roundScore(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}
