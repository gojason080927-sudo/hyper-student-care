import type { HubMaterial, HubMaterialPage } from './types'

export type HubPreviewIo = {
  signUrl: (path: string) => Promise<string>
  readFile: (path: string) => Promise<Blob>
  fetchUrl: (url: string) => Promise<Blob>
  renderPdf: (file: Blob) => Promise<{ pageNumber: number; blob: Blob; width: number; height: number }[]>
  objectUrl: (blob: Blob) => string
}

export type HubPreviewResult =
  | { ok: true; pages: HubMaterialPage[] }
  | { ok: false; error: string }

export function classifyHubPreviewBytes(bytes: Uint8Array): 'pdf' | 'image' | 'json' | 'html' | 'empty' | 'unknown' {
  if (bytes.length < 4) return 'empty'
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'pdf'
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image'
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image'
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return 'image'
  const head = new TextDecoder().decode(bytes.slice(0, 48)).trim().toLowerCase()
  if (head.startsWith('{') || head.startsWith('[')) return 'json'
  if (head.startsWith('<!doctype') || head.startsWith('<html')) return 'html'
  return 'unknown'
}

export function hubPreviewFileLooksValid(bytes: Uint8Array, expected: 'pdf' | 'image' | 'any'): boolean {
  const kind = classifyHubPreviewBytes(bytes)
  if (kind === 'json' || kind === 'html' || kind === 'empty') return false
  if (expected === 'any') return kind === 'pdf' || kind === 'image' || kind === 'unknown'
  return kind === expected || kind === 'unknown'
}

/**
 * Hub SW는 navigate와 RPC만 no-store로 가로챈다.
 * /api, Storage signed URL, worker, 이미지는 브라우저 기본 fetch를 탄다.
 */
export function hubServiceWorkerShouldIntercept(pathname: string, requestMode = ''): boolean {
  if (pathname.startsWith('/api/')) return false
  return requestMode === 'navigate' || pathname.includes('/rest/v1/rpc/')
}

export function hubPreviewSrcIsReady(src: string): boolean {
  return src.startsWith('blob:') || src.startsWith('https://') || src.startsWith('http://')
}

function fail(message: string): HubPreviewResult {
  return { ok: false, error: message }
}

async function blobFromBytes(blob: Blob, expected: 'pdf' | 'image' | 'any'): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (!hubPreviewFileLooksValid(bytes, expected)) {
    throw new Error('미리보기 파일을 불러오지 못했습니다.')
  }
  return new Blob([bytes], { type: blob.type || (expected === 'pdf' ? 'application/pdf' : 'image/jpeg') })
}

async function loadPdfBytes(io: HubPreviewIo, path: string): Promise<Blob> {
  try {
    const url = await io.signUrl(path)
    return blobFromBytes(await io.fetchUrl(url), 'pdf')
  } catch {
    return blobFromBytes(await io.readFile(path), 'pdf')
  }
}

export async function loadHubMaterialPreview(
  material: Pick<HubMaterial, 'kind' | 'pages' | 'sourceFilePath'> & { originalFileName?: string },
  io: HubPreviewIo,
): Promise<HubPreviewResult> {
  try {
    if (material.pages.length > 0) {
      const pages = await Promise.all(
        material.pages.map(async (page) => {
          if (!page.assetPath) throw new Error('미리보기 페이지가 없습니다.')
          const signed = await io.signUrl(page.assetPath)
          if (!hubPreviewSrcIsReady(signed)) throw new Error('미리보기 주소를 만들지 못했습니다.')
          return {
            pageNumber: page.pageNumber,
            assetPath: signed,
            width: page.width,
            height: page.height,
          }
        }),
      )
      return { ok: true, pages }
    }

    if (!material.sourceFilePath) {
      return fail('이 자료는 미리보기를 지원하지 않습니다. 다운로드를 이용해 주세요.')
    }

    if (material.kind === 'pdf') {
      const blob = await loadPdfBytes(io, material.sourceFilePath)
      const rendered = await io.renderPdf(blob)
      if (rendered.length === 0) return fail('PDF에 페이지가 없습니다.')
      return {
        ok: true,
        pages: rendered.map((page) => ({
          pageNumber: page.pageNumber,
          assetPath: io.objectUrl(page.blob),
          width: page.width,
          height: page.height,
        })),
      }
    }

    if (material.kind === 'image') {
      const signed = await io.signUrl(material.sourceFilePath)
      if (!hubPreviewSrcIsReady(signed)) return fail('미리보기 주소를 만들지 못했습니다.')
      return {
        ok: true,
        pages: [{ pageNumber: 1, assetPath: signed, width: null, height: null }],
      }
    }

    return fail('이 자료는 미리보기를 지원하지 않습니다. 다운로드를 이용해 주세요.')
  } catch (err) {
    return fail(err instanceof Error ? err.message : '미리보기를 불러오지 못했습니다.')
  }
}

export function hubPreviewPagesToViewerPages(pages: HubMaterialPage[]): {
  pageNumber: number
  src: string | null
  width: number | null
  height: number | null
  loading: boolean
  error: boolean
}[] {
  return pages.map((page) => {
    const ready = hubPreviewSrcIsReady(page.assetPath)
    return {
      pageNumber: page.pageNumber,
      src: ready ? page.assetPath : null,
      width: page.width,
      height: page.height,
      loading: false,
      error: !ready,
    }
  })
}
