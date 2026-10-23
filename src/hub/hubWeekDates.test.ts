/**
 * 실행: npx tsx src/hub/hubWeekDates.test.ts
 */
import assert from 'node:assert/strict'
import {
  addDaysYmd,
  formatSelectedDateLabel,
  heroMetaLabel,
  isYmd,
  kstTodayYmd,
  shortenSchoolName,
  weekDates,
  weekStartMonday,
} from './hubWeekDates'

// KST 경계: UTC 14:59:59 = KST 23:59:59(같은 날), UTC 15:00:00 = KST 00:00:00(다음 날)
assert.equal(kstTodayYmd(new Date('2026-10-22T14:59:59Z')), '2026-10-22')
assert.equal(kstTodayYmd(new Date('2026-10-22T15:00:00Z')), '2026-10-23')
assert.equal(kstTodayYmd(new Date('2026-10-23T00:30:00+09:00')), '2026-10-23')

// 주(월~일) 계산
assert.equal(weekStartMonday('2026-10-23'), '2026-10-19') // 금
assert.equal(weekStartMonday('2026-10-25'), '2026-10-19') // 일요일은 그 주의 마지막
assert.equal(weekStartMonday('2026-10-26'), '2026-10-26') // 월요일은 새 주의 시작
assert.deepEqual(weekDates('2026-10-23'), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
// 월이 바뀌는 주
assert.deepEqual(weekDates('2026-09-30'), ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
// 연도가 바뀌는 날, 윤년
assert.equal(addDaysYmd('2026-12-31', 1), '2027-01-01')
assert.equal(addDaysYmd('2028-02-28', 1), '2028-02-29')
assert.equal(addDaysYmd('2026-10-23', -7), '2026-10-16')

assert.equal(formatSelectedDateLabel('2026-10-23'), '10월 23일 (금)')
assert.equal(formatSelectedDateLabel('2026-10-25'), '10월 25일 (일)')
assert.equal(formatSelectedDateLabel('2026-10-26'), '10월 26일 (월)')

assert.equal(isYmd('2026-10-23'), true)
assert.equal(isYmd('2026-02-30'), false)
assert.equal(isYmd('abc'), false)
assert.equal(isYmd(null), false)

// 학교 이름 줄이기
assert.equal(shortenSchoolName('동산고등학교'), '동산고')
assert.equal(shortenSchoolName('양지중학교'), '양지중')

// 학교 · 반 (학년이 반 이름에 있으면 생략, 없으면 학년을 앞에 붙임)
assert.equal(heroMetaLabel({ school: '동산고등학교', grade: '고3', className: '고3 영수' }), '동산고 · 고3 영수')
assert.equal(heroMetaLabel({ school: '동산고등학교', grade: '고3', className: '영수반' }), '동산고 · 고3 영수반')
assert.equal(heroMetaLabel({ school: '양지중학교', grade: '중2', className: '중2 수학A' }), '양지중 · 중2 수학A')
assert.equal(heroMetaLabel({ school: '', grade: '고1', className: '영어' }), '고1 영어')
assert.equal(heroMetaLabel({ school: '동산고등학교', grade: '', className: '' }), '동산고')

console.log('hubWeekDates tests passed')
