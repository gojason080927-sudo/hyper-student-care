/**
 * 실행: npx tsx src/hub/hubMaterialBatch.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  formatMaterialBatchResult,
  hubMaterialBatchPushEntityId,
  isIgnoredOsFile,
  mergeMaterialFiles,
  pickHubMaterialFiles,
  titleFromMaterialFileName,
} from './hubMaterialBatch.ts'
import { hubAudienceFieldsForSave, hubAudienceSummary, nextHubAudienceOnTypeChange } from './hubAudience.ts'

const teacherCms = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')
const teacherRepo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')

function fakeFile(name: string, type = 'application/pdf', relative = '', size = 4): File {
  const file = new File(['x'.repeat(size)], name, { type })
  if (relative) {
    Object.defineProperty(file, 'webkitRelativePath', { value: relative })
  }
  return file
}

assert.equal(titleFromMaterialFileName('함수 심화문제.pdf'), '함수 심화문제')
assert.equal(titleFromMaterialFileName('함수 기본문제.PDF'), '함수 기본문제')
assert.equal(titleFromMaterialFileName('고1/수학/함수/추가문제.docx'), '추가문제')
assert.equal(titleFromMaterialFileName('자료'), '자료')
assert.equal(titleFromMaterialFileName('.hidden'), '.hidden')

assert.equal(isIgnoredOsFile('.DS_Store'), true)
assert.equal(isIgnoredOsFile('Thumbs.db'), true)
assert.equal(isIgnoredOsFile('desktop.ini'), true)
assert.equal(isIgnoredOsFile('._함수.pdf'), true)
assert.equal(isIgnoredOsFile('함수.pdf', '__MACOSX/함수.pdf'), true)
assert.equal(isIgnoredOsFile('함수.pdf', '.hidden/함수.pdf'), true)
assert.equal(isIgnoredOsFile('함수 기본문제.pdf'), false)
assert.equal(isIgnoredOsFile('함수.pdf', '고1/수학/함수/함수.pdf'), false)

const picked = pickHubMaterialFiles([
  fakeFile('함수 기본문제.pdf'),
  fakeFile('함수 심화문제.pdf'),
  fakeFile('함수 오답문제.pdf'),
  fakeFile('함수 추가문제.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
  fakeFile('clip.mp4', 'video/mp4'),
  fakeFile('setup.exe', 'application/x-msdownload'),
  fakeFile('.DS_Store', ''),
  fakeFile('note.pdf', 'application/pdf', '__MACOSX/note.pdf'),
])
assert.equal(picked.accepted.length, 4)
assert.deepEqual(
  picked.accepted.map((item) => item.title),
  ['함수 기본문제', '함수 심화문제', '함수 오답문제', '함수 추가문제'],
)
assert.equal(picked.skipped.filter((item) => item.reason === 'unsupported').length, 2)
assert.equal(picked.skipped.filter((item) => item.reason === 'ignored').length, 2)
assert.equal(
  picked.skipped.some((item) => item.name.includes('clip.mp4') && item.reason === 'unsupported'),
  true,
)

const first = fakeFile('a.pdf')
const merged = mergeMaterialFiles([first], [first, fakeFile('b.png', 'image/png')])
assert.equal(merged.length, 2)

assert.equal(formatMaterialBatchResult(1, []), '자료를 저장했습니다.')
assert.equal(formatMaterialBatchResult(8, []), '8개 게시 완료')
assert.equal(formatMaterialBatchResult(8, ['a.pdf', 'b.pdf']), '8개 게시 완료 / 2개 실패')
assert.equal(formatMaterialBatchResult(0, ['a.pdf']), '자료 업로드에 실패했습니다.')
assert.equal(formatMaterialBatchResult(0, ['a.pdf', 'b.pdf']), '0개 게시 완료 / 2개 실패')

assert.equal(hubMaterialBatchPushEntityId(['id-1', 'id-2', 'id-3']), 'id-1')
assert.equal(hubMaterialBatchPushEntityId([]), null)

assert.deepEqual(
  hubAudienceFieldsForSave({ audienceType: 'all', targetGrade: '고1', targetClassName: '고1 수학B', targetStudentId: 's1' }),
  { audienceType: 'all', targetGrade: null, targetClassName: null, targetStudentId: null },
)
assert.deepEqual(
  hubAudienceFieldsForSave({ audienceType: 'grade', targetGrade: '고1', targetClassName: '고1 수학B', targetStudentId: 's1' }),
  { audienceType: 'grade', targetGrade: '고1', targetClassName: null, targetStudentId: null },
)
assert.deepEqual(
  hubAudienceFieldsForSave({
    audienceType: 'class',
    targetGrade: '고1',
    targetClassName: '고1 수학B',
    targetStudentId: 's1',
  }),
  { audienceType: 'class', targetGrade: '고1', targetClassName: '고1 수학B', targetStudentId: null },
)
assert.deepEqual(
  hubAudienceFieldsForSave({
    audienceType: 'student',
    targetGrade: '고1',
    targetClassName: '고1 수학B',
    targetStudentId: 's1',
  }),
  { audienceType: 'student', targetGrade: null, targetClassName: null, targetStudentId: 's1' },
)

assert.deepEqual(
  nextHubAudienceOnTypeChange(
    { audienceType: 'class', targetGrade: '고1', targetClassName: '고1 수학B', targetStudentId: '' },
    'all',
  ),
  { audienceType: 'all', targetGrade: '', targetClassName: '', targetStudentId: '' },
)
assert.deepEqual(
  nextHubAudienceOnTypeChange(
    { audienceType: 'class', targetGrade: '고1', targetClassName: '고1 수학B', targetStudentId: '' },
    'grade',
  ),
  { audienceType: 'grade', targetGrade: '고1', targetClassName: '', targetStudentId: '' },
)

assert.equal(hubAudienceSummary({ audienceType: 'all', targetGrade: null, targetClassName: null }), '전체 학생')
assert.equal(
  hubAudienceSummary({ audienceType: 'grade', targetGrade: '고1', targetClassName: null }),
  '학년 전체 · 고1',
)
assert.equal(
  hubAudienceSummary({ audienceType: 'class', targetGrade: '고1', targetClassName: '고1 수학B' }),
  '특정 반 · 고1 고1 수학B',
)
assert.equal(
  hubAudienceSummary({ audienceType: 'student', targetGrade: null, targetClassName: null }, '홍길동'),
  '홍길동',
)

assert.match(teacherCms, /파일 선택/)
assert.match(teacherCms, /폴더 선택/)
assert.match(teacherCms, /\bmultiple\b/)
assert.match(teacherCms, /applyFolderPickerAttributes/)
assert.match(teacherCms, /pickHubMaterialFiles/)
assert.match(teacherCms, /hubMaterialBatchPushEntityId/)
assert.match(teacherCms, /실패 파일 다시 시도/)
assert.match(teacherCms, /업로드 완료/)
assert.match(teacherCms, /지원하지 않는 파일/)
assert.match(teacherCms, /전체 학생/)
assert.match(teacherCms, /학년 전체/)
assert.match(teacherCms, /특정 반/)
assert.match(teacherCms, /개별 학생/)
assert.match(teacherCms, /for \(let index = 0; index < queue\.length/)
assert.doesNotMatch(teacherCms, /Promise\.all\(\s*queue/)
assert.doesNotMatch(teacherCms, /event\.target\.files\?\.\[0\]/)
assert.equal((teacherCms.match(/event: 'material_saved'/g) ?? []).length, 3)
assert.match(teacherRepo, /teacherUploadMaterial/)
assert.match(teacherRepo, /hubAudienceFieldsForSave/)
assert.match(teacherRepo, /file: File/)

console.log('hubMaterialBatch tests passed')
