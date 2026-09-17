import type { HubMaterial, HubMaterialPage } from './types'

export type HubPreviewIo = {
  readFile: (path: string) => Promise<Blob>
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

/** Hub SW must not intercept /api so Samsung Chrome can POST the file body. */
export function hubServiceWorkerShouldIntercept(pathname: string): boolean {
  return !pathname.startsWith('/api/')
}

function fail(message: string): HubPreviewResult {
  return { ok: false, error: message }
}

async function blobFromPath(
  io: HubPreviewIo,
  path: string,
  expected: 'pdf' | 'image' | 'any',
): Promise<Blob> {
  const blob = await io.readFile(path)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  if (!hubPreviewFileLooksValid(bytes, expected)) {
    throw new Error('미리보기 파일을 불러오지 못했습니다.')
  }
  return new Blob([bytes], { type: blob.type || (expected === 'pdf' ? 'application/pdf' : 'image/jpeg') })
}

export async function loadHubMaterialPreview(
  material: Pick<HubMaterial, 'kind' | 'pages' | 'sourceFilePath'> & { originalFileName?: string },
  io: HubPreviewIo,
): Promise<HubPreviewResult> {
  try {
    if (material.pages.length > 0) {
      const pages: HubMaterialPage[] = []
      for (const page of material.pages) {
        if (!page.assetPath) return fail('미리보기 페이지가 없습니다.')
        const blob = await blobFromPath(io, page.assetPath, 'image')
        pages.push({
          pageNumber: page.pageNumber,
          assetPath: io.objectUrl(blob),
          width: page.width,
          height: page.height,
        })
      }
      return { ok: true, pages }
    }

    if (!material.sourceFilePath) {
      return fail('이 자료는 미리보기를 지원하지 않습니다. 다운로드를 이용해 주세요.')
    }

    if (material.kind === 'pdf') {
      const blob = await blobFromPath(io, material.sourceFilePath, 'pdf')
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
      const blob = await blobFromPath(io, material.sourceFilePath, 'image')
      return {
        ok: true,
        pages: [{ pageNumber: 1, assetPath: io.objectUrl(blob), width: null, height: null }],
      }
    }

    return fail('이 자료는 미리보기를 지원하지 않습니다. 다운로드를 이용해 주세요.')
  } catch (err) {
    return fail(err instanceof Error ? err.message : '미리보기를 불러오지 못했습니다.')
  }
}
