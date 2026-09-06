/**
 * 실행: npx tsx src/features/careerAssessment/utils/careerReportContent.test.ts
 */
import assert from 'node:assert/strict'
import {
  MAJOR_CAREER_LICENSE_NOTE,
  MAJOR_CAREER_PATHS,
  MAJOR_FAMILY_DEPARTMENTS,
} from '../data/careerMajorCareerPaths.ts'
import {
  BEHAVIOR_DESCRIPTIONS,
  CAREER_MAJOR_REPORT_SEED,
  CREDIT_SUBJECT_CLUSTERS,
  CREDIT_WATCH_ITEMS,
  PROBLEM_SOLVING_DESCRIPTIONS,
  RIASEC_DNA_PRIMARY,
  RIASEC_DNA_SECONDARY,
  RIASEC_TRAIT_DESCRIPTIONS,
  STRENGTH_DESCRIPTIONS,
  VALUE_DESCRIPTIONS,
} from '../data/careerReportDescriptions.ts'
import { BEHAVIOR_ORDER, RIASEC_ORDER, STRENGTH_ORDER, VALUE_ORDER } from '../data/labels.ts'
import { CAREER_MAJOR_DICTIONARY } from '../data/majorDictionary.ts'
import { CAREER_MAJOR_PROFILES } from '../data/majorProfiles.ts'
import { PROBLEM_SOLVING_ORDER } from '../data/labels.ts'
import { CAREER_QUESTIONS } from '../data/questions.ts'
import { scoreCareerAssessment } from '../engine/scoring.ts'
import {
  buildCombinedMajorReason,
  buildReportDnaExplanation,
  careersForMajorGroup,
  collectDetailedMajorsForGroup,
  commentForEfficacy,
  commentForReadiness,
  containsBrokenSuriParticle,
  creditClustersForMajors,
  detailedMajorsByTopGroups,
} from './careerReportContent.ts'

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

assert.equal(RIASEC_ORDER.length, 6)
for (const code of RIASEC_ORDER) {
  assert.ok(RIASEC_TRAIT_DESCRIPTIONS[code].length > 10)
  assert.ok(RIASEC_DNA_PRIMARY[code].length > 8)
  assert.ok(RIASEC_DNA_SECONDARY[code].length > 8)
}
assert.equal(STRENGTH_ORDER.length, 8)
for (const code of STRENGTH_ORDER) {
  assert.ok(STRENGTH_DESCRIPTIONS[code].includes('능력'))
}
assert.equal(VALUE_ORDER.length, 12)
for (const code of VALUE_ORDER) {
  assert.ok(VALUE_DESCRIPTIONS[code].length > 10)
}
assert.equal(BEHAVIOR_ORDER.length, 10)
for (const code of BEHAVIOR_ORDER) {
  assert.ok(BEHAVIOR_DESCRIPTIONS[code].length > 8)
}
assert.equal(PROBLEM_SOLVING_ORDER.length, 8)
for (const code of PROBLEM_SOLVING_ORDER) {
  assert.ok(PROBLEM_SOLVING_DESCRIPTIONS[code].length > 8)
}

const dnaIS = buildReportDnaExplanation(['I', 'S'])
const dnaRE = buildReportDnaExplanation(['R', 'E'])
assert.match(dnaIS, /탐구형\(I\)과 사회형\(S\)/)
assert.match(dnaIS, /새로운 지식이나 원리를 탐구하는 흥미/)
assert.match(dnaIS, /사람을 돕거나 함께 성장/)
assert.match(dnaRE, /현실형\(R\)과 진취형\(E\)/)
assert.notEqual(dnaIS, dnaRE)

const med = CAREER_MAJOR_PROFILES.find((row) => row.id === 'MED')
const psy = CAREER_MAJOR_PROFILES.find((row) => row.id === 'PSY')
assert.ok(med && psy)
const iHigh = { R: 40, I: 95, A: 30, S: 88, E: 35, C: 40 }
const strengthMed = { VER: 70, NUM: 75, LOG: 100, SPA: 50, CRE: 40, INT: 80, OBS: 100, PRA: 55 }
const strengthPsy = { VER: 90, NUM: 40, LOG: 60, SPA: 40, CRE: 50, INT: 95, OBS: 80, PRA: 40 }
const medReason = buildCombinedMajorReason(med, iHigh, strengthMed)
const psyReason = buildCombinedMajorReason(psy, iHigh, strengthPsy)
assert.match(medReason, /탐구형 흥미/)
assert.match(medReason, /논리/)
assert.match(medReason, /관찰/)
assert.match(medReason, /의학 계열/)
assert.match(psyReason, /사회형 흥미|탐구형 흥미/)
assert.match(psyReason, /대인|언어|관찰/)
assert.match(psyReason, /심리 계열/)
assert.notEqual(medReason, psyReason)
assert.ok(!containsBrokenSuriParticle(medReason))
assert.ok(!containsBrokenSuriParticle(psyReason))

const inquiry = score(answersWithCodes(['I', 'S', 'LOG', 'OBS', 'INT', 'CONTRIBUTION', 'GROWTH']))
const top10 = inquiry.majorGroupScores.slice(0, 10)
const grouped = detailedMajorsByTopGroups(top10, inquiry.detailedMajorScores)
assert.equal(grouped.length, 10)
for (const row of grouped) {
  assert.ok(row.majors.length >= 1)
  assert.ok(row.majors.length <= 3)
  assert.ok(row.careers.length >= 3)
}
const medRow = grouped.find((row) => row.group.id === 'MED')
if (medRow) {
  assert.ok(medRow.majors.includes('의학과') || medRow.majors.includes('의예과'))
  assert.ok(medRow.majors.length >= 2)
}

assert.equal(CAREER_MAJOR_PROFILES.length, 36)
assert.equal(Object.keys(MAJOR_CAREER_PATHS).length, 36)
assert.match(MAJOR_CAREER_LICENSE_NOTE, /국가시험·면허/)

for (const profile of CAREER_MAJOR_PROFILES) {
  const names = collectDetailedMajorsForGroup(profile.id, inquiry.detailedMajorScores)
  assert.ok(names.length >= 1 && names.length <= 3, profile.id)
  const careers = careersForMajorGroup(profile.id)
  assert.ok(careers.length >= 3 && careers.length <= 4, `careers ${profile.id}`)

  for (const [familyId, familyNames] of Object.entries(MAJOR_FAMILY_DEPARTMENTS)) {
    if (familyId === profile.id) continue
    const leaked = names.filter((name) => familyNames.includes(name))
    assert.equal(leaked.length, 0, `${profile.id} leaked ${familyId} majors: ${leaked.join(', ')}`)
  }
}

const mathMajors = collectDetailedMajorsForGroup('MATH', inquiry.detailedMajorScores)
const vetMajors = collectDetailedMajorsForGroup('VET', inquiry.detailedMajorScores)
assert.ok(mathMajors.includes('수학과') && mathMajors.includes('통계학과'))
assert.ok(vetMajors.includes('수의학과'))
assert.ok(vetMajors.includes('수의예과') || vetMajors.includes('동물보건복지학과'))
assert.ok(!mathMajors.some((name) => name.includes('수의')))
assert.ok(!vetMajors.includes('수학과'))

assert.ok(CAREER_MAJOR_REPORT_SEED.every((row) => row.name.endsWith('과') || row.name.endsWith('학') || row.name.includes('과')))
assert.ok(!CREDIT_WATCH_ITEMS.some((item) => item.includes('수업·실습')))
assert.ok(CREDIT_SUBJECT_CLUSTERS.every((cluster) => cluster.examples.length >= 3))

const clusters = creditClustersForMajors(top10)
assert.ok(clusters.length >= 1)
assert.ok(clusters.length <= 2)

assert.notEqual(commentForEfficacy(90), commentForEfficacy(40))
assert.notEqual(commentForReadiness(85), commentForReadiness(50))

const onlyI = score(answersWithCodes(['I', 'S', 'LOG']))
const onlyR = score(answersWithCodes(['R', 'E', 'PRA']))
assert.notEqual(onlyI.riasecTop2.join(''), onlyR.riasecTop2.join(''))
assert.notEqual(
  buildReportDnaExplanation(onlyI.riasecTop2),
  buildReportDnaExplanation(onlyR.riasecTop2),
)
assert.notEqual(onlyI.majorGroupScores[0]?.id, onlyR.majorGroupScores[0]?.id)

const dictionaryText = JSON.stringify({
  RIASEC_TRAIT_DESCRIPTIONS,
  STRENGTH_DESCRIPTIONS,
  VALUE_DESCRIPTIONS,
  BEHAVIOR_DESCRIPTIONS,
  PROBLEM_SOLVING_DESCRIPTIONS,
  RIASEC_DNA_PRIMARY,
  RIASEC_DNA_SECONDARY,
})
assert.ok(!containsBrokenSuriParticle(dictionaryText))

console.log('careerReportContent tests OK')
