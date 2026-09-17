/**
 * 실행: npx tsx src/hub/hubRouteRefresh.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { hubMaterialPreviewKind, hubRouteReloadNeeded } from './hubRouteRefresh.ts'
import { parseHubRpcArray } from './hubRpc.ts'
import { canStudentSignHubMaterialPath } from './hubAudience.ts'

assert.equal(hubRouteReloadNeeded(null, '/hub/key/materials'), false)
assert.equal(hubRouteReloadNeeded('/hub/key', '/hub/key'), false)
assert.equal(hubRouteReloadNeeded('/hub/key', '/hub/key/materials'), true)
assert.equal(hubRouteReloadNeeded('/hub/key/materials', '/hub/key/videos'), true)
assert.equal(hubRouteReloadNeeded('/hub/key/videos', '/hub/key/videos'), false)

assert.equal(
  hubMaterialPreviewKind({ kind: 'pdf', pages: [{ pageNumber: 1 }], sourceFilePath: 'a/source.pdf' }),
  'pages',
)
assert.equal(
  hubMaterialPreviewKind({ kind: 'pdf', pages: [], sourceFilePath: 'a/source.pdf' }),
  'source',
)
assert.equal(hubMaterialPreviewKind({ kind: 'hwp', pages: [], sourceFilePath: 'a/source.hwp' }), 'none')

const pages = parseHubRpcArray(
  JSON.stringify([{ page_number: 1, asset_path: 'mat/pages/001.jpg', width: 100, height: 200 }]),
)
assert.equal(pages.length, 1)
assert.equal(pages[0]?.page_number, 1)
assert.equal(pages[0]?.asset_path, 'mat/pages/001.jpg')
assert.deepEqual(parseHubRpcArray('not-json'), [])
assert.deepEqual(parseHubRpcArray(null), [])

const studentA = { id: 'stu-a', grade: '고1', className: '고1 수학B' }
const studentB = { id: 'stu-b', grade: '고1', className: '고1 수학A' }
const classAMaterial = {
  status: 'PUBLISHED' as const,
  sourceFilePath: 'mat-a/source/file.pdf',
  pages: [{ pageNumber: 1, assetPath: 'mat-a/pages/001.jpg', width: 100, height: 100 }],
  audienceType: 'class' as const,
  targetGrade: '고1',
  targetClassName: '고1 수학B',
  targetStudentId: null,
}
assert.equal(
  canStudentSignHubMaterialPath({ material: classAMaterial, student: studentA, path: 'mat-a/pages/001.jpg' }),
  true,
)
assert.equal(
  canStudentSignHubMaterialPath({ material: classAMaterial, student: studentB, path: 'mat-a/pages/001.jpg' }),
  false,
)
assert.equal(
  canStudentSignHubMaterialPath({ material: classAMaterial, student: studentB, path: 'mat-a/source/file.pdf' }),
  false,
)

const hubLayout = readFileSync('src/hub/HubLayout.tsx', 'utf8')
const hubRefresh = readFileSync('src/hub/useHubContentRefresh.ts', 'utf8')
const hubMaterials = readFileSync('src/hub/HubMaterialsPage.tsx', 'utf8')
const hubVideos = readFileSync('src/hub/HubVideosPage.tsx', 'utf8')
const hubRpc = readFileSync('src/hub/hubRpc.ts', 'utf8')

assert.match(hubLayout, /useLocation/)
assert.match(hubLayout, /hubRouteReloadNeeded/)
assert.match(hubLayout, /prevPathRef/)
assert.match(hubRefresh, /location\.pathname/)
assert.doesNotMatch(hubRefresh, /addEventListener\('focus'/)
assert.match(hubMaterials, /refreshing/)
assert.match(hubMaterials, /hubMaterialPreviewKind/)
assert.match(hubMaterials, /createObjectURL/)
assert.match(hubMaterials, /미리보기/)
assert.match(hubVideos, /refreshing/)
assert.match(hubVideos, /useHubContentRefresh\(reload\)/)
assert.match(hubRpc, /parseHubRpcArray\(row\.pages\)/)
assert.doesNotMatch(hubRefresh, /\[reload\]/)
assert.doesNotMatch(hubLayout, /\[accessKey, location\.pathname\]/)

console.log('hubRouteRefresh.test.ts passed')
