/**
 * 실행: npx tsx src/features/careerAssessment/engine/careerScoring.test.ts
 */
import assert from 'node:assert/strict'
import { CAREER_MAJOR_DICTIONARY } from '../data/majorDictionary.ts'
import { CAREER_MAJOR_PROFILES } from '../data/majorProfiles.ts'
import { CAREER_QUESTIONS, buildMixedDisplayOrder } from '../data/questions.ts'
import { MAJOR_FIT_WEIGHTS } from '../types.ts'
import {
  CareerScoringError,
  computeMajorFit,
  normalizeLikert,
  scoreCareerAssessment,
} from './scoring.ts'

function answersAll(value: number): Record<number, number> {
  const answers: Record<number, number> = {}
  for (let i = 1; i <= 88; i += 1) answers[i] = value
  return answers
}

function answersWithCodes(highCodes: string[], high = 5, low = 1): Record<number, number> {
  const answers: Record<number, number> = {}
  for (const question of CAREER_QUESTIONS) {
    answers[question.questionNumber] = highCodes.includes(question.scoringCode) ? high : low
  }
  return answers
}

function score(answers: Record<number, number>) {
  return scoreCareerAssessment({
    answers,
    questions: CAREER_QUESTIONS,
    profiles: CAREER_MAJOR_PROFILES,
    dictionary: CAREER_MAJOR_DICTIONARY,
  })
}

assert.equal(CAREER_QUESTIONS.length, 88)
assert.equal(new Set(CAREER_QUESTIONS.map((q) => q.questionNumber)).size, 88)
assert.equal(CAREER_MAJOR_PROFILES.length, 36)
assert.ok(CAREER_MAJOR_DICTIONARY.every((row) => {
  if (!row.majorGroupSecondary) return row.primaryWeight === 1 && row.secondaryWeight === 0
  return Math.abs(row.primaryWeight + row.secondaryWeight - 1) < 1e-9
}))

const display = buildMixedDisplayOrder(CAREER_QUESTIONS.map((q) => q.questionNumber))
assert.equal(display.length, 88)
assert.equal(new Set(display).size, 88)
assert.notDeepEqual(display.slice(0, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
assert.deepEqual(buildMixedDisplayOrder(CAREER_QUESTIONS.map((q) => q.questionNumber)), display)

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

const all5 = score(answersAll(5))
for (const value of Object.values(all5.riasecScores)) assert.equal(value, 100)
for (const value of Object.values(all5.strengthScores)) assert.equal(value, 100)
for (const value of Object.values(all5.valueScores)) assert.equal(value, 100)
for (const value of Object.values(all5.behaviorScores)) assert.equal(value, 100)
for (const value of Object.values(all5.problemSolvingScores)) assert.equal(value, 100)
assert.equal(all5.careerEfficacy, 100)
assert.equal(all5.careerReadiness, 100)
assert.ok(all5.majorGroupScores.every((row) => row.score >= 0 && row.score <= 100))
assert.equal(all5.resultVersion, 'HYPER_CAREER_V1')

const all1 = score(answersAll(1))
for (const value of Object.values(all1.riasecScores)) assert.equal(value, 0)
assert.equal(all1.careerEfficacy, 0)
assert.equal(all1.careerReadiness, 0)

const all3 = score(answersAll(3))
for (const value of Object.values(all3.riasecScores)) assert.equal(value, 50)
assert.equal(all3.careerEfficacy, 50)
assert.equal(all3.careerReadiness, 50)

const onlyR = score(answersWithCodes(['R']))
assert.equal(onlyR.riasecScores.R, 100)
assert.equal(onlyR.riasecScores.I, 0)
assert.equal(onlyR.riasecTop2[0], 'R')

const onlyI = score(answersWithCodes(['I']))
assert.equal(onlyI.riasecScores.I, 100)
assert.equal(onlyI.riasecScores.R, 0)
assert.equal(onlyI.riasecTop2[0], 'I')

const mixed = answersAll(3)
for (const question of CAREER_QUESTIONS) {
  if (question.questionNumber >= 69 && question.questionNumber <= 76) mixed[question.questionNumber] = 5
  if (question.questionNumber >= 85 && question.questionNumber <= 88) mixed[question.questionNumber] = 1
}
const mixedScore = score(mixed)
assert.equal(mixedScore.careerEfficacy, 100)
assert.equal(mixedScore.careerReadiness, 0)
const baselineMajors = all3.majorGroupScores.map((row) => row.score)
const mixedMajors = mixedScore.majorGroupScores.map((row) => row.score)
assert.deepEqual(mixedMajors, baselineMajors)

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

const incomplete = answersAll(5)
delete incomplete[88]
assert.throws(() => score(incomplete), CareerScoringError)

const dataCs = CAREER_MAJOR_DICTIONARY.find((row) => row.id === 'cs-data')
assert.ok(dataCs)
assert.equal(dataCs.majorGroupPrimary, 'CS')
assert.equal(dataCs.majorGroupSecondary, 'MATH')
assert.equal(dataCs.primaryWeight, 0.7)
assert.equal(dataCs.secondaryWeight, 0.3)

console.log('careerScoring tests OK')
