import type { StudentDailyCareRecord } from '../types/records.ts'
import { findDailyCare } from './studentCare/scoring.ts'

export const PARENT_ATTITUDE_TEACHER_COMMENT_LABEL = '강사의 의견'

/** Meaningful non-empty attitude_note for parent display. Whitespace-only is hidden. */
export function parentAttitudeTeacherCommentText(
  note: string | null | undefined,
): string | null {
  if (note == null) return null
  const trimmed = note.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parentAttitudeTeacherCommentDisplay(
  note: string | null | undefined,
): { visible: true; label: string; text: string } | { visible: false } {
  const text = parentAttitudeTeacherCommentText(note)
  if (!text) return { visible: false }
  return {
    visible: true,
    label: PARENT_ATTITUDE_TEACHER_COMMENT_LABEL,
    text,
  }
}

/**
 * Parent Today Report must read attitude_note from the selected report date's
 * daily-care row only. Do not use carry-forward contentDate.
 */
export function parentAttitudeNoteForSelectedDate(params: {
  records: StudentDailyCareRecord[]
  studentId: string
  selectedDate: string
}): string {
  const care = findDailyCare(params.records, params.studentId, params.selectedDate)
  return care?.attitudeNote ?? ''
}
