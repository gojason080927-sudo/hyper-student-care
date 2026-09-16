import { getSupabase } from '../lib/supabase'
import { createId } from '../utils/id'
import { renderPdfFileToPages } from '../lib/admissionStrategy/pdfToPageImages'
import type {
  HubAssignment,
  HubAudienceType,
  HubInboxItem,
  HubMaterial,
  HubMaterialKind,
  HubQuestionAttachment,
  HubVideo,
} from './types'
import { HUB_LEARNING_MATERIALS_BUCKET } from './types'
import { classifyHubMaterialFile, materialKindFromDecision } from './hubFilePolicy'

function throwIfError(error: { message?: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback)
}

export async function teacherFetchAssignments(): Promise<HubAssignment[]> {
  const { data, error } = await getSupabase()
    .from('class_hub_assignments')
    .select('*')
    .order('created_at', { ascending: false })
  throwIfError(error, '과제를 불러오지 못했습니다.')
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    grade: String(row.grade ?? ''),
    className: String(row.class_name ?? ''),
    subject: String(row.subject ?? ''),
    textbookName: String(row.textbook_name ?? ''),
    content: String(row.content ?? ''),
    dueDate: typeof row.due_date === 'string' ? row.due_date : null,
    studentId: typeof row.student_id === 'string' ? row.student_id : null,
    published: row.published === true,
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }))
}

export async function teacherSaveAssignment(record: HubAssignment): Promise<void> {
  const { error } = await getSupabase().from('class_hub_assignments').upsert({
    id: record.id,
    grade: record.grade,
    class_name: record.className,
    subject: record.subject,
    textbook_name: record.textbookName || null,
    content: record.content,
    due_date: record.dueDate,
    student_id: record.studentId,
    published: record.published,
    published_at: record.published ? record.publishedAt || new Date().toISOString() : null,
  })
  throwIfError(error, '과제 저장에 실패했습니다.')
}

export async function teacherDeleteAssignment(id: string): Promise<void> {
  const { error } = await getSupabase().from('class_hub_assignments').delete().eq('id', id)
  throwIfError(error, '과제 삭제에 실패했습니다.')
}

export async function teacherFetchVideos(): Promise<HubVideo[]> {
  const { data, error } = await getSupabase().from('hub_videos').select('*').order('created_at', { ascending: false })
  throwIfError(error, '영상을 불러오지 못했습니다.')
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    videoUrl: String(row.video_url ?? ''),
    videoId: String(row.video_id ?? ''),
    audienceType: (row.audience_type as HubAudienceType) || 'all',
    targetGrade: typeof row.target_grade === 'string' ? row.target_grade : null,
    targetClassName: typeof row.target_class_name === 'string' ? row.target_class_name : null,
    targetStudentId: typeof row.target_student_id === 'string' ? row.target_student_id : null,
    published: row.published === true,
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    timestamps: Array.isArray(row.timestamps)
      ? row.timestamps.flatMap((item) => {
          if (!item || typeof item !== 'object') return []
          const stamp = item as Record<string, unknown>
          const seconds = Number(stamp.seconds ?? 0)
          if (!Number.isFinite(seconds) || seconds < 0) return []
          return [{ label: String(stamp.label ?? ''), seconds }]
        })
      : [],
    createdAt: String(row.created_at ?? ''),
  }))
}

export async function teacherSaveVideo(record: HubVideo): Promise<void> {
  const { error } = await getSupabase().from('hub_videos').upsert({
    id: record.id,
    title: record.title,
    description: record.description,
    video_url: record.videoUrl,
    video_id: record.videoId,
    audience_type: record.audienceType,
    target_grade: record.targetGrade,
    target_class_name: record.targetClassName,
    target_student_id: record.targetStudentId,
    published: record.published,
    published_at: record.published ? record.publishedAt || new Date().toISOString() : null,
    timestamps: record.timestamps ?? [],
  })
  throwIfError(error, '영상 저장에 실패했습니다.')
}

export async function teacherDeleteVideo(id: string): Promise<void> {
  const { error } = await getSupabase().from('hub_videos').delete().eq('id', id)
  throwIfError(error, '영상 삭제에 실패했습니다.')
}

export async function teacherFetchInbox(): Promise<HubInboxItem[]> {
  const { data, error } = await getSupabase()
    .from('student_hub_inbox')
    .select('*, students(name), hub_inbox_attachments(*)')
    .order('created_at', { ascending: false })
  throwIfError(error, '받은 글을 불러오지 못했습니다.')
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const student = row.students as { name?: string } | null
    const attachments = Array.isArray(row.hub_inbox_attachments) ? row.hub_inbox_attachments : []
    return {
      id: String(row.id),
      kind: row.kind === 'suggestion' ? 'suggestion' : 'material_request',
      title: String(row.title ?? ''),
      content: String(row.content ?? ''),
      status: String(row.status ?? '접수'),
      createdAt: String(row.created_at ?? ''),
      studentId: typeof row.student_id === 'string' ? row.student_id : undefined,
      studentName: student?.name,
      attachments: attachments.map((item) => {
        const file = item as Record<string, unknown>
        return {
          id: String(file.id),
          storagePath: String(file.storage_path ?? ''),
          mime: String(file.mime ?? ''),
          byteSize: Number(file.byte_size ?? 0),
          originalName: String(file.original_name ?? ''),
          ready: file.ready === true,
        }
      }),
    }
  })
}

export async function teacherUpdateInboxStatus(id: string, status: string): Promise<void> {
  const { error } = await getSupabase().from('student_hub_inbox').update({ status }).eq('id', id)
  throwIfError(error, '상태 변경에 실패했습니다.')
}

export async function teacherSignedUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(path, 60 * 10)
  throwIfError(error, '파일을 열지 못했습니다.')
  if (!data?.signedUrl) throw new Error('파일을 열지 못했습니다.')
  return data.signedUrl
}

export type TeacherQuestionAttachment = HubQuestionAttachment & { questionId: string }

function isMissingRelation(error: { message?: string; code?: string } | null): boolean {
  const msg = `${error?.message ?? ''} ${error?.code ?? ''}`
  return /does not exist|schema cache|42P01/i.test(msg)
}

export async function teacherFetchQuestionAttachments(): Promise<TeacherQuestionAttachment[]> {
  const { data, error } = await getSupabase()
    .from('question_attachments')
    .select('*')
    .eq('ready', true)
    .order('created_at', { ascending: true })
  if (error) {
    if (isMissingRelation(error)) return []
    throw new Error(error.message || '질문 첨부를 불러오지 못했습니다.')
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    questionId: String(row.question_id),
    kind: (row.kind as HubQuestionAttachment['kind']) || 'file',
    storagePath: String(row.storage_path ?? ''),
    mime: String(row.mime ?? ''),
    byteSize: Number(row.byte_size ?? 0),
    durationMs: typeof row.duration_ms === 'number' ? row.duration_ms : null,
    originalName: String(row.original_name ?? ''),
    ready: row.ready === true,
  }))
}

export function groupAttachmentsByQuestion(
  items: TeacherQuestionAttachment[],
): Record<string, HubQuestionAttachment[]> {
  const grouped: Record<string, HubQuestionAttachment[]> = {}
  for (const item of items) {
    const list = grouped[item.questionId] ?? []
    list.push(item)
    grouped[item.questionId] = list
  }
  return grouped
}

function detectMaterialKind(file: File): HubMaterialKind {
  const decision = classifyHubMaterialFile(file)
  if (!decision.ok) throw new Error(decision.error)
  return materialKindFromDecision(decision)
}

export async function teacherFetchMaterials(): Promise<HubMaterial[]> {
  const { data, error } = await getSupabase()
    .from('hub_learning_materials')
    .select('*, hub_learning_material_pages(*)')
    .order('created_at', { ascending: false })
  throwIfError(error, '자료를 불러오지 못했습니다.')
  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const pages = Array.isArray(row.hub_learning_material_pages) ? row.hub_learning_material_pages : []
    return {
      id: String(row.id),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      kind: (row.kind as HubMaterialKind) || 'file',
      originalFileName: String(row.original_file_name ?? ''),
      sourceFilePath: typeof row.source_file_path === 'string' ? row.source_file_path : null,
      mime: String(row.mime ?? ''),
      pageCount: Number(row.page_count ?? 0),
      status: (row.status as HubMaterial['status']) || 'DRAFT',
      audienceType: (row.audience_type as HubAudienceType) || 'all',
      targetGrade: typeof row.target_grade === 'string' ? row.target_grade : null,
      targetClassName: typeof row.target_class_name === 'string' ? row.target_class_name : null,
      targetStudentId: typeof row.target_student_id === 'string' ? row.target_student_id : null,
      publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
      createdAt: String(row.created_at ?? ''),
      pages: pages
        .map((page) => {
          const item = page as Record<string, unknown>
          return {
            pageNumber: Number(item.page_number ?? 0),
            assetPath: String(item.asset_path ?? ''),
            width: typeof item.width === 'number' ? item.width : null,
            height: typeof item.height === 'number' ? item.height : null,
          }
        })
        .sort((a, b) => a.pageNumber - b.pageNumber),
    }
  })
}

export async function teacherUploadMaterial(params: {
  title: string
  description: string
  file: File
  audienceType: HubAudienceType
  targetGrade: string | null
  targetClassName: string | null
  targetStudentId: string | null
  publish: boolean
}): Promise<void> {
  const decision = classifyHubMaterialFile(params.file)
  if (!decision.ok) throw new Error(decision.error)
  const id = createId()
  const kind = detectMaterialKind(params.file)
  const ext = decision.ext
  const sourcePath = `${id}/source/${createId()}.${ext}`
  const { error: uploadError } = await getSupabase()
    .storage.from(HUB_LEARNING_MATERIALS_BUCKET)
    .upload(sourcePath, params.file, { upsert: true, contentType: decision.mime })
  throwIfError(uploadError, '원본 업로드에 실패했습니다.')

  const pages: { page_number: number; asset_path: string; width: number | null; height: number | null }[] = []
  if (kind === 'pdf') {
    const rendered = await renderPdfFileToPages(params.file)
    for (const page of rendered) {
      const assetPath = `${id}/pages/${createId()}-${String(page.pageNumber).padStart(3, '0')}.${page.extension}`
      const { error } = await getSupabase()
        .storage.from(HUB_LEARNING_MATERIALS_BUCKET)
        .upload(assetPath, page.blob, { upsert: true, contentType: page.contentType })
      throwIfError(error, '미리보기 페이지 업로드에 실패했습니다.')
      pages.push({
        page_number: page.pageNumber,
        asset_path: assetPath,
        width: page.width,
        height: page.height,
      })
    }
  } else if (kind === 'image') {
    const assetPath = `${id}/pages/${createId()}-001.jpg`
    const { error } = await getSupabase()
      .storage.from(HUB_LEARNING_MATERIALS_BUCKET)
      .upload(assetPath, params.file, { upsert: true, contentType: decision.mime })
    throwIfError(error, '이미지 업로드에 실패했습니다.')
    pages.push({ page_number: 1, asset_path: assetPath, width: null, height: null })
  }

  const { error } = await getSupabase().from('hub_learning_materials').insert({
    id,
    title: params.title,
    description: params.description,
    original_file_name: params.file.name,
    source_file_path: sourcePath,
    mime: decision.mime,
    kind,
    status: params.publish ? 'PUBLISHED' : 'DRAFT',
    page_count: pages.length,
    audience_type: params.audienceType,
    target_grade: params.targetGrade,
    target_class_name: params.targetClassName,
    target_student_id: params.targetStudentId,
    published_at: params.publish ? new Date().toISOString() : null,
  })
  throwIfError(error, '자료 저장에 실패했습니다.')
  if (pages.length > 0) {
    const { error: pageError } = await getSupabase()
      .from('hub_learning_material_pages')
      .insert(pages.map((page) => ({ ...page, material_id: id })))
    throwIfError(pageError, '미리보기 정보 저장에 실패했습니다.')
  }
}

export async function teacherSetMaterialStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'): Promise<void> {
  const { error } = await getSupabase()
    .from('hub_learning_materials')
    .update({
      status,
      published_at: status === 'PUBLISHED' ? new Date().toISOString() : null,
    })
    .eq('id', id)
  throwIfError(error, '자료 상태 변경에 실패했습니다.')
}

export async function teacherUpdateMaterialMetadata(params: {
  id: string
  title: string
  description: string
  audienceType: HubAudienceType
  targetGrade: string | null
  targetClassName: string | null
  targetStudentId: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
  publishedAt?: string | null
}): Promise<void> {
  const { error } = await getSupabase()
    .from('hub_learning_materials')
    .update({
      title: params.title,
      description: params.description,
      audience_type: params.audienceType,
      target_grade: params.targetGrade,
      target_class_name: params.targetClassName,
      target_student_id: params.targetStudentId,
      status: params.status,
      published_at:
        params.status === 'PUBLISHED' ? params.publishedAt || new Date().toISOString() : null,
    })
    .eq('id', params.id)
  throwIfError(error, '자료 정보 수정에 실패했습니다.')
}
