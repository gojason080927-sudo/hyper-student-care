export const CAREER_RESULT_VERSION = 'HYPER_CAREER_V1' as const

export const CAREER_QUESTION_COUNT = 88

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
  resultVersion: typeof CAREER_RESULT_VERSION
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
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  latestResultId: string | null
}
