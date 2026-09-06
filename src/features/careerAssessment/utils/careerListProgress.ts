import { CAREER_QUESTION_COUNT } from '../types'
import type { CareerSessionStatus } from '../types'

export type CareerListProgress = {
  status: CareerSessionStatus
  label: string
  answeredCount: number
  percent: number
}

/** 강사 목록 상태는 session.status가 아니라 실제 응답 수를 기준으로 한다. */
export function deriveCareerListProgress(input?: {
  status?: string | null
  answeredCount?: number | null
  latestResultId?: string | null
}): CareerListProgress {
  const answeredCount = Math.max(0, Number(input?.answeredCount ?? 0) || 0)
  const completed = input?.status === 'completed' || Boolean(input?.latestResultId)

  if (completed) {
    return {
      status: 'completed',
      label: '완료',
      answeredCount: Math.max(answeredCount, CAREER_QUESTION_COUNT),
      percent: 100,
    }
  }

  if (answeredCount > 0) {
    return {
      status: 'in_progress',
      label: '검사중',
      answeredCount,
      percent: Math.round((answeredCount / CAREER_QUESTION_COUNT) * 100),
    }
  }

  return {
    status: 'not_started',
    label: '미시작',
    answeredCount: 0,
    percent: 0,
  }
}

export function missingCareerStudentIds(
  sessionStudentIds: string[],
  rosterIds: Iterable<string>,
): string[] {
  const known = new Set(rosterIds)
  return [...new Set(sessionStudentIds.filter((id) => id && !known.has(id)))]
}

export function mergeStudentsById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const map = new Map<string, T>()
  for (const student of base) map.set(student.id, student)
  for (const student of extra) {
    if (!map.has(student.id)) map.set(student.id, student)
  }
  return [...map.values()]
}
