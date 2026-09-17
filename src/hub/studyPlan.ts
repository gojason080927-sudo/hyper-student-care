import { addDays } from '../utils/date'
import type { StudentStudyPlan, StudyPlanResult } from './types'

export const STUDY_PLAN_GRACE_MS = 48 * 60 * 60 * 1000
export const STUDY_PLAN_TIMEZONE = 'Asia/Seoul'

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
  if (/result_locked/.test(raw)) return '종료 후 48시간이 지나 결과를 바꿀 수 없습니다.'
  if (/schedule_locked/.test(raw)) return '종료된 계획의 날짜와 시간은 바꿀 수 없습니다.'
  if (/plan_not_deletable/.test(raw)) return '확정된 계획은 삭제할 수 없습니다.'
  if (/invalid_result/.test(raw)) return '올바른 결과가 아닙니다.'
  if (/Could not find the function|schema cache|404/i.test(raw)) {
    return '학습 계획 기능이 아직 서버에 적용되지 않았습니다. 학원에 문의해 주세요.'
  }
  return raw.trim() || '저장에 실패했습니다.'
}

export function todayInSeoul(nowMs: number = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STUDY_PLAN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs))
}

export function storedStudyPlanResult(plan: Pick<StudentStudyPlan, 'result' | 'completed'>): StudyPlanResult {
  if (plan.result === 'pending' || plan.result === 'completed' || plan.result === 'failed') {
    return plan.result
  }
  return plan.completed ? 'completed' : 'pending'
}

export function planEndAtUtcMs(planDate: string, endTime: string): number | null {
  const clock = formatClock(endTime)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate) || !/^\d{2}:\d{2}$/.test(clock)) return null
  const ms = Date.parse(`${planDate}T${clock}:00+09:00`)
  return Number.isFinite(ms) ? ms : null
}

export function planDeadlineUtcMs(planDate: string, endTime: string): number | null {
  const endAt = planEndAtUtcMs(planDate, endTime)
  if (endAt == null) return null
  return endAt + STUDY_PLAN_GRACE_MS
}

export function effectiveStudyPlanResult(
  plan: Pick<StudentStudyPlan, 'result' | 'completed' | 'planDate' | 'endTime'>,
  nowMs: number,
): StudyPlanResult {
  const stored = storedStudyPlanResult(plan)
  if (stored === 'completed' || stored === 'failed') return stored
  const deadline = planDeadlineUtcMs(plan.planDate, plan.endTime)
  if (deadline != null && nowMs >= deadline) return 'failed'
  return 'pending'
}

export function isStudyPlanResultLocked(
  plan: Pick<StudentStudyPlan, 'planDate' | 'endTime'>,
  nowMs: number,
): boolean {
  const deadline = planDeadlineUtcMs(plan.planDate, plan.endTime)
  return deadline != null && nowMs >= deadline
}

export function isStudyPlanEnded(
  plan: Pick<StudentStudyPlan, 'planDate' | 'endTime'>,
  nowMs: number,
): boolean {
  const endAt = planEndAtUtcMs(plan.planDate, plan.endTime)
  return endAt != null && nowMs >= endAt
}

/** Freeze date/time after end_at, or once a judged result is stored (prevents moving a completed plan across weeks). */
export function isStudyPlanScheduleLocked(
  plan: Pick<StudentStudyPlan, 'result' | 'completed' | 'planDate' | 'endTime'>,
  nowMs: number,
): boolean {
  const stored = storedStudyPlanResult(plan)
  if (stored === 'completed' || stored === 'failed') return true
  return isStudyPlanEnded(plan, nowMs)
}

export function canDeleteStudyPlan(
  plan: Pick<StudentStudyPlan, 'result' | 'completed' | 'planDate' | 'endTime'>,
  nowMs: number,
): boolean {
  return effectiveStudyPlanResult(plan, nowMs) === 'pending'
}

export function canChangeStudyPlanResult(
  plan: Pick<StudentStudyPlan, 'result' | 'completed' | 'planDate' | 'endTime'>,
  next: Extract<StudyPlanResult, 'completed' | 'failed'>,
  nowMs: number,
): boolean {
  if (next !== 'completed' && next !== 'failed') return false
  return !isStudyPlanResultLocked(plan, nowMs)
}

export function rejectDeletedStudyPlan(
  plans: StudentStudyPlan[],
  planId: string,
  nowMs: number,
): StudentStudyPlan[] {
  const target = plans.find((item) => item.id === planId)
  if (!target || !canDeleteStudyPlan(target, nowMs)) return plans
  return plans.filter((item) => item.id !== planId)
}

export type StudyPlanRateBand = 'great' | 'try_more' | 'lack' | 'trouble' | 'danger' | 'fall' | 'neutral'

export const STUDY_PLAN_RATE_COPY: Record<Exclude<StudyPlanRateBand, 'neutral'>, string> = {
  great: '좋아요',
  try_more: '좀 더 노력해요',
  lack: '부족해요',
  trouble: '곤란해요',
  danger: '위험해요',
  fall: '이러다 나락가요',
}

export function roundedStudyPlanPercent(completedCount: number, judgedCount: number): number {
  if (judgedCount <= 0) return 0
  return Math.round((completedCount / judgedCount) * 100)
}

export function studyPlanRateBand(percent: number): Exclude<StudyPlanRateBand, 'neutral'> {
  if (percent >= 90) return 'great'
  if (percent >= 80) return 'try_more'
  if (percent >= 70) return 'lack'
  if (percent >= 60) return 'trouble'
  if (percent >= 50) return 'danger'
  return 'fall'
}

export function weeklyRateTitle(weekStart: string, today: string): string {
  const thisMonday = startOfWeekMonday(today)
  if (weekStart === thisMonday) return '이번 주 달성률'
  if (weekStart < thisMonday) return '지난 주 달성률'
  return '다음 주 달성률'
}

export type WeeklyAchievement = {
  title: string
  completedCount: number
  failedCount: number
  judgedCount: number
  pendingGraceCount: number
  futureCount: number
  percent: number | null
  band: StudyPlanRateBand
  message: string
}

export function computeWeeklyAchievement(input: {
  plans: Array<Pick<StudentStudyPlan, 'result' | 'completed' | 'planDate' | 'endTime'>>
  weekStart: string
  today: string
  nowMs: number
}): WeeklyAchievement {
  const weekEnd = addDays(input.weekStart, 6)
  let completedCount = 0
  let failedCount = 0
  let pendingGraceCount = 0
  let futureCount = 0

  for (const plan of input.plans) {
    if (plan.planDate < input.weekStart || plan.planDate > weekEnd) continue
    if (plan.planDate > input.today) {
      futureCount += 1
      continue
    }
    const effective = effectiveStudyPlanResult(plan, input.nowMs)
    if (effective === 'completed') completedCount += 1
    else if (effective === 'failed') failedCount += 1
    else pendingGraceCount += 1
  }

  const judgedCount = completedCount + failedCount
  const title = weeklyRateTitle(input.weekStart, input.today)
  if (judgedCount === 0) {
    return {
      title,
      completedCount,
      failedCount,
      judgedCount,
      pendingGraceCount,
      futureCount,
      percent: null,
      band: 'neutral',
      message: '아직 평가할 계획이 없어요',
    }
  }

  const percent = roundedStudyPlanPercent(completedCount, judgedCount)
  const band = studyPlanRateBand(percent)
  return {
    title,
    completedCount,
    failedCount,
    judgedCount,
    pendingGraceCount,
    futureCount,
    percent,
    band,
    message: STUDY_PLAN_RATE_COPY[band],
  }
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
