import type { TodayAssignmentRecord } from '../types/records'

export const TODAY_ASSIGNMENT_MAX_LENGTH = 2000

export function normalizeTodayAssignment(
  raw: Record<string, unknown>,
): TodayAssignmentRecord | null {
  if (!raw.id || !raw.studentId || !raw.date) return null
  const ts = String(raw.createdAt ?? new Date().toISOString())
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    date: String(raw.date),
    assignment1: String(raw.assignment1 ?? '').slice(0, TODAY_ASSIGNMENT_MAX_LENGTH),
    assignment2: String(raw.assignment2 ?? '').slice(0, TODAY_ASSIGNMENT_MAX_LENGTH),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

export function findTodayAssignment(
  records: TodayAssignmentRecord[],
  studentId: string,
  date: string,
): TodayAssignmentRecord | undefined {
  return records.find((record) => record.studentId === studentId && record.date === date)
}
