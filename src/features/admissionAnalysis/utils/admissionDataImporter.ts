/**
 * JSON / CSV → UniversityAdmissionRecord import.
 * 매년 입결 업데이트 시 이 importer로 검증·적재.
 */
import type { UniversityAdmissionRecord } from '../types'
import {
  dedupeUniversityRecords,
  validateUniversityAdmissionRecord,
} from './admissionRecordValidator'

export type ImportAdmissionResult = {
  accepted: UniversityAdmissionRecord[]
  rejected: Array<{ index: number; reason: string; raw?: unknown }>
}

export function importAdmissionRecordsFromJsonArray(
  rows: unknown[],
): ImportAdmissionResult {
  const accepted: UniversityAdmissionRecord[] = []
  const rejected: ImportAdmissionResult['rejected'] = []

  rows.forEach((row, index) => {
    if (!row || typeof row !== 'object') {
      rejected.push({ index, reason: '객체가 아님', raw: row })
      return
    }
    const result = validateUniversityAdmissionRecord(
      row as Partial<UniversityAdmissionRecord>,
    )
    if (!result.ok) {
      rejected.push({ index, reason: result.reason, raw: row })
      return
    }
    accepted.push(result.record)
  })

  return {
    accepted: dedupeUniversityRecords(accepted),
    rejected,
  }
}

/** 간단 CSV (헤더 1행). 따옴표·이스케이프는 최소 지원. */
export function parseSimpleCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]!)
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? ''
    })
    return row
  })
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

export function importAdmissionRecordsFromCsv(text: string): ImportAdmissionResult {
  const rows = parseSimpleCsv(text).map((row) => ({
    id: row.id || undefined,
    universityName: row.universityName,
    departmentName: row.departmentName,
    admissionYear: row.admissionYear ? Number(row.admissionYear) : undefined,
    admissionType: row.admissionType,
    admissionCategory: row.admissionCategory || '학생부교과',
    gradeSystem: row.gradeSystem || '9-grade',
    dataType: row.dataType || 'actual_admission_result',
    scoreType: row.scoreType || 'grade',
    cutoff50: row.cutoff50 === '' || row.cutoff50 == null ? null : Number(row.cutoff50),
    cutoff70: row.cutoff70 === '' || row.cutoff70 == null ? null : Number(row.cutoff70),
    reflectedSubjects: row.reflectedSubjects
      ? row.reflectedSubjects.split(/[|/]/).map((s) => s.trim()).filter(Boolean)
      : undefined,
    calculationNote: row.calculationNote || undefined,
    region: row.region || undefined,
    fieldTrack: row.fieldTrack || undefined,
    csatMinimum: row.csatMinimum || undefined,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl || undefined,
    sourceYear: row.sourceYear ? Number(row.sourceYear) : undefined,
    officialData: row.officialData === 'true' || row.officialData === '1',
    note: row.note || undefined,
  }))
  return importAdmissionRecordsFromJsonArray(rows)
}
