/**
 * 실행: npx tsx src/utils/parentUnreadMakeup.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { MakeupPlanRecord } from '../types/records'
import type { Student } from '../types/student'
import {
  applyParentCategoryRead,
  coerceParentReadTimestamp,
  computeParentUnreadState,
  hasUnreadNoticesOrMakeup,
  laterParentReadTimestamp,
  mergeParentCategoryReads,
  parentCategoryReadFloor,
  parentCategoryReadStorageKey,
  readStoredParentCategoryReads,
  shouldAcceptParentCategoryReadsFetch,
  writeStoredParentCategoryRead,
  type ParentUnreadInput,
} from './parentUnread.ts'

const grid = readFileSync('src/components/parent/ParentCategoryGrid.tsx', 'utf8')
const layout = readFileSync('src/components/layout/ParentStudentLayout.tsx', 'utf8')
const page = readFileSync('src/pages/parent/ParentStudentNoticesMakeupPage.tsx', 'utf8')
const detail = readFileSync('src/pages/LearningNoticeDetailPage.tsx', 'utf8')
const provider = readFileSync('src/contexts/ParentUnreadContext.tsx', 'utf8')
const hook = readFileSync('src/hooks/useMarkParentCategoryReadOnView.ts', 'utf8')
const rpc = readFileSync('src/lib/db/parentAccessRpc.ts', 'utf8')

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

assert.equal(coerceParentReadTimestamp(new Date('2026-09-24T03:12:00.000Z')), '2026-09-24T03:12:00.000Z')
assert.equal(coerceParentReadTimestamp('2026-09-24T03:12:00+00:00'), '2026-09-24T03:12:00+00:00')
const epochMs = Date.parse('2026-09-24T03:20:00.000Z')
assert.equal(coerceParentReadTimestamp(epochMs), '2026-09-24T03:20:00.000Z')
assert.equal(coerceParentReadTimestamp({}), null)
assert.equal(coerceParentReadTimestamp(null), null)

const markedAt = '2026-09-24T03:12:00.000Z'
const readsAfterNullRpc = applyParentCategoryRead({}, 'makeup-plans', null, markedAt)
const readsAfterDateRpc = applyParentCategoryRead(
  {},
  'makeup-plans',
  new Date(markedAt),
  '2026-09-24T03:11:00.000Z',
)
assert.equal(readsAfterNullRpc['makeup-plans'], markedAt)
assert.equal(readsAfterDateRpc['makeup-plans'], markedAt)

const unreadAfterOptimisticRead = computeParentUnreadState(
  emptyInput({
    makeupPlans: [makeupA],
    categoryReads: readsAfterNullRpc,
  }),
)
assert.equal(hasUnreadNoticesOrMakeup(unreadAfterOptimisticRead), false)

const unreadAfterHomeReturn = computeParentUnreadState(
  emptyInput({
    makeupPlans: [makeupA],
    categoryReads: readsAfterNullRpc,
  }),
)
assert.equal(hasUnreadNoticesOrMakeup(unreadAfterHomeReturn), false)

const newerMakeup: MakeupPlanRecord = {
  ...makeupA,
  id: 'm3',
  updatedAt: '2026-09-24T04:00:00.000Z',
}
const unreadAfterNewerMakeup = computeParentUnreadState(
  emptyInput({
    makeupPlans: [newerMakeup],
    categoryReads: readsAfterNullRpc,
  }),
)
assert.equal(unreadAfterNewerMakeup['makeup-plans'], true)
assert.equal(hasUnreadNoticesOrMakeup(unreadAfterNewerMakeup), true)

const noticeAndMakeupUnread = computeParentUnreadState(
  emptyInput({
    makeupPlans: [makeupA],
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
    categoryReads: applyParentCategoryRead({}, 'makeup-plans', null, markedAt),
  }),
)
assert.equal(noticeAndMakeupUnread['learning-notices'], true)
assert.equal(noticeAndMakeupUnread['makeup-plans'], false)
assert.equal(hasUnreadNoticesOrMakeup(noticeAndMakeupUnread), true)

const bothRead = applyParentCategoryRead(
  applyParentCategoryRead({}, 'learning-notices', null, markedAt),
  'makeup-plans',
  null,
  markedAt,
)
const unreadAfterBothRead = computeParentUnreadState(
  emptyInput({
    makeupPlans: [makeupA],
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
    categoryReads: bothRead,
  }),
)
assert.equal(hasUnreadNoticesOrMakeup(unreadAfterBothRead), false)

assert.equal(shouldAcceptParentCategoryReadsFetch(1, 1), true)
assert.equal(shouldAcceptParentCategoryReadsFetch(1, 2), false)

assert.match(grid, /hasUnreadNoticesOrMakeup/)
assert.match(grid, /segment === 'notices-makeup'/)
assert.match(layout, /ParentUnreadProvider/)
assert.match(page, /useMarkParentCategoryReadOnView\('makeup-plans', tab === 'makeup'\)/)
assert.doesNotMatch(page, /useMarkParentCategoryReadOnView\('learning-notices'\)/)
assert.match(detail, /useMarkParentCategoryReadOnView\('learning-notices', Boolean\(post\), post\?\.updatedAt\)/)
assert.match(hook, /markCategoryRead = unread\?\.markCategoryRead/)
assert.match(hook, /void markCategoryRead\(category, seenThrough\)/)
assert.match(provider, /applyParentCategoryRead/)
assert.match(provider, /loadIdRef\.current \+= 1/)
assert.match(provider, /shouldAcceptParentCategoryReadsFetch/)
assert.match(rpc, /coerceParentReadTimestamp\(data\)/)
assert.match(rpc, /coerceParentReadTimestamp\(value\)/)

function notice(id: string, updatedAt: string) {
  return {
    id,
    category: '공지사항' as const,
    title: id,
    content: '본문',
    summary: '',
    sourceName: '',
    originalArticleTitle: '',
    authorName: '',
    isPinned: false,
    isPublished: true,
    publishedAt: updatedAt,
    audienceType: 'all' as const,
    createdAt: updatedAt,
    updatedAt,
  }
}

const olderNotice = notice('A', '2026-09-24T01:00:00.000Z')
const newerNotice = notice('B', '2026-09-24T05:00:00.000Z')
const clientNowBehindContent = '2026-09-24T04:00:00.000Z'

assert.equal(
  hasUnreadNoticesOrMakeup(
    computeParentUnreadState(emptyInput({ contentPosts: [newerNotice] })),
  ),
  true,
)

const readNewer = applyParentCategoryRead(
  {},
  'learning-notices',
  newerNotice.updatedAt,
  clientNowBehindContent,
)
assert.equal(
  hasUnreadNoticesOrMakeup(
    computeParentUnreadState(
      emptyInput({ contentPosts: [newerNotice], categoryReads: readNewer }),
    ),
  ),
  false,
)

const readOlderOnly = applyParentCategoryRead(
  {},
  'learning-notices',
  olderNotice.updatedAt,
  olderNotice.updatedAt,
)
const stillUnread = computeParentUnreadState(
  emptyInput({
    contentPosts: [olderNotice, newerNotice],
    categoryReads: readOlderOnly,
  }),
)
assert.equal(stillUnread['learning-notices'], true)
assert.equal(hasUnreadNoticesOrMakeup(stillUnread), true)

const readBothNotices = applyParentCategoryRead(
  readOlderOnly,
  'learning-notices',
  newerNotice.updatedAt,
  newerNotice.updatedAt,
)
assert.equal(
  hasUnreadNoticesOrMakeup(
    computeParentUnreadState(
      emptyInput({
        contentPosts: [olderNotice, newerNotice],
        categoryReads: readBothNotices,
      }),
    ),
  ),
  false,
)

const afterNewNotice = computeParentUnreadState(
  emptyInput({
    contentPosts: [olderNotice, newerNotice, notice('C', '2026-09-24T06:00:00.000Z')],
    categoryReads: readBothNotices,
  }),
)
assert.equal(hasUnreadNoticesOrMakeup(afterNewNotice), true)

if (typeof localStorage === 'undefined') {
  const memory = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
    },
  })
}

assert.equal(parentCategoryReadStorageKey('key-a'), 'hyper-parent-category-reads:key-a')
assert.notEqual(parentCategoryReadStorageKey('key-a'), parentCategoryReadStorageKey('key-b'))
writeStoredParentCategoryRead('key-a', 'learning-notices', newerNotice.updatedAt)
writeStoredParentCategoryRead('key-b', 'learning-notices', olderNotice.updatedAt)
assert.equal(readStoredParentCategoryReads('key-a')['learning-notices'], newerNotice.updatedAt)
assert.equal(readStoredParentCategoryReads('key-b')['learning-notices'], olderNotice.updatedAt)

const scheduleDoesNotKeepBadge = computeParentUnreadState(
  emptyInput({
    contentPosts: [olderNotice],
    classScheduleGrids: [
      {
        id: 'grid',
        grade: '고1',
        className: '고1 수학A',
        templateType: 'mon-sun',
        timeLabels: [],
        cells: {},
        isActive: true,
        createdAt: '2026-09-24T09:00:00.000Z',
        updatedAt: '2026-09-24T09:00:00.000Z',
      },
    ],
    categoryReads: readOlderOnly,
  }),
)
assert.equal(scheduleDoesNotKeepBadge['learning-notices'], false)

const makeupStillUnread = computeParentUnreadState(
  emptyInput({
    contentPosts: [olderNotice],
    makeupPlans: [makeupA],
    categoryReads: readOlderOnly,
  }),
)
assert.equal(hasUnreadNoticesOrMakeup(makeupStillUnread), true)
const makeupReadToo = applyParentCategoryRead(
  readOlderOnly,
  'makeup-plans',
  parentCategoryReadFloor(clientNowBehindContent, makeupA.updatedAt),
  clientNowBehindContent,
)
assert.equal(
  hasUnreadNoticesOrMakeup(
    computeParentUnreadState(
      emptyInput({
        contentPosts: [olderNotice],
        makeupPlans: [makeupA],
        categoryReads: makeupReadToo,
      }),
    ),
  ),
  false,
)

const refreshed = mergeParentCategoryReads(readNewer, {
  'learning-notices': clientNowBehindContent,
})
assert.equal(refreshed['learning-notices'], newerNotice.updatedAt)
assert.equal(
  laterParentReadTimestamp(clientNowBehindContent, newerNotice.updatedAt),
  newerNotice.updatedAt,
)

const lexicalEarlier = notice('lex', '2026-09-25T04:00:00+09:00')
const chronologicalLater = notice('chrono', '2026-09-24T20:00:00.000Z')
assert.ok(lexicalEarlier.updatedAt > chronologicalLater.updatedAt)
const mixed = computeParentUnreadState(
  emptyInput({ contentPosts: [lexicalEarlier, chronologicalLater] }),
)
assert.equal(mixed['learning-notices'], true)
const readLexicalOnly = applyParentCategoryRead(
  {},
  'learning-notices',
  lexicalEarlier.updatedAt,
  lexicalEarlier.updatedAt,
)
assert.equal(
  computeParentUnreadState(
    emptyInput({
      contentPosts: [lexicalEarlier, chronologicalLater],
      categoryReads: readLexicalOnly,
    }),
  )['learning-notices'],
  true,
)
const readChrono = applyParentCategoryRead(
  {},
  'learning-notices',
  chronologicalLater.updatedAt,
  chronologicalLater.updatedAt,
)
const sameInstantsReloaded = [
  notice('lex', '2026-09-24T19:00:00.000Z'),
  notice('chrono', '2026-09-24T20:00:00.000Z'),
]
assert.equal(
  hasUnreadNoticesOrMakeup(
    computeParentUnreadState(
      emptyInput({ contentPosts: sameInstantsReloaded, categoryReads: readChrono }),
    ),
  ),
  false,
)
const reloaded = mergeParentCategoryReads(readChrono, {
  'learning-notices': '2026-09-24T19:00:00.000Z',
})
assert.equal(
  hasUnreadNoticesOrMakeup(
    computeParentUnreadState(
      emptyInput({ contentPosts: sameInstantsReloaded, categoryReads: reloaded }),
    ),
  ),
  false,
)
writeStoredParentCategoryRead('key-reload', 'learning-notices', chronologicalLater.updatedAt)
writeStoredParentCategoryRead('key-reload', 'makeup-plans', makeupA.updatedAt)
const hydrated = mergeParentCategoryReads(
  readStoredParentCategoryReads('key-reload'),
  { 'learning-notices': '2020-01-01T00:00:00.000Z' },
)
assert.equal(
  hasUnreadNoticesOrMakeup(
    computeParentUnreadState(
      emptyInput({
        contentPosts: sameInstantsReloaded,
        makeupPlans: [makeupA],
        categoryReads: hydrated,
      }),
    ),
  ),
  false,
)
const otherKey = readStoredParentCategoryReads('key-b')['learning-notices']
assert.equal(otherKey, olderNotice.updatedAt)

console.log('parentUnreadMakeup tests passed')
