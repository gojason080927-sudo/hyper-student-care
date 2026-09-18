/**
 * 실행: node --experimental-strip-types src/utils/studentCare/studentCare.test.ts
 */
import assert from 'node:assert/strict'
import type {
  AttendanceRecord,
  DailyTestRecord,
  HomeworkTextbookEntry,
  StudentDailyCareRecord,
} from '../../types/records.ts'
import { weeklyGradeFromScore } from './constants.ts'
import {
  computeLearningRisk,
  computePriorDayLearningEvaluation,
  priorDayLearningGradeFromScore,
} from './risk.ts'
import {
  attendanceIndex,
  attitudeLessonIndex,
  homeworkDayIndex,
  materialPrepIndex,
  weeklyTestIndex,
} from './scoring.ts'
import { getLastWeeklySummaryCutoff, getMondayOfWeek } from './week.ts'
import { buildWeeklyLearningSummary } from './weeklySummary.ts'
import { hasUnreadWeeklySummary, weeklyAreaFactLines } from './weeklySummaryDisplay.ts'

function attendance(
  date: string,
  status: AttendanceRecord['status'],
  excuseKind: AttendanceRecord['excuseKind'] = null,
): AttendanceRecord {
  return {
    id: `a-${date}`,
    studentId: 'stu-1',
    date,
    status,
    reason: '',
    memo: '',
    excuseKind,
    createdAt: '',
    updatedAt: '',
  }
}

function care(
  date: string,
  patch: Partial<StudentDailyCareRecord> = {},
): StudentDailyCareRecord {
  return {
    id: `c-${date}`,
    studentId: 'stu-1',
    date,
    materialPrep: null,
    attitudeIssues: [],
    attitudeNote: '',
    createdAt: '',
    updatedAt: '',
    ...patch,
  }
}

function homework(
  date: string,
  status: HomeworkTextbookEntry['status'],
): HomeworkTextbookEntry {
  return {
    id: `h-${date}`,
    studentId: 'stu-1',
    date,
    subject: '수학',
    slotNumber: 1,
    previousAssignment: 'p',
    todayAssignment: 't',
    status,
    createdAt: '',
    updatedAt: '',
  }
}

function testRecord(date: string, score: number): DailyTestRecord {
  return {
    id: `t-${date}-${score}`,
    studentId: 'stu-1',
    date,
    testName: '일일',
    subject: '수학',
    score,
    totalScore: 100,
    percentage: score,
    incorrectCount: 0,
    memo: '',
    sessionResults: [
      { session: 1, status: score >= 85 ? '합격' : '불합격', score, totalScore: 100, incorrectCount: 0 },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    learningDiagnosis: {
      wrongAnswerItems: [],
      questionTotal: 0,
      conceptLackCount: 0,
      calculationErrorCount: 0,
      applicationLackCount: 0,
      comprehensionLackCount: 0,
      teacherFeedback: '',
      fridayRetestTotal: null,
      fridayRetestWrong: null,
      englishVocabResult: null,
      englishGrammarWrongCount: null,
      englishReadingWrongCount: null,
      englishListeningScore: null,
      englishListeningResult: null,
    },
    createdAt: '',
    updatedAt: '',
  }
}

assert.equal(attendanceIndex(attendance('2026-09-07', '출석')), 100)
assert.equal(attendanceIndex(attendance('2026-09-07', '지각', '인정')), 100)
assert.equal(attendanceIndex(attendance('2026-09-07', '결석', '인정')), 100)
assert.equal(attendanceIndex(attendance('2026-09-07', '지각', '무단')), 70)
assert.equal(attendanceIndex(attendance('2026-09-07', '결석', '무단')), 0)
assert.equal(attendanceIndex(attendance('2026-09-07', '지각')), 100)
assert.equal(attendanceIndex(attendance('2026-09-07', '결석')), 100)
assert.equal(materialPrepIndex('지참'), 100)
assert.equal(materialPrepIndex('부분 지참'), 50)
assert.equal(materialPrepIndex(null), null)
assert.equal(homeworkDayIndex(['완료']), 100)
assert.equal(homeworkDayIndex(['부분 완료']), 50)
assert.equal(homeworkDayIndex(['미완료']), 0)
assert.equal(homeworkDayIndex(['']), null)
assert.equal(attitudeLessonIndex([]), 100)
assert.equal(attitudeLessonIndex(['졸음']), 80)
assert.equal(attitudeLessonIndex(['졸음', '잡담']), 60)
assert.equal(attitudeLessonIndex(['졸음', '잡담', '수업방해']), 60)

const testIndex = weeklyTestIndex([92, 86, 78])
assert.ok(testIndex != null)
assert.equal(Math.round(testIndex * 100) / 100, 79.73)
assert.equal(weeklyGradeFromScore(90), '우수')
assert.equal(weeklyGradeFromScore(80), '양호')
assert.equal(weeklyGradeFromScore(79.9), '보통')
assert.equal(weeklyGradeFromScore(69.9), '미흡')

assert.equal(getMondayOfWeek('2026-09-12'), '2026-09-07')
assert.equal(getMondayOfWeek('2026-09-07'), '2026-09-07')

const cutoff = getLastWeeklySummaryCutoff(new Date('2026-09-12T08:00:00+09:00'))
assert.equal(cutoff.weekStart, '2026-09-07')
assert.equal(cutoff.saturdayDate, '2026-09-12')
assert.equal(cutoff.periodEnd, '2026-09-11')

const beforeCutoff = getLastWeeklySummaryCutoff(new Date('2026-09-12T07:59:00+09:00'))
assert.equal(beforeCutoff.weekStart, '2026-08-31')

const summary = buildWeeklyLearningSummary({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  asOfIso: '2026-09-12T08:00:00.000+09:00',
  asOfDate: '2026-09-12',
  attendance: [
    attendance('2026-09-07', '출석'),
    attendance('2026-09-09', '출석'),
    attendance('2026-09-11', '지각', '무단'),
  ],
  homework: [],
  homeworkTextbookEntries: [
    homework('2026-09-07', '완료'),
    homework('2026-09-09', '완료'),
    homework('2026-09-11', '부분 완료'),
  ],
  dailyTests: [
    testRecord('2026-09-07', 92),
    testRecord('2026-09-09', 86),
    testRecord('2026-09-11', 78),
  ],
  dailyCare: [
    care('2026-09-07', { materialPrep: '지참' }),
    care('2026-09-09', { materialPrep: '지참', attitudeIssues: ['졸음'], attitudeNote: '전날 수면 부족' }),
    care('2026-09-11', { materialPrep: '부분 지참' }),
  ],
})

assert.equal(summary.scores.attendance.score, 18)
assert.equal(summary.scores.attendance.facts.presentCount, 2)
assert.equal(summary.scores.attendance.facts.unexcusedLateCount, 1)
assert.equal(summary.scores.material.facts.broughtCount, 2)
assert.equal(summary.scores.material.facts.partialCount, 1)
assert.equal(summary.scores.homework.facts.completeCount, 2)
assert.equal(summary.scores.homework.facts.partialCount, 1)
assert.equal(summary.scores.dailyTest.facts.passCount, 2)
assert.equal(summary.scores.dailyTest.facts.attemptCount, 3)
assert.ok(summary.scores.dailyTest.score != null)
assert.equal(Math.round((summary.scores.dailyTest.score ?? 0) * 100) / 100, 23.92)
assert.equal(summary.scores.attitude.facts.졸음, 1)
assert.ok((summary.scores.attitude.score ?? 0) >= 13.9 && (summary.scores.attitude.score ?? 0) <= 14.1)
assert.equal(summary.periodStart, '2026-09-07')
assert.equal(summary.periodEnd, '2026-09-11')
assert.match(summary.teacherComment, /전날 수면 부족/)
assert.doesNotMatch(summary.checkText, /불성실|의지|집중력이 나쁨/)

const futureExcluded = buildWeeklyLearningSummary({
  studentId: 'stu-1',
  weekStart: '2026-09-07',
  asOfIso: '2026-09-12T08:00:00.000+09:00',
  asOfDate: '2026-09-12',
  attendance: [attendance('2026-09-07', '출석'), attendance('2026-09-14', '결석', '무단')],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  dailyCare: [],
})
assert.equal(futureExcluded.scores.attendance.facts.unexcusedAbsentCount, 0)
assert.equal(futureExcluded.scores.attendance.facts.presentCount, 1)

const legacyLate = computeLearningRisk({
  studentId: 'stu-1',
  attendance: [attendance('2026-09-07', '지각'), attendance('2026-09-09', '결석'), attendance('2026-09-11', '출석')],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  dailyCare: [],
})
assert.equal(legacyLate.level, '우수')
assert.equal(legacyLate.unexcusedAbsent, false)

const unexcusedAbsentRisk = computeLearningRisk({
  studentId: 'stu-1',
  attendance: [attendance('2026-09-07', '출석'), attendance('2026-09-09', '결석', '무단')],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  dailyCare: [],
})
assert.equal(unexcusedAbsentRisk.level, '위험')
assert.equal(unexcusedAbsentRisk.unexcusedAbsent, true)

const caution = computeLearningRisk({
  studentId: 'stu-1',
  attendance: [
    attendance('2026-09-07', '출석'),
    attendance('2026-09-09', '출석'),
    attendance('2026-09-11', '출석'),
  ],
  homework: [],
  homeworkTextbookEntries: [homework('2026-09-11', '부분 완료')],
  dailyTests: [testRecord('2026-09-09', 90)],
  dailyCare: [care('2026-09-07', { attitudeIssues: ['졸음'] })],
})
assert.equal(caution.level, '주의')
assert.ok(caution.score >= 1 && caution.score <= 3)

const recovered = computeLearningRisk({
  studentId: 'stu-1',
  attendance: [
    attendance('2026-09-01', '결석', '무단'),
    attendance('2026-09-07', '출석'),
    attendance('2026-09-09', '출석'),
    attendance('2026-09-11', '출석'),
  ],
  homework: [],
  homeworkTextbookEntries: [
    homework('2026-09-07', '완료'),
    homework('2026-09-09', '완료'),
    homework('2026-09-11', '완료'),
  ],
  dailyTests: [
    testRecord('2026-09-07', 90),
    testRecord('2026-09-09', 90),
    testRecord('2026-09-11', 90),
  ],
  dailyCare: [],
})
assert.equal(recovered.level, '우수')
assert.equal(recovered.unexcusedAbsent, false)

const danger = computeLearningRisk({
  studentId: 'stu-1',
  attendance: [attendance('2026-09-07', '지각', '무단')],
  homework: [],
  homeworkTextbookEntries: [homework('2026-09-07', '부분 완료')],
  dailyTests: [testRecord('2026-09-07', 68)],
  dailyCare: [care('2026-09-07', { materialPrep: '부분 지참', attitudeIssues: ['졸음', '잡담'] })],
})
assert.equal(danger.level, '위험')
assert.ok(danger.score >= 4)

assert.equal(priorDayLearningGradeFromScore(0, false), '우수')
assert.equal(priorDayLearningGradeFromScore(1, false), '양호')
assert.equal(priorDayLearningGradeFromScore(2, false), '주의')
assert.equal(priorDayLearningGradeFromScore(3, false), '주의')
assert.equal(priorDayLearningGradeFromScore(4, false), '위험')
assert.equal(priorDayLearningGradeFromScore(0, true), '위험')

const priorGood = computePriorDayLearningEvaluation(
  {
    studentId: 'stu-1',
    attendance: [attendance('2026-09-11', '출석')],
    homework: [],
    homeworkTextbookEntries: [homework('2026-09-11', '부분 완료')],
    dailyTests: [],
    dailyCare: [],
  },
  '2026-09-11',
)
assert.equal(priorGood.grade, '주의')
assert.equal(priorGood.score, 2)
assert.equal(priorGood.reportDate, '2026-09-11')

const priorFair = computePriorDayLearningEvaluation(
  {
    studentId: 'stu-1',
    attendance: [attendance('2026-09-11', '출석')],
    homework: [],
    homeworkTextbookEntries: [],
    dailyTests: [],
    dailyCare: [care('2026-09-11', { materialPrep: '부분 지참' })],
  },
  '2026-09-11',
)
assert.equal(priorFair.grade, '양호')
assert.equal(priorFair.score, 1)

const priorAbsent = computePriorDayLearningEvaluation(
  {
    studentId: 'stu-1',
    attendance: [attendance('2026-09-11', '결석', '무단')],
    homework: [],
    homeworkTextbookEntries: [],
    dailyTests: [],
    dailyCare: [],
  },
  '2026-09-11',
)
assert.equal(priorAbsent.grade, '위험')
assert.equal(priorAbsent.unexcusedAbsent, true)

const threeLessonCaution = computeLearningRisk({
  studentId: 'stu-1',
  attendance: [attendance('2026-09-11', '출석')],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  dailyCare: [care('2026-09-11', { materialPrep: '부분 지참' })],
})
assert.equal(threeLessonCaution.level, '주의')
assert.equal(threeLessonCaution.score, 1)

assert.deepEqual(
  weeklyAreaFactLines('attendance', {
    score: 18,
    max: 20,
    index: 90,
    grade: '우수',
    facts: { presentCount: 3, unexcusedLateCount: 0, unexcusedAbsentCount: 0 },
  }),
  ['출석 3회', '무단지각 0', '무단결석 0'],
)
assert.deepEqual(
  weeklyAreaFactLines('attitude', {
    score: 15,
    max: 15,
    index: 100,
    grade: '우수',
    facts: { issueCount: 0 },
  }),
  ['문제기록 없음'],
)
assert.equal(
  hasUnreadWeeklySummary(
    [
      {
        id: 'sum-1',
        studentId: 'stu-1',
        weekStart: '2026-09-07',
        periodStart: '2026-09-07',
        periodEnd: '2026-09-11',
        asOf: '',
        totalScore: 90,
        grade: '우수',
        scores: {
          attendance: { score: 20, max: 20, index: 100, grade: '우수', facts: {} },
          material: { score: 10, max: 10, index: 100, grade: '우수', facts: {} },
          homework: { score: 25, max: 25, index: 100, grade: '우수', facts: {} },
          dailyTest: { score: 30, max: 30, index: 100, grade: '우수', facts: {} },
          attitude: { score: 15, max: 15, index: 100, grade: '우수', facts: {} },
        },
        goodText: '',
        checkText: '',
        teacherComment: '',
        createdAt: '2026-09-12T00:00:00.000Z',
        updatedAt: '2026-09-12T00:00:00.000Z',
      },
    ],
    'stu-1',
    null,
  ),
  true,
)
assert.equal(
  hasUnreadWeeklySummary(
    [
      {
        id: 'sum-1',
        studentId: 'stu-1',
        weekStart: '2026-09-07',
        periodStart: '2026-09-07',
        periodEnd: '2026-09-11',
        asOf: '',
        totalScore: 90,
        grade: '우수',
        scores: {
          attendance: { score: 20, max: 20, index: 100, grade: '우수', facts: {} },
          material: { score: 10, max: 10, index: 100, grade: '우수', facts: {} },
          homework: { score: 25, max: 25, index: 100, grade: '우수', facts: {} },
          dailyTest: { score: 30, max: 30, index: 100, grade: '우수', facts: {} },
          attitude: { score: 15, max: 15, index: 100, grade: '우수', facts: {} },
        },
        goodText: '',
        checkText: '',
        teacherComment: '',
        createdAt: '2026-09-12T00:00:00.000Z',
        updatedAt: '2026-09-12T00:00:00.000Z',
      },
    ],
    'stu-1',
    { lastReadAt: '2026-09-12T01:00:00.000Z', lastReadSummaryId: 'sum-1' },
  ),
  false,
)

console.log('studentCare scoring OK')
