/**
 * 실행: npx tsx src/features/careerAssessment/utils/careerMajorDeepAnalysis.test.ts
 */
import assert from 'node:assert/strict'
import { CAREER_MAJOR_DETAIL_MAP } from '../data/careerMajorDetails.ts'
import { CAREER_MAJOR_DICTIONARY } from '../data/majorDictionary.ts'
import { CAREER_MAJOR_PROFILES } from '../data/majorProfiles.ts'
import { CAREER_QUESTIONS_V1 } from '../data/questions.ts'
import { scoreCareerAssessment } from '../engine/scoring.ts'
import {
  analyzeTop10ReasonUniqueness,
  buildDeepFitExplanation,
  buildDistinctMajorReason,
  buildSelectionPoints,
  buildTop3DeepCards,
  reportHasPlaceholderLeak,
  resolveMajorDetail,
} from './careerMajorDeepAnalysis.ts'

function answersWithCodes(highCodes: string[], high = 5, low = 2): Record<number, number> {
  const answers: Record<number, number> = {}
  for (const question of CAREER_QUESTIONS_V1) {
    answers[question.questionNumber] = highCodes.includes(question.scoringCode) ? high : low
  }
  return answers
}

function score(highCodes: string[]) {
  return scoreCareerAssessment({
    answers: answersWithCodes(highCodes),
    questions: CAREER_QUESTIONS_V1,
    profiles: CAREER_MAJOR_PROFILES,
    dictionary: CAREER_MAJOR_DICTIONARY,
  })
}

assert.equal(CAREER_MAJOR_PROFILES.length, 36)
assert.equal(Object.keys(CAREER_MAJOR_DETAIL_MAP).length, 36)
for (const profile of CAREER_MAJOR_PROFILES) {
  assert.ok(CAREER_MAJOR_DETAIL_MAP[profile.id], profile.id)
}

const inquiry = score(['I', 'S', 'LOG', 'OBS', 'INT', 'CONTRIBUTION', 'GROWTH', 'ANALYSIS'])
const practical = score(['R', 'E', 'PRA', 'SPA', 'ACHIEVEMENT', 'EXECUTION'])
const creative = score(['A', 'E', 'CRE', 'VER', 'CREATIVITY', 'FLEXIBILITY'])

for (const result of [inquiry, practical, creative]) {
  const top10 = result.majorGroupScores.slice(0, 10)
  assert.equal(top10.length, 10)
  const top3 = buildTop3DeepCards(result)
  assert.equal(top3.length, 3)
  assert.deepEqual(
    top3.map((row) => row.group.id),
    top10.slice(0, 3).map((row) => row.id),
  )
  for (const card of top3) {
    assert.ok(card.relatedMajors.length >= 1, card.group.id)
    assert.ok(card.exploratorySubjects.length >= 3, `${card.group.id} subjects`)
    assert.ok(card.explorationTopics.length >= 3, `${card.group.id} topics`)
    assert.ok(card.careers.length >= 6, `${card.group.id} careers ${card.careers.length}`)
    assert.ok(card.whyFit.length > 12)
    assert.ok(!reportHasPlaceholderLeak(JSON.stringify(card)))
  }
  const points = buildSelectionPoints(result)
  assert.ok(points.length >= 3 && points.length <= 4)
  assert.ok(!reportHasPlaceholderLeak(JSON.stringify(points)))
  const reasons = top10.map((group) => buildDistinctMajorReason(group, result))
  const uniqueness = analyzeTop10ReasonUniqueness(reasons, top10)
  assert.equal(
    uniqueness.ok,
    true,
    JSON.stringify({ top: top10.map((row) => row.id), uniqueness, reasons }, null, 2),
  )
}

assert.notEqual(inquiry.majorGroupScores[0]?.id, practical.majorGroupScores[0]?.id)
assert.notEqual(
  buildDeepFitExplanation(inquiry.majorGroupScores[0]!, inquiry),
  buildDeepFitExplanation(practical.majorGroupScores[0]!, practical),
)
assert.notEqual(
  buildSelectionPoints(inquiry).map((row) => row.title).join('|'),
  buildSelectionPoints(practical).map((row) => row.title).join('|'),
)

const unknown = resolveMajorDetail('UNKNOWN_GROUP', [])
assert.ok(unknown.relatedMajors.length >= 1)
assert.ok(unknown.exploratorySubjects.length >= 3)
assert.ok(unknown.explorationTopics.length >= 3)
assert.ok(unknown.careers.length >= 1)
assert.ok(!reportHasPlaceholderLeak(JSON.stringify(unknown)))

const ghostGroup = {
  id: 'NO_SUCH',
  name: '미등록전공',
  score: 70,
  label: '탐색 가능',
  reasons: [],
  watchItems: [],
}
const ghostWhy = buildDeepFitExplanation(ghostGroup, inquiry)
assert.ok(ghostWhy.includes('미등록전공') || ghostWhy.includes('학습'))
assert.ok(!reportHasPlaceholderLeak(ghostWhy))

const baselineTop = inquiry.majorGroupScores.map((row) => `${row.id}:${row.score.toFixed(4)}`).join('|')
const again = score(['I', 'S', 'LOG', 'OBS', 'INT', 'CONTRIBUTION', 'GROWTH', 'ANALYSIS'])
assert.equal(
  again.majorGroupScores.map((row) => `${row.id}:${row.score.toFixed(4)}`).join('|'),
  baselineTop,
)

console.log('careerMajorDeepAnalysis tests OK')
