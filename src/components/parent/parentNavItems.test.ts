/**
 * 실행: npx tsx src/components/parent/parentNavItems.test.ts
 */
import assert from 'node:assert/strict'
import { isParentCategoryPathActive, parentCategoryItems } from './parentNavItems.ts'

const labels = parentCategoryItems.map((item) => item.label.replace(/\n/g, ' '))
assert.deepEqual(labels, [
  '월간 학습진단 REPORT',
  '월말평가 결과',
  '공지사항 · 보강계획',
  '고입 · 대입 입시전략',
  '질문하기',
])

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
assert.equal(isParentCategoryPathActive('notices-makeup', '/care/abc/questions'), false)
assert.equal(
  isParentCategoryPathActive('admission-strategy', '/care/abc/admission-strategy'),
  true,
)
assert.equal(
  isParentCategoryPathActive('questions', '/care/abc/notices-makeup'),
  false,
)

console.log('parentNavItems OK')
