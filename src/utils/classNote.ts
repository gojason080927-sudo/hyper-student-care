import type { ClassNoteRecord } from '../types/records'

export const CLASS_NOTE_MAX_LENGTH = 500

export function normalizeClassNote(raw: Record<string, unknown>): ClassNoteRecord | null {
  if (!raw.id || !raw.studentId || !raw.date) return null
  const ts = String(raw.createdAt ?? new Date().toISOString())
  const hasClassNote = Boolean(raw.hasClassNote)
  return {
    id: String(raw.id),
    studentId: String(raw.studentId),
    date: String(raw.date),
    hasClassNote,
    note: String(raw.note ?? '').slice(0, CLASS_NOTE_MAX_LENGTH),
    createdAt: ts,
    updatedAt: String(raw.updatedAt ?? ts),
  }
}

export function findClassNote(
  records: ClassNoteRecord[],
  studentId: string,
  date: string,
): ClassNoteRecord | undefined {
  return records.find((record) => record.studentId === studentId && record.date === date)
}
