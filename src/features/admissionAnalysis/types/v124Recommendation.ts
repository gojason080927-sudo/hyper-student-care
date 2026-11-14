/** v124 MASTER 기반 대학 추천 — 상향/소신/적정 */

export type V124CsatStatus = 'applied' | 'not_applied' | 'partial' | 'unverified'

export type V124RegionGroup =
  | 'seoul'
  | 'incheon-gyeonggi'
  | 'regional-national'
  | 'other'

export type V124SupportBand = 'reach' | 'ambitious' | 'target'

export type V124RecommendationRecord = {
  id: string
  universityName: string
  campus: string
  admissionType: string
  departmentName: string
  curriculumCutoff70: number
  curriculumCompetitionRate: number | null
  csatStatus: V124CsatStatus
  csatNote: string
  comprehensiveCutoff70: number | null
  comprehensiveCutoff50: number | null
  comprehensiveCompetitionRate: number | null
}

export type V124RecommendationMatch = {
  record: V124RecommendationRecord
  studentGrade9: number
  band: V124SupportBand
}

export type V124RecommendationResult = {
  ready: boolean
  message: string
  studentGrade9: number | null
  reach: V124RecommendationMatch[]
  ambitious: V124RecommendationMatch[]
  target: V124RecommendationMatch[]
}
