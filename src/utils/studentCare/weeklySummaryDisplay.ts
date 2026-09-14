import type {
  WeeklyLearningSummaryRecord,
  WeeklySummaryAreaKey,
  WeeklySummaryAreaSnapshot,
  WeeklySummaryGrade,
} from '../../types/records.ts'

export const WEEKLY_AREA_LABELS: Record<WeeklySummaryAreaKey, string> = {
  attendance: '출결',
  material: '교재 준비',
  homework: '숙제 수행',
  dailyTest: '일일테스트',
  attitude: '수업태도',
}

export const WEEKLY_GRADE_CLASS: Record<WeeklySummaryGrade, string> = {
  우수: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  양호: 'border-sky-200 bg-sky-50 text-sky-800',
  보통: 'border-amber-200 bg-amber-50 text-amber-800',
  미흡: 'border-rose-200 bg-rose-50 text-rose-800',
}

function num(facts: WeeklySummaryAreaSnapshot['facts'], key: string): number {
  const value = facts[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function weeklyAreaFactLines(
  key: WeeklySummaryAreaKey,
  area: WeeklySummaryAreaSnapshot,
): string[] {
  const facts = area.facts
  if (key === 'attendance') {
    return [
      `출석 ${num(facts, 'presentCount')}회`,
      `무단지각 ${num(facts, 'unexcusedLateCount')}`,
      `무단결석 ${num(facts, 'unexcusedAbsentCount')}`,
    ]
  }
  if (key === 'material') {
    return [
      `지참 ${num(facts, 'broughtCount')}회`,
      `부분지참 ${num(facts, 'partialCount')}회`,
    ]
  }
  if (key === 'homework') {
    return [
      `완료 ${num(facts, 'completeCount')}회`,
      `부분완료 ${num(facts, 'partialCount')}회`,
    ]
  }
  if (key === 'dailyTest') {
    const average = facts.averageScore
    const passCount = num(facts, 'passCount')
    const attemptCount = num(facts, 'attemptCount')
    if (attemptCount <= 0) return ['평가 대상 기록이 없습니다.']
    const averageLabel =
      typeof average === 'number' ? `평균 ${Math.round(average)}점` : '평균 기록 없음'
    return [averageLabel, `합격 ${passCount}/${attemptCount}회`]
  }
  const issueCount = num(facts, 'issueCount')
  if (issueCount <= 0) return ['문제기록 없음']
  const issueKeys = ['졸음', '집중 저하', '잡담', '수업방해', '태도 불량'] as const
  return issueKeys
    .filter((issue) => num(facts, issue) > 0)
    .map((issue) => `${issue} ${num(facts, issue)}회`)
}

export function latestWeeklySummary(
  summaries: WeeklyLearningSummaryRecord[],
  studentId: string,
): WeeklyLearningSummaryRecord | null {
  return (
    summaries
      .filter((summary) => summary.studentId === studentId)
      .sort(
        (a, b) =>
          b.weekStart.localeCompare(a.weekStart) || b.createdAt.localeCompare(a.createdAt),
      )[0] ?? null
  )
}

export function hasUnreadWeeklySummary(
  summaries: WeeklyLearningSummaryRecord[],
  studentId: string,
  read: { lastReadAt: string; lastReadSummaryId: string | null } | null,
): boolean {
  const latest = latestWeeklySummary(summaries, studentId)
  if (!latest) return false
  if (read?.lastReadSummaryId === latest.id) return false
  if (!read?.lastReadAt) return true
  return new Date(latest.createdAt).getTime() > new Date(read.lastReadAt).getTime()
}
