import type { TextbookSubject } from '../types/records'
import type { SubjectOption } from '../types/student'
import { SUBJECTS } from './labels'
import { TEXTBOOK_SUBJECTS } from '../types/records'
import { classTrackIncludesSubject } from './classTodayReportCommon'

export function getVisibleTextbookSubjects(className: string): TextbookSubject[] {
  const trimmed = className.trim()
  if (!trimmed) return [...TEXTBOOK_SUBJECTS]
  return TEXTBOOK_SUBJECTS.filter((subject) =>
    classTrackIncludesSubject(trimmed, subject),
  )
}

export function getVisibleDailyTestSubjects(className: string): SubjectOption[] {
  const trimmed = className.trim()
  if (!trimmed) return [...SUBJECTS]
  return SUBJECTS.filter((subject) =>
    classTrackIncludesSubject(trimmed, subject as TextbookSubject),
  )
}
