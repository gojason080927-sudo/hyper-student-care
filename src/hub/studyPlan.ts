import { addDays } from '../utils/date'
import type { StudentStudyPlan } from './types'

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const

export function startOfWeekMonday(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = date.getDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  date.setDate(date.getDate() + diff)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function weekDatesFromMonday(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function weekdayKo(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  return WEEKDAY_KO[new Date(year, month - 1, day).getDay()] ?? ''
}

export function dayNumber(dateString: string): string {
  const parts = dateString.split('-')
  return String(Number(parts[2] || 0))
}

export function formatClock(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/)
  if (!match) return value
  return `${match[1].padStart(2, '0')}:${match[2]}`
}

export function formatPlanTimeRange(start: string, end: string): string {
  return `${formatClock(start)} – ${formatClock(end)}`
}

export function timeInputValue(value: string): string {
  return formatClock(value)
}

export function comparePlanOrder(a: StudentStudyPlan, b: StudentStudyPlan): number {
  const date = a.planDate.localeCompare(b.planDate)
  if (date !== 0) return date
  const time = formatClock(a.startTime).localeCompare(formatClock(b.startTime))
  if (time !== 0) return time
  return a.createdAt.localeCompare(b.createdAt)
}

export function plansOnDate(plans: StudentStudyPlan[], dateString: string): StudentStudyPlan[] {
  return plans.filter((item) => item.planDate === dateString).slice().sort(comparePlanOrder)
}

export function emptyDateMessage(dateString: string, today: string): string {
  if (dateString === today) return '오늘 등록된 학습 계획이 없습니다.'
  return '선택한 날에 등록된 학습 계획이 없습니다.'
}

export function studyPlanErrorMessage(err: unknown): string {
  const raw =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err ?? '')
  if (/invalid or inactive/i.test(raw)) return '유효하지 않거나 만료된 학생 링크입니다.'
  if (/plan_not_found/.test(raw)) return '계획을 찾을 수 없습니다.'
  if (/rate_limited/.test(raw)) return '잠시 후 다시 추가해 주세요.'
  if (/too_many_plans/.test(raw)) return '하루에 등록할 수 있는 계획이 너무 많습니다.'
  if (/invalid_time_range/.test(raw)) return '종료 시간은 시작 시간보다 늦어야 합니다.'
  if (/subject_required/.test(raw)) return '과목을 입력해 주세요.'
  if (/content_required/.test(raw)) return '공부할 내용을 입력해 주세요.'
  if (/invalid_date_range/.test(raw)) return '날짜 범위가 올바르지 않습니다.'
  if (/Could not find the function|schema cache|404/i.test(raw)) {
    return '학습 계획 기능이 아직 서버에 적용되지 않았습니다. 학원에 문의해 주세요.'
  }
  return raw.trim() || '저장에 실패했습니다.'
}

/** SQL isolation contract used by tests: actor identity comes from access_key, never from a client student_id. */
export function canMutateStudyPlan(params: {
  actorStudentId: string
  planOwnerStudentId: string
  planId: string
  requestedPlanId: string
}): boolean {
  return params.actorStudentId === params.planOwnerStudentId && params.planId === params.requestedPlanId
}
