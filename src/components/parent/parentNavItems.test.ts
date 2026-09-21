/**
 * 실행: npx tsx src/components/parent/parentNavItems.test.ts
 */
import assert from 'node:assert/strict'
import {
  isParentCategoryPathActive,
  parentCategoryItems,
  parentHomeCategoryItems,
  parentSidebarItems,
  parentTodayReportHighlights,
} from './parentNavItems.ts'

const labels = parentCategoryItems.map((item) => item.label.replace(/\n/g, ' '))
assert.deepEqual(labels, [
  '월간 학습진단 REPORT',
  '월말평가 결과',
  '공지사항 · 보강계획',
  '고입 · 대입 입시전략',
  '질문하기',
])

const homeLabels = parentHomeCategoryItems.map((item) => item.label.replace(/\n/g, ' '))
assert.deepEqual(homeLabels, [
  '주간 SUMMARY',
  '주간 수학 오답 영어 단어 누적',
  '시간표',
  '입시전략',
  '공지사항 보강계획',
  '건의사항',
])
assert.equal(
  parentHomeCategoryItems.find((item) => item.segment === 'notices-makeup')?.label,
  '공지사항\n보강계획',
)
assert.equal(
  parentHomeCategoryItems.some((item) => item.segment === 'monthly-learning-report'),
  false,
)
assert.deepEqual(
  parentHomeCategoryItems.map((item) => item.segment),
  [
    'weekly-learning-summary',
    'weekly-wrong-vocab',
    'schedule',
    'admission-strategy',
    'notices-makeup',
    'suggestions',
  ],
)
assert.equal(parentSidebarItems[0]?.segment, 'weekly-learning-summary')
assert.equal(parentSidebarItems[1]?.segment, 'monthly-learning-report')

assert.equal(parentCategoryItems[2]?.segment, 'notices-makeup')
assert.equal(parentCategoryItems[2]?.description, '학원 공지 · 보강 일정')
assert.equal(parentCategoryItems[3]?.segment, 'admission-strategy')
assert.equal(parentCategoryItems[3]?.description, '진학 · 입시 정보')

assert.equal(
  isParentCategoryPathActive('notices-makeup', '/care/abc/notices-makeup'),
  true,
)
assert.equal(
  isParentCategoryPathActive('notices-makeup', '/care/abc/learning-notices/post-1'),
  true,
)
assert.equal(isParentCategoryPathActive('notices-makeup', '/care/abc/makeup-plans'), true)
assert.equal(
  isParentCategoryPathActive('notices-makeup', '/care/abc/career-result/result-1'),
  true,
)
assert.equal(isParentCategoryPathActive('notices-makeup', '/care/abc/questions'), false)
assert.equal(
  isParentCategoryPathActive('admission-strategy', '/care/abc/admission-strategy'),
  true,
)
assert.equal(
  isParentCategoryPathActive('weekly-learning-summary', '/care/abc/weekly-learning-summary'),
  true,
)
assert.equal(
  isParentCategoryPathActive('questions', '/care/abc/notices-makeup'),
  false,
)

assert.equal(parentCategoryItems[4]?.segment, 'questions')
assert.equal(
  isParentCategoryPathActive('suggestions', '/care/abc/suggestions'),
  true,
)
assert.equal(
  isParentCategoryPathActive('schedule', '/care/abc/schedule'),
  true,
)
assert.equal(
  isParentCategoryPathActive('weekly-wrong-vocab', '/care/abc/weekly-wrong-vocab'),
  true,
)

assert.deepEqual(
  parentTodayReportHighlights.map((item) => item.label),
  ['출결', '오늘의 진도', '과제 수행', '일일 테스트', '수업태도'],
)

console.log('parentNavItems OK')
