/**
 * 정시 UI 수능 기준연도 과목 목록 — 2025 엔진 값은 변경하지 않음
 * 실행: npx tsx src/lib/admissions/regular/csatCurriculum.test.ts
 */
import assert from 'node:assert/strict'
import {
  CSAT_2025_MATH_SELECTIONS,
  CSAT_2028_INQUIRY_TRACKS,
  CSAT_2028_MATH_SELECTIONS,
  CSAT_2028_SCIENCE_INQUIRY_SUBJECTS,
  CSAT_2028_SOCIAL_INQUIRY_SUBJECTS,
  csat2028InquirySubjects,
} from './csatCurriculum'
import {
  SCIENCE_INQUIRY_SUBJECTS,
  SOCIAL_INQUIRY_SUBJECTS,
} from './types'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

section('2025 수학 선택값은 기존 엔진과 동일')
assert.deepEqual([...CSAT_2025_MATH_SELECTIONS], ['확률과통계', '미적분', '기하'])

section('2028 수학 UI 목록')
assert.deepEqual([...CSAT_2028_MATH_SELECTIONS], [
  '대수',
  '미적분Ⅰ',
  '확률과 통계',
  '기하',
  '미적분Ⅱ',
])

section('2025 탐구 과목은 types.ts 원본 유지')
assert.deepEqual([...SOCIAL_INQUIRY_SUBJECTS], [
  '생활과윤리',
  '윤리와사상',
  '한국지리',
  '세계지리',
  '동아시아사',
  '세계사',
  '경제',
  '정치와법',
  '사회문화',
])
assert.deepEqual([...SCIENCE_INQUIRY_SUBJECTS], [
  '물리학Ⅰ',
  '화학Ⅰ',
  '생명과학Ⅰ',
  '지구과학Ⅰ',
  '물리학Ⅱ',
  '화학Ⅱ',
  '생명과학Ⅱ',
  '지구과학Ⅱ',
])

section('2028 탐구 계열·과목')
assert.deepEqual([...CSAT_2028_INQUIRY_TRACKS], ['사회', '과학'])
assert.equal(CSAT_2028_SOCIAL_INQUIRY_SUBJECTS.includes('사회와 문화'), true)
assert.equal(CSAT_2028_SCIENCE_INQUIRY_SUBJECTS.includes('생명과학'), true)
assert.equal(csat2028InquirySubjects('사회').includes('생활과윤리'), false)
assert.equal(csat2028InquirySubjects('과학').includes('물리학Ⅰ'), false)
assert.equal(csat2028InquirySubjects('').length, 0)

console.log('\ncsatCurriculum OK')
