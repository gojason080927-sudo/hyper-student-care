/**
 * 실행: node --experimental-strip-types src/utils/parentTodayReportHistory.test.ts
 */
import assert from 'node:assert/strict'
import {
  canShiftParentTodayReportDate,
  clampParentTodayReportDate,
  getParentTodayReportMinDate,
  isParentTodayReportHistoricalDate,
  PARENT_TODAY_REPORT_HISTORY_DAYS,
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

console.log('parentTodayReportHistory OK')
