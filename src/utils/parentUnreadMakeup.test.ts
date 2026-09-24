/**
 * 실행: npx tsx src/utils/parentUnreadMakeup.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { MakeupPlanRecord } from '../types/records'
import type { Student } from '../types/student'
import {
  computeParentUnreadState,
  hasUnreadNoticesOrMakeup,
  type ParentUnreadInput,
} from './parentUnread.ts'

const grid = readFileSync('src/components/parent/ParentCategoryGrid.tsx', 'utf8')
const layout = readFileSync('src/components/layout/ParentStudentLayout.tsx', 'utf8')
const page = readFileSync('src/pages/parent/ParentStudentNoticesMakeupPage.tsx', 'utf8')

const studentA: Student = {
  id: 'a',
  name: '학생A',
  studentAccessKey: 'key-a',
  accessKeyActive: true,
  school: '',
  grade: '고1',
  studentPhone: '',
  parentPhone: '',
  className: '고1 수학A',
  subjects: [],
  teacher: '',
  enrollmentDate: '2026-03-02',
  status: '재원',
  memo: '',
  createdAt: '',
  updatedAt: '',
}

const makeupA: MakeupPlanRecord = {
  id: 'm1',
  studentId: 'a',
  scheduledDate: '2026-09-25',
  scheduledTime: '19:00',
  method: '학원 보강',
  subject: '수학',
  reason: '',
  memo: '',
  status: '예정',
  createdAt: '2026-09-24T02:00:00.000Z',
  updatedAt: '2026-09-24T02:00:00.000Z',
}

const makeupB: MakeupPlanRecord = {
  ...makeupA,
  id: 'm2',
  studentId: 'b',
}

const emptyInput = (overrides: Partial<ParentUnreadInput> = {}): ParentUnreadInput => ({
  student: studentA,
  categoryReads: {},
  attendance: [],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  classNotes: [],
  todayAssignments: [],
  classTodayReportCommon: [],
  progressRecords: [],
  monthlyEvaluations: [],
  makeupPlans: [],
  contentPosts: [],
  classScheduleGrids: [],
  questions: [],
  ...overrides,
})

const unreadNewMakeup = computeParentUnreadState(
  emptyInput({ makeupPlans: [makeupA] }),
)
assert.equal(unreadNewMakeup['makeup-plans'], true)
assert.equal(hasUnreadNoticesOrMakeup(unreadNewMakeup), true)

const unreadAfterRead = computeParentUnreadState(
  emptyInput({
    makeupPlans: [makeupA],
    categoryReads: { 'makeup-plans': '2026-09-24T03:00:00.000Z' },
  }),
)
assert.equal(unreadAfterRead['makeup-plans'], false)
assert.equal(hasUnreadNoticesOrMakeup(unreadAfterRead), false)

const unreadOtherStudent = computeParentUnreadState(
  emptyInput({ makeupPlans: [makeupB] }),
)
assert.equal(unreadOtherStudent['makeup-plans'], false)
assert.equal(hasUnreadNoticesOrMakeup(unreadOtherStudent), false)

const unreadNoticeOnly = computeParentUnreadState(
  emptyInput({
    contentPosts: [
      {
        id: 'n1',
        category: '공지사항',
        title: '공지',
        content: '',
        summary: '',
        sourceName: '',
        originalArticleTitle: '',
        authorName: '',
        isPinned: false,
        isPublished: true,
        publishedAt: '2026-09-24T01:00:00.000Z',
        audienceType: 'all',
        createdAt: '2026-09-24T01:00:00.000Z',
        updatedAt: '2026-09-24T01:00:00.000Z',
      },
    ],
  }),
)
assert.equal(unreadNoticeOnly['learning-notices'], true)
assert.equal(unreadNoticeOnly['makeup-plans'], false)
assert.equal(hasUnreadNoticesOrMakeup(unreadNoticeOnly), true)

assert.match(grid, /hasUnreadNoticesOrMakeup/)
assert.match(grid, /segment === 'notices-makeup'/)
assert.match(layout, /ParentUnreadProvider/)
assert.match(page, /useMarkParentCategoryReadOnView\('learning-notices'\)/)
assert.match(page, /useMarkParentCategoryReadOnView\('makeup-plans'\)/)

console.log('parentUnreadMakeup tests passed')
