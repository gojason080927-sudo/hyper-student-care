export const CAREER_ASSESSMENT_V1 = 'HYPER_CAREER_V1' as const
export const CAREER_ASSESSMENT_V2 = 'HYPER_CAREER_V2' as const
export type CareerAssessmentVersion = typeof CAREER_ASSESSMENT_V1 | typeof CAREER_ASSESSMENT_V2

/** 신규 세션이 사용하는 현재 검사 버전 */
export const CURRENT_ASSESSMENT_VERSION = CAREER_ASSESSMENT_V2
/** 하위 호환: 결과 기록 시 기본값은 현재 버전 */
export const CAREER_RESULT_VERSION = CAREER_ASSESSMENT_V2

export const CAREER_QUESTION_COUNT_V1 = 88
export const CAREER_QUESTION_COUNT_V2 = 140
export const CAREER_QUESTION_COUNT = CAREER_QUESTION_COUNT_V2

export function isCareerAssessmentV2(version?: string | null): boolean {
  return version === CAREER_ASSESSMENT_V2
}

export function questionCountForVersion(version?: string | null): number {
  return isCareerAssessmentV2(version) ? CAREER_QUESTION_COUNT_V2 : CAREER_QUESTION_COUNT_V1
}

export function resolveExpectedQuestionCount(input?: {
  expectedQuestionCount?: number | null
  assessmentVersion?: string | null
}): number {
  const count = Number(input?.expectedQuestionCount ?? 0)
  if (count === CAREER_QUESTION_COUNT_V1 || count === CAREER_QUESTION_COUNT_V2) return count
  return questionCountForVersion(input?.assessmentVersion)
}

export function timeEstimateForVersion(version?: string | null): string {
  return isCareerAssessmentV2(version) ? '약 15~20분' : '약 12~15분'
}

export const MAJOR_FIT_WEIGHTS = {
  interest: 0.4,
  strength: 0.3,
  value: 0.12,
  behavior: 0.1,
  problemSolving: 0.08,
} as const

export type RiasecCode = 'R' | 'I' | 'A' | 'S' | 'E' | 'C'

export type StrengthCode = 'VER' | 'NUM' | 'LOG' | 'SPA' | 'CRE' | 'INT' | 'OBS' | 'PRA'

export type ValueCode =
  | 'STABILITY'
  | 'REWARD'
  | 'ACHIEVEMENT'
  | 'CONTRIBUTION'
  | 'AUTONOMY'
  | 'GROWTH'
  | 'RECOGNITION'
  | 'BALANCE'
  | 'CREATIVITY'
  | 'RELATIONSHIP'
  | 'INFLUENCE'
  | 'EXPERTISE'

export type BehaviorCode =
  | 'PLANNING'
  | 'PERSISTENCE'
  | 'CAREFULNESS'
  | 'SOCIABILITY'
  | 'COOPERATION'
  | 'ADAPTABILITY'
  | 'INITIATIVE'
  | 'SELF_CONTROL'
  | 'DELIBERATION'
  | 'EXECUTION'

export type ProblemSolvingCode =
  | 'ANALYSIS'
  | 'FLEXIBILITY'
  | 'CONNECTION'
  | 'REFLECTION'
  | 'EXPLORATION'
  | 'STRUCTURING'
  | 'COMPARISON'
  | 'ERROR_ANALYSIS'

export type CareerReadinessCode =
  | 'SELF_UNDERSTANDING'
  | 'CAREER_EXPLORATION'
  | 'DECISION_CRITERIA'
  | 'EXPLORATION_READINESS'

export type CareerDomain =
  | 'riasec'
  | 'strength'
  | 'value'
  | 'behavior'
  | 'efficacy'
  | 'problem_solving'
  | 'career_readiness'

export type CareerQuestion = {
  questionNumber: number
  text: string
  domain: CareerDomain
  scoringCode: string
  displayOrder: number
  displayOrderV2?: number
  introducedIn?: CareerAssessmentVersion
}

export type RiasecVector = Record<RiasecCode, number>

export type MajorProfile = {
  id: string
  name: string
  /** HYPER v1 heuristic target vector. Not a nationally validated psychometric norm. */
  riasecTarget: RiasecVector
  strengthKeys: StrengthCode[]
  valueKeys: ValueCode[]
  behaviorKeys: BehaviorCode[]
  problemSolvingKeys: ProblemSolvingCode[]
}

export type DetailedMajorDef = {
  id: string
  majorName: string
  majorGroupPrimary: string
  majorGroupSecondary: string | null
  primaryWeight: number
  secondaryWeight: number
  isActive: boolean
}

export type FitBand = {
  minScore: number
  maxScore: number
  label: string
  excludeFromPriority: boolean
}

export type LikertAnswer = 1 | 2 | 3 | 4 | 5

export type ScoreMap<T extends string> = Record<T, number>

export type RankedItem = {
  id: string
  name: string
  score: number
  label: string
  reasons: string[]
  watchItems: string[]
}

export type CareerAssessmentScores = {
  resultVersion: CareerAssessmentVersion
  riasecScores: ScoreMap<RiasecCode>
  riasecTop2: [RiasecCode, RiasecCode]
  riasecCodeLabel: string
  strengthScores: ScoreMap<StrengthCode>
  valueScores: ScoreMap<ValueCode>
  behaviorScores: ScoreMap<BehaviorCode>
  problemSolvingScores: ScoreMap<ProblemSolvingCode>
  careerEfficacy: number
  careerReadiness: number
  majorGroupScores: RankedItem[]
  detailedMajorScores: RankedItem[]
  dnaExplanation: string
  overallExplanation: string
}

export type CareerSessionStatus = 'not_started' | 'in_progress' | 'completed'

export type CareerSessionSummary = {
  id: string
  studentId: string
  accessToken: string
  status: CareerSessionStatus
  answeredCount: number
  expectedQuestionCount: number
  assessmentVersion: CareerAssessmentVersion
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  latestResultId: string | null
}
