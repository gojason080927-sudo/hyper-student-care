/**
 * 실행: npx tsx src/hub/hubRouteRefresh.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  hubMaterialPreviewKind,
  hubMaterialPreviewRuntime,
  hubRenderedPagesToViewerPages,
  hubRouteEntryUnmountsOutlet,
  hubRouteReloadNeeded,
  hubSpaCompleteLoad,
  hubSpaInitial,
  hubSpaNavigate,
  hubSpaRememberPath,
} from './hubRouteRefresh.ts'
import { parseHubRpcArray } from './hubRpc.ts'
import { canStudentSignHubMaterialPath } from './hubAudience.ts'

assert.equal(hubRouteReloadNeeded(null, '/hub/key/materials'), false)
assert.equal(hubRouteReloadNeeded('/hub/key', '/hub/key'), false)
assert.equal(hubRouteReloadNeeded('/hub/key', '/hub/key/materials'), true)
assert.equal(hubRouteReloadNeeded('/hub/key/materials', '/hub/key/videos'), true)
assert.equal(hubRouteReloadNeeded('/hub/key/videos', '/hub/key/videos'), false)
assert.equal(hubRouteEntryUnmountsOutlet('/hub/key', '/hub/key/materials'), true)
assert.equal(hubRouteEntryUnmountsOutlet(null, '/hub/key/materials'), false)

assert.equal(
  hubMaterialPreviewKind({ kind: 'pdf', pages: [{ pageNumber: 1 }], sourceFilePath: 'a/source.pdf' }),
  'pages',
)
assert.equal(
  hubMaterialPreviewKind({ kind: 'pdf', pages: [], sourceFilePath: 'a/source.pdf' }),
  'source',
)
assert.equal(hubMaterialPreviewKind({ kind: 'hwp', pages: [], sourceFilePath: 'a/source.hwp' }), 'none')
assert.deepEqual(
  hubMaterialPreviewRuntime({ kind: 'pdf', pages: [], sourceFilePath: 'a/source.pdf' }),
  { kind: 'source', viewer: 'in-app', popupAfterAwait: false },
)
assert.deepEqual(
  hubMaterialPreviewRuntime({ kind: 'pdf', pages: [{ pageNumber: 1 }], sourceFilePath: 'a/source.pdf' }),
  { kind: 'pages', viewer: 'in-app', popupAfterAwait: false },
)

const mapped = hubRenderedPagesToViewerPages(
  [{ pageNumber: 1, width: 800, height: 1100 }],
  ['blob:https://hyper-student-care.vercel.app/page-1'],
)
assert.equal(mapped[0]?.assetPath.startsWith('blob:'), true)
assert.equal(mapped[0]?.pageNumber, 1)

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

let runtime = hubSpaInitial('/hub/key')
runtime = hubSpaRememberPath(runtime)
runtime = hubSpaCompleteLoad(runtime, 1, 'home-empty')
assert.equal(runtime.outletMounted, true)
assert.equal(runtime.bundleLabel, 'home-empty')

runtime = hubSpaNavigate(runtime, '/hub/key/materials')
assert.equal(runtime.mode, 'loading')
assert.equal(runtime.outletMounted, false)
assert.equal(runtime.generation, 2)
assert.equal(runtime.bundleLabel, '')

const ignoredStale = hubSpaCompleteLoad(runtime, 1, 'home-empty')
assert.equal(ignoredStale.bundleLabel, '', 'old HOME bundle must not overwrite the in-flight materials reload')
assert.equal(ignoredStale.outletMounted, false)

runtime = hubSpaCompleteLoad(runtime, 2, 'new-pdf')
assert.equal(runtime.mode, 'ready')
assert.equal(runtime.outletMounted, true)
assert.equal(runtime.bundleLabel, 'new-pdf')

const hubLayout = readFileSync('src/hub/HubLayout.tsx', 'utf8')
const hubRefresh = readFileSync('src/hub/useHubContentRefresh.ts', 'utf8')
const hubMaterials = readFileSync('src/hub/HubMaterialsPage.tsx', 'utf8')
const hubVideos = readFileSync('src/hub/HubVideosPage.tsx', 'utf8')
const hubRpc = readFileSync('src/hub/hubRpc.ts', 'utf8')
const hubStorageClient = readFileSync('src/hub/hubStorageClient.ts', 'utf8')
const hubStorage = readFileSync('api/hub-storage.ts', 'utf8')
const teacherRepo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')

assert.match(hubLayout, /useLocation/)
assert.match(hubLayout, /hubRouteReloadNeeded/)
assert.match(hubLayout, /prevPathRef/)
assert.match(hubLayout, /setMode\('loading'\)/)
assert.match(hubLayout, /setBundle\(undefined\)/)
assert.match(hubLayout, /\[accessKey, location\.pathname\]/)
assert.doesNotMatch(hubLayout, /\[mode, location\.pathname\]/)
assert.match(hubLayout, /gen !== loadGenRef\.current/)
assert.doesNotMatch(hubRefresh, /location\.pathname/)
assert.doesNotMatch(hubRefresh, /addEventListener\('focus'/)
assert.match(hubRefresh, /visibilitychange/)
assert.match(hubRefresh, /event\.persisted/)
assert.match(hubMaterials, /hubMaterialPreviewKind/)
assert.match(hubMaterials, /downloadHubObjectBlob/)
assert.match(hubMaterials, /renderPdfFileToPages/)
assert.match(hubMaterials, /pdfToPageImages/)
assert.match(hubMaterials, /ConnectedAdmissionStrategyViewer/)
assert.doesNotMatch(hubMaterials, /downloadHubObjectUrl/)
assert.doesNotMatch(hubMaterials, /target=_blank/)
assert.doesNotMatch(hubMaterials, /target: '_blank'/)
assert.doesNotMatch(hubMaterials, /target=`_blank`/)
assert.doesNotMatch(hubMaterials, /window\.open/)
assert.match(hubVideos, /useHubContentRefresh\(reload\)/)
assert.match(hubRpc, /parseHubRpcArray\(row\.pages\)/)
assert.match(hubRpc, /cache: 'no-store'/)
assert.match(hubRpc, /get_student_hub_bundle/)
assert.doesNotMatch(hubRefresh, /\[reload\]/)
assert.match(hubStorageClient, /action: 'file'/)
assert.match(hubStorage, /payload\.action === 'file'/)
assert.match(hubStorage, /p_mode: action === 'upload' \? 'upload' : 'download'/)
assert.match(hubStorage, /arrayBuffer/)
assert.match(teacherRepo, /renderPdfFileToPages/)
assert.match(teacherRepo, /hub_learning_material_pages/)

console.log('hubRouteRefresh.test.ts passed')
