/**
 * 실행: npx tsx src/utils/homeworkInput.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HOMEWORK_INPUT_STATUSES, HOMEWORK_STATUSES } from './labels.ts'
import {
  homeworkRecordToSavePayload,
  persistStoredHomeworkStatus,
  resolveHomeworkStatusForSave,
  resolveSelectedHomeworkStatus,
} from './homework.ts'

assert.deepEqual(HOMEWORK_INPUT_STATUSES, ['완료', '부분 완료', '미완료'])
assert.equal(HOMEWORK_INPUT_STATUSES.includes('미완료'), true)
assert.deepEqual(HOMEWORK_STATUSES, ['완료', '부분 완료', '미완료'])

// 미완료도 신규 입력으로 저장할 수 있다. 빈 값·미선택은 미완료로 바뀌지 않는다.
assert.equal(resolveHomeworkStatusForSave('미완료', undefined), '미완료')
assert.equal(resolveHomeworkStatusForSave('미완료', ''), '미완료')
assert.equal(resolveHomeworkStatusForSave('미완료', '완료'), '미완료')
assert.equal(resolveHomeworkStatusForSave('미완료', '미완료'), '미완료')
assert.equal(resolveHomeworkStatusForSave('완료', '미완료'), '완료')
assert.equal(resolveHomeworkStatusForSave('부분 완료', undefined), '부분 완료')
assert.equal(resolveHomeworkStatusForSave('', '미완료'), '미완료')
assert.equal(resolveHomeworkStatusForSave('', undefined), '')
assert.equal(resolveHomeworkStatusForSave('', '완료'), '완료')

assert.equal(persistStoredHomeworkStatus(''), '')
assert.equal(persistStoredHomeworkStatus('미완료'), '미완료')
assert.equal(persistStoredHomeworkStatus('완료'), '완료')
assert.equal(persistStoredHomeworkStatus('unknown'), '')
assert.equal(resolveSelectedHomeworkStatus(''), null)
assert.equal(resolveSelectedHomeworkStatus('미완료'), '미완료')

assert.equal(
  homeworkRecordToSavePayload({
    studentId: 's1',
    date: '2026-09-14',
    content: '과제',
    status: '완료',
    teacherMemo: '',
  }).status,
  '완료',
)

assert.equal(
  homeworkRecordToSavePayload({
    id: 'legacy-1',
    studentId: 's1',
    date: '2026-09-01',
    content: '과거 과제',
    status: '미완료',
    teacherMemo: '',
    existingStatus: '미완료',
  }).status,
  '미완료',
)

assert.equal(
  homeworkRecordToSavePayload({
    studentId: 's1',
    date: '2026-09-14',
    content: '신규',
    status: '미완료',
    teacherMemo: '',
  }).status,
  '미완료',
)

assert.throws(
  () =>
    homeworkRecordToSavePayload({
      studentId: 's1',
      date: '2026-09-14',
      content: '선택 없음',
      status: '',
      teacherMemo: '',
    }),
  /완료 \/ 부분 완료 \/ 미완료 중에서 선택/,
)

const pickerFiles = [
  'src/components/homework/HomeworkStatusButtons.tsx',
  'src/components/teacherMobile/TeacherMobileHomeworkStatusButtons.tsx',
  'src/components/classBulk/ClassBulkStudentCard.tsx',
]
for (const file of pickerFiles) {
  const source = readFileSync(file, 'utf8')
  assert.match(source, /HOMEWORK_INPUT_STATUSES/)
  assert.doesNotMatch(source, /HOMEWORK_STATUSES\.map/)
  assert.doesNotMatch(source, /신규 입력은 완료 \/ 부분 완료만 가능/)
}

console.log('homeworkInput OK')
