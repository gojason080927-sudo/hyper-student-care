/**
 * 실행: npx tsx src/utils/parentTodayReportMathDisplay.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { ProgressRecord, TextbookSlotNumber, TextbookSubject } from '../types/records.ts'
import {
  filterParentVisibleSlotDisplays,
  PARENT_VISIBLE_SLOTS,
} from './parentTextbookSlots.ts'
import { buildParentProgressTextbookDisplays } from './textbookSlots.ts'

const parentDiagnosis = readFileSync(
  'src/components/dailytest/ParentDailyTestDiagnosisBlock.tsx',
  'utf8',
)
const teacherDiagnosis = readFileSync(
  'src/components/diagnosis/DailyLearningDiagnosisFields.tsx',
  'utf8',
)
const mathDaily = readFileSync('src/utils/mathDailyTest.ts', 'utf8')
const highRecovery = readFileSync('src/utils/mathHighRecovery.ts', 'utf8')
const weekly = readFileSync('src/utils/studentCare/weeklySummary.ts', 'utf8')
const todayReport = readFileSync('src/components/todayReport/TodayReportView.tsx', 'utf8')

assert.deepEqual(PARENT_VISIBLE_SLOTS.수학, [1, 2])
assert.deepEqual(PARENT_VISIBLE_SLOTS.영어, [1, 2, 3])

function display(subject: TextbookSubject, slotNumber: TextbookSlotNumber) {
  return { subject, slotNumber }
}

const visible = filterParentVisibleSlotDisplays([
  display('수학', 1),
  display('수학', 2),
  display('수학', 3),
  display('영어', 1),
  display('영어', 2),
  display('영어', 3),
])
assert.deepEqual(
  visible.map((item) => `${item.subject}-${item.slotNumber}`),
  ['수학-1', '수학-2', '영어-1', '영어-2', '영어-3'],
)

function progress(slotNumber: TextbookSlotNumber, date: string, text: string): ProgressRecord {
  return {
    id: `prg-${slotNumber}-${date}`,
    studentId: 'stu-1',
    subject: '수학',
    slotNumber,
    textbookName: `수학 교재 ${slotNumber}`,
    currentProgress: text,
    currentPage: 10,
    totalPage: 100,
    progressRate: 10,
    lastStudyDate: date,
    teacherMemo: '',
    createdAt: '',
    updatedAt: '',
  }
}

const earlier = '2026-09-08'
const later = '2026-09-10'
const stored = [
  progress(1, earlier, '교재1 이전'),
  progress(2, earlier, '교재2 이전'),
  progress(3, earlier, '교재3 이전'),
  progress(1, later, '교재1 당일'),
  progress(2, later, '교재2 당일'),
]
const rawLater = buildParentProgressTextbookDisplays('stu-1', later, [], stored, undefined, {
  allowCarryForward: false,
})
assert.equal(rawLater.some((item) => item.slotNumber === 3), false)
assert.equal(rawLater.find((item) => item.slotNumber === 1)?.currentProgress, '교재1 당일')
assert.equal(rawLater.find((item) => item.slotNumber === 2)?.currentProgress, '교재2 당일')

const carried = buildParentProgressTextbookDisplays('stu-1', '2026-09-11', [], stored, undefined, {
  allowCarryForward: true,
})
assert.equal(carried.find((item) => item.slotNumber === 1)?.currentProgress, '교재1 당일')
assert.equal(carried.find((item) => item.slotNumber === 2)?.currentProgress, '교재2 당일')
assert.equal(carried.some((item) => item.slotNumber === 3), true)
const parentShown = filterParentVisibleSlotDisplays(carried)
assert.equal(parentShown.some((item) => item.slotNumber === 3), false)
assert.equal(parentShown.some((item) => item.slotNumber === 1), true)
assert.equal(parentShown.some((item) => item.slotNumber === 2), true)

assert.doesNotMatch(parentDiagnosis, /격주간 오답 재시험/)
assert.doesNotMatch(parentDiagnosis, /재시험 오답 수/)
assert.match(parentDiagnosis, /오답 분석/)
assert.match(parentDiagnosis, /문법 서술형 TEST/)
assert.match(parentDiagnosis, /영어 작문/)
assert.doesNotMatch(teacherDiagnosis, /격주간 오답 재시험/)
assert.match(mathDaily, /fixed-wrong-v1/)
assert.match(highRecovery, /high-recovery-v1/)
assert.match(todayReport, /HighRecoveryTestResult/)
assert.doesNotMatch(weekly, /fridayRetestTotal/)
assert.doesNotMatch(weekly, /fridayRetestWrong/)

console.log('parentTodayReportMathDisplay tests passed')
