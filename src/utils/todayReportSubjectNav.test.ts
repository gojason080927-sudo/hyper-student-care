/**
 * 실행: npx tsx src/utils/todayReportSubjectNav.test.ts
 */
import assert from 'node:assert/strict'
import type { ClassTodayReportCommon, HomeworkTextbookEntry } from '../types/records.ts'
import { findClassTodayReportCommon } from './classTodayReportCommon.ts'
import {
  findClassTodayReportCommonForProgressDisplay,
  findHomeworkTextbookEntryForDisplay,
} from './todayReportDisplayFallback.ts'
import {
  agreedScheduledSubject,
  collectSubjectReportRows,
  datesForSubject,
  latestSubjectReportDate,
  TODAY_REPORT_OPERATION_START,
  recordedSubjectsOnDate,
  isActualTodayClass,
  resolveAutoSubject,
  scheduledSubjectOnDate,
  viewSubjectForReport,
  seoulClassDay,
  subjectReportDatesOnOrBefore,
  visibleSubjectsForClass,
} from './todayReportSubjectNav.ts'

const THU = '2026-09-24'
const WED = '2026-09-23'
const TUE = '2026-09-22'
const MON = '2026-09-21'
const FRI = '2026-09-18'

assert.equal(seoulClassDay(THU), '목')
assert.equal(seoulClassDay(WED), '수')
assert.equal(seoulClassDay('2026-09-20'), null)

const mathOnly = [{ className: '고2 영수', subjects: ['수학'] }]
const englishOnly = [{ className: '고2 영수', subjects: ['영어'] }]
const both = [{ className: '고2 영수', subjects: ['영어·수학'] }]
assert.deepEqual(visibleSubjectsForClass('고2 영수', mathOnly), ['수학'])
assert.deepEqual(visibleSubjectsForClass('고2 영수', englishOnly), ['영어'])
assert.deepEqual(visibleSubjectsForClass('고2 영수', both), ['수학', '영어'])
assert.deepEqual(
  visibleSubjectsForClass('고2 영수', [...mathOnly, ...englishOnly]),
  ['수학', '영어'],
)

const mathDays = ['화', '목']
const englishDays = ['월', '수']
assert.equal(scheduledSubjectOnDate(THU, mathDays, englishDays), '수학')
assert.equal(scheduledSubjectOnDate(WED, mathDays, englishDays), '영어')
assert.equal(scheduledSubjectOnDate(FRI, mathDays, englishDays), null)
assert.equal(scheduledSubjectOnDate(THU, null, null), null)
assert.equal(scheduledSubjectOnDate(THU, undefined, undefined), null)
assert.equal(scheduledSubjectOnDate(THU, ['목'], ['목']), null)

assert.equal(
  resolveAutoSubject({
    visible: ['수학', '영어'],
    recorded: [],
    scheduled: '수학',
  }),
  '수학',
)
assert.equal(
  resolveAutoSubject({
    visible: ['수학', '영어'],
    recorded: [],
    scheduled: '영어',
  }),
  '영어',
)
assert.equal(
  resolveAutoSubject({
    visible: ['수학', '영어'],
    recorded: ['영어'],
    scheduled: '수학',
  }),
  '영어',
)
assert.equal(
  resolveAutoSubject({
    visible: ['수학', '영어'],
    recorded: [],
    scheduled: null,
  }),
  null,
)
assert.equal(
  resolveAutoSubject({
    visible: ['수학'],
    recorded: ['영어'],
    scheduled: null,
  }),
  null,
)
assert.equal(
  resolveAutoSubject({
    visible: ['수학', '영어'],
    recorded: ['수학', '영어'],
    scheduled: '수학',
  }),
  null,
)

const rows = [
  { date: THU, subject: '수학' },
  { date: WED, subject: '영어' },
  { date: TUE, subject: '수학' },
  { date: MON, subject: '수학' },
  { date: '2026-08-01', subject: '영어' },
]
assert.deepEqual(recordedSubjectsOnDate(rows, THU), ['수학'])
assert.deepEqual(datesForSubject(rows, '수학').sort(), [MON, TUE, THU])
assert.equal(latestSubjectReportDate(datesForSubject(rows, '영어'), THU, '2026-08-26'), WED)
assert.equal(latestSubjectReportDate(datesForSubject(rows, '영어'), THU, THU), null)
assert.deepEqual(subjectReportDatesOnOrBefore(datesForSubject(rows, '수학'), THU, '2026-08-26'), [
  THU,
  TUE,
  MON,
])
assert.deepEqual(subjectReportDatesOnOrBefore(['2026-08-01'], THU, '2026-08-26'), [])

assert.equal(
  agreedScheduledSubject(
    [
      { mathClassDays: mathDays, englishClassDays: englishDays },
      { mathClassDays: null, englishClassDays: null },
    ],
    THU,
  ),
  '수학',
)
assert.equal(
  agreedScheduledSubject(
    [
      { mathClassDays: mathDays, englishClassDays: englishDays },
      { mathClassDays: englishDays, englishClassDays: mathDays },
    ],
    THU,
  ),
  null,
)
assert.equal(
  agreedScheduledSubject([{ mathClassDays: null, englishClassDays: null }], THU),
  null,
)

const priorCommon: ClassTodayReportCommon = {
  id: 'c1',
  grade: '고2',
  className: '고2 영수',
  reportDate: WED,
  subject: '수학',
  slotNumber: 1,
  textbookName: '개념원리',
  currentProgress: '2단원',
  currentPage: 12,
  totalPage: 40,
  previousAssignment: '지난 과제',
  todayAssignment: '수요일 과제',
  createdAt: WED,
  updatedAt: WED,
}
assert.equal(
  findClassTodayReportCommon([priorCommon], '고2', '고2 영수', THU, '수학', 1),
  undefined,
)
const progress = findClassTodayReportCommonForProgressDisplay(
  [priorCommon],
  '고2',
  '고2 영수',
  THU,
  '수학',
  1,
)
assert.equal(progress.isFallback, true)
assert.equal(progress.record?.currentProgress, '2단원')
assert.equal(progress.record?.textbookName, '개념원리')

const priorHomework: HomeworkTextbookEntry = {
  id: 'h1',
  studentId: 's1',
  date: WED,
  subject: '수학',
  slotNumber: 1,
  previousAssignment: '이전',
  todayAssignment: '수요일 숙제',
  status: '완료',
  createdAt: WED,
  updatedAt: WED,
}
const homework = findHomeworkTextbookEntryForDisplay([priorHomework], 's1', THU, '수학', 1)
assert.equal(homework.isFallback, true)
assert.equal(homework.entry?.status, '완료')
const sameDateStatus = !homework.isFallback ? homework.entry?.status : ''
const sameDateAssignment = homework.isFallback ? '' : (homework.entry?.todayAssignment ?? '')
assert.equal(sameDateStatus, '')
assert.equal(sameDateAssignment, '')

assert.equal(TODAY_REPORT_OPERATION_START, '2026-09-07')

const ids = new Set(['s1'])
const collected = collectSubjectReportRows({
  studentIds: ids,
  grade: '고2',
  className: '고2 영수',
  dailyTests: [
    { studentId: 's1', date: '2026-09-06', subject: '수학' },
    { studentId: 's1', date: '2026-09-07', subject: '수학' },
    { studentId: 's1', date: '2026-09-19', subject: '수학' },
  ],
  homeworkTextbookEntries: [
    { studentId: 's1', date: '2026-09-09', subject: '영어', status: '완료', todayAssignment: '', previousAssignment: '' },
    { studentId: 's1', date: '2026-09-11', subject: '수학', status: '', todayAssignment: '', previousAssignment: '' },
  ],
  progressRecords: [
    { studentId: 's1', lastStudyDate: '2026-08-20', subject: '수학', currentProgress: '예전 진도', currentPage: 3, totalPage: 10 },
    { studentId: 's1', lastStudyDate: '2026-09-14', subject: '수학', currentProgress: '', currentPage: 0, totalPage: 0 },
    { studentId: 's1', lastStudyDate: '2026-09-16', subject: '영어', currentProgress: 'Unit 2', currentPage: 4, totalPage: 20 },
  ],
  classTodayReportCommon: [
    { grade: '고2', className: '고2 영수', reportDate: '2026-09-12', subject: '수학', textbookName: '개념원리', todayAssignment: '', currentProgress: '', currentPage: 0, totalPage: 0 },
    { grade: '고2', className: '고2 영수', reportDate: '2026-09-18', subject: '수학', todayAssignment: '금 과제', currentProgress: '', currentPage: 0, totalPage: 0 },
    { grade: '고2', className: '다른반', reportDate: '2026-09-21', subject: '수학', todayAssignment: '다른 반', currentProgress: '', currentPage: 0, totalPage: 0 },
  ],
})
const mathPast = subjectReportDatesOnOrBefore(datesForSubject(collected, '수학'), '2026-09-25')
const englishPast = subjectReportDatesOnOrBefore(datesForSubject(collected, '영어'), '2026-09-25')
assert.deepEqual(mathPast, ['2026-09-19', '2026-09-18', '2026-09-07'])
assert.deepEqual(englishPast, ['2026-09-16', '2026-09-09'])
assert.equal(mathPast.includes('2026-09-06'), false)
assert.equal(mathPast.includes('2026-08-20'), false)
assert.equal(mathPast.includes('2026-09-11'), false)
assert.equal(mathPast.includes('2026-09-14'), false)
assert.equal(mathPast.includes('2026-09-12'), false)
assert.equal(mathPast.includes('2026-09-21'), false)
assert.equal(
  latestSubjectReportDate(datesForSubject(collected, '영어'), '2026-09-25', '2026-08-26'),
  '2026-09-16',
)
assert.equal(
  latestSubjectReportDate(['2026-09-06', '2026-08-01'], '2026-09-25'),
  null,
)
assert.equal(scheduledSubjectOnDate('2026-09-19', ['월', '수', '금'], ['화', '목']), null)
assert.equal(
  resolveAutoSubject({ visible: ['수학', '영어'], recorded: [], scheduled: scheduledSubjectOnDate('2026-09-18', ['월', '수', '금'], ['화', '목']) }),
  '수학',
)

const FRI25 = '2026-09-25'
const englishOnlyVisible = ['영어'] as const
const mathOnlyVisible = ['수학'] as const
const bothSubjects = ['수학', '영어'] as const
const tueThu = ['화', '목']
const mwf = ['월', '수', '금']

function actualToday(
  visible: readonly ('수학' | '영어')[],
  date: string,
  mathDays: readonly string[] | null,
  englishDays: readonly string[] | null,
  recorded: ('수학' | '영어')[] = [],
) {
  return resolveAutoSubject({
    visible,
    recorded,
    scheduled: scheduledSubjectOnDate(date, mathDays, englishDays),
  })
}

assert.equal(actualToday(englishOnlyVisible, FRI25, null, tueThu), null)
assert.equal(actualToday(englishOnlyVisible, THU, null, tueThu), '영어')
assert.equal(actualToday(englishOnlyVisible, FRI25, null, tueThu, ['영어']), '영어')
assert.equal(actualToday(mathOnlyVisible, THU, mwf, null), null)
assert.equal(actualToday(mathOnlyVisible, FRI25, mwf, null), '수학')
assert.equal(actualToday(bothSubjects, FRI25, mwf, tueThu), '수학')
assert.equal(actualToday(bothSubjects, THU, mwf, tueThu), '영어')
assert.equal(
  agreedScheduledSubject(
    [
      { mathClassDays: null, englishClassDays: tueThu },
      { mathClassDays: mwf, englishClassDays: null },
    ],
    FRI25,
  ),
  null,
)

const fridayRows = collectSubjectReportRows({
  studentIds: new Set(['s1']),
  grade: '고1',
  className: '고1 영어',
  dailyTests: [],
  homeworkTextbookEntries: [],
  progressRecords: [],
  classTodayReportCommon: [
    {
      grade: '고1',
      className: '고1 영어',
      reportDate: FRI25,
      subject: '영어',
      textbookName: '교재',
      todayAssignment: '',
      currentProgress: '',
      currentPage: 0,
      totalPage: 0,
    },
  ],
})
assert.deepEqual(recordedSubjectsOnDate(fridayRows, FRI25), [])
assert.equal(actualToday(englishOnlyVisible, FRI25, null, tueThu, recordedSubjectsOnDate(fridayRows, FRI25)), null)

const fridayView = viewSubjectForReport({
  visible: englishOnlyVisible,
  manual: null,
  actualToday: null,
})
assert.equal(fridayView, '영어')
assert.equal(
  isActualTodayClass({
    viewingToday: true,
    pastOpen: false,
    actualToday: null,
    viewSubject: fridayView,
  }),
  false,
)
assert.equal(
  isActualTodayClass({
    viewingToday: true,
    pastOpen: false,
    actualToday: '영어',
    viewSubject: '영어',
  }),
  true,
)

console.log('todayReportSubjectNav.test.ts ok')
