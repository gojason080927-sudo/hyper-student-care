import type {
  BehaviorCode,
  ProblemSolvingCode,
  RiasecCode,
  StrengthCode,
  ValueCode,
} from '../types'

export const RIASEC_LABELS: Record<RiasecCode, string> = {
  R: '현실형',
  I: '탐구형',
  A: '예술형',
  S: '사회형',
  E: '진취형',
  C: '관습형',
}

export const RIASEC_ORDER: RiasecCode[] = ['R', 'I', 'A', 'S', 'E', 'C']

export const STRENGTH_LABELS: Record<StrengthCode, string> = {
  VER: '언어',
  NUM: '수리',
  LOG: '논리',
  SPA: '공간',
  CRE: '창의',
  INT: '대인',
  OBS: '관찰',
  PRA: '실용',
}

export const STRENGTH_ORDER: StrengthCode[] = [
  'VER',
  'NUM',
  'LOG',
  'SPA',
  'CRE',
  'INT',
  'OBS',
  'PRA',
]

export const VALUE_LABELS: Record<ValueCode, string> = {
  STABILITY: '안정',
  REWARD: '보상',
  ACHIEVEMENT: '성취',
  CONTRIBUTION: '사회기여',
  AUTONOMY: '자율',
  GROWTH: '성장',
  RECOGNITION: '인정',
  BALANCE: '균형',
  CREATIVITY: '창의',
  RELATIONSHIP: '관계',
  INFLUENCE: '영향',
  EXPERTISE: '전문성',
}

export const VALUE_ORDER: ValueCode[] = [
  'STABILITY',
  'REWARD',
  'ACHIEVEMENT',
  'CONTRIBUTION',
  'AUTONOMY',
  'GROWTH',
  'RECOGNITION',
  'BALANCE',
  'CREATIVITY',
  'RELATIONSHIP',
  'INFLUENCE',
  'EXPERTISE',
]

export const BEHAVIOR_LABELS: Record<BehaviorCode, string> = {
  PLANNING: '계획',
  PERSISTENCE: '끈기',
  CAREFULNESS: '신중',
  SOCIABILITY: '사교',
  COOPERATION: '협력',
  ADAPTABILITY: '적응',
  INITIATIVE: '주도',
  SELF_CONTROL: '자기조절',
  DELIBERATION: '숙고',
  EXECUTION: '실행',
}

export const BEHAVIOR_ORDER: BehaviorCode[] = [
  'PLANNING',
  'PERSISTENCE',
  'CAREFULNESS',
  'SOCIABILITY',
  'COOPERATION',
  'ADAPTABILITY',
  'INITIATIVE',
  'SELF_CONTROL',
  'DELIBERATION',
  'EXECUTION',
]

export const PROBLEM_SOLVING_LABELS: Record<ProblemSolvingCode, string> = {
  ANALYSIS: '분석',
  FLEXIBILITY: '유연',
  CONNECTION: '연결',
  REFLECTION: '성찰',
  EXPLORATION: '탐색',
  STRUCTURING: '구조화',
  COMPARISON: '비교',
  ERROR_ANALYSIS: '오인분석',
}

export const PROBLEM_SOLVING_ORDER: ProblemSolvingCode[] = [
  'ANALYSIS',
  'FLEXIBILITY',
  'CONNECTION',
  'REFLECTION',
  'EXPLORATION',
  'STRUCTURING',
  'COMPARISON',
  'ERROR_ANALYSIS',
]

export const LIKERT_OPTIONS = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '그렇지 않은 편이다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그런 편이다' },
  { value: 5, label: '매우 그렇다' },
] as const

export const CAREER_DISCLAIMER =
  '본 검사는 학생의 현재 흥미·강점·가치관 및 행동 특성을 바탕으로 진로 탐색을 돕기 위한 자료이며 특정 전공이나 직업을 결정하는 판정 도구가 아닙니다.'

export const CAREER_PRINT_FOOTER = 'HYPER ACADEMY | 24시간 학습을 설계하다'

export const DEFAULT_FIT_BANDS = [
  { minScore: 85, maxScore: 100, label: '매우 높은 적합', excludeFromPriority: false },
  { minScore: 75, maxScore: 84.9, label: '높은 적합', excludeFromPriority: false },
  { minScore: 65, maxScore: 74.9, label: '비교적 적합', excludeFromPriority: false },
  { minScore: 55, maxScore: 64.9, label: '탐색 가능', excludeFromPriority: false },
  { minScore: 0, maxScore: 54.999, label: '우선추천 제외', excludeFromPriority: true },
] as const

export function labelOfDimension(code: string): string {
  if (code in RIASEC_LABELS) return RIASEC_LABELS[code as RiasecCode]
  if (code in STRENGTH_LABELS) return STRENGTH_LABELS[code as StrengthCode]
  if (code in VALUE_LABELS) return VALUE_LABELS[code as ValueCode]
  if (code in BEHAVIOR_LABELS) return BEHAVIOR_LABELS[code as BehaviorCode]
  if (code in PROBLEM_SOLVING_LABELS) return PROBLEM_SOLVING_LABELS[code as ProblemSolvingCode]
  return code
}
