/**
 * 학부모 Today Report 교재명: student_textbook_slots가 class_today_report_common보다 우선
 * npx tsx src/utils/textbookSlots.textbookName.test.ts
 */
import assert from 'node:assert/strict'
import type {
  ClassTodayReportCommon,
  StudentTextbookSlot,
} from '../types/records'
import {
  buildParentHomeworkTextbookDisplays,
  buildParentProgressTextbookDisplays,
  type TextbookDisplayClassContext,
} from './textbookSlots'

const ts = '2026-08-25T00:00:00.000Z'

function slot(
  studentId: string,
  subject: '수학' | '영어',
  slotNumber: 1 | 2 | 3,
  textbookName: string,
): StudentTextbookSlot {
  return {
    id: `${studentId}-${subject}-${slotNumber}`,
    studentId,
    subject,
    slotNumber,
    textbookName,
    createdAt: ts,
    updatedAt: ts,
  }
}

function common(
  subject: '수학' | '영어',
  slotNumber: 1 | 2 | 3,
  textbookName: string,
): ClassTodayReportCommon {
  return {
    id: `common-${subject}-${slotNumber}`,
    grade: '고1',
    className: '고1 수학A',
    reportDate: '2026-08-25',
    subject,
    slotNumber,
    textbookName,
    currentProgress: '1단원',
    currentPage: 10,
    totalPage: 100,
    previousAssignment: '',
    todayAssignment: 'p.10',
    createdAt: ts,
    updatedAt: ts,
  }
}

const studentA = 'stu-a'
const studentB = 'stu-b'
const date = '2026-08-25'

const classContext: TextbookDisplayClassContext = {
  grade: '고1',
  className: '고1 수학A',
  commonRecords: [
    common('수학', 1, '블랙라벨'),
    common('수학', 2, '개념쎈'),
    common('영어', 1, '구문 300'),
    common('영어', 3, 'Listening'),
  ],
  classSlots: [
    slot(studentA, '수학', 1, '일품'),
    slot(studentA, '수학', 2, 'RPM'),
    slot(studentA, '영어', 1, '어법 끝'),
    slot(studentA, '영어', 3, '수능특강'),
    slot(studentB, '수학', 1, '블랙라벨'),
  ],
}

const homeworkA = buildParentHomeworkTextbookDisplays(
  studentA,
  date,
  classContext.classSlots ?? [],
  [],
  classContext,
)
const progressA = buildParentProgressTextbookDisplays(
  studentA,
  date,
  classContext.classSlots ?? [],
  [],
  classContext,
)

function nameOf(
  items: Array<{ subject: string; slotNumber: number; textbookName: string }>,
  subject: string,
  slotNumber: number,
) {
  return items.find((item) => item.subject === subject && item.slotNumber === slotNumber)
    ?.textbookName
}

assert.equal(nameOf(homeworkA, '수학', 1), '일품')
assert.equal(nameOf(homeworkA, '수학', 2), 'RPM')
assert.equal(nameOf(homeworkA, '영어', 1), '어법 끝')
assert.equal(nameOf(homeworkA, '영어', 3), '수능특강')
assert.equal(nameOf(progressA, '수학', 1), '일품')
assert.equal(nameOf(progressA, '수학', 2), 'RPM')
assert.equal(nameOf(progressA, '영어', 1), '어법 끝')
assert.equal(nameOf(progressA, '영어', 3), '수능특강')

const homeworkB = buildParentHomeworkTextbookDisplays(
  studentB,
  date,
  classContext.classSlots ?? [],
  [],
  classContext,
)
assert.equal(nameOf(homeworkB, '수학', 1), '블랙라벨')

const progressWithStaleDateName = buildParentProgressTextbookDisplays(
  studentA,
  date,
  classContext.classSlots ?? [],
  [
    {
      id: 'prog-1',
      studentId: studentA,
      lastStudyDate: date,
      subject: '수학',
      slotNumber: 1,
      textbookName: '블랙라벨',
      currentProgress: '절대부등식',
      currentPage: 10,
      totalPage: 100,
      progressRate: 10,
      teacherMemo: '',
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  classContext,
)
assert.equal(nameOf(progressWithStaleDateName, '수학', 1), '일품')

const studentC = 'stu-c'
const emptySlotContext: TextbookDisplayClassContext = {
  grade: '고1',
  className: '고1 수학A',
  commonRecords: [common('수학', 1, '일품')],
  classSlots: [],
}
const progressEmptyOwnSlots = buildParentProgressTextbookDisplays(
  studentC,
  date,
  [],
  [
    {
      id: 'prog-c',
      studentId: studentC,
      lastStudyDate: date,
      subject: '수학',
      slotNumber: 1,
      textbookName: '블랙라벨',
      currentProgress: '절대부등식',
      currentPage: 10,
      totalPage: 100,
      progressRate: 10,
      teacherMemo: '',
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  emptySlotContext,
)
assert.equal(nameOf(progressEmptyOwnSlots, '수학', 1), '일품')

const duplicateSlots: StudentTextbookSlot[] = [
  {
    ...slot(studentA, '수학', 1, '블랙라벨'),
    id: 'old-homework-row',
    updatedAt: '2026-08-24T00:00:00.000Z',
  },
  {
    ...slot(studentA, '수학', 1, '일품'),
    id: 'new-progress-row',
    updatedAt: '2026-08-25T12:00:00.000Z',
  },
]
const progressDup = buildParentProgressTextbookDisplays(
  studentA,
  date,
  duplicateSlots,
  [],
  { ...classContext, classSlots: duplicateSlots },
)
assert.equal(nameOf(progressDup, '수학', 1), '일품')

console.log('textbook name parent sync tests passed.')
