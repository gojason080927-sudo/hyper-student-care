import type { HubMaterialKind } from './types'

/** a.download 직후 revoke하면 iOS Safari가 blob을 놓칠 수 있다. */
export const HUB_MATERIAL_BLOB_REVOKE_MS = 60_000

export type HubMaterialFileIo = {
  signUrl: (path: string) => Promise<string>
  fetchUrl: (url: string) => Promise<Blob>
  readFile: (path: string) => Promise<Blob>
  createObjectUrl: (blob: Blob) => string
  clickDownloadLink: (params: { href: string; filename: string }) => void
  scheduleRevoke: (objectUrl: string, delayMs?: number) => void
  assignLocation: (url: string) => void
}

export type HubMaterialOpenResult = {
  method: 'signed-navigation'
  url: string
}

export type HubMaterialDownloadResult = {
  method: 'blob' | 'file-proxy' | 'signed-navigation'
  url: string
}

export function canOpenHubMaterial(kind: HubMaterialKind): boolean {
  return kind === 'pdf' || kind === 'image'
}

export function canDownloadHubMaterial(path: string | null | undefined): boolean {
  return Boolean(path)
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function hubMaterialDownloadFilename(originalFileName: string | null | undefined): string {
  const name = originalFileName?.trim() || 'download'
  return name.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 180)
}

/**
 * PDF/이미지는 시스템·브라우저 viewer에서 연다.
 * blob URL은 문서 unload 시 revoke되어 같은 탭 이동에 쓰지 않는다.
 * await 후 window.open / target=_blank / location.replace 는 쓰지 않는다.
 */
export async function openHubMaterialInSystemViewer(
  material: { kind: HubMaterialKind; sourceFilePath: string | null },
  io: Pick<HubMaterialFileIo, 'signUrl' | 'assignLocation'>,
): Promise<HubMaterialOpenResult> {
  if (!canOpenHubMaterial(material.kind)) {
    throw new Error('이 자료는 열기를 지원하지 않습니다. 다운로드를 이용해 주세요.')
  }
  if (!material.sourceFilePath) {
    throw new Error('파일 경로가 없습니다.')
  }
  const signedUrl = await io.signUrl(material.sourceFilePath)
  if (!isSafeHttpUrl(signedUrl)) {
    throw new Error('파일 주소를 만들지 못했습니다.')
  }
  io.assignLocation(signedUrl)
  return { method: 'signed-navigation', url: signedUrl }
}

async function downloadBlob(
  blob: Blob,
  filename: string,
  io: Pick<HubMaterialFileIo, 'createObjectUrl' | 'clickDownloadLink' | 'scheduleRevoke'>,
): Promise<string> {
  const objectUrl = io.createObjectUrl(blob)
  io.clickDownloadLink({ href: objectUrl, filename })
  io.scheduleRevoke(objectUrl, HUB_MATERIAL_BLOB_REVOKE_MS)
  return objectUrl
}

/**
 * 작은 파일: signed GET → same-origin blob → <a download> (지연 revoke).
 * Vercel action=file 한도를 넘는 큰 파일/실패: signed URL 같은 탭 이동.
 */
export async function downloadHubMaterialFile(
  material: { sourceFilePath: string | null; originalFileName?: string },
  io: HubMaterialFileIo,
): Promise<HubMaterialDownloadResult> {
  if (!material.sourceFilePath) {
    throw new Error('파일 경로가 없습니다.')
  }
  const filename = hubMaterialDownloadFilename(material.originalFileName)
  const signedUrl = await io.signUrl(material.sourceFilePath)
  if (!isSafeHttpUrl(signedUrl)) {
    throw new Error('파일 주소를 만들지 못했습니다.')
  }

  try {
    const blob = await io.fetchUrl(signedUrl)
    const url = await downloadBlob(blob, filename, io)
    return { method: 'blob', url }
  } catch {
    try {
      const blob = await io.readFile(material.sourceFilePath)
      const url = await downloadBlob(blob, filename, io)
      return { method: 'file-proxy', url }
    } catch {
      io.assignLocation(signedUrl)
      return { method: 'signed-navigation', url: signedUrl }
    }
  }
}

export function createBrowserHubMaterialFileIo(): HubMaterialFileIo {
  return {
    signUrl: async () => {
      throw new Error('signUrl is not wired')
    },
    fetchUrl: async (url) => {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(res.status === 413 ? '413' : '파일을 불러오지 못했습니다.')
      return res.blob()
    },
    readFile: async () => {
      throw new Error('readFile is not wired')
    },
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    clickDownloadLink: ({ href, filename }) => {
      const link = document.createElement('a')
      link.href = href
      link.download = filename
      link.rel = 'noopener'
      document.body.appendChild(link)
      link.click()
      link.remove()
    },
    scheduleRevoke: (objectUrl, delayMs = HUB_MATERIAL_BLOB_REVOKE_MS) => {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), delayMs)
    },
    assignLocation: (url) => {
      window.location.assign(url)
    },
  }
}
