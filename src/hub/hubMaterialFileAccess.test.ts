/**
 * 실행: npx tsx src/hub/hubMaterialFileAccess.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { canStudentSignHubMaterialPath } from './hubAudience.ts'
import {
  canDownloadHubMaterial,
  canOpenHubMaterial,
  createBrowserHubMaterialFileIo,
  downloadHubMaterialFile,
  HUB_MATERIAL_BLOB_REVOKE_MS,
  hubMaterialDownloadFilename,
  isSafeHttpUrl,
  openHubMaterialInSystemViewer,
  type HubMaterialFileIo,
} from './hubMaterialFileAccess.ts'
import { hubMaterialFileRuntime, hubRouteReloadNeeded } from './hubRouteRefresh.ts'

function mockIo(options: {
  signed?: Record<string, string>
  signFail?: Record<string, string>
  urls?: Record<string, Blob>
  files?: Record<string, Blob>
}): HubMaterialFileIo & {
  assigned: string[]
  downloads: { href: string; filename: string }[]
  revoked: { url: string; delayMs: number }[]
  created: string[]
} {
  const assigned: string[] = []
  const downloads: { href: string; filename: string }[] = []
  const revoked: { url: string; delayMs: number }[] = []
  const created: string[] = []
  return {
    assigned,
    downloads,
    revoked,
    created,
    signUrl: async (path) => {
      if (options.signFail?.[path]) throw new Error(options.signFail[path])
      const url = options.signed?.[path]
      if (!url) throw new Error('이 파일에 접근할 수 없습니다.')
      return url
    },
    fetchUrl: async (url) => {
      const blob = options.urls?.[url]
      if (!blob) throw new Error('파일을 불러오지 못했습니다.')
      return blob
    },
    readFile: async (path) => {
      const blob = options.files?.[path]
      if (!blob) throw new Error('파일을 불러오지 못했습니다.')
      return blob
    },
    createObjectUrl: (blob) => {
      const url = `blob:mock/${created.length}-${blob.size}`
      created.push(url)
      return url
    },
    clickDownloadLink: (params) => {
      downloads.push(params)
    },
    scheduleRevoke: (objectUrl, delayMs = HUB_MATERIAL_BLOB_REVOKE_MS) => {
      revoked.push({ url: objectUrl, delayMs })
    },
    assignLocation: (url) => {
      assigned.push(url)
    },
  }
}

assert.equal(canOpenHubMaterial('pdf'), true)
assert.equal(canOpenHubMaterial('image'), true)
assert.equal(canOpenHubMaterial('hwp'), false)
assert.equal(canOpenHubMaterial('hwpx'), false)
assert.equal(canOpenHubMaterial('docx'), false)
assert.equal(canOpenHubMaterial('pptx'), false)
assert.equal(canOpenHubMaterial('file'), false)
assert.equal(canDownloadHubMaterial('mat-a/source/file.pdf'), true)
assert.equal(canDownloadHubMaterial(null), false)
assert.equal(isSafeHttpUrl('https://signed.example/file.pdf'), true)
assert.equal(isSafeHttpUrl('http://localhost/file.pdf'), true)
assert.equal(isSafeHttpUrl('javascript:alert(1)'), false)
assert.equal(isSafeHttpUrl('blob:https://x/1'), false)
assert.equal(hubMaterialDownloadFilename('중1 문제.pdf'), '중1 문제.pdf')
assert.equal(hubMaterialDownloadFilename('a/b\\c.pdf'), 'a_b_c.pdf')
assert.equal(HUB_MATERIAL_BLOB_REVOKE_MS >= 30_000, true)

assert.deepEqual(hubMaterialFileRuntime('pdf'), {
  canOpen: true,
  canDownload: true,
  viewer: 'system',
  popupAfterAwait: false,
  usesWindowPrint: false,
})
assert.deepEqual(hubMaterialFileRuntime('image'), {
  canOpen: true,
  canDownload: true,
  viewer: 'system',
  popupAfterAwait: false,
  usesWindowPrint: false,
})
assert.deepEqual(hubMaterialFileRuntime('hwp'), {
  canOpen: false,
  canDownload: true,
  viewer: 'none',
  popupAfterAwait: false,
  usesWindowPrint: false,
})
assert.deepEqual(hubMaterialFileRuntime('docx'), {
  canOpen: false,
  canDownload: true,
  viewer: 'none',
  popupAfterAwait: false,
  usesWindowPrint: false,
})

{
  const signed = 'https://signed.example/source.pdf'
  const io = mockIo({ signed: { 'mat-a/source/file.pdf': signed } })
  const result = await openHubMaterialInSystemViewer(
    { kind: 'pdf', sourceFilePath: 'mat-a/source/file.pdf' },
    io,
  )
  assert.equal(result.method, 'signed-navigation')
  assert.deepEqual(io.assigned, [signed])
  assert.equal(io.downloads.length, 0)
}

{
  const signed = 'https://signed.example/photo.jpg'
  const io = mockIo({ signed: { 'mat-a/source/photo.jpg': signed } })
  const result = await openHubMaterialInSystemViewer(
    { kind: 'image', sourceFilePath: 'mat-a/source/photo.jpg' },
    io,
  )
  assert.equal(result.method, 'signed-navigation')
  assert.deepEqual(io.assigned, [signed])
}

{
  const io = mockIo({ signed: { 'a/file.hwp': 'https://signed.example/file.hwp' } })
  await assert.rejects(
    () => openHubMaterialInSystemViewer({ kind: 'hwp', sourceFilePath: 'a/file.hwp' }, io),
    /열기를 지원하지 않습니다/,
  )
  assert.equal(io.assigned.length, 0)
}

{
  const io = mockIo({ signFail: { 'mat-a/source/file.pdf': '이 파일에 접근할 수 없습니다.' } })
  await assert.rejects(
    () => openHubMaterialInSystemViewer({ kind: 'pdf', sourceFilePath: 'mat-a/source/file.pdf' }, io),
    /접근할 수 없습니다/,
  )
  assert.equal(io.assigned.length, 0)
}

{
  const signed = 'https://signed.example/source.pdf'
  const io = mockIo({
    signed: { 'mat-a/source/file.pdf': signed },
    urls: { [signed]: new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' }) },
  })
  const result = await downloadHubMaterialFile(
    { sourceFilePath: 'mat-a/source/file.pdf', originalFileName: '문제.pdf' },
    io,
  )
  assert.equal(result.method, 'blob')
  assert.equal(io.assigned.length, 0)
  assert.equal(io.downloads.length, 1)
  assert.equal(io.downloads[0]?.filename, '문제.pdf')
  assert.equal(io.downloads[0]?.href.startsWith('blob:'), true)
  assert.equal(io.revoked.length, 1)
  assert.equal(io.revoked[0]?.delayMs, HUB_MATERIAL_BLOB_REVOKE_MS)
  assert.notEqual(io.revoked[0]?.delayMs, 0)
}

{
  const signed = 'https://signed.example/large.pdf'
  const io = mockIo({
    signed: { 'mat-a/source/large.pdf': signed },
    files: { 'mat-a/source/large.pdf': new Blob([new Uint8Array(8)], { type: 'application/pdf' }) },
  })
  const result = await downloadHubMaterialFile(
    { sourceFilePath: 'mat-a/source/large.pdf', originalFileName: 'large.pdf' },
    io,
  )
  assert.equal(result.method, 'file-proxy')
  assert.equal(io.downloads.length, 1)
  assert.equal(io.assigned.length, 0)
}

{
  const signed = 'https://signed.example/huge.pdf'
  const io = mockIo({ signed: { 'mat-a/source/huge.pdf': signed } })
  const result = await downloadHubMaterialFile(
    { sourceFilePath: 'mat-a/source/huge.pdf', originalFileName: 'huge.pdf' },
    io,
  )
  assert.equal(result.method, 'signed-navigation')
  assert.deepEqual(io.assigned, [signed])
  assert.equal(io.downloads.length, 0)
}

const studentA = { id: 'stu-a', grade: '고1', className: '고1 수학B' }
const studentB = { id: 'stu-b', grade: '고1', className: '고1 수학A' }
const classAMaterial = {
  status: 'PUBLISHED' as const,
  sourceFilePath: 'mat-a/source/file.pdf',
  pages: [{ pageNumber: 1, assetPath: 'mat-a/pages/001.webp', width: 100, height: 100 }],
  audienceType: 'class' as const,
  targetGrade: '고1',
  targetClassName: '고1 수학B',
  targetStudentId: null,
}
assert.equal(
  canStudentSignHubMaterialPath({ material: classAMaterial, student: studentA, path: 'mat-a/source/file.pdf' }),
  true,
)
assert.equal(
  canStudentSignHubMaterialPath({ material: classAMaterial, student: studentB, path: 'mat-a/source/file.pdf' }),
  false,
)

assert.equal(hubRouteReloadNeeded('/hub/key', '/hub/key/materials'), true)

const hubMaterials = readFileSync('src/hub/HubMaterialsPage.tsx', 'utf8')
const hubStorageClient = readFileSync('src/hub/hubStorageClient.ts', 'utf8')
const hubStorage = readFileSync('api/hub-storage.ts', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')
const hubLayout = readFileSync('src/hub/HubLayout.tsx', 'utf8')
const viewer = readFileSync('src/components/admissionStrategy/AdmissionStrategyMaterialViewer.tsx', 'utf8')
const teacherRepo = readFileSync('src/hub/teacherHubRepo.ts', 'utf8')
const browserIo = createBrowserHubMaterialFileIo.toString()

assert.match(hubMaterials, /openHubMaterialInSystemViewer/)
assert.match(hubMaterials, /downloadHubMaterialFile/)
assert.match(hubMaterials, /열기 후 인쇄할 수 있습니다/)
assert.match(hubMaterials, />\s*열기\s*</)
assert.match(hubMaterials, />\s*다운로드\s*</)
assert.match(hubMaterials, /canOpenHubMaterial/)
assert.doesNotMatch(hubMaterials, /미리보기/)
assert.doesNotMatch(hubMaterials, />출력</)
assert.doesNotMatch(hubMaterials, /window\.print/)
assert.doesNotMatch(hubMaterials, /window\.open/)
assert.doesNotMatch(hubMaterials, /target=_blank/)
assert.doesNotMatch(hubMaterials, /location\.replace/)
assert.doesNotMatch(hubMaterials, /AdmissionStrategyMaterialViewer/)
assert.doesNotMatch(hubMaterials, /loadHubMaterialPreview/)
assert.doesNotMatch(hubMaterials, /pdfToPageImages/)
assert.doesNotMatch(hubMaterials, /hub-preview-diag/)
assert.doesNotMatch(hubMaterials, /진단코드/)
assert.doesNotMatch(hubMaterials, /onImageError/)
assert.match(hubMaterials, /location\.assign/)
assert.match(hubMaterials, /downloadHubObjectUrl/)
assert.match(hubMaterials, /useHubContentRefresh\(reload\)/)
assert.match(hubStorageClient, /action: 'download'/)
assert.match(hubStorage, /p_mode: action === 'upload' \? 'upload' : 'download'/)
assert.match(hubStorage, /createSignedUrl\(path, 60 \* 30\)/)
assert.doesNotMatch(hubStorage, /public: true/)
assert.match(hubSw, /url\.origin !== self\.location\.origin/)
assert.match(hubSw, /preview-signed-v1/)
assert.match(hubLayout, /setMode\('loading'\)/)
assert.match(hubLayout, /\[accessKey, location\.pathname\]/)
assert.match(viewer, /export function AdmissionStrategyMaterialViewer/)
assert.match(teacherRepo, /renderPdfFileToPages/)
assert.match(browserIo, /location\.assign/)
assert.doesNotMatch(browserIo, /window\.open/)
assert.doesNotMatch(browserIo, /window\.print/)
assert.match(browserIo, /revokeObjectURL/)

console.log('hubMaterialFileAccess.test.ts passed')
