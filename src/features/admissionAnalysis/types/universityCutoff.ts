/**
 * 대학 단위 9등급 70%컷 추천용 레코드.
 * 모집단위 official record / 대학50 cutoff9 에서 파생. 임의 컷 생성 금지.
 */
export type UniversityCutoffYearValue = {
  admissionYear: number
  cutoff70: number
}

export type UniversityCutoffSummary = {
  id: string
  universityName: string
  region: string
  admissionType: string
  /** 가장 최근 연도 70%컷 */
  latest: UniversityCutoffYearValue
  /** 직전 연도 70%컷 (있으면) */
  previous: UniversityCutoffYearValue | null
  /** 최근 2개년 평균 — 참고용. 공식 단일 컷이 아님 */
  recentAverageCutoff: number | null
  evidenceType?: string
  counselingNote?: string
  sourceUrl?: string
  sourceName: string
  /** 펼치기용 모집단위 (official만) */
  departments?: Array<{
    id: string
    departmentName: string
    admissionType: string
    admissionYear: number
    cutoff70: number
  }>
}

export type Grade9SupportBand = 'ambitious' | 'target'

export type UniversityCutoffMatch = {
  summary: UniversityCutoffSummary
  studentGrade9: number
  /** 판정에 사용한 컷 (최신 연도) */
  cutoffUsed: number
  band: Grade9SupportBand
}
