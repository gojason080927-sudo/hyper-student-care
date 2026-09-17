/**
 * 실행: npx tsx src/hub/hubMaterialPreview.test.ts
 *
 * 실제 tap → file request → blob → render → preview state 경로.
 * source regex만으로 PASS 시키지 않는다.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { canStudentSignHubMaterialPath } from './hubAudience.ts'
import {
  classifyHubPreviewBytes,
  hubPreviewFileLooksValid,
  hubServiceWorkerShouldIntercept,
  loadHubMaterialPreview,
} from './hubMaterialPreview.ts'

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const htmlBytes = new TextEncoder().encode('<!doctype html><html><body>index</body></html>')
const jsonBytes = new TextEncoder().encode('{"error":"forbidden"}')

assert.equal(classifyHubPreviewBytes(pdfBytes), 'pdf')
assert.equal(classifyHubPreviewBytes(jpegBytes), 'image')
assert.equal(classifyHubPreviewBytes(htmlBytes), 'html')
assert.equal(classifyHubPreviewBytes(jsonBytes), 'json')
assert.equal(classifyHubPreviewBytes(new Uint8Array([1, 2])), 'empty')
assert.equal(hubPreviewFileLooksValid(htmlBytes, 'image'), false)
assert.equal(hubPreviewFileLooksValid(jsonBytes, 'pdf'), false)
assert.equal(hubPreviewFileLooksValid(jpegBytes, 'image'), true)
assert.equal(hubPreviewFileLooksValid(pdfBytes, 'pdf'), true)

assert.equal(hubServiceWorkerShouldIntercept('/api/hub-storage'), false)
assert.equal(hubServiceWorkerShouldIntercept('/hub/sw.js'), true)
assert.equal(hubServiceWorkerShouldIntercept('/rest/v1/rpc/get_student_hub_bundle'), true)

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
  files?: Record<string, Blob>
  fail?: Record<string, string>
  render?: HubPreviewIoRender
}) {
  const reads: string[] = []
  const opened: string[] = []
  return {
    reads,
    opened,
    io: {
      readFile: async (path: string) => {
        reads.push(path)
        if (options.fail?.[path]) throw new Error(options.fail[path])
        const blob = options.files?.[path]
        if (!blob) throw new Error('이 파일에 접근할 수 없습니다.')
        return blob
      },
      renderPdf: async (file: Blob) => {
        if (options.render) return options.render(file)
        throw new Error('pdfjs should not run for page-image materials')
      },
      objectUrl: (blob: Blob) => {
        const url = `blob:mock/${opened.length}-${blob.size}`
        opened.push(url)
        return url
      },
    },
  }
}

type HubPreviewIoRender = (file: Blob) => Promise<{ pageNumber: number; blob: Blob; width: number; height: number }[]>

const pageMaterial = {
  kind: 'pdf' as const,
  sourceFilePath: 'mat-a/source/file.pdf',
  pages: [{ pageNumber: 1, assetPath: 'mat-a/pages/001.webp', width: 800, height: 1100 }],
}

{
  const { reads, opened, io } = mockIo({
    files: { 'mat-a/pages/001.webp': new Blob([jpegBytes], { type: 'image/jpeg' }) },
  })
  const result = await loadHubMaterialPreview(pageMaterial, io)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.pages.length, 1)
    assert.equal(result.pages[0]?.assetPath.startsWith('blob:'), true)
    assert.equal(result.pages[0]?.pageNumber, 1)
  }
  assert.deepEqual(reads, ['mat-a/pages/001.webp'])
  assert.equal(opened.length, 1)
}

{
  const { io, reads } = mockIo({
    fail: { 'mat-a/pages/001.webp': '이 파일에 접근할 수 없습니다.' },
  })
  const result = await loadHubMaterialPreview(pageMaterial, io)
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /접근할 수 없습니다/)
  assert.deepEqual(reads, ['mat-a/pages/001.webp'])
}

{
  const { io } = mockIo({
    files: { 'mat-a/pages/001.webp': new Blob([htmlBytes], { type: 'text/html' }) },
  })
  const result = await loadHubMaterialPreview(pageMaterial, io)
  assert.equal(result.ok, false)
  if (!result.ok) assert.equal(result.error, '미리보기 파일을 불러오지 못했습니다.')
}

const sourceMaterial = {
  kind: 'pdf' as const,
  sourceFilePath: 'mat-a/source/file.pdf',
  pages: [] as { pageNumber: number; assetPath: string; width: number | null; height: number | null }[],
}

{
  let rendered = false
  const { reads, io } = mockIo({
    files: { 'mat-a/source/file.pdf': new Blob([pdfBytes], { type: 'application/pdf' }) },
    render: async () => {
      rendered = true
      return [{ pageNumber: 1, blob: new Blob([jpegBytes], { type: 'image/jpeg' }), width: 800, height: 1100 }]
    },
  })
  const result = await loadHubMaterialPreview(sourceMaterial, io)
  assert.equal(result.ok, true)
  assert.equal(rendered, true)
  assert.deepEqual(reads, ['mat-a/source/file.pdf'])
  if (result.ok) assert.equal(result.pages[0]?.assetPath.startsWith('blob:'), true)
}

{
  const { io } = mockIo({
    fail: { 'mat-a/source/file.pdf': '이 파일에 접근할 수 없습니다.' },
  })
  const result = await loadHubMaterialPreview(sourceMaterial, io)
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /접근할 수 없습니다/)
}

{
  const result = await loadHubMaterialPreview(
    { kind: 'hwp', pages: [], sourceFilePath: 'a/file.hwp' },
    mockIo({}).io,
  )
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /지원하지 않습니다/)
}

const hubMaterials = readFileSync('src/hub/HubMaterialsPage.tsx', 'utf8')
const hubLayout = readFileSync('src/hub/HubLayout.tsx', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')
const hubStorage = readFileSync('src/hub/hubStorageClient.ts', 'utf8')

assert.match(hubMaterials, /loadHubMaterialPreview/)
assert.match(hubMaterials, /미리보기를 불러오는 중/)
assert.doesNotMatch(hubMaterials, /window\.open/)
assert.doesNotMatch(hubMaterials, /target=_blank/)
assert.match(hubStorage, /action: 'file'/)
assert.match(hubSw, /pathname\.startsWith\('\/api\/'\)/)
assert.match(hubLayout, /setMode\('loading'\)/)
assert.match(hubLayout, /\[accessKey, location\.pathname\]/)

console.log('hubMaterialPreview.test.ts passed')
