import type { HubAssignment } from '../hub/types'
import type { ClassTodayReportCommon, TextbookSlotNumber, TextbookSubject } from '../types/records'
import { getTextbookSlotHeading } from '../utils/teacherMobileTextbookSlots'

/** RFC 4122 URL namespace — UUID v5 안정 키용. */
export const HUB_FROM_TODAY_REPORT_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
export const HUB_FROM_TODAY_REPORT_PREFIX = 'hub-from-today-report-v1'

export type HubFromTodayReportKey = {
  reportDate: string
  grade: string
  className: string
  subject: string
  slotNumber: number
}

function parseUuidBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '')
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) {
    throw new Error('invalid uuid')
  }
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export async function uuidV5(namespace: string, name: string): Promise<string> {
  const nsBytes = parseUuidBytes(namespace)
  const nameBytes = new TextEncoder().encode(name)
  const data = new Uint8Array(nsBytes.length + nameBytes.length)
  data.set(nsBytes, 0)
  data.set(nameBytes, nsBytes.length)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', data))
  const bytes = digest.slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  return bytesToUuid(bytes)
}

export function hubFromTodayReportName(input: HubFromTodayReportKey): string {
  return [
    HUB_FROM_TODAY_REPORT_PREFIX,
    input.reportDate.trim(),
    input.grade.trim(),
    input.className.trim(),
    input.subject.trim(),
    String(input.slotNumber),
  ].join('|')
}

export async function hubAssignmentIdFromTodayReport(
  input: HubFromTodayReportKey,
): Promise<string> {
  return uuidV5(HUB_FROM_TODAY_REPORT_NAMESPACE, hubFromTodayReportName(input))
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
  id: string,
): HubAssignment | null {
  const content = common.todayAssignment.trim()
  if (!content) return null
  const grade = common.grade.trim()
  const className = common.className.trim()
  if (!grade || !className) return null

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

export async function syncHubAssignmentsFromTodayReport(
  records: ClassTodayReportCommon[],
  save: (record: HubAssignment) => Promise<void>,
  notify?: (record: HubAssignment) => void,
): Promise<void> {
  const nowIso = new Date().toISOString()
  for (const common of records) {
    try {
      const mapped = hubAssignmentFromTodayReportCommon(common, nowIso, 'pending')
      if (!mapped) continue
      const id = await hubAssignmentIdFromTodayReport({
        reportDate: common.reportDate,
        grade: common.grade,
        className: common.className,
        subject: common.subject,
        slotNumber: common.slotNumber,
      })
      const assignment = { ...mapped, id }
      await save(assignment)
      notify?.(assignment)
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
  }
}
