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
import { buildDailyTestWeeklyFlow } from './studentCare/dailyTestWeeklyFlow.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis.ts'
import { applyFixedWrongFormatToDiagnosis, mathWrongTrackingStatus } from './mathDailyTest.ts'
import { applyHighRecoveryToDiagnosis } from './mathHighRecovery.ts'
import {
  buildParentWeeklyVocabClassContext,
  formatParentMathWrongTrackingStatus,
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
assert.match(page, /이번 주 수학 오답 추적과 영어 누적 단어 학습을 확인합니다/)
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
assert.match(report, /추적 상태/)
assert.match(report, /formatParentMathWrongTrackingStatus/)
assert.match(report, /보강·시험 대비에서 다시 점검합니다/)
assert.match(report, /recovery\.discoveredWrong\}문제/)
assert.match(report, /text-xl font-bold tabular-nums leading-none/)
assert.match(report, /break-words text-base font-bold leading-snug/)
assert.doesNotMatch(report, /text-2xl font-bold tabular-nums/)
assert.doesNotMatch(report, /회수 완료/)
assert.doesNotMatch(report, /회수율/)
assert.doesNotMatch(report, /formatRate/)
assert.doesNotMatch(report, /recovery\.recoveryRate/)
assert.doesNotMatch(report, /recovery\.recoveredWrong/)
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
      trackingStatus: 'COMPLETE',
    },
    {
      discoveredWrong: 1,
      recoveredWrong: 0,
      unrecoveredWrong: 1,
      retakeQuestionCount: 0,
      recoveryRate: 0,
      trackingStatus: 'IN_PROGRESS',
    },
  ]),
  {
    discoveredWrong: 4,
    recoveredWrong: 3,
    unrecoveredWrong: 1,
    retakeQuestionCount: 5,
    recoveryRate: 75,
    trackingStatus: 'IN_PROGRESS',
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

function session(
  number: 1 | 2 | 3 | 4,
  status: '합격' | '불합격' | '미응시',
  score?: number,
  incorrectCount?: number,
) {
  return {
    session: number,
    status,
    ...(score == null ? {} : { score, totalScore: 100 }),
    ...(incorrectCount == null ? {} : { incorrectCount }),
  }
}

function middleMath(
  date: string,
  sessions: DailyTestRecord['sessionResults'],
): DailyTestRecord {
  return {
    ...mathRecord(date),
    learningDiagnosis: applyFixedWrongFormatToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS),
    sessionResults: sessions,
  }
}

function highMath(
  date: string,
  parsed: Parameters<typeof applyHighRecoveryToDiagnosis>[1],
): DailyTestRecord {
  return {
    ...mathRecord(date),
    learningDiagnosis: applyHighRecoveryToDiagnosis(EMPTY_DAILY_LEARNING_DIAGNOSIS, parsed),
    sessionResults: [session(1, '미응시'), session(2, '미응시'), session(3, '미응시'), session(4, '미응시')],
  }
}

function weekFacts(records: DailyTestRecord[], weekStart = '2026-09-07') {
  const model = buildDailyTestWeeklyFlow({
    studentId: 's1',
    weekStart,
    dailyTests: records,
  })
  return {
    model,
    recovery: summarizeParentWeeklyMathRecovery(model.weekRecoveryResults.map((item) => item.facts)),
  }
}

assert.equal(formatParentMathWrongTrackingStatus('COMPLETE'), '1차 오답 추적 완료')
assert.equal(formatParentMathWrongTrackingStatus('IN_PROGRESS'), '오답 추적 진행 중')

// CASE 1: 최초 오답 있음 + 추적 종료
const case1Record = middleMath('2026-09-07', [
  session(1, '불합격', 70, 3),
  session(2, '합격', 80, 1),
  session(3, '미응시'),
  session(4, '미응시'),
])
const case1 = weekFacts([case1Record])
assert.equal(case1.model.hasMathWeekRecords, true)
assert.equal(mathWrongTrackingStatus(case1Record), 'COMPLETE')
assert.equal(case1.recovery?.discoveredWrong, 3)
assert.equal(case1.recovery?.retakeQuestionCount, 5)
assert.equal(case1.recovery?.trackingStatus, 'COMPLETE')

// CASE 2: 최초 오답 있음 + 다음 추적 차시 필요
const case2Open = middleMath('2026-09-07', [
  session(1, '불합격', 70, 3),
  session(2, '미응시'),
  session(3, '미응시'),
  session(4, '미응시'),
])
const case2 = weekFacts([case2Open])
assert.equal(mathWrongTrackingStatus(case2Open), 'IN_PROGRESS')
assert.equal(case2.recovery?.trackingStatus, 'IN_PROGRESS')
assert.equal(case2.recovery?.discoveredWrong, 3)
assert.equal(case2.recovery?.retakeQuestionCount, 0)

// CASE 3: 한 주에 일부 완료 + 일부 진행 중
const case3 = weekFacts([
  middleMath('2026-09-07', [
    session(1, '불합격', 70, 3),
    session(2, '합격', 80, 1),
    session(3, '미응시'),
    session(4, '미응시'),
  ]),
  middleMath('2026-09-09', [
    session(1, '불합격', 70, 3),
    session(2, '미응시'),
    session(3, '미응시'),
    session(4, '미응시'),
  ]),
])
assert.equal(case3.recovery?.trackingStatus, 'IN_PROGRESS')
assert.equal(case3.recovery?.discoveredWrong, 6)
assert.equal(case3.recovery?.retakeQuestionCount, 5)

// CASE 4: 한 주의 모든 추적 대상 기록 완료
const case4 = weekFacts([
  middleMath('2026-09-07', [
    session(1, '불합격', 70, 3),
    session(2, '합격', 80, 1),
    session(3, '미응시'),
    session(4, '미응시'),
  ]),
  middleMath('2026-09-11', [
    session(1, '합격', 90, 1),
    session(2, '미응시'),
    session(3, '미응시'),
    session(4, '미응시'),
  ]),
])
assert.equal(case4.recovery?.trackingStatus, 'COMPLETE')
assert.equal(case4.recovery?.discoveredWrong, 4)

// CASE 5: 최초 오답 0 → 데이터 없음으로 오판하지 않음
const case5Zero = middleMath('2026-09-07', [
  session(1, '합격', 100, 0),
  session(2, '미응시'),
  session(3, '미응시'),
  session(4, '미응시'),
])
const case5 = weekFacts([case5Zero])
assert.equal(case5.model.hasMathWeekRecords, true)
assert.notEqual(case5.recovery, null)
assert.equal(case5.recovery?.discoveredWrong, 0)
assert.equal(case5.recovery?.retakeQuestionCount, 0)
assert.equal(case5.recovery?.recoveryRate, null)
assert.equal(case5.recovery?.trackingStatus, 'COMPLETE')

// CASE 6: high-recovery-v1 정상 종료
const case6Record = highMath('2026-09-07', {
  firstWrong: 4,
  endSession: 2,
  session3Questions: null,
  session4Questions: null,
})
const case6 = weekFacts([case6Record])
assert.equal(mathWrongTrackingStatus(case6Record), 'COMPLETE')
assert.equal(case6.recovery?.trackingStatus, 'COMPLETE')
assert.equal(case6.recovery?.discoveredWrong, 4)
assert.equal(case6.recovery?.retakeQuestionCount, 4)

// CASE 7: 고등부 완료를 증명하지 못하면 완료 처리하지 않음
const case7Record: DailyTestRecord = {
  ...mathRecord('2026-09-07'),
  learningDiagnosis: {
    ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
    mathDailyTestFormat: 'high-recovery-v1',
    mathHighFirstWrongCount: 4,
    mathHighEndSession: 1,
    mathHighSession3Questions: null,
    mathHighSession4Questions: null,
  },
}
const case7 = weekFacts([case7Record])
assert.equal(mathWrongTrackingStatus(case7Record), 'IN_PROGRESS')
assert.equal(case7.recovery?.trackingStatus, 'IN_PROGRESS')

// CASE 11: NO DATA vs 0문제
const noMath = weekFacts([cumulativeEnglish('2026-09-07', 300, 30)])
assert.equal(noMath.model.hasMathWeekRecords, false)
assert.equal(noMath.recovery, null)
assert.notEqual(case5.model.hasMathWeekRecords, noMath.model.hasMathWeekRecords)

console.log('parentWeeklyWrongVocab OK')
