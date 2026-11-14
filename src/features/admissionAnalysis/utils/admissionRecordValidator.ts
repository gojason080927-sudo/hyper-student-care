import type { UniversityAdmissionRecord } from '../types'
import { universityRecordUniqueKey } from '../types'

export type AdmissionRecordValidationResult =
  | { ok: true; record: UniversityAdmissionRecord }
  | { ok: false; reason: string }

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === ''
}

/**
 * 입결 import 전 검증.
 * 출처 없거나 비공식·범위 위반이면 reject.
 */
export function validateUniversityAdmissionRecord(
  raw: Partial<UniversityAdmissionRecord> & Record<string, unknown>,
): AdmissionRecordValidationResult {
  if (isBlank(raw.universityName)) return { ok: false, reason: '대학명 없음' }
  if (isBlank(raw.departmentName)) return { ok: false, reason: '모집단위 없음' }
  if (isBlank(raw.admissionType)) return { ok: false, reason: '전형명 없음' }
  if (raw.admissionYear == null || !Number.isFinite(Number(raw.admissionYear))) {
    return { ok: false, reason: '학년도 없음' }
  }
  if (isBlank(raw.sourceName)) return { ok: false, reason: '출처 없음' }
  if (raw.officialData !== true) {
    return { ok: false, reason: '공식자료 여부 확인 안 됨 (officialData !== true)' }
  }
  if (raw.sourceYear == null || !Number.isFinite(Number(raw.sourceYear))) {
    return { ok: false, reason: '출처 연도 없음' }
  }

  const cutoff70 =
    raw.cutoff70 === null || raw.cutoff70 === undefined
      ? null
      : Number(raw.cutoff70)

  if (cutoff70 !== null) {
    if (!Number.isFinite(cutoff70)) return { ok: false, reason: 'cutoff70 숫자 아님' }
    if (cutoff70 < 0) return { ok: false, reason: 'cutoff70이 음수' }
  }

  const gradeSystem = (raw.gradeSystem ?? '9-grade') as UniversityAdmissionRecord['gradeSystem']
  const scoreType = (raw.scoreType ?? 'grade') as UniversityAdmissionRecord['scoreType']

  if (scoreType === 'grade' && gradeSystem === '9-grade' && cutoff70 !== null) {
    if (cutoff70 < 1 || cutoff70 > 9) {
      return { ok: false, reason: '9등급 cutoff70 범위(1~9) 벗어남' }
    }
  }

  if (scoreType === 'grade' && raw.cutoff50 != null && raw.cutoff50 !== undefined) {
    const c50 = Number(raw.cutoff50)
    if (gradeSystem === '9-grade' && (c50 < 1 || c50 > 9)) {
      return { ok: false, reason: '9등급 cutoff50 범위(1~9) 벗어남' }
    }
  }

  const record: UniversityAdmissionRecord = {
    id: String(raw.id ?? universityRecordUniqueKey({
      universityName: String(raw.universityName),
      departmentName: String(raw.departmentName),
      admissionType: String(raw.admissionType),
      admissionYear: Number(raw.admissionYear),
    })),
    universityName: String(raw.universityName).trim(),
    departmentName: String(raw.departmentName).trim(),
    admissionYear: Number(raw.admissionYear),
    admissionType: String(raw.admissionType).trim(),
    admissionCategory: (raw.admissionCategory ?? '학생부교과') as UniversityAdmissionRecord['admissionCategory'],
    gradeSystem,
    dataType: (raw.dataType ?? 'actual_admission_result') as UniversityAdmissionRecord['dataType'],
    scoreType,
    cutoff50: raw.cutoff50 === undefined ? null : raw.cutoff50 === null ? null : Number(raw.cutoff50),
    cutoff70,
    reflectedSubjects: raw.reflectedSubjects,
    calculationNote: raw.calculationNote ? String(raw.calculationNote) : undefined,
    region: raw.region ? String(raw.region) : undefined,
    fieldTrack: raw.fieldTrack as UniversityAdmissionRecord['fieldTrack'],
    csatMinimum: raw.csatMinimum ? String(raw.csatMinimum) : undefined,
    sourceName: String(raw.sourceName).trim(),
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl) : undefined,
    sourceYear: Number(raw.sourceYear),
    officialData: true,
    note: raw.note ? String(raw.note) : undefined,
  }

  return { ok: true, record }
}

export function dedupeUniversityRecords(
  records: UniversityAdmissionRecord[],
): UniversityAdmissionRecord[] {
  const map = new Map<string, UniversityAdmissionRecord>()
  for (const r of records) {
    map.set(universityRecordUniqueKey(r), r)
  }
  return [...map.values()]
}
