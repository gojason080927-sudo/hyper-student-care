/**
 * 대학50 상담표 repository — official 모집단위 record 와 분리.
 */
import type { UniversityCounselingRow } from '../types'
import bundle from './counseling/universityCounselingTable50.json'

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function normalizeRow(raw: unknown): UniversityCounselingRow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const rank = Number(r.rank)
  const cutoff9 = Number(r.cutoff9)
  const convertedCutoff5 = Number(r.convertedCutoff5)
  const safeMax = Number(r.safeMax)
  const targetMin = Number(r.targetMin)
  const targetMax = Number(r.targetMax)
  const ambitiousMax = Number(r.ambitiousMax)
  const universityName = String(r.universityName ?? '').trim()
  if (
    !universityName ||
    !isFiniteNumber(rank) ||
    !isFiniteNumber(cutoff9) ||
    !isFiniteNumber(convertedCutoff5) ||
    !isFiniteNumber(safeMax) ||
    !isFiniteNumber(targetMin) ||
    !isFiniteNumber(targetMax) ||
    !isFiniteNumber(ambitiousMax)
  ) {
    return null
  }
  return {
    rank,
    universityName,
    region: String(r.region ?? ''),
    cutoff9,
    convertedCutoff5,
    safeMax,
    targetMin,
    targetMax,
    ambitiousMax,
    evidenceType: String(r.evidenceType ?? ''),
    counselingNote: String(r.counselingNote ?? ''),
    sourceUrl: r.sourceUrl ? String(r.sourceUrl) : undefined,
  }
}

const accepted: UniversityCounselingRow[] = (
  (bundle as { records?: unknown[] }).records ?? []
)
  .map(normalizeRow)
  .filter((r): r is UniversityCounselingRow => r != null)
  .sort((a, b) => a.rank - b.rank)

export function listUniversityCounselingTable50(): UniversityCounselingRow[] {
  return accepted
}

export function getUniversityCounselingTableMeta(): {
  sourceFile?: string
  admissionYear?: number
  recordCount: number
} {
  const meta = (bundle as { meta?: Record<string, unknown> }).meta ?? {}
  return {
    sourceFile: meta.sourceFile ? String(meta.sourceFile) : undefined,
    admissionYear: isFiniteNumber(meta.admissionYear)
      ? meta.admissionYear
      : undefined,
    recordCount: accepted.length,
  }
}
