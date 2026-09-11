/**
 * 실행: node --experimental-strip-types src/utils/parentTodayReportHistory.test.ts
 */
import assert from 'node:assert/strict'
import {
  canShiftParentTodayReportDate,
  clampParentTodayReportDate,
  getParentTodayReportMinDate,
  getParentTodayReportSectionEmptyMessages,
  isParentTodayReportHistoricalDate,
  PARENT_TODAY_REPORT_EMPTY_DAY_MESSAGE,
  PARENT_TODAY_REPORT_HISTORY_DAYS,
  selectParentTodayReportDate,
} from './parentTodayReportHistory.ts'
import { addDaysInSeoul } from './seoulDate.ts'

const today = '2026-09-10'
assert.equal(PARENT_TODAY_REPORT_HISTORY_DAYS, 30)
assert.equal(getParentTodayReportMinDate(today), '2026-08-12')
assert.equal(addDaysInSeoul(today, -29), '2026-08-12')
assert.equal(addDaysInSeoul(today, -30), '2026-08-11')

assert.equal(clampParentTodayReportDate('2026-09-10', today), '2026-09-10')
assert.equal(clampParentTodayReportDate('2026-09-03', today), '2026-09-03')
assert.equal(clampParentTodayReportDate('2026-08-12', today), '2026-08-12')
assert.equal(clampParentTodayReportDate('2026-08-11', today), '2026-08-12')
assert.equal(clampParentTodayReportDate('2026-09-11', today), '2026-09-10')

assert.equal(canShiftParentTodayReportDate(today, 1, today), false)
assert.equal(canShiftParentTodayReportDate(today, -1, today), true)
assert.equal(canShiftParentTodayReportDate('2026-08-12', -1, today), false)
assert.equal(canShiftParentTodayReportDate('2026-08-12', 1, today), true)
assert.equal(canShiftParentTodayReportDate('2026-09-09', 1, today), true)

assert.equal(isParentTodayReportHistoricalDate(today, today), false)
assert.equal(isParentTodayReportHistoricalDate('2026-09-03', today), true)

const sep11 = '2026-09-11'
assert.equal(getParentTodayReportMinDate(sep11), '2026-08-13')
assert.equal(clampParentTodayReportDate('2026-08-13', sep11), '2026-08-13')
assert.equal(clampParentTodayReportDate('2026-08-12', sep11), '2026-08-13')
assert.equal(selectParentTodayReportDate('2026-08-12', sep11), '2026-08-13')
assert.equal(selectParentTodayReportDate('2026-09-12', sep11), sep11)
assert.equal(selectParentTodayReportDate('', sep11), sep11)
assert.equal(selectParentTodayReportDate('not-a-date', sep11), sep11)

assert.equal(
  getParentTodayReportSectionEmptyMessages(false).attendance,
  '오늘 등록된 출결 정보가 없습니다.',
)
assert.equal(
  getParentTodayReportSectionEmptyMessages(true).attendance,
  '해당 날짜에 등록된 출결 정보가 없습니다.',
)
assert.equal(PARENT_TODAY_REPORT_EMPTY_DAY_MESSAGE, '해당 날짜의 학습 기록이 없습니다.')

console.log('parentTodayReportHistory OK')
