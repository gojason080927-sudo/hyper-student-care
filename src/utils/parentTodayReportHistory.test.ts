/**
 * 학부모 Today Report 최근 30일 조회 범위
 * npx tsx src/utils/parentTodayReportHistory.test.ts
 */
import assert from 'node:assert/strict'
import {
  canGoParentHistoryNext,
  canGoParentHistoryPrev,
  clampParentTodayReportDate,
  getParentTodayReportHistoryStartDate,
  isWithinParentTodayReportHistoryRange,
  PARENT_TODAY_REPORT_HISTORY_DAYS,
} from './parentTodayReportHistory'
import { addDaysInSeoul, getSeoulDateString } from './seoulDate'

const today = '2026-09-10'
assert.equal(PARENT_TODAY_REPORT_HISTORY_DAYS, 30)
assert.equal(getParentTodayReportHistoryStartDate(today), '2026-08-12')

assert.equal(isWithinParentTodayReportHistoryRange(today, today), true)
assert.equal(isWithinParentTodayReportHistoryRange('2026-09-09', today), true)
assert.equal(isWithinParentTodayReportHistoryRange('2026-09-03', today), true)
assert.equal(isWithinParentTodayReportHistoryRange('2026-08-12', today), true)
assert.equal(isWithinParentTodayReportHistoryRange('2026-08-11', today), false)
assert.equal(isWithinParentTodayReportHistoryRange('2026-09-11', today), false)

assert.equal(canGoParentHistoryPrev(today, today), true)
assert.equal(canGoParentHistoryPrev('2026-08-12', today), false)
assert.equal(canGoParentHistoryNext(today, today), false)
assert.equal(canGoParentHistoryNext('2026-09-09', today), true)

assert.equal(clampParentTodayReportDate('2026-09-11', today), today)
assert.equal(clampParentTodayReportDate('2026-08-11', today), '2026-08-12')
assert.equal(clampParentTodayReportDate('2026-09-03', today), '2026-09-03')

assert.equal(addDaysInSeoul('2026-09-10', -1), '2026-09-09')
assert.equal(addDaysInSeoul('2026-09-01', -1), '2026-08-31')
assert.equal(addDaysInSeoul('2026-01-01', -1), '2025-12-31')

const seoulToday = getSeoulDateString(new Date('2026-09-10T15:10:00+09:00'))
assert.equal(seoulToday, '2026-09-10')
const seoulLate = getSeoulDateString(new Date('2026-09-10T00:10:00+09:00'))
assert.equal(seoulLate, '2026-09-10')
const seoulPrevUtc = getSeoulDateString(new Date('2026-09-10T23:30:00+09:00'))
assert.equal(seoulPrevUtc, '2026-09-10')
const afterMidnight = getSeoulDateString(new Date('2026-09-10T00:10:00+09:00'))
assert.equal(afterMidnight, '2026-09-10')
const beforeMidnight = getSeoulDateString(new Date('2026-09-09T23:30:00+09:00'))
assert.equal(beforeMidnight, '2026-09-09')

console.log('parent today-report history range tests passed.')
