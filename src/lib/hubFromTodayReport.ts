import { getSupabase } from './supabase'
import type { HubAssignment } from '../hub/types'
import type { ClassTodayReportCommon, TextbookSlotNumber, TextbookSubject } from '../types/records'
import { getTextbookSlotHeading } from '../utils/teacherMobileTextbookSlots'

export function todayReportAssignmentVisibleToStudent(input: {
  studentGrade: string
  studentClassName: string
  recordGrade: string
  recordClassName: string
  todayAssignment: string
  reportDate: string
  today: string
}): boolean {
  return (
    input.todayAssignment.trim() !== '' &&
    input.recordGrade.trim() === input.studentGrade.trim() &&
    input.recordClassName.trim() === input.studentClassName.trim() &&
    input.reportDate === input.today
  )
}

export function hubAssignmentSubjectLabel(
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): string {
  const heading = getTextbookSlotHeading(subject, slotNumber)
  return heading ? `${subject} · ${heading}` : subject
}

export function hubAssignmentFromTodayReportCommon(
  common: ClassTodayReportCommon,
  nowIso: string,
): HubAssignment | null {
  const content = common.todayAssignment.trim()
  if (!content) return null
  const grade = common.grade.trim()
  const className = common.className.trim()
  const id = common.id.trim()
  if (!grade || !className || !id) return null

  return {
    id,
    grade,
    className,
    subject: hubAssignmentSubjectLabel(common.subject, common.slotNumber),
    textbookName: common.textbookName.trim(),
    content,
    dueDate: common.reportDate.trim() || null,
    studentId: null,
    published: true,
    publishedAt: nowIso,
    createdAt: common.createdAt || nowIso,
    updatedAt: nowIso,
  }
}

export async function upsertHubAssignmentRow(record: HubAssignment): Promise<void> {
  const { error } = await getSupabase().from('class_hub_assignments').upsert({
    id: record.id,
    grade: record.grade,
    class_name: record.className,
    subject: record.subject,
    textbook_name: record.textbookName || null,
    content: record.content,
    due_date: record.dueDate,
    student_id: record.studentId,
    published: record.published,
    published_at: record.published ? record.publishedAt || new Date().toISOString() : null,
  })
  if (error) throw new Error(error.message || '과제 저장에 실패했습니다.')
}

export async function syncHubAssignmentsFromTodayReport(
  records: ClassTodayReportCommon[],
  save: (record: HubAssignment) => Promise<void> = upsertHubAssignmentRow,
  notify?: (record: HubAssignment) => void,
): Promise<void> {
  const nowIso = new Date().toISOString()
  for (const common of records) {
    const assignment = hubAssignmentFromTodayReportCommon(common, nowIso)
    if (!assignment) continue
    try {
      await save(assignment)
    } catch (error) {
      console.error('[HubFromTodayReport] sync failed', {
        grade: common.grade,
        className: common.className,
        reportDate: common.reportDate,
        subject: common.subject,
        slotNumber: common.slotNumber,
        error,
      })
    }
    notify?.(assignment)
  }
}
