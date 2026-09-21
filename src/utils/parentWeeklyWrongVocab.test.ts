/**
 * 실행: npx tsx src/utils/parentWeeklyWrongVocab.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type {
  ClassTodayReportCommon,
  DailyTestRecord,
  StudentTextbookSlot,
} from '../types/records.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis.ts'
import { buildDailyTestWeeklyFlow } from './studentCare/dailyTestWeeklyFlow.ts'
import {
  buildParentWeeklyVocabClassContext,
  formatParentWeeklyVocabSuccessRate,
  listParentWeeklyWrongVocabWeeks,
  parentWeeklyVocabMemorizedWords,
  parentWeeklyVocabSuccessRate,
  pickDefaultParentWeeklyWrongVocabWeek,
  pickLatestParentWeeklyVocab,
  resolveParentWeeklyVocabBookName,
  summarizeParentWeeklyMathRecovery,
} from './parentWeeklyWrongVocab.ts'

function mathRecord(date: string, studentId = 's1'): DailyTestRecord {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    testName: '일일테스트',
    subject: '수학',
    score: 80,
    totalScore: 100,
    percentage: 80,
    incorrectCount: 2,
    memo: '',
    sessionResults: [],
    learningDiagnosis: EMPTY_DAILY_LEARNING_DIAGNOSIS,
    createdAt: '',
    updatedAt: '',
  }
}

const lastWeek = mathRecord('2026-09-16')
assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [lastWeek],
    today: '2026-09-21',
  }),
  '2026-09-14',
)

assert.deepEqual(
  listParentWeeklyWrongVocabWeeks({
    studentId: 's1',
    dailyTests: [lastWeek],
    weeklySummaries: [],
    today: '2026-09-21',
  }),
  ['2026-09-21', '2026-09-14'],
)

assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [],
    today: '2026-09-21',
  }),
  '2026-09-21',
)

assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [mathRecord('2026-09-20')],
    today: '2026-09-21',
  }),
  '2026-09-21',
)

assert.equal(
  pickDefaultParentWeeklyWrongVocabWeek({
    studentId: 's1',
    dailyTests: [{ ...lastWeek, studentId: 'other' }],
    today: '2026-09-21',
  }),
  '2026-09-21',
)

const page = readFileSync('src/pages/parent/ParentStudentWeeklyWrongVocabPage.tsx', 'utf8')
assert.match(page, /pickDefaultParentWeeklyWrongVocabWeek/)
assert.match(page, /weekTouched/)
assert.match(page, /ParentWeeklyWrongVocabReport/)
assert.match(page, /이번 주 수학 오답 회수와 영어 누적 단어 학습을 확인합니다/)
assert.doesNotMatch(page, /setWeekStart\(weeks\[0\]\)/)
assert.doesNotMatch(page, /DailyTestWeeklyFlowCard/)
assert.doesNotMatch(page, /일일테스트 주간 흐름/)

const report = readFileSync('src/components/parent/ParentWeeklyWrongVocabReport.tsx', 'utf8')
assert.match(report, /buildDailyTestWeeklyFlow/)
assert.match(report, /summarizeParentWeeklyMathRecovery/)
assert.match(report, /수학 오답 추적/)
assert.match(report, /오답 원인/)
assert.match(report, /영어 단어 누적/)
assert.match(report, /이번 주 수학 일일테스트 기록이 없습니다/)
assert.match(report, /이번 주 영어 누적 단어 TEST 기록이 없습니다/)
assert.doesNotMatch(report, /DAILY TEST/)
assert.doesNotMatch(report, /FlowChart/)
assert.doesNotMatch(report, /일일테스트 주간 흐름/)

assert.deepEqual(
  summarizeParentWeeklyMathRecovery([
    {
      discoveredWrong: 3,
      recoveredWrong: 3,
      unrecoveredWrong: 0,
      retakeQuestionCount: 5,
      recoveryRate: 100,
    },
    {
      discoveredWrong: 1,
      recoveredWrong: 0,
      unrecoveredWrong: 1,
      retakeQuestionCount: 0,
      recoveryRate: 0,
    },
  ]),
  {
    discoveredWrong: 4,
    recoveredWrong: 3,
    unrecoveredWrong: 1,
    retakeQuestionCount: 5,
    recoveryRate: 75,
  },
)
assert.equal(summarizeParentWeeklyMathRecovery([]), null)
assert.equal(
  pickLatestParentWeeklyVocab([
    { date: '2026-09-07', totalWords: 200, wrongWords: 2, label: 'a' },
    { date: '2026-09-09', totalWords: 300, wrongWords: 6, label: 'b' },
  ])?.totalWords,
  300,
)

assert.match(report, /단어장명/)
assert.match(report, /총 누적 단어/)
assert.match(report, /최종 암기 단어/)
assert.match(report, /총 암기 성공률/)
assert.match(report, /resolveParentWeeklyVocabBookName/)
assert.match(report, /PARENT_FIELD_EMPTY/)
assert.doesNotMatch(report, /틀린 단어/)
assert.doesNotMatch(report, /맞힌 단어/)
assert.doesNotMatch(report, /label="누적 단어"/)
assert.doesNotMatch(report, /record\.testName/)
assert.doesNotMatch(report, /vocabWeeklyDeduction/)
assert.match(page, /studentTextbookSlots/)
assert.match(page, /classTodayReportCommon/)

function cumulativeEnglish(
  date: string,
  totalWords: number,
  wrongWords: number,
): DailyTestRecord {
  return {
    id: `en-${date}`,
    studentId: 's1',
    date,
    testName: '9월 21일 일일테스트',
    subject: '영어',
    score: 0,
    totalScore: 100,
    percentage: 0,
    incorrectCount: 0,
    memo: '',
    sessionResults: [],
    learningDiagnosis: {
      ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
      englishVocabTestFormat: 'cumulative',
      englishVocabTotalWords: totalWords,
      englishVocabWrongWords: wrongWords,
    },
    createdAt: '',
    updatedAt: '',
  }
}

function textbookSlot(name: string): StudentTextbookSlot {
  return {
    id: `slot-${name || 'empty'}`,
    studentId: 's1',
    subject: '영어',
    slotNumber: 3,
    textbookName: name,
    createdAt: '',
    updatedAt: '',
  }
}

function classCommon(reportDate: string, textbookName: string): ClassTodayReportCommon {
  return {
    id: `common-${reportDate}`,
    grade: '고1',
    className: '고1-영어A',
    reportDate,
    subject: '영어',
    slotNumber: 3,
    textbookName,
    currentProgress: '',
    currentPage: 0,
    totalPage: 0,
    previousAssignment: '',
    todayAssignment: '',
    createdAt: '',
    updatedAt: '',
  }
}

// CASE 1: 마지막 TEST 300/30 → 암기 270, 성공률 90%
const case1Memorized = parentWeeklyVocabMemorizedWords(300, 30)
const case1Rate = parentWeeklyVocabSuccessRate(300, case1Memorized)
assert.equal(case1Memorized, 270)
assert.equal(case1Rate, 90)
assert.equal(formatParentWeeklyVocabSuccessRate(case1Rate), '90%')

// CASE 2: 주 2회 200/20 → 300/30. 카드는 마지막 TEST만. 합산/평균 금지.
const twoTests = buildDailyTestWeeklyFlow({
  studentId: 's1',
  weekStart: '2026-09-07',
  dailyTests: [cumulativeEnglish('2026-09-08', 200, 20), cumulativeEnglish('2026-09-11', 300, 30)],
})
const latestTwo = pickLatestParentWeeklyVocab(twoTests.weekCumulativeResults)
assert.equal(twoTests.weekCumulativeResults.length, 2)
assert.equal(latestTwo?.date, '2026-09-11')
assert.equal(latestTwo?.totalWords, 300)
assert.equal(latestTwo?.wrongWords, 30)
assert.equal(parentWeeklyVocabMemorizedWords(latestTwo!.totalWords, latestTwo!.wrongWords), 270)
assert.equal(
  formatParentWeeklyVocabSuccessRate(
    parentWeeklyVocabSuccessRate(
      latestTwo!.totalWords,
      parentWeeklyVocabMemorizedWords(latestTwo!.totalWords, latestTwo!.wrongWords),
    ),
  ),
  '90%',
)
assert.notEqual(latestTwo!.totalWords, 200 + 300)
assert.notEqual(latestTwo!.wrongWords, (20 + 30) / 2)

const classContext = buildParentWeeklyVocabClassContext({
  grade: '고1',
  className: '고1-영어A',
  commonRecords: [
    classCommon('2026-09-08', '화요일 단어장'),
    classCommon('2026-09-11', '목요일 단어장'),
  ],
  classSlots: [textbookSlot('현재 슬롯 단어장')],
})

// CASE 3: 마지막 TEST 날짜의 영어 슬롯3 단어장
assert.equal(
  resolveParentWeeklyVocabBookName({
    studentId: 's1',
    date: '2026-09-11',
    studentTextbookSlots: [textbookSlot('현재 슬롯 단어장')],
    classContext,
  }),
  '목요일 단어장',
)
assert.notEqual(
  resolveParentWeeklyVocabBookName({
    studentId: 's1',
    date: '2026-09-11',
    studentTextbookSlots: [textbookSlot('현재 슬롯 단어장')],
    classContext,
  }),
  '9월 21일 일일테스트',
)

// CASE 4: 해당 날짜 스냅샷 없음 → Parent Today Report 이월 후 슬롯 fallback
assert.equal(
  resolveParentWeeklyVocabBookName({
    studentId: 's1',
    date: '2026-09-11',
    studentTextbookSlots: [textbookSlot('현재 슬롯 단어장')],
    classContext: buildParentWeeklyVocabClassContext({
      grade: '고1',
      className: '고1-영어A',
      commonRecords: [classCommon('2026-09-08', '이월 단어장')],
      classSlots: [textbookSlot('현재 슬롯 단어장')],
    }),
  }),
  '이월 단어장',
)
assert.equal(
  resolveParentWeeklyVocabBookName({
    studentId: 's1',
    date: '2026-09-11',
    studentTextbookSlots: [textbookSlot('현재 슬롯 단어장')],
  }),
  '현재 슬롯 단어장',
)

// CASE 5: 단어장명 없음 → 임의 값 생성하지 않음
assert.equal(
  resolveParentWeeklyVocabBookName({
    studentId: 's1',
    date: '2026-09-11',
    studentTextbookSlots: [textbookSlot('')],
    classContext: buildParentWeeklyVocabClassContext({
      grade: '고1',
      className: '고1-영어A',
      commonRecords: [classCommon('2026-09-11', '')],
      classSlots: [textbookSlot('')],
    }),
  }),
  '',
)

// CASE 6: 해당 주 cumulative TEST 없음
const emptyWeek = buildDailyTestWeeklyFlow({
  studentId: 's1',
  weekStart: '2026-09-21',
  dailyTests: [cumulativeEnglish('2026-09-11', 300, 30), mathRecord('2026-09-16')],
})
assert.equal(pickLatestParentWeeklyVocab(emptyWeek.weekCumulativeResults), null)

// CASE 7: 0 / 비정상 → NaN/Infinity 없음
assert.equal(parentWeeklyVocabSuccessRate(0, 0), null)
assert.equal(formatParentWeeklyVocabSuccessRate(parentWeeklyVocabSuccessRate(0, 0)), '해당 없음')
assert.equal(parentWeeklyVocabSuccessRate(Number.NaN, 10), null)
assert.equal(parentWeeklyVocabMemorizedWords(10, 40), 0)
assert.equal(formatParentWeeklyVocabSuccessRate(Number.POSITIVE_INFINITY), '해당 없음')
assert.equal(formatParentWeeklyVocabSuccessRate(Number.NaN), '해당 없음')

const summary = readFileSync('src/pages/parent/ParentStudentWeeklySummaryPage.tsx', 'utf8')
assert.doesNotMatch(summary, /pickDefaultParentWeeklyWrongVocabWeek/)
assert.doesNotMatch(summary, /ParentWeeklyWrongVocabReport/)
assert.match(summary, /DailyTestWeeklyFlowCard/)

console.log('parentWeeklyWrongVocab OK')
