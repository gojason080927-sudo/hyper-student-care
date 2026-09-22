import { classifyHubMaterialFile } from './hubFilePolicy'

export type HubMaterialSkipReason = 'ignored' | 'unsupported'

export type PickedHubMaterialFile = {
  file: File
  title: string
}

export type HubMaterialSkip = {
  name: string
  reason: HubMaterialSkipReason
}

export type HubMaterialPickResult = {
  accepted: PickedHubMaterialFile[]
  skipped: HubMaterialSkip[]
}

const IGNORED_BASENAMES = new Set([
  '.ds_store',
  'thumbs.db',
  'ehthumbs.db',
  'desktop.ini',
  'icon\r',
  '.localized',
])

export function fileRelativePath(file: File): string {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath
  return typeof rel === 'string' ? rel.trim() : ''
}

export function materialFileKey(file: File): string {
  const relative = fileRelativePath(file)
  return `${relative || file.name}:${file.size}:${file.lastModified}`
}

export function titleFromMaterialFileName(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? name).trim()
  if (!base) return '자료'
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return base
  return base.slice(0, dot).trim() || base
}

export function isIgnoredOsFile(name: string, relativePath = ''): boolean {
  const path = (relativePath || name).replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = path.split('/').filter(Boolean)
  const base = parts[parts.length - 1] || name
  if (!base || base === '.' || base === '..') return true
  if (base.startsWith('.')) return true
  if (base.startsWith('._')) return true
  if (IGNORED_BASENAMES.has(base.toLowerCase())) return true
  return parts.some((part) => part === '__MACOSX' || (part.startsWith('.') && part !== '.' && part !== '..'))
}

export function pickHubMaterialFiles(files: Iterable<File>): HubMaterialPickResult {
  const accepted: PickedHubMaterialFile[] = []
  const skipped: HubMaterialSkip[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const relative = fileRelativePath(file)
    const display = relative || file.name
    const key = materialFileKey(file)
    if (seen.has(key)) continue
    seen.add(key)
    if (isIgnoredOsFile(file.name, relative)) {
      skipped.push({ name: display, reason: 'ignored' })
      continue
    }
    const decision = classifyHubMaterialFile(file)
    if (!decision.ok) {
      skipped.push({ name: display, reason: 'unsupported' })
      continue
    }
    accepted.push({ file, title: titleFromMaterialFileName(file.name) })
  }

  return { accepted, skipped }
}

export function mergeMaterialFiles(current: File[], incoming: Iterable<File>): File[] {
  const keys = new Set(current.map(materialFileKey))
  const next = [...current]
  for (const file of incoming) {
    const key = materialFileKey(file)
    if (keys.has(key)) continue
    keys.add(key)
    next.push(file)
  }
  return next
}

export function formatMaterialBatchResult(successCount: number, failedNames: string[]): string {
  if (failedNames.length === 0) {
    return successCount <= 1 ? '자료를 저장했습니다.' : `${successCount}개 게시 완료`
  }
  if (successCount === 0 && failedNames.length === 1) {
    return '자료 업로드에 실패했습니다.'
  }
  return `${successCount}개 게시 완료 / ${failedNames.length}개 실패`
}

/** 같은 audience 일괄 게시는 첫 성공 자료 1건만 Push한다. 알림 폭탄 방지. */
export function hubMaterialBatchPushEntityId(successIds: string[]): string | null {
  return successIds[0] ?? null
}

export function applyFolderPickerAttributes(input: HTMLInputElement | null): void {
  if (!input) return
  input.setAttribute('webkitdirectory', '')
  input.setAttribute('directory', '')
}
