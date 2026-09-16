import type { HubAttachmentKind, HubMaterialKind } from './types'

export const HUB_BLOCKED_EXTENSIONS = [
  'exe',
  'apk',
  'bat',
  'cmd',
  'sh',
  'js',
  'msi',
  'com',
  'scr',
  'pif',
  'vbs',
  'ps1',
  'jar',
  'dll',
  'so',
  'dmg',
  'pkg',
  'html',
  'htm',
  'php',
  'py',
  'rb',
  'wasm',
  'app',
] as const

const BLOCKED_EXT = new Set<string>(HUB_BLOCKED_EXTENSIONS)
const GENERIC_MIMES = new Set(['', 'application/octet-stream', 'binary/octet-stream'])

const BLOCKED_MIMES = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  'application/javascript',
  'text/javascript',
  'application/x-sh',
  'application/x-bat',
  'application/x-msdos-program',
])

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])
const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm'])
const PDF_EXTS = new Set(['pdf'])
const FILE_EXTS = new Set(['hwp', 'hwpx', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv'])

const MIME_BY_EXT: Record<string, readonly string[]> = {
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  pdf: ['application/pdf'],
  mp4: ['video/mp4', 'video/mpeg'],
  mov: ['video/quicktime', 'video/mp4'],
  webm: ['video/webm'],
  hwp: ['application/x-hwp', 'application/haansofthwp', 'application/vnd.hancom.hwp', 'application/hwp'],
  hwpx: ['application/vnd.hancom.hwpx', 'application/hwpx', 'application/x-hwp+zip'],
  doc: ['application/msword', 'application/doc'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ppt: ['application/vnd.ms-powerpoint', 'application/mspowerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain', 'text/txt'],
  csv: ['text/csv', 'text/plain', 'application/csv'],
}

const CANONICAL_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  hwp: 'application/x-hwp',
  hwpx: 'application/vnd.hancom.hwpx',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  csv: 'text/csv',
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'video/mp4': 'mp4',
  'video/mpeg': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export type HubFileDecision =
  | {
      ok: true
      kind: HubAttachmentKind
      ext: string
      mime: string
    }
  | {
      ok: false
      error: string
    }

function normalizeExt(nameOrExt: string): string {
  const base = nameOrExt.split(/[?#]/)[0] ?? nameOrExt
  const raw = base.includes('.') ? (base.split('.').pop() ?? '') : base
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeMime(mime: string | undefined | null): string {
  return (mime ?? '').trim().toLowerCase()
}

export function kindForExtension(ext: string): HubAttachmentKind | null {
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (PDF_EXTS.has(ext)) return 'pdf'
  if (VIDEO_EXTS.has(ext)) return 'video'
  if (FILE_EXTS.has(ext)) return 'file'
  return null
}

export function isHubFileAllowed(kind: HubAttachmentKind, mime: string, ext: string): boolean {
  const vMime = normalizeMime(mime)
  let vExt = normalizeExt(ext)
  if (BLOCKED_EXT.has(vExt)) return false
  if (BLOCKED_MIMES.has(vMime)) return false
  if (!vExt) vExt = EXT_BY_MIME[vMime] ?? ''
  if (!vExt) return false
  if (kindForExtension(vExt) !== kind) return false
  if (GENERIC_MIMES.has(vMime)) return true
  return (MIME_BY_EXT[vExt] ?? []).includes(vMime)
}

export function classifyHubUpload(file: { name: string; type?: string }): HubFileDecision {
  const mime = normalizeMime(file.type)
  if (BLOCKED_MIMES.has(mime)) {
    return { ok: false, error: '허용되지 않는 파일 형식입니다.' }
  }
  let ext = normalizeExt(file.name)
  if (BLOCKED_EXT.has(ext)) {
    return { ok: false, error: '실행 파일은 첨부할 수 없습니다.' }
  }
  if (!ext) ext = EXT_BY_MIME[mime] ?? ''
  if (!ext) {
    return { ok: false, error: '지원하지 않는 파일입니다. 확장자를 확인해 주세요.' }
  }
  const kind = kindForExtension(ext)
  if (!kind) {
    return { ok: false, error: '지원하지 않는 파일 형식입니다.' }
  }
  if (!isHubFileAllowed(kind, mime, ext)) {
    return { ok: false, error: '파일 확장자와 형식이 일치하지 않습니다.' }
  }
  return {
    ok: true,
    kind,
    ext,
    mime: GENERIC_MIMES.has(mime) ? (CANONICAL_MIME[ext] ?? 'application/octet-stream') : mime,
  }
}

export function classifyHubMaterialFile(file: { name: string; type?: string }): HubFileDecision {
  const decision = classifyHubUpload(file)
  if (!decision.ok) return decision
  if (decision.kind === 'video') {
    return { ok: false, error: '문제 자료실은 영상을 올리지 않습니다. 영상 자료실을 이용해 주세요.' }
  }
  return decision
}

export function materialKindFromDecision(decision: Extract<HubFileDecision, { ok: true }>): HubMaterialKind {
  if (decision.kind === 'pdf') return 'pdf'
  if (decision.kind === 'image') return 'image'
  if (decision.ext === 'hwp') return 'hwp'
  if (decision.ext === 'hwpx') return 'hwpx'
  if (decision.ext === 'docx') return 'docx'
  if (decision.ext === 'pptx') return 'pptx'
  return 'file'
}

export function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0B'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10}KB`
  return `${Math.round(bytes / 104857.6) / 10}MB`
}

export function videoNeedsDownloadFallback(mime: string, name: string): boolean {
  const ext = normalizeExt(name)
  const vMime = normalizeMime(mime)
  return ext === 'mov' || vMime === 'video/quicktime' || vMime.includes('hevc') || vMime.includes('h265')
}

export const HUB_QUESTION_ACCEPT =
  'image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm'

export const HUB_MATERIAL_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.gif,.hwp,.hwpx,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv'
