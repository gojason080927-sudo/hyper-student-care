/**
 * 대학50 상담표 — 스프레드시트 판정과 동일.
 *
 * Excel:
 * IF(g<=cut5-0.10,"안정",IF(g<=cut5+0.05,"적정",IF(g<=cut5+0.15,"소신","상향")))
 *
 * 모집단위별 officialAdmissionRecords 와 섞지 않음.
 */
import type {
  CounselingJudgmentStatus,
  UniversityCounselingMatch,
  UniversityCounselingRow,
} from '../types'
import { listUniversityCounselingTable50 } from '../data/universityCounselingData'

/** REPORT 기본 선택 개수 */
export const COUNSELING_TABLE_REPORT_COUNTS = {
  ambitious: 5,
  target: 7,
  safe: 5,
} as const

export function classifyCounselingStatus(
  studentGrade5: number,
  convertedCutoff5: number,
): CounselingJudgmentStatus {
  // 센트(0.01) 단위 정수 비교 — 스프레드시트와 동일, float 오차 방지
  const g = Math.round(studentGrade5 * 100)
  const cut = Math.round(convertedCutoff5 * 100)
  if (g <= cut - 10) return 'safe'
  if (g <= cut + 5) return 'target'
  if (g <= cut + 15) return 'ambitious'
  return 'reach'
}

export function counselingStatusLabel(status: CounselingJudgmentStatus): string {
  switch (status) {
    case 'reach':
      return '상향'
    case 'ambitious':
      return '소신'
    case 'target':
      return '적정'
    case 'safe':
      return '안정'
  }
}

export function isEstimateEvidence(evidenceType: string): boolean {
  return /상담\s*추정|과거계열|추정/.test(evidenceType)
}

export type UniversityCounselingAnalysis = {
  ready: boolean
  message: string
  studentGrade5: number | null
  all: UniversityCounselingMatch[]
  reach: UniversityCounselingMatch[]
  ambitious: UniversityCounselingMatch[]
  target: UniversityCounselingMatch[]
  safe: UniversityCounselingMatch[]
}

export function analyzeUniversityCounselingTable(input: {
  studentGrade5: number | null
  rows?: UniversityCounselingRow[]
}): UniversityCounselingAnalysis {
  if (input.studentGrade5 === null) {
    return {
      ready: false,
      message: '5등급제 예상 내신이 계산된 뒤 대학 상담표를 이용할 수 있습니다.',
      studentGrade5: null,
      all: [],
      reach: [],
      ambitious: [],
      target: [],
      safe: [],
    }
  }

  const rows = input.rows ?? listUniversityCounselingTable50()
  if (rows.length === 0) {
    return {
      ready: false,
      message: '대학50 상담표 데이터가 없습니다.',
      studentGrade5: input.studentGrade5,
      all: [],
      reach: [],
      ambitious: [],
      target: [],
      safe: [],
    }
  }

  const all = [...rows]
    .sort((a, b) => a.rank - b.rank || a.convertedCutoff5 - b.convertedCutoff5)
    .map((row) => ({
      row,
      studentGrade5: input.studentGrade5!,
      status: classifyCounselingStatus(
        input.studentGrade5!,
        row.convertedCutoff5,
      ),
    }))

  return {
    ready: true,
    message: '',
    studentGrade5: input.studentGrade5,
    all,
    reach: all.filter((m) => m.status === 'reach'),
    ambitious: all.filter((m) => m.status === 'ambitious'),
    target: all.filter((m) => m.status === 'target'),
    safe: all.filter((m) => m.status === 'safe'),
  }
}

export function pickCounselingReportIds(
  analysis: UniversityCounselingAnalysis,
  counts = COUNSELING_TABLE_REPORT_COUNTS,
): string[] {
  const ids: string[] = []
  for (const m of analysis.ambitious.slice(0, counts.ambitious)) {
    ids.push(counselingRowKey(m.row))
  }
  for (const m of analysis.target.slice(0, counts.target)) {
    ids.push(counselingRowKey(m.row))
  }
  for (const m of analysis.safe.slice(0, counts.safe)) {
    ids.push(counselingRowKey(m.row))
  }
  return ids
}

export function counselingRowKey(row: UniversityCounselingRow): string {
  return `univ50:${row.rank}:${row.universityName}`
}

export function formatTargetRange(row: UniversityCounselingRow): string {
  return `${row.targetMin.toFixed(2)}~${row.targetMax.toFixed(2)}`
}
