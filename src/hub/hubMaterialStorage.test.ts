/**
 * 실행: npx tsx src/hub/hubMaterialStorage.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  collectHubMaterialStoragePaths,
  isOwnedHubMaterialStoragePath,
  mergeOwnedHubMaterialStoragePaths,
} from './hubMaterialStorage.ts'

assert.equal(isOwnedHubMaterialStoragePath('m1', 'm1/source/a.pdf'), true)
assert.equal(isOwnedHubMaterialStoragePath('m1', 'm1/pages/001.jpg'), true)
assert.equal(isOwnedHubMaterialStoragePath('m1', 'm1'), true)
assert.equal(isOwnedHubMaterialStoragePath('m1', 'm2/source/a.pdf'), false)
assert.equal(isOwnedHubMaterialStoragePath('m1', 'm10/source/a.pdf'), false)
assert.equal(isOwnedHubMaterialStoragePath('', 'm1/source/a.pdf'), false)

assert.deepEqual(
  collectHubMaterialStoragePaths({
    id: 'm1',
    sourceFilePath: 'm1/source/a.pdf',
    pages: [
      { pageNumber: 1, assetPath: 'm1/pages/001.jpg', width: null, height: null },
      { pageNumber: 2, assetPath: 'other/pages/002.jpg', width: null, height: null },
    ],
  }),
  ['m1/source/a.pdf', 'm1/pages/001.jpg'],
)

assert.deepEqual(
  mergeOwnedHubMaterialStoragePaths(
    'm1',
    ['m1/source/a.pdf', 'shared/not-this.pdf'],
    ['m1/pages/001.jpg', 'm2/pages/001.jpg'],
  ).sort(),
  ['m1/pages/001.jpg', 'm1/source/a.pdf'],
)

const teacherRepo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')
assert.match(teacherRepo, /export async function teacherDeleteMaterial/)
assert.match(teacherRepo, /mergeOwnedHubMaterialStoragePaths/)
assert.match(teacherRepo, /HUB_LEARNING_MATERIALS_BUCKET/)
assert.match(teacherRepo, /\.from\('hub_learning_materials'\)[\s\S]{0,80}\.delete\(\)/)
assert.match(teacherRepo, /export async function teacherDeleteVideo/)
assert.match(teacherRepo, /\.from\('hub_videos'\)[\s\S]{0,40}\.delete\(\)/)
assert.doesNotMatch(teacherRepo, /admission-strategy/)

const teacherCms = readFileSync('src/pages/teacher/TeacherStudentHubPage.tsx', 'utf8')
assert.match(teacherCms, /label: '건의'/)
assert.match(teacherCms, /id: 'suggestions'/)
assert.match(teacherCms, /kind === 'suggestion'/)
assert.match(teacherCms, /teacherDeleteMaterial/)
assert.match(teacherCms, /teacherDeleteVideo/)
assert.match(teacherCms, /ConfirmDialog/)
assert.match(teacherCms, /student_hub_inbox|teacherFetchInbox/)
assert.doesNotMatch(teacherCms, /filterParentSuggestions/)
assert.doesNotMatch(teacherCms, /PARENT_SUGGESTION_CATEGORY/)

const questionsPage = readFileSync('src/pages/QuestionsPage.tsx', 'utf8')
assert.match(questionsPage, /title="질문하기"/)
assert.match(questionsPage, /학부모 건의/)
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8')
assert.match(sidebar, /path: '\/questions', label: '질문하기'/)
const mobileMore = readFileSync('src/pages/teacherMobile/TeacherMobileMorePage.tsx', 'utf8')
assert.match(mobileMore, /label: '질문하기'/)

console.log('hubMaterialStorage.test.ts passed')
