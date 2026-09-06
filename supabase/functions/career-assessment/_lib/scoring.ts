import { DEFAULT_FIT_BANDS, labelOfDimension, RIASEC_LABELS, RIASEC_ORDER } from './labels.ts'
import type {
  CareerAssessmentScores,
  CareerQuestion,
  DetailedMajorDef,
  FitBand,
  MajorProfile,
  RankedItem,
  RiasecCode,
  RiasecVector,
  ScoreMap,
} from './types.ts'
import { CAREER_RESULT_VERSION, MAJOR_FIT_WEIGHTS } from './types.ts'
import { buildDnaExplanation, buildMajorReasons, buildOverallExplanation, buildWatchItems } from './explanation.ts'

export class CareerScoringError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CareerScoringError'
  }
}

export function normalizeLikert(rawAverage: number): number {
  return ((rawAverage - 1) / 4) * 100
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    throw new CareerScoringError('non_finite_score')
  }
  return Math.min(100, Math.max(0, value))
}

export function mean(values: number[]): number {
  if (values.length === 0) throw new CareerScoringError('empty_mean')
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    throw new CareerScoringError('cosine_length_mismatch')
  }
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0
    const bv = b[i] ?? 0
    if (!Number.isFinite(av) || !Number.isFinite(bv)) {
      throw new CareerScoringError('non_finite_vector')
    }
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function assertLikert(value: number, questionNumber: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new CareerScoringError(`invalid_answer:${questionNumber}`)
  }
}

function averageByCode(
  questions: CareerQuestion[],
  answers: Map<number, number>,
  domain: CareerQuestion['domain'],
  code: string,
): number {
  const matched = questions.filter((q) => q.domain === domain && q.scoringCode === code)
  if (matched.length === 0) throw new CareerScoringError(`missing_questions:${code}`)
  const raw = matched.map((q) => {
    const answer = answers.get(q.questionNumber)
    if (answer === undefined) throw new CareerScoringError(`missing_answer:${q.questionNumber}`)
    assertLikert(answer, q.questionNumber)
    return answer
  })
  return clampScore(normalizeLikert(mean(raw)))
}

function scoreMapForCodes<T extends string>(
  questions: CareerQuestion[],
  answers: Map<number, number>,
  domain: CareerQuestion['domain'],
  codes: readonly T[],
): ScoreMap<T> {
  const result = {} as ScoreMap<T>
  for (const code of codes) {
    result[code] = averageByCode(questions, answers, domain, code)
  }
  return result
}

function topKeys<T extends string>(scores: ScoreMap<T>, count: number, order: readonly T[]): T[] {
  return Object.entries(scores)
    .sort((a, b) => {
      const diff = (b[1] as number) - (a[1] as number)
      if (diff !== 0) return diff
      return order.indexOf(a[0] as T) - order.indexOf(b[0] as T)
    })
    .slice(0, count)
    .map(([key]) => key as T)
}

function dimensionMean<T extends string>(scores: ScoreMap<T>, keys: readonly T[]): number {
  const used = keys.length > 0 ? keys : (Object.keys(scores) as T[])
  return clampScore(mean(used.map((key) => scores[key])))
}

export function labelForFitScore(score: number, bands: readonly FitBand[] = DEFAULT_FIT_BANDS): string {
  const hit = bands.find((band) => score >= band.minScore && score <= band.maxScore)
  return hit?.label ?? (score < 55 ? '우선추천 제외' : '탐색 가능')
}

function vectorToArray(vector: RiasecVector): number[] {
  return RIASEC_ORDER.map((code) => vector[code])
}

function studentRiasecVector(scores: ScoreMap<RiasecCode>): number[] {
  return RIASEC_ORDER.map((code) => scores[code])
}

export function computeInterestFit(student: ScoreMap<RiasecCode>, target: RiasecVector): number {
  const similarity = cosineSimilarity(studentRiasecVector(student), vectorToArray(target))
  return clampScore(similarity * 100)
}

export function computeMajorFit(parts: {
  interestFit: number
  strengthFit: number
  valueFit: number
  behaviorFit: number
  problemSolvingFit: number
}): number {
  const weightSum =
    MAJOR_FIT_WEIGHTS.interest +
    MAJOR_FIT_WEIGHTS.strength +
    MAJOR_FIT_WEIGHTS.value +
    MAJOR_FIT_WEIGHTS.behavior +
    MAJOR_FIT_WEIGHTS.problemSolving
  if (Math.abs(weightSum - 1) > 1e-9) {
    throw new CareerScoringError('invalid_weight_sum')
  }
  return clampScore(
    parts.interestFit * MAJOR_FIT_WEIGHTS.interest +
      parts.strengthFit * MAJOR_FIT_WEIGHTS.strength +
      parts.valueFit * MAJOR_FIT_WEIGHTS.value +
      parts.behaviorFit * MAJOR_FIT_WEIGHTS.behavior +
      parts.problemSolvingFit * MAJOR_FIT_WEIGHTS.problemSolving,
  )
}

export type ScoreCareerAssessmentInput = {
  answers: Record<number, number> | Map<number, number>
  questions: CareerQuestion[]
  profiles: MajorProfile[]
  dictionary: DetailedMajorDef[]
  bands?: readonly FitBand[]
}

export function scoreCareerAssessment(input: ScoreCareerAssessmentInput): CareerAssessmentScores {
  const answers = input.answers instanceof Map ? input.answers : new Map(
    Object.entries(input.answers).map(([key, value]) => [Number(key), value]),
  )

  if (input.questions.length !== 88) {
    throw new CareerScoringError('question_count')
  }
  if (answers.size !== 88) {
    throw new CareerScoringError('answer_count')
  }

  const riasecScores = scoreMapForCodes(input.questions, answers, 'riasec', RIASEC_ORDER)
  const strengthScores = scoreMapForCodes(
    input.questions,
    answers,
    'strength',
    ['VER', 'NUM', 'LOG', 'SPA', 'CRE', 'INT', 'OBS', 'PRA'] as const,
  )
  const valueScores = scoreMapForCodes(
    input.questions,
    answers,
    'value',
    [
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
    ] as const,
  )
  const behaviorScores = scoreMapForCodes(
    input.questions,
    answers,
    'behavior',
    [
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
    ] as const,
  )
  const problemSolvingScores = scoreMapForCodes(
    input.questions,
    answers,
    'problem_solving',
    [
      'ANALYSIS',
      'FLEXIBILITY',
      'CONNECTION',
      'REFLECTION',
      'EXPLORATION',
      'STRUCTURING',
      'COMPARISON',
      'ERROR_ANALYSIS',
    ] as const,
  )

  const efficacyQuestions = input.questions.filter((q) => q.domain === 'efficacy')
  const readinessQuestions = input.questions.filter((q) => q.domain === 'career_readiness')
  const careerEfficacy = clampScore(
    normalizeLikert(
      mean(
        efficacyQuestions.map((q) => {
          const answer = answers.get(q.questionNumber)
          if (answer === undefined) throw new CareerScoringError(`missing_answer:${q.questionNumber}`)
          assertLikert(answer, q.questionNumber)
          return answer
        }),
      ),
    ),
  )
  const careerReadiness = clampScore(
    normalizeLikert(
      mean(
        readinessQuestions.map((q) => {
          const answer = answers.get(q.questionNumber)
          if (answer === undefined) throw new CareerScoringError(`missing_answer:${q.questionNumber}`)
          assertLikert(answer, q.questionNumber)
          return answer
        }),
      ),
    ),
  )

  const top2 = topKeys(riasecScores, 2, RIASEC_ORDER) as [RiasecCode, RiasecCode]
  const bands = input.bands ?? DEFAULT_FIT_BANDS
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]))

  const majorGroupScores: RankedItem[] = input.profiles
    .map((profile) => {
      const interestFit = computeInterestFit(riasecScores, profile.riasecTarget)
      const strengthFit = dimensionMean(strengthScores, profile.strengthKeys)
      const valueFit = dimensionMean(valueScores, profile.valueKeys)
      const behaviorFit = dimensionMean(behaviorScores, profile.behaviorKeys)
      const problemSolvingFit = dimensionMean(problemSolvingScores, profile.problemSolvingKeys)
      const score = computeMajorFit({
        interestFit,
        strengthFit,
        valueFit,
        behaviorFit,
        problemSolvingFit,
      })
      return {
        id: profile.id,
        name: profile.name,
        score,
        label: labelForFitScore(score, bands),
        reasons: buildMajorReasons({
          profile,
          riasecScores,
          strengthScores,
          valueScores,
          behaviorScores,
          problemSolvingScores,
        }),
        watchItems: buildWatchItems({
          profile,
          strengthScores,
          valueScores,
          behaviorScores,
          problemSolvingScores,
        }),
      }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))

  const detailedMajorScores: RankedItem[] = input.dictionary
    .filter((item) => item.isActive)
    .map((item) => {
      const weightSum = item.primaryWeight + (item.majorGroupSecondary ? item.secondaryWeight : 0)
      if (item.majorGroupSecondary && Math.abs(weightSum - 1) > 1e-6) {
        throw new CareerScoringError(`invalid_major_weight:${item.id}`)
      }
      const primary = majorGroupScores.find((row) => row.id === item.majorGroupPrimary)
      const secondary = item.majorGroupSecondary
        ? majorGroupScores.find((row) => row.id === item.majorGroupSecondary)
        : null
      if (!primary) throw new CareerScoringError(`missing_primary_group:${item.id}`)
      const secondaryFit = secondary?.score ?? 0
      const score = clampScore(
        primary.score * item.primaryWeight +
          (item.majorGroupSecondary ? secondaryFit * item.secondaryWeight : 0),
      )
      const primaryProfile = profileById.get(item.majorGroupPrimary)
      return {
        id: item.id,
        name: item.majorName,
        score,
        label: labelForFitScore(score, bands),
        reasons: primaryProfile
          ? buildMajorReasons({
              profile: primaryProfile,
              riasecScores,
              strengthScores,
              valueScores,
              behaviorScores,
              problemSolvingScores,
            })
          : [],
        watchItems: primaryProfile
          ? buildWatchItems({
              profile: primaryProfile,
              strengthScores,
              valueScores,
              behaviorScores,
              problemSolvingScores,
            })
          : [],
      }
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))

  return {
    resultVersion: CAREER_RESULT_VERSION,
    riasecScores,
    riasecTop2: top2,
    riasecCodeLabel: `${top2[0]}-${top2[1]}형`,
    strengthScores,
    valueScores,
    behaviorScores,
    problemSolvingScores,
    careerEfficacy,
    careerReadiness,
    majorGroupScores,
    detailedMajorScores,
    dnaExplanation: buildDnaExplanation(top2, riasecScores),
    overallExplanation: buildOverallExplanation({
      riasecScores,
      strengthScores,
      valueScores,
      problemSolvingScores,
    }),
  }
}

export function rankedTop<T extends { score: number }>(items: T[], count: number): T[] {
  return items.slice(0, count)
}

export function formatScore(score: number, digits = 1): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(digits)
}

export function formatRiasecPair(top2: [RiasecCode, RiasecCode]): string {
  return `${RIASEC_LABELS[top2[0]]} ${top2[0]} + ${RIASEC_LABELS[top2[1]]} ${top2[1]}`
}

export function topEntries<T extends string>(
  scores: ScoreMap<T>,
  count: number,
  order: readonly T[],
): Array<{ code: T; label: string; score: number }> {
  return topKeys(scores, count, order).map((code) => ({
    code,
    label: labelOfDimension(code),
    score: scores[code],
  }))
}
