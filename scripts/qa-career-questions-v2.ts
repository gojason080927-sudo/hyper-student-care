/**
 * MASTER v2 140문항 자동 QA.
 *   npx tsx scripts/qa-career-questions-v2.ts
 */
import assert from 'node:assert/strict'
import { CAREER_V1_QUESTION_SNAPSHOT } from '../src/features/careerAssessment/data/careerQuestionsV1Snapshot.ts'
import {
  CAREER_QUESTIONS,
  CAREER_QUESTIONS_V1,
  CAREER_QUESTIONS_V2,
  buildMixedDisplayOrder,
  buildV1MixedDisplayOrder,
} from '../src/features/careerAssessment/data/questions.ts'
import {
  CAREER_ASSESSMENT_V1,
  CAREER_ASSESSMENT_V2,
  CAREER_QUESTION_COUNT_V1,
  CAREER_QUESTION_COUNT_V2,
} from '../src/features/careerAssessment/types.ts'

const DOMAIN_COUNTS_V2: Record<string, number> = {
  riasec: 42,
  strength: 24,
  value: 18,
  behavior: 16,
  efficacy: 12,
  problem_solving: 16,
  career_readiness: 12,
}

const RIASEC = ['R', 'I', 'A', 'S', 'E', 'C'] as const
const STRENGTH = ['VER', 'NUM', 'LOG', 'SPA', 'CRE', 'INT', 'OBS', 'PRA'] as const
const VALUE_ONCE = ['STABILITY', 'REWARD', 'RECOGNITION', 'CREATIVITY', 'RELATIONSHIP', 'INFLUENCE'] as const
const VALUE_TWICE = ['ACHIEVEMENT', 'CONTRIBUTION', 'AUTONOMY', 'GROWTH', 'BALANCE', 'EXPERTISE'] as const
const BEHAVIOR_ONCE = ['CAREFULNESS', 'SOCIABILITY', 'INITIATIVE', 'DELIBERATION'] as const
const BEHAVIOR_TWICE = ['PLANNING', 'PERSISTENCE', 'COOPERATION', 'ADAPTABILITY', 'SELF_CONTROL', 'EXECUTION'] as const
const PROBLEM = [
  'ANALYSIS',
  'FLEXIBILITY',
  'CONNECTION',
  'REFLECTION',
  'EXPLORATION',
  'STRUCTURING',
  'COMPARISON',
  'ERROR_ANALYSIS',
] as const
const READINESS = [
  'SELF_UNDERSTANDING',
  'CAREER_EXPLORATION',
  'DECISION_CRITERIA',
  'EXPLORATION_READINESS',
] as const

function countBy<T extends string>(items: Array<{ scoringCode: string }>, codes: readonly T[]): Record<T, number> {
  const result = {} as Record<T, number>
  for (const code of codes) result[code] = items.filter((item) => item.scoringCode === code).length
  return result
}

function trigrams(text: string): Set<string> {
  const normalized = text.replace(/\s+/g, '')
  const grams = new Set<string>()
  for (let i = 0; i < normalized.length - 2; i += 1) grams.add(normalized.slice(i, i + 3))
  return grams
}

function jaccard(a: string, b: string): number {
  const left = trigrams(a)
  const right = trigrams(b)
  let inter = 0
  for (const gram of left) if (right.has(gram)) inter += 1
  const union = left.size + right.size - inter
  return union === 0 ? 0 : inter / union
}

assert.equal(CAREER_QUESTIONS.length, CAREER_QUESTION_COUNT_V2)
assert.equal(CAREER_QUESTIONS_V1.length, CAREER_QUESTION_COUNT_V1)
assert.equal(CAREER_QUESTIONS_V2.length, CAREER_QUESTION_COUNT_V2)

const numbers = CAREER_QUESTIONS.map((q) => q.questionNumber)
assert.equal(new Set(numbers).size, 140)
assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 140 }, (_, i) => i + 1))

const v1Orders = CAREER_QUESTIONS_V1.map((q) => q.displayOrder)
assert.equal(new Set(v1Orders).size, 88)
const v2Orders = CAREER_QUESTIONS_V2.map((q) => q.displayOrderV2)
assert.equal(new Set(v2Orders).size, 140)

for (const question of CAREER_QUESTIONS) {
  assert.ok(question.text.trim().length > 8, `empty/short ${question.questionNumber}`)
  assert.ok(!question.text.includes('항상') && !question.text.includes('절대로'), `extreme ${question.questionNumber}`)
  assert.equal(
    question.introducedIn,
    question.questionNumber <= 88 ? CAREER_ASSESSMENT_V1 : CAREER_ASSESSMENT_V2,
  )
}

const texts = CAREER_QUESTIONS.map((q) => q.text.trim())
assert.equal(new Set(texts).size, 140, 'duplicate exact text')

for (const frozen of CAREER_V1_QUESTION_SNAPSHOT) {
  const live = CAREER_QUESTIONS_V1.find((q) => q.questionNumber === frozen.questionNumber)
  assert.ok(live)
  assert.equal(live.text, frozen.text)
  assert.equal(live.domain, frozen.domain)
  assert.equal(live.scoringCode, frozen.scoringCode)
}

const v2ByDomain = Object.fromEntries(
  Object.keys(DOMAIN_COUNTS_V2).map((domain) => [
    domain,
    CAREER_QUESTIONS_V2.filter((q) => q.domain === domain).length,
  ]),
)
assert.deepEqual(v2ByDomain, DOMAIN_COUNTS_V2)

const riasec = countBy(CAREER_QUESTIONS_V2.filter((q) => q.domain === 'riasec'), RIASEC)
for (const code of RIASEC) assert.equal(riasec[code], 7, `RIASEC ${code}`)

const strength = countBy(CAREER_QUESTIONS_V2.filter((q) => q.domain === 'strength'), STRENGTH)
for (const code of STRENGTH) assert.equal(strength[code], 3, `strength ${code}`)

const values = CAREER_QUESTIONS_V2.filter((q) => q.domain === 'value')
for (const code of VALUE_ONCE) assert.equal(values.filter((q) => q.scoringCode === code).length, 1, `value ${code}`)
for (const code of VALUE_TWICE) assert.equal(values.filter((q) => q.scoringCode === code).length, 2, `value ${code}`)

const behaviors = CAREER_QUESTIONS_V2.filter((q) => q.domain === 'behavior')
for (const code of BEHAVIOR_ONCE) assert.equal(behaviors.filter((q) => q.scoringCode === code).length, 1, `behavior ${code}`)
for (const code of BEHAVIOR_TWICE) assert.equal(behaviors.filter((q) => q.scoringCode === code).length, 2, `behavior ${code}`)

assert.equal(CAREER_QUESTIONS_V2.filter((q) => q.domain === 'efficacy').length, 12)
assert.ok(CAREER_QUESTIONS_V2.filter((q) => q.domain === 'efficacy').every((q) => q.scoringCode === 'SE'))

const problems = CAREER_QUESTIONS_V2.filter((q) => q.domain === 'problem_solving')
for (const code of PROBLEM) assert.equal(problems.filter((q) => q.scoringCode === code).length, 2, `problem ${code}`)

const readiness = CAREER_QUESTIONS_V2.filter((q) => q.domain === 'career_readiness')
for (const code of READINESS) assert.equal(readiness.filter((q) => q.scoringCode === code).length, 3, `readiness ${code}`)

const v1Display = buildV1MixedDisplayOrder(CAREER_QUESTIONS_V1.map((q) => q.questionNumber))
assert.equal(v1Display.length, 88)
assert.notDeepEqual(v1Display.slice(0, 7), [1, 2, 3, 4, 5, 6, 7])

const v2Display = buildMixedDisplayOrder(CAREER_QUESTIONS_V2)
assert.equal(v2Display.length, 140)
assert.notDeepEqual(v2Display.slice(0, 7), [1, 2, 3, 4, 5, 6, 7])

const similar: Array<{ a: number; b: number; score: number }> = []
const added = CAREER_QUESTIONS.filter((q) => q.questionNumber >= 89)
for (const next of added) {
  for (const other of CAREER_QUESTIONS) {
    if (other.questionNumber === next.questionNumber) continue
    const score = jaccard(next.text, other.text)
    if (score >= 0.72) similar.push({ a: next.questionNumber, b: other.questionNumber, score })
  }
}
similar.sort((a, b) => b.score - a.score)
if (similar.length > 0) {
  console.log(
    'similar new items (warning, not fatal)',
    similar.slice(0, 12).map((row) => `${row.a}~${row.b}:${row.score.toFixed(2)}`),
  )
}

console.log('career question QA OK', {
  v1: 88,
  v2: 140,
  added: 52,
  similarWarnings: similar.length,
})
