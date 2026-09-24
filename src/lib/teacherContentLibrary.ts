import { getSupabase } from './supabase'
import {
  TEACHER_CONTENT_LIBRARY_ALLOWED_MIME_TYPES,
  TEACHER_CONTENT_LIBRARY_BUCKET,
  TEACHER_CONTENT_LIBRARY_CATEGORIES,
  TEACHER_CONTENT_LIBRARY_KINDS,
  TEACHER_CONTENT_LIBRARY_MAX_BYTES,
  TEACHER_CONTENT_LIBRARY_STATUSES,
  TEACHER_CONTENT_LIBRARY_TABLE,
  type TeacherContentLibraryCategory,
  type TeacherContentLibraryDraft,
  type TeacherContentLibraryFilters,
  type TeacherContentLibraryItem,
  type TeacherContentLibraryKind,
  type TeacherContentLibraryStatus,
} from '../types/teacherContentLibrary'

type TeacherContentLibraryRow = {
  id: string
  title: string
  source_url: string | null
  content_kind: string
  category: string
  tags: string[] | null
  memo: string | null
  status: string
  file_path: string | null
  file_name: string | null
  file_mime: string | null
  file_size: number | null
  created_by_email: string | null
  created_at: string
  updated_at: string
}

export function emptyTeacherContentLibraryDraft(): TeacherContentLibraryDraft {
  return {
    title: '',
    sourceUrl: '',
    category: '기타',
    tagsText: '',
    memo: '',
    status: '미사용',
  }
}

export function draftFromTeacherContentLibraryItem(
  item: TeacherContentLibraryItem,
): TeacherContentLibraryDraft {
  return {
    title: item.title,
    sourceUrl: item.sourceUrl ?? '',
    category: item.category,
    tagsText: item.tags.join(', '),
    memo: item.memo,
    status: item.status,
  }
}

export function parseTeacherContentLibraryTags(value: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of value.split(/[,#]/)) {
    const tag = part.trim().replace(/^#/, '')
    if (!tag || seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
  }
  return tags
}

export function normalizeTeacherContentLibraryUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function isAllowedTeacherContentLibraryMime(mime: string): boolean {
  return (TEACHER_CONTENT_LIBRARY_ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

export function teacherContentLibraryFileError(file: File): string | null {
  if (file.size > TEACHER_CONTENT_LIBRARY_MAX_BYTES) {
    return '파일은 50MB 이하만 업로드할 수 있습니다. SNS 영상은 원본 URL로 저장하세요.'
  }
  if (!isAllowedTeacherContentLibraryMime(file.type)) {
    return '이미지, 영상, PDF, Word, PPT 파일만 업로드할 수 있습니다.'
  }
  return null
}

export function resolveTeacherContentLibraryKind(input: {
  sourceUrl: string | null
  filePath: string | null
}): TeacherContentLibraryKind {
  const hasUrl = Boolean(input.sourceUrl)
  const hasFile = Boolean(input.filePath)
  if (hasUrl && hasFile) return 'mixed'
  if (hasFile) return 'file'
  return 'link'
}

export function teacherContentLibraryDraftError(
  draft: TeacherContentLibraryDraft,
  file: File | null,
  existingFilePath: string | null,
): string | null {
  if (!draft.title.trim()) return '제목을 입력하세요.'
  const sourceUrl = draft.sourceUrl.trim()
    ? normalizeTeacherContentLibraryUrl(draft.sourceUrl)
    : null
  if (draft.sourceUrl.trim() && !sourceUrl) {
    return '원본 URL은 http 또는 https 주소여야 합니다.'
  }
  if (file) {
    const fileError = teacherContentLibraryFileError(file)
    if (fileError) return fileError
  }
  if (!sourceUrl && !file && !existingFilePath) {
    return '원본 URL 또는 첨부파일 중 하나는 필요합니다.'
  }
  return null
}

export function filterTeacherContentLibraryItems(
  items: TeacherContentLibraryItem[],
  filters: TeacherContentLibraryFilters,
): TeacherContentLibraryItem[] {
  const query = filters.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.category !== 'all' && item.category !== filters.category) return false
    if (filters.status !== 'all' && item.status !== filters.status) return false
    if (!query) return true
    const haystack = [
      item.title,
      item.memo,
      item.sourceUrl ?? '',
      item.fileName ?? '',
      item.tags.join(' '),
      item.category,
      item.status,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
}

function isCategory(value: string): value is TeacherContentLibraryCategory {
  return (TEACHER_CONTENT_LIBRARY_CATEGORIES as readonly string[]).includes(value)
}

function isStatus(value: string): value is TeacherContentLibraryStatus {
  return (TEACHER_CONTENT_LIBRARY_STATUSES as readonly string[]).includes(value)
}

function isKind(value: string): value is TeacherContentLibraryKind {
  return (TEACHER_CONTENT_LIBRARY_KINDS as readonly string[]).includes(value)
}

export function teacherContentLibraryItemFromRow(row: TeacherContentLibraryRow): TeacherContentLibraryItem {
  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.source_url,
    contentKind: isKind(row.content_kind) ? row.content_kind : 'link',
    category: isCategory(row.category) ? row.category : '기타',
    tags: Array.isArray(row.tags) ? row.tags.filter((tag) => tag.trim().length > 0) : [],
    memo: row.memo ?? '',
    status: isStatus(row.status) ? row.status : '미사용',
    filePath: row.file_path,
    fileName: row.file_name,
    fileMime: row.file_mime,
    fileSize: row.file_size,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function teacherContentLibraryObjectPath(itemId: string, file: File): string {
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : ''
  const safeExt = ext.replace(/[^a-z0-9.]/g, '') || ''
  return `${itemId}/source/${Date.now()}${safeExt}`
}

export async function listTeacherContentLibraryItems(): Promise<TeacherContentLibraryItem[]> {
  const { data, error } = await getSupabase()
    .from(TEACHER_CONTENT_LIBRARY_TABLE)
    .select(
      'id, title, source_url, content_kind, category, tags, memo, status, file_path, file_name, file_mime, file_size, created_by_email, created_at, updated_at',
    )
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message || '자료 보관함을 불러오지 못했습니다.')
  return (data as TeacherContentLibraryRow[] | null ?? []).map(teacherContentLibraryItemFromRow)
}

export async function uploadTeacherContentLibraryFile(itemId: string, file: File): Promise<{
  filePath: string
  fileName: string
  fileMime: string
  fileSize: number
}> {
  const fileError = teacherContentLibraryFileError(file)
  if (fileError) throw new Error(fileError)

  const filePath = teacherContentLibraryObjectPath(itemId, file)
  const { error } = await getSupabase().storage.from(TEACHER_CONTENT_LIBRARY_BUCKET).upload(filePath, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw new Error(error.message || '파일을 업로드하지 못했습니다.')
  return {
    filePath,
    fileName: file.name,
    fileMime: file.type,
    fileSize: file.size,
  }
}

export async function createTeacherContentLibrarySignedUrl(
  filePath: string,
  expiresIn = 60 * 10,
): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(TEACHER_CONTENT_LIBRARY_BUCKET)
    .createSignedUrl(filePath, expiresIn)
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || '첨부파일을 열 수 없습니다.')
  }
  return data.signedUrl
}

export async function removeTeacherContentLibraryFile(filePath: string | null): Promise<void> {
  if (!filePath) return
  const { error } = await getSupabase().storage.from(TEACHER_CONTENT_LIBRARY_BUCKET).remove([filePath])
  if (error) throw new Error(error.message || '첨부파일을 삭제하지 못했습니다.')
}

export async function saveTeacherContentLibraryItem(input: {
  id?: string
  draft: TeacherContentLibraryDraft
  file?: File | null
  existing?: TeacherContentLibraryItem | null
  createdByEmail?: string | null
}): Promise<TeacherContentLibraryItem> {
  const existing = input.existing ?? null
  const error = teacherContentLibraryDraftError(input.draft, input.file ?? null, existing?.filePath ?? null)
  if (error) throw new Error(error)

  const id = input.id ?? existing?.id ?? crypto.randomUUID()
  let filePath = existing?.filePath ?? null
  let fileName = existing?.fileName ?? null
  let fileMime = existing?.fileMime ?? null
  let fileSize = existing?.fileSize ?? null

  if (input.file) {
    const uploaded = await uploadTeacherContentLibraryFile(id, input.file)
    if (filePath && filePath !== uploaded.filePath) {
      await removeTeacherContentLibraryFile(filePath)
    }
    filePath = uploaded.filePath
    fileName = uploaded.fileName
    fileMime = uploaded.fileMime
    fileSize = uploaded.fileSize
  }

  const sourceUrl = input.draft.sourceUrl.trim()
    ? normalizeTeacherContentLibraryUrl(input.draft.sourceUrl)
    : null
  const contentKind = resolveTeacherContentLibraryKind({ sourceUrl, filePath })
  const { data: sessionData } = await getSupabase().auth.getUser()

  const payload = {
    id,
    title: input.draft.title.trim(),
    source_url: sourceUrl,
    content_kind: contentKind,
    category: input.draft.category,
    tags: parseTeacherContentLibraryTags(input.draft.tagsText),
    memo: input.draft.memo.trim(),
    status: input.draft.status,
    file_path: filePath,
    file_name: fileName,
    file_mime: fileMime,
    file_size: fileSize,
    created_by: sessionData.user?.id ?? null,
    created_by_email: input.createdByEmail ?? sessionData.user?.email ?? existing?.createdByEmail ?? null,
  }

  const { data, error: writeError } = await getSupabase()
    .from(TEACHER_CONTENT_LIBRARY_TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select(
      'id, title, source_url, content_kind, category, tags, memo, status, file_path, file_name, file_mime, file_size, created_by_email, created_at, updated_at',
    )
    .single()

  if (writeError || !data) {
    throw new Error(writeError?.message || '자료를 저장하지 못했습니다.')
  }
  return teacherContentLibraryItemFromRow(data as TeacherContentLibraryRow)
}

export async function deleteTeacherContentLibraryItem(item: TeacherContentLibraryItem): Promise<void> {
  const { error } = await getSupabase().from(TEACHER_CONTENT_LIBRARY_TABLE).delete().eq('id', item.id)
  if (error) throw new Error(error.message || '자료를 삭제하지 못했습니다.')
  await removeTeacherContentLibraryFile(item.filePath)
}
