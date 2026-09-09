/**
 * 실행: npx tsx src/features/careerAssessment/engine/careerScoring.test.ts
 */
import assert from 'node:assert/strict'
import { CAREER_MAJOR_DICTIONARY } from '../data/majorDictionary.ts'
import { CAREER_MAJOR_PROFILES } from '../data/majorProfiles.ts'
import { CAREER_V1_QUESTION_SNAPSHOT } from '../data/careerQuestionsV1Snapshot.ts'
import {
  CAREER_QUESTIONS,
  CAREER_QUESTIONS_V1,
  CAREER_QUESTIONS_V2,
  buildMixedDisplayOrder,
  buildV1MixedDisplayOrder,
} from '../data/questions.ts'
import { CAREER_ASSESSMENT_V1, CAREER_ASSESSMENT_V2, MAJOR_FIT_WEIGHTS } from '../types.ts'
import {
  CareerScoringError,
  computeMajorFit,
  normalizeLikert,
  scoreCareerAssessment,
} from './scoring.ts'

function answersAll(questions: typeof CAREER_QUESTIONS, value: number): Record<number, number> {
  const answers: Record<number, number> = {}
  for (const question of questions) answers[question.questionNumber] = value
  return answers
}

function answersWithCodes(
  questions: typeof CAREER_QUESTIONS,
  highCodes: string[],
  high = 5,
  low = 1,
): Record<number, number> {
  const answers: Record<number, number> = {}
  for (const question of questions) {
    answers[question.questionNumber] = highCodes.includes(question.scoringCode) ? high : low
  }
  return answers
}

function score(answers: Record<number, number>, questions = CAREER_QUESTIONS_V1) {
  return scoreCareerAssessment({
    answers,
    questions,
    profiles: CAREER_MAJOR_PROFILES,
    dictionary: CAREER_MAJOR_DICTIONARY,
  })
}

assert.equal(CAREER_QUESTIONS_V1.length, 88)
assert.equal(CAREER_QUESTIONS_V2.length, 140)
assert.equal(CAREER_QUESTIONS.length, 140)
assert.equal(new Set(CAREER_QUESTIONS.map((q) => q.questionNumber)).size, 140)
assert.equal(CAREER_V1_QUESTION_SNAPSHOT.length, 88)
for (const frozen of CAREER_V1_QUESTION_SNAPSHOT) {
  const live = CAREER_QUESTIONS_V1.find((q) => q.questionNumber === frozen.questionNumber)
  assert.ok(live, `missing V1 ${frozen.questionNumber}`)
  assert.equal(live.text, frozen.text)
  assert.equal(live.domain, frozen.domain)
  assert.equal(live.scoringCode, frozen.scoringCode)
}
assert.equal(CAREER_MAJOR_PROFILES.length, 36)
assert.ok(CAREER_MAJOR_DICTIONARY.every((row) => {
  if (!row.majorGroupSecondary) return row.primaryWeight === 1 && row.secondaryWeight === 0
  return Math.abs(row.primaryWeight + row.secondaryWeight - 1) < 1e-9
}))

const displayV1 = buildV1MixedDisplayOrder(CAREER_QUESTIONS_V1.map((q) => q.questionNumber))
assert.equal(displayV1.length, 88)
assert.equal(new Set(displayV1).size, 88)
assert.notDeepEqual(displayV1.slice(0, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
assert.deepEqual(buildV1MixedDisplayOrder(CAREER_QUESTIONS_V1.map((q) => q.questionNumber)), displayV1)

const displayV2 = buildMixedDisplayOrder(CAREER_QUESTIONS_V2)
assert.equal(displayV2.length, 140)
assert.equal(new Set(displayV2).size, 140)
assert.notDeepEqual(displayV2.slice(0, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
assert.deepEqual(buildMixedDisplayOrder(CAREER_QUESTIONS_V2), displayV2)

assert.equal(normalizeLikert(5), 100)
assert.equal(normalizeLikert(1), 0)
assert.equal(normalizeLikert(3), 50)

const weightSum =
  MAJOR_FIT_WEIGHTS.interest +
  MAJOR_FIT_WEIGHTS.strength +
  MAJOR_FIT_WEIGHTS.value +
  MAJOR_FIT_WEIGHTS.behavior +
  MAJOR_FIT_WEIGHTS.problemSolving
assert.ok(Math.abs(weightSum - 1) < 1e-9)

const all5 = score(answersAll(CAREER_QUESTIONS_V1, 5))
for (const value of Object.values(all5.riasecScores)) assert.equal(value, 100)
for (const value of Object.values(all5.strengthScores)) assert.equal(value, 100)
for (const value of Object.values(all5.valueScores)) assert.equal(value, 100)
for (const value of Object.values(all5.behaviorScores)) assert.equal(value, 100)
for (const value of Object.values(all5.problemSolvingScores)) assert.equal(value, 100)
assert.equal(all5.careerEfficacy, 100)
assert.equal(all5.careerReadiness, 100)
assert.ok(all5.majorGroupScores.every((row) => row.score >= 0 && row.score <= 100))
assert.equal(all5.resultVersion, CAREER_ASSESSMENT_V1)

const all1 = score(answersAll(CAREER_QUESTIONS_V1, 1))
for (const value of Object.values(all1.riasecScores)) assert.equal(value, 0)
assert.equal(all1.careerEfficacy, 0)
assert.equal(all1.careerReadiness, 0)

const all3 = score(answersAll(CAREER_QUESTIONS_V1, 3))
for (const value of Object.values(all3.riasecScores)) assert.equal(value, 50)
assert.equal(all3.careerEfficacy, 50)
assert.equal(all3.careerReadiness, 50)

const onlyR = score(answersWithCodes(CAREER_QUESTIONS_V1, ['R']))
assert.equal(onlyR.riasecScores.R, 100)
assert.equal(onlyR.riasecScores.I, 0)
assert.equal(onlyR.riasecTop2[0], 'R')

const onlyI = score(answersWithCodes(CAREER_QUESTIONS_V1, ['I']))
assert.equal(onlyI.riasecScores.I, 100)
assert.equal(onlyI.riasecScores.R, 0)
assert.equal(onlyI.riasecTop2[0], 'I')

const mixed = answersAll(CAREER_QUESTIONS_V1, 3)
for (const question of CAREER_QUESTIONS_V1) {
  if (question.questionNumber >= 69 && question.questionNumber <= 76) mixed[question.questionNumber] = 5
  if (question.questionNumber >= 85 && question.questionNumber <= 88) mixed[question.questionNumber] = 1
}
const mixedScore = score(mixed)
assert.equal(mixedScore.careerEfficacy, 100)
assert.equal(mixedScore.careerReadiness, 0)
const baselineMajors = all3.majorGroupScores.map((row) => row.score)
const mixedMajors = mixedScore.majorGroupScores.map((row) => row.score)
assert.deepEqual(mixedMajors, baselineMajors)

const all3V2 = score(answersAll(CAREER_QUESTIONS_V2, 3), CAREER_QUESTIONS_V2)
assert.equal(all3V2.resultVersion, CAREER_ASSESSMENT_V2)
for (const value of Object.values(all3V2.riasecScores)) assert.equal(value, 50)
assert.equal(all3V2.careerEfficacy, 50)
assert.equal(all3V2.careerReadiness, 50)
assert.deepEqual(
  all3V2.majorGroupScores.map((row) => row.score),
  all3.majorGroupScores.map((row) => row.score),
)

const onlyRV2 = score(answersWithCodes(CAREER_QUESTIONS_V2, ['R']), CAREER_QUESTIONS_V2)
assert.equal(onlyRV2.riasecScores.R, 100)
assert.equal(onlyRV2.riasecScores.I, 0)

assert.equal(
  computeMajorFit({
    interestFit: 100,
    strengthFit: 100,
    valueFit: 100,
    behaviorFit: 100,
    problemSolvingFit: 100,
  }),
  100,
)

const incomplete = answersAll(CAREER_QUESTIONS_V1, 5)
delete incomplete[88]
assert.throws(() => score(incomplete), CareerScoringError)
assert.throws(() => score(answersAll(CAREER_QUESTIONS_V1, 5), CAREER_QUESTIONS_V2), CareerScoringError)

const dataCs = CAREER_MAJOR_DICTIONARY.find((row) => row.id === 'cs-data')
assert.ok(dataCs)
assert.equal(dataCs.majorGroupPrimary, 'CS')
assert.equal(dataCs.majorGroupSecondary, 'MATH')
assert.equal(dataCs.primaryWeight, 0.7)
assert.equal(dataCs.secondaryWeight, 0.3)

console.log('careerScoring tests OK')
