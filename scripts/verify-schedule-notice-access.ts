/**
 * Grid 시간표·공지 필터 검증
 * npx tsx scripts/verify-schedule-notice-access.ts
 */
import {
  isScheduleGridVisibleToStudent,
} from '../src/utils/classScheduleAccess.ts'
import { isNoticeVisibleToStudent } from '../src/utils/noticeAudience.ts'
import type { ClassScheduleGrid, ContentPost } from '../src/types/records'

const studentA = { id: 'a', grade: '고1', className: '고1 수학A' }
const studentB = { id: 'b', grade: '고1', className: '고1 수학B' }
const studentC = { id: 'c', grade: '고1', className: '고1 영수A' }

function grid(className: string): ClassScheduleGrid {
  return {
    id: className,
    grade: '고1',
    className,
    templateType: 'mon-wed-fri-sat',
    timeLabels: ['18:00'],
    cells: { '0:월': '수업' },
    isActive: true,
    createdAt: '',
    updatedAt: '',
  }
}

const grids = [grid('고1 수학A'), grid('고1 수학B'), grid('고1 영어')]

function basePost(overrides: Partial<ContentPost>): ContentPost {
  return {
    id: 'p',
    category: '공지사항',
    title: '',
    content: '',
    summary: '',
    sourceName: '',
    originalArticleTitle: '',
    authorName: '',
    isPinned: false,
    isPublished: true,
    publishedAt: '2026-01-01',
    audienceType: 'all',
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
    publishStartDate: '',
    publishEndDate: '',
    isImportant: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

const notices = {
  all: basePost({ id: 'n-all', audienceType: 'all' }),
  grade: basePost({ id: 'n-grade', audienceType: 'grade', targetGrade: '고1' }),
  mathA: basePost({
    id: 'n-matha',
    audienceType: 'class',
    targetGrade: '고1',
    targetClassName: '고1 수학A',
  }),
  mathB: basePost({
    id: 'n-mathb',
    audienceType: 'class',
    targetGrade: '고1',
    targetClassName: '고1 수학B',
  }),
  studentA: basePost({ id: 'n-a', audienceType: 'student', targetStudentId: 'a' }),
}

function assert(name: string, condition: boolean) {
  if (!condition) {
    console.error('FAIL:', name)
    process.exitCode = 1
  } else {
    console.log('OK:', name)
  }
}

function visibleGrids(student: typeof studentA) {
  return grids.filter((item) => isScheduleGridVisibleToStudent(item, student.grade, student.className))
}

assert('A sees mathA only', visibleGrids(studentA).map((s) => s.className).join() === '고1 수학A')
assert('B sees mathB only', visibleGrids(studentB).map((s) => s.className).join() === '고1 수학B')
assert(
  'C sees mathA + english',
  visibleGrids(studentC).map((s) => s.className).sort().join() === '고1 수학A,고1 영어',
)

assert('A all notice', isNoticeVisibleToStudent(notices.all, studentA))
assert('A grade notice', isNoticeVisibleToStudent(notices.grade, studentA))
assert('A mathA notice', isNoticeVisibleToStudent(notices.mathA, studentA))
assert('A not mathB', !isNoticeVisibleToStudent(notices.mathB, studentA))
assert('A personal', isNoticeVisibleToStudent(notices.studentA, studentA))
assert('C mathA via link', isNoticeVisibleToStudent(notices.mathA, studentC))
assert('C not mathB', !isNoticeVisibleToStudent(notices.mathB, studentC))
assert('B not mathA', !isNoticeVisibleToStudent(notices.mathA, studentB))

console.log(process.exitCode ? 'Some tests failed' : 'All tests passed')
