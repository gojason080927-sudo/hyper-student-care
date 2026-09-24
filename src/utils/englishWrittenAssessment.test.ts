/**
 * 실행: npx tsx src/utils/englishWrittenAssessment.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS, normalizeDailyLearningDiagnosis } from './learningDiagnosis.ts'
import {
  blendEnglishWeeklyIndex,
  compositionScore,
  englishWrittenScoresForWeek,
  grammarWrittenScore,
} from './englishWrittenAssessment.ts'
import { englishVocabWeeklyDeduction } from './englishVocabTest.ts'
import { buildWeeklyLearningSummary } from './studentCare/weeklySummary.ts'
import type { DailyTestRecord } from '../types/records.ts'
import { dailyTestDayScore } from './studentCare/scoring.ts'

assert.equal(grammarWrittenScore('합격'), 100)
assert.equal(grammarWrittenScore('부분 합격'), 85)
assert.equal(grammarWrittenScore('불합격'), 70)
assert.equal(compositionScore('A'), 100)
assert.equal(compositionScore('B'), 85)
assert.equal(compositionScore('C'), 70)

assert.equal(blendEnglishWeeklyIndex(90, [], []), 90)
assert.equal(blendEnglishWeeklyIndex(90, [85], []), (90 * 0.8 + 85 * 0.1) / 0.9)
assert.equal(blendEnglishWeeklyIndex(90, [], [85]), (90 * 0.8 + 85 * 0.1) / 0.9)
assert.equal(
  blendEnglishWeeklyIndex(90, [85], [85]),
  90 * 0.8 + 85 * 0.1 + 85 * 0.1,
)
assert.equal(blendEnglishWeeklyIndex(100, [70], [70]), 100 * 0.8 + 70 * 0.2)
assert.equal(blendEnglishWeeklyIndex(null, [], []), null)
assert.equal(blendEnglishWeeklyIndex(null, [100], []), 100)

const restored = normalizeDailyLearningDiagnosis({
  englishGrammarWrittenResult: '부분 합격',
  englishCompositionGrade: 'B',
})
assert.equal(restored.englishGrammarWrittenResult, '부분 합격')
assert.equal(restored.englishCompositionGrade, 'B')
assert.equal(normalizeDailyLearningDiagnosis({}).englishGrammarWrittenResult, null)
assert.equal(normalizeDailyLearningDiagnosis({ englishCompositionGrade: 'D' }).englishCompositionGrade, null)
assert.equal(EMPTY_DAILY_LEARNING_DIAGNOSIS.englishGrammarWrittenResult, null)

function englishRecord(
  date: string,
  percentage: number,
  grammar: '합격' | '부분 합격' | '불합격' | null,
  composition: 'A' | 'B' | 'C' | null,
  wrongWords: number | null = null,
): DailyTestRecord {
  return {
    id: `t-${date}-${grammar ?? 'x'}-${composition ?? 'x'}`,
    studentId: 'stu-1',
    date,
    testName: '영어',
    subject: '영어',
    score: percentage,
    totalScore: 100,
    percentage,
    incorrectCount: 0,
    memo: '',
    sessionResults: [
      { session: 1, status: percentage >= 85 ? '합격' : '불합격', score: percentage, totalScore: 100 },
    ],
    learningDiagnosis: {
      ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
      englishGrammarWrittenResult: grammar,
      englishCompositionGrade: composition,
      englishVocabWrongWords: wrongWords,
      englishVocabTotalWords: wrongWords == null ? null : 300,
      englishVocabTestFormat: wrongWords == null ? null : 'cumulative',
    },
    createdAt: date,
    updatedAt: date,
  }
}

function week(dailyTests: DailyTestRecord[]) {
  return buildWeeklyLearningSummary({
    studentId: 'stu-1',
    weekStart: '2026-09-07',
    asOfIso: '2026-09-12T08:00:00.000+09:00',
    asOfDate: '2026-09-12',
    attendance: [
      {
        id: 'a',
        studentId: 'stu-1',
        date: '2026-09-07',
        status: '출석',
        reason: '',
        memo: '',
        excuseKind: null,
        createdAt: '',
        updatedAt: '',
      },
    ],
    homework: [],
    homeworkTextbookEntries: [],
    dailyTests,
    dailyCare: [],
  })
}

const plain = week([englishRecord('2026-09-07', 90, null, null)])
const grammarOnly = week([englishRecord('2026-09-07', 90, '부분 합격', null)])
const writingOnly = week([englishRecord('2026-09-07', 90, null, 'B')])
const both = week([englishRecord('2026-09-07', 90, '부분 합격', 'B')])
assert.equal(
  grammarOnly.scores.dailyTest.index,
  Math.round((blendEnglishWeeklyIndex(plain.scores.dailyTest.index, [85], []) ?? 0) * 100) / 100,
)
assert.ok(grammarOnly.scores.dailyTest.index! < plain.scores.dailyTest.index!)
assert.equal(writingOnly.scores.dailyTest.index, grammarOnly.scores.dailyTest.index)
assert.equal(
  both.scores.dailyTest.index,
  Math.round((blendEnglishWeeklyIndex(plain.scores.dailyTest.index, [85], [85]) ?? 0) * 100) / 100,
)

const vocab = englishRecord('2026-09-07', 0, null, null, 12)
vocab.sessionResults = []
vocab.percentage = 0
vocab.score = 0
const withVocab = week([englishRecord('2026-09-07', 90, '합격', 'A'), vocab])
assert.equal(englishVocabWeeklyDeduction(12), 2)
assert.equal(withVocab.scores.dailyTest.facts.vocabWeeklyDeduction, 2)
assert.equal(dailyTestDayScore([vocab]), null)
assert.doesNotMatch(
  readFileSync('src/utils/studentCare/risk.ts', 'utf8'),
  /englishGrammarWrittenResult|englishCompositionGrade|blendEnglishWeeklyIndex/,
)

const math = englishRecord('2026-09-07', 80, '불합격', 'C')
math.subject = '수학'
const mathIgnored = week([math])
const mathPlain = week([{ ...math, learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS } }])
assert.equal(mathIgnored.scores.dailyTest.index, mathPlain.scores.dailyTest.index)
assert.deepEqual(englishWrittenScoresForWeek([math]), { grammar: [], composition: [] })

console.log('englishWrittenAssessment.test.ts ok')
