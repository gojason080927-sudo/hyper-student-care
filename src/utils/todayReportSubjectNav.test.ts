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
  datesForSubject,
  latestSubjectReportDate,
  recordedSubjectsOnDate,
  resolveAutoSubject,
  scheduledSubjectOnDate,
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

console.log('todayReportSubjectNav.test.ts ok')
