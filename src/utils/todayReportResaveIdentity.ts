import type {
  ClassAttitudeIssue,
  MaterialPrepStatus,
  StudentDailyCareRecord,
} from '../types/records'

/** Blank / whitespace ids are treated as “not provided”. */
export function normalizeRecordId(id: string | undefined | null): string | undefined {
  const trimmed = id?.trim()
  return trimmed ? trimmed : undefined
}

export function findByIdOrNaturalKey<T extends { id: string }>(
  records: readonly T[],
  requestedId: string | undefined | null,
  matchesNaturalKey: (row: T) => boolean,
): T | undefined {
  const id = normalizeRecordId(requestedId)
  if (id) {
    const byId = records.find((row) => row.id === id)
    if (byId) return byId
  }
  return records.find(matchesNaturalKey)
}

/**
 * Prefer the existing same-day row id so re-save UPDATEs instead of inserting
 * a second row (attendance UNIQUE(student_id,date), daily care same).
 */
export function resolvePersistedRecordId(
  requestedId: string | undefined | null,
  existingId: string | undefined | null,
  createId: () => string,
): string {
  return normalizeRecordId(existingId) ?? normalizeRecordId(requestedId) ?? createId()
}

export type StudentDailyCareWriteInput = {
  id?: string
  studentId: string
  date: string
  materialPrep?: MaterialPrepStatus | null
  attitudeIssues?: ClassAttitudeIssue[]
  attitudeNote?: string
}

/** Omit a field (undefined) to keep the existing same-day value. */
export function mergeDailyCareWrite(
  input: Pick<StudentDailyCareWriteInput, 'materialPrep' | 'attitudeIssues' | 'attitudeNote'>,
  existing?: Pick<StudentDailyCareRecord, 'materialPrep' | 'attitudeIssues' | 'attitudeNote'>,
): Pick<StudentDailyCareRecord, 'materialPrep' | 'attitudeIssues' | 'attitudeNote'> {
  return {
    materialPrep:
      input.materialPrep !== undefined ? input.materialPrep : (existing?.materialPrep ?? null),
    attitudeIssues:
      input.attitudeIssues !== undefined
        ? input.attitudeIssues
        : (existing?.attitudeIssues ?? []),
    attitudeNote: (
      input.attitudeNote !== undefined ? input.attitudeNote : (existing?.attitudeNote ?? '')
    ).slice(0, 500),
  }
}
