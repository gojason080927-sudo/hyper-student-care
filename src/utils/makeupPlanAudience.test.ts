/**
 * 실행: npx tsx src/utils/makeupPlanAudience.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  makeupPlanAudienceSelectionError,
  resolveMakeupPlanTargetStudentIds,
} from './makeupPlanAudience.ts'

const page = readFileSync('src/pages/MakeupPlanPage.tsx', 'utf8')
const dataHook = readFileSync('src/hooks/useData.tsx', 'utf8')
const repo = readFileSync('src/lib/db/repository.ts', 'utf8')
const parentHook = readFileSync('src/hooks/useParentStudentRecords.ts', 'utf8')
const parentRpc = readFileSync('supabase/parent-access-rpc.sql', 'utf8')
const mappers = readFileSync('src/lib/db/mappers.ts', 'utf8')

const students = [
  { id: 'a', grade: '고1', className: '고1 수학A', status: '재원' as const },
  { id: 'b', grade: '고1', className: '고1 수학B', status: '재원' as const },
  { id: 'c', grade: '고2', className: '고2 수학', status: '재원' as const },
  { id: 'd', grade: '고1', className: '고1 수학A', status: '휴원' as const },
  { id: 'e', grade: '고1', className: '고1 수학A', status: '재원' as const },
]

assert.equal(
  makeupPlanAudienceSelectionError({
    audienceType: 'all',
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  }),
  null,
)
assert.equal(
  makeupPlanAudienceSelectionError({
    audienceType: 'grade',
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  }),
  '학년을 선택해 주세요.',
)
assert.equal(
  makeupPlanAudienceSelectionError({
    audienceType: 'class',
    targetGrade: '고1',
    targetClassName: '',
    targetStudentId: '',
  }),
  '반을 선택해 주세요.',
)
assert.equal(
  makeupPlanAudienceSelectionError({
    audienceType: 'student',
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  }),
  '학생을 선택해 주세요.',
)

const all = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'all',
  targetGrade: '',
  targetClassName: '',
  targetStudentId: '',
})
assert.deepEqual(all.studentIds.sort(), ['a', 'b', 'c', 'e'])
assert.equal(all.error, null)
assert.equal(all.studentIds.includes('d'), false)

const grade = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'grade',
  targetGrade: '고1',
  targetClassName: '',
  targetStudentId: '',
})
assert.deepEqual(grade.studentIds.sort(), ['a', 'b', 'e'])
assert.equal(grade.studentIds.includes('c'), false)

const otherGrade = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'grade',
  targetGrade: '중3',
  targetClassName: '',
  targetStudentId: '',
})
assert.deepEqual(otherGrade.studentIds, [])
assert.equal(otherGrade.error, '해당하는 재원 학생이 없습니다.')

const classA = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'class',
  targetGrade: '고1',
  targetClassName: '고1 수학A',
  targetStudentId: '',
})
assert.deepEqual(classA.studentIds.sort(), ['a', 'e'])
assert.equal(classA.studentIds.includes('b'), false)

const classB = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'class',
  targetGrade: '고1',
  targetClassName: '고1 수학B',
  targetStudentId: '',
})
assert.deepEqual(classB.studentIds, ['b'])

const one = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'student',
  targetGrade: '',
  targetClassName: '',
  targetStudentId: 'a',
})
assert.deepEqual(one.studentIds, ['a'])

const oneFromList = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'student',
  targetGrade: '',
  targetClassName: '',
  targetStudentId: '',
  targetStudentIds: ['a'],
})
assert.deepEqual(oneFromList.studentIds, ['a'])

const three = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'student',
  targetGrade: '',
  targetClassName: '',
  targetStudentId: '',
  targetStudentIds: ['a', 'c', 'e'],
})
assert.deepEqual(three.studentIds.sort(), ['a', 'c', 'e'])
assert.equal(three.error, null)

const duplicates = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'student',
  targetGrade: '',
  targetClassName: '',
  targetStudentId: '',
  targetStudentIds: ['a', 'a', 'e'],
})
assert.deepEqual(duplicates.studentIds.sort(), ['a', 'e'])

const noneSelected = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'student',
  targetGrade: '',
  targetClassName: '',
  targetStudentId: '',
  targetStudentIds: [],
})
assert.deepEqual(noneSelected.studentIds, [])
assert.equal(noneSelected.error, '학생을 선택해 주세요.')

const inactiveStudent = resolveMakeupPlanTargetStudentIds(students, {
  audienceType: 'student',
  targetGrade: '',
  targetClassName: '',
  targetStudentId: 'd',
})
assert.equal(inactiveStudent.error, '해당하는 재원 학생이 없습니다.')

assert.match(page, /MAKEUP_PLAN_AUDIENCE_OPTIONS/)
assert.match(page, /보강 대상/)
assert.match(page, /saveMakeupPlanRecords/)
assert.match(page, /resolveMakeupPlanTargetStudentIds/)
assert.match(page, /getClassOptionsForGrade/)
assert.match(page, /errors\.audienceType/)
assert.match(page, /type="checkbox"/)
assert.match(page, /선택 \{form\.studentIds\.length\}명/)
assert.match(page, /targetStudentIds: form\.studentIds/)
assert.match(page, /if \(form\.id\) \{\s*saveMakeupPlanRecord\(/)
assert.match(page, /deleteMakeupPlanRecord\(deleteTarget\.id\)/)
assert.doesNotMatch(page, /notifyHubPush/)
assert.match(dataHook, /saveMakeupPlanRecords/)
assert.match(dataHook, /upsertMakeupPlans/)
const makeupSaveStart = dataHook.indexOf('const saveMakeupPlanRecord')
const makeupSaveEnd = dataHook.indexOf('const deleteMakeupPlanRecord')
assert.ok(makeupSaveStart >= 0 && makeupSaveEnd > makeupSaveStart)
assert.doesNotMatch(dataHook.slice(makeupSaveStart, makeupSaveEnd), /notifyHubPush/)
assert.match(repo, /export async function upsertMakeupPlans/)
assert.match(parentHook, /makeupPlans\.filter\(\(record\) => record\.studentId === studentId\)/)
assert.match(parentRpc, /FROM public\.makeup_plans mp WHERE mp\.student_id = v_student_id/)
assert.match(mappers, /student_id: record\.studentId/)
assert.match(mappers, /studentId: row\.student_id/)

console.log('makeupPlanAudience tests passed')
