/**
 * 실행: npx tsx src/hub/hubMaterialPreview.test.ts
 *
 * 문제자료 preview: tap → signed URL(JSON) → img src.
 * 페이지 없는 PDF만 bytes → pdf.js.
 * source regex만으로 PASS 시키지 않는다.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { canStudentSignHubMaterialPath } from './hubAudience.ts'
import {
  classifyHubPreviewBytes,
  classifyHubServiceWorkerScript,
  formatHubPreviewDiag,
  hubPreviewFailureCode,
  hubPreviewFileLooksValid,
  hubPreviewPagesToViewerPages,
  hubPreviewPathCode,
  hubPreviewSrcIsReady,
  hubServiceWorkerShouldIntercept,
  loadHubMaterialPreview,
  type HubPreviewIo,
} from './hubMaterialPreview.ts'

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const htmlBytes = new TextEncoder().encode('<!doctype html><html></html>')

assert.equal(classifyHubPreviewBytes(pdfBytes), 'pdf')
assert.equal(classifyHubPreviewBytes(jpegBytes), 'image')
assert.equal(classifyHubPreviewBytes(htmlBytes), 'html')
assert.equal(hubPreviewFileLooksValid(htmlBytes, 'image'), false)
assert.equal(hubPreviewSrcIsReady('https://example.supabase.co/storage/v1/object/sign/x'), true)
assert.equal(hubPreviewSrcIsReady('blob:https://x/1'), true)
assert.equal(hubPreviewSrcIsReady('mat-a/pages/001.webp'), false)
assert.equal(
  hubPreviewPagesToViewerPages([{ pageNumber: 1, assetPath: 'mat-a/pages/001.webp', width: 1, height: 1 }])[0]?.error,
  true,
)

assert.equal(hubServiceWorkerShouldIntercept('/api/hub-storage', 'cors'), false)
assert.equal(hubServiceWorkerShouldIntercept('/hub/key/materials', 'navigate'), true)
assert.equal(hubServiceWorkerShouldIntercept('/rest/v1/rpc/get_student_hub_bundle', 'cors'), true)
assert.equal(hubServiceWorkerShouldIntercept('/storage/v1/object/sign/hub-learning-materials/x', 'no-cors'), false)
assert.equal(hubServiceWorkerShouldIntercept('/storage/v1/object/sign/hub-learning-materials/x', 'cors'), false)
assert.equal(hubServiceWorkerShouldIntercept('/assets/pdf.worker.min.mjs', 'cors'), false)
assert.equal(hubServiceWorkerShouldIntercept('/hub/sw.js', 'cors'), false)

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
  canStudentSignHubMaterialPath({ material: classAMaterial, student: studentA, path: 'mat-a/pages/001.webp' }),
  true,
)
assert.equal(
  canStudentSignHubMaterialPath({ material: classAMaterial, student: studentB, path: 'mat-a/pages/001.webp' }),
  false,
)

function mockIo(options: {
  signed?: Record<string, string>
  signFail?: Record<string, string>
  files?: Record<string, Blob>
  urls?: Record<string, Blob>
  render?: HubPreviewIo['renderPdf']
}) {
  const signs: string[] = []
  const reads: string[] = []
  const fetches: string[] = []
  const opened: string[] = []
  const io: HubPreviewIo = {
    signUrl: async (path) => {
      signs.push(path)
      if (options.signFail?.[path]) throw new Error(options.signFail[path])
      const url = options.signed?.[path]
      if (!url) throw new Error('이 파일에 접근할 수 없습니다.')
      return url
    },
    readFile: async (path) => {
      reads.push(path)
      const blob = options.files?.[path]
      if (!blob) throw new Error('이 파일에 접근할 수 없습니다.')
      return blob
    },
    fetchUrl: async (url) => {
      fetches.push(url)
      const blob = options.urls?.[url]
      if (!blob) throw new Error('미리보기 파일을 불러오지 못했습니다.')
      return blob
    },
    renderPdf: async (file) => {
      if (options.render) return options.render(file)
      throw new Error('pdfjs should not run for page-image materials')
    },
    objectUrl: (blob) => {
      const url = `blob:mock/${opened.length}-${blob.size}`
      opened.push(url)
      return url
    },
  }
  return { signs, reads, fetches, opened, io }
}

const pageMaterial = {
  kind: 'pdf' as const,
  sourceFilePath: 'mat-a/source/file.pdf',
  pages: [{ pageNumber: 1, assetPath: 'mat-a/pages/001.webp', width: 800, height: 1100 }],
}

{
  const { signs, reads, fetches, io } = mockIo({
    signed: { 'mat-a/pages/001.webp': 'https://signed.example/page-1.webp' },
  })
  const result = await loadHubMaterialPreview(pageMaterial, io)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.path, 'PREVIEW-PAGES')
    assert.equal(result.pages[0]?.assetPath, 'https://signed.example/page-1.webp')
    assert.equal(hubPreviewSrcIsReady(result.pages[0]?.assetPath ?? ''), true)
  }
  assert.deepEqual(signs, ['mat-a/pages/001.webp'])
  assert.deepEqual(reads, [])
  assert.deepEqual(fetches, [])
  const viewerPages = hubPreviewPagesToViewerPages(result.ok ? result.pages : [])
  assert.equal(viewerPages[0]?.src, 'https://signed.example/page-1.webp')
  assert.equal(viewerPages[0]?.loading, false)
  assert.equal(viewerPages[0]?.error, false)
}

{
  const { io, reads } = mockIo({
    signFail: { 'mat-a/pages/001.webp': '이 파일에 접근할 수 없습니다.' },
  })
  const result = await loadHubMaterialPreview(pageMaterial, io)
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.error, /접근할 수 없습니다/)
    assert.equal(result.code, 'SIGN-403')
    assert.equal(result.path, 'PREVIEW-PAGES')
  }
  assert.deepEqual(reads, [])
}

const sourceMaterial = {
  kind: 'pdf' as const,
  sourceFilePath: 'mat-a/source/file.pdf',
  pages: [] as { pageNumber: number; assetPath: string; width: number | null; height: number | null }[],
}

{
  let rendered = false
  const signedPdf = 'https://signed.example/source.pdf'
  const { signs, reads, fetches, io } = mockIo({
    signed: { 'mat-a/source/file.pdf': signedPdf },
    urls: { [signedPdf]: new Blob([pdfBytes], { type: 'application/pdf' }) },
    render: async () => {
      rendered = true
      return [{ pageNumber: 1, blob: new Blob([jpegBytes], { type: 'image/jpeg' }), width: 800, height: 1100 }]
    },
  })
  const result = await loadHubMaterialPreview(sourceMaterial, io)
  assert.equal(result.ok, true)
  assert.equal(rendered, true)
  if (result.ok) assert.equal(result.path, 'PREVIEW-PDF')
  assert.deepEqual(signs, ['mat-a/source/file.pdf'])
  assert.deepEqual(fetches, [signedPdf])
  assert.deepEqual(reads, [])
  if (result.ok) {
    assert.equal(result.path, 'PREVIEW-PDF')
    assert.equal(result.pages[0]?.assetPath.startsWith('blob:'), true)
  }
}

{
  const { io, reads, fetches } = mockIo({
    signed: { 'mat-a/source/file.pdf': 'https://signed.example/source.pdf' },
    files: { 'mat-a/source/file.pdf': new Blob([pdfBytes], { type: 'application/pdf' }) },
    render: async () => [{ pageNumber: 1, blob: new Blob([jpegBytes]), width: 1, height: 1 }],
  })
  const result = await loadHubMaterialPreview(sourceMaterial, io)
  assert.equal(result.ok, true)
  assert.equal(fetches.length, 1)
  assert.deepEqual(reads, ['mat-a/source/file.pdf'])
}

{
  const result = await loadHubMaterialPreview(
    { kind: 'hwp', pages: [], sourceFilePath: 'a/file.hwp' },
    mockIo({}).io,
  )
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.error, /지원하지 않습니다/)
    assert.equal(result.path, 'PREVIEW-NONE')
    assert.equal(result.code, 'PREVIEW-NONE')
  }
}

assert.equal(hubPreviewPathCode(pageMaterial), 'PREVIEW-PAGES')
assert.equal(hubPreviewPathCode(sourceMaterial), 'PREVIEW-PDF')
assert.equal(hubPreviewFailureCode('이 파일에 접근할 수 없습니다.'), 'SIGN-403')
assert.equal(hubPreviewFailureCode('413'), 'PDF-FETCH-413')
assert.equal(classifyHubServiceWorkerScript('preview-signed-v1: navigate'), 'SW-SIGNED-V1')
assert.equal(classifyHubServiceWorkerScript('old intercept all'), 'SW-OTHER')
assert.equal(formatHubPreviewDiag(['PREVIEW-PAGES', 'PREVIEW-PAGES SW-SIGNED-V1', 'IMAGE-ERROR']), 'PREVIEW-PAGES SW-SIGNED-V1 IMAGE-ERROR')

const hubMaterials = readFileSync('src/hub/HubMaterialsPage.tsx', 'utf8')
const hubLayout = readFileSync('src/hub/HubLayout.tsx', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')
const hubStorage = readFileSync('src/hub/hubStorageClient.ts', 'utf8')

assert.match(hubMaterials, /loadHubMaterialPreview/)
assert.match(hubMaterials, /downloadHubObjectUrl/)
assert.match(hubMaterials, /hubPreviewPagesToViewerPages/)
assert.match(hubMaterials, /AdmissionStrategyMaterialViewer/)
assert.match(hubMaterials, /진단코드/)
assert.match(hubMaterials, /hub-preview-diag/)
assert.match(hubMaterials, /IMAGE-ERROR/)
assert.match(hubMaterials, /onImageError/)
assert.doesNotMatch(hubMaterials, /진단코드: \$\{accessKey\}/)
assert.doesNotMatch(hubMaterials, /ConnectedAdmissionStrategyViewer/)
assert.doesNotMatch(hubMaterials, /window\.open/)
assert.doesNotMatch(hubMaterials, /target=_blank/)
assert.match(hubStorage, /action: 'download'/)
assert.match(hubSw, /if \(!bypassHttpCache\) return/)
assert.match(hubSw, /preview-signed-v1/)
assert.match(hubLayout, /setMode\('loading'\)/)
assert.match(hubLayout, /\[accessKey, location\.pathname\]/)
const hubRegistrar = readFileSync('src/hub/HubPwaRegistrar.tsx', 'utf8')
assert.match(hubRegistrar, /updateViaCache: 'none'/)

console.log('hubMaterialPreview.test.ts passed')
