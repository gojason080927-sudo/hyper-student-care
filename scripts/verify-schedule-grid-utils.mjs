/**
 * scheduleGrid 유틸 단위 검증
 * node scripts/verify-schedule-grid-utils.mjs
 */
import {
  buildGridRecord,
  cellKey,
  formatTimeLabel,
  parseTimeLabel,
  removeGridRow,
  trimEmptyTrailingRows,
} from '../src/utils/scheduleGrid.ts'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// parse / format
const parsed = parseTimeLabel('13:30 ~ 15:30')
assert(parsed.start === '13:30' && parsed.end === '15:30', 'parse range')
assert(formatTimeLabel('13:30', '15:30') === '13:30 ~ 15:30', 'format range')
assert(parseTimeLabel('18:00').start === '18:00', 'parse legacy single time')

// remove middle row reindex
const removed = removeGridRow(
  ['14:00 ~ 16:00', '16:00 ~ 18:00', '18:00 ~ 20:00'],
  {
    '0:월': 'A',
    '1:월': 'B',
    '2:월': 'C',
    '0:수': 'a',
    '1:수': 'b',
    '2:수': 'c',
  },
  1,
  'mon-wed-fri-sat',
)
assert(removed.timeLabels.length === 2, 'row count after delete')
assert(removed.timeLabels[0] === '14:00 ~ 16:00', 'first label preserved')
assert(removed.timeLabels[1] === '18:00 ~ 20:00', 'third label moved up')
assert(removed.cells['0:월'] === 'A' && removed.cells['1:월'] === 'C', 'cells reindexed')
assert(removed.cells['2:월'] === undefined, 'old index removed')

// trim trailing empty
const trimmed = trimEmptyTrailingRows(
  ['14:00 ~ 16:00', '', ''],
  { '0:월': 'x' },
  'mon-wed-fri-sat',
)
assert(trimmed.timeLabels.length === 1, 'trailing empty rows trimmed')

// build record keeps sync
const record = buildGridRecord({
  grade: '고1',
  className: '고1 수학A',
  templateType: 'mon-wed-fri-sat',
  timeLabels: ['14:00 ~ 16:00', '16:00 ~ 18:00', '', ''],
  cells: { '0:월': '수학A', '1:금': '수학A' },
})
assert(record.timeLabels.length === 2, 'build trims empty rows')
assert(record.cells[cellKey(0, '월')] === '수학A', 'cells normalized to row count')
assert(record.cells[cellKey(1, '금')] === '수학A', 'second row cells kept')

console.log('OK  scheduleGrid utils verified')
