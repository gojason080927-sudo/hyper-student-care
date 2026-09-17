import { getSupabase } from '../lib/supabase'
import {
  classScheduleGridFromRow,
  noticeFromRow,
  weeklyLearningSummaryFromRow,
  type ClassScheduleGridRow,
  type NoticeRow,
  type WeeklyLearningSummaryRow,
} from '../lib/db/mappers'
import type { ClassScheduleGrid, ContentPost, WeeklyLearningSummaryRecord } from '../types/records'
import type {
  HubAssignment,
  HubIdentity,
  HubInboxItem,
  HubMaterial,
  HubQuestion,
  HubVideo,
  StudentStudyPlan,
} from './types'

function parseRpcJson(value: unknown): Record<string, unknown> | null {
  if (value == null) return null
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
}

export function identityFromRpc(raw: unknown): HubIdentity | null {
  const row = parseRpcJson(raw)
  if (!row || typeof row.name !== 'string') return null
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    school: String(row.school ?? ''),
    grade: String(row.grade ?? ''),
    className: String(row.class_name ?? ''),
    accessKeyActive: row.access_key_active !== false,
  }
}

function assignmentFromRpc(row: Record<string, unknown>): HubAssignment {
  return {
    id: String(row.id ?? ''),
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
  }
}

function materialFromRpc(row: Record<string, unknown>): HubMaterial {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    kind: (row.kind as HubMaterial['kind']) || 'file',
    originalFileName: String(row.original_file_name ?? ''),
    sourceFilePath: typeof row.source_file_path === 'string' ? row.source_file_path : null,
    mime: String(row.mime ?? ''),
    pageCount: Number(row.page_count ?? 0),
    status: (row.status as HubMaterial['status']) || 'PUBLISHED',
    audienceType: (row.audience_type as HubMaterial['audienceType']) || 'all',
    targetGrade: typeof row.target_grade === 'string' ? row.target_grade : null,
    targetClassName: typeof row.target_class_name === 'string' ? row.target_class_name : null,
    targetStudentId: typeof row.target_student_id === 'string' ? row.target_student_id : null,
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    createdAt: String(row.created_at ?? ''),
    pages: asArray(row.pages).map((page) => ({
      pageNumber: Number(page.page_number ?? 0),
      assetPath: String(page.asset_path ?? ''),
      width: typeof page.width === 'number' ? page.width : null,
      height: typeof page.height === 'number' ? page.height : null,
    })),
  }
}

function timestampsFromRpc(value: unknown): HubVideo['timestamps'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const seconds = Number(row.seconds ?? 0)
    if (!Number.isFinite(seconds) || seconds < 0) return []
    return [{ label: String(row.label ?? ''), seconds }]
  })
}

function videoFromRpc(row: Record<string, unknown>): HubVideo {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    videoUrl: String(row.video_url ?? ''),
    videoId: String(row.video_id ?? ''),
    audienceType: (row.audience_type as HubVideo['audienceType']) || 'all',
    targetGrade: typeof row.target_grade === 'string' ? row.target_grade : null,
    targetClassName: typeof row.target_class_name === 'string' ? row.target_class_name : null,
    targetStudentId: typeof row.target_student_id === 'string' ? row.target_student_id : null,
    published: row.published === true,
    publishedAt: typeof row.published_at === 'string' ? row.published_at : null,
    timestamps: timestampsFromRpc(row.timestamps),
    createdAt: String(row.created_at ?? ''),
  }
}

function questionFromRpc(row: Record<string, unknown>): HubQuestion {
  return {
    id: String(row.id ?? ''),
    date: String(row.date ?? ''),
    category: String(row.category ?? ''),
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    answer: String(row.answer ?? ''),
    status: String(row.status ?? ''),
    source: 'student',
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    attachments: asArray(row.attachments).map((item) => ({
      id: String(item.id ?? ''),
      kind: (item.kind as HubQuestion['attachments'][number]['kind']) || 'file',
      storagePath: String(item.storage_path ?? ''),
      mime: String(item.mime ?? ''),
      byteSize: Number(item.byte_size ?? 0),
      durationMs: typeof item.duration_ms === 'number' ? item.duration_ms : null,
      originalName: String(item.original_name ?? ''),
      ready: item.ready === true,
    })),
  }
}

function inboxFromRpc(row: Record<string, unknown>): HubInboxItem {
  return {
    id: String(row.id ?? ''),
    kind: row.kind === 'suggestion' ? 'suggestion' : 'material_request',
    title: String(row.title ?? ''),
    content: String(row.content ?? ''),
    status: String(row.status ?? '접수'),
    createdAt: String(row.created_at ?? ''),
    studentId: typeof row.student_id === 'string' ? row.student_id : undefined,
    studentName: typeof row.student_name === 'string' ? row.student_name : undefined,
    attachments: asArray(row.attachments).map((item) => ({
      id: String(item.id ?? ''),
      storagePath: String(item.storage_path ?? ''),
      mime: String(item.mime ?? ''),
      byteSize: Number(item.byte_size ?? 0),
      originalName: String(item.original_name ?? ''),
      ready: item.ready === true,
    })),
  }
}

export type StudentHubBundle = {
  student: HubIdentity
  inactive: boolean
  weeklyLearningSummaries: WeeklyLearningSummaryRecord[]
  assignments: HubAssignment[]
  materials: HubMaterial[]
  videos: HubVideo[]
  questions: HubQuestion[]
  inbox: HubInboxItem[]
  classScheduleGrids: ClassScheduleGrid[]
  notices: ContentPost[]
}

export async function rpcGetStudentHubIdentity(accessKey: string): Promise<HubIdentity | null> {
  const { data, error } = await getSupabase().rpc('get_student_hub_identity', {
    p_access_key: accessKey.trim(),
  })
  if (error) {
    console.error('[StudentHub] get_student_hub_identity', error.message)
    return null
  }
  return identityFromRpc(data)
}

export async function rpcGetStudentHubBundle(accessKey: string): Promise<StudentHubBundle | null> {
  const { data, error } = await getSupabase().rpc('get_student_hub_bundle', {
    p_access_key: accessKey.trim(),
  })
  if (error) {
    console.error('[StudentHub] get_student_hub_bundle', error.message)
    return null
  }
  const row = parseRpcJson(data)
  if (!row) return null
  const student = identityFromRpc(row.student)
  if (!student) return null
  return {
    student,
    inactive: row.inactive === true,
    weeklyLearningSummaries: asArray(row.weekly_learning_summaries).map((item) =>
      weeklyLearningSummaryFromRow(item as unknown as WeeklyLearningSummaryRow),
    ),
    assignments: asArray(row.assignments).map(assignmentFromRpc),
    materials: asArray(row.materials).map(materialFromRpc),
    videos: asArray(row.videos).map(videoFromRpc),
    questions: asArray(row.questions).map(questionFromRpc),
    inbox: asArray(row.inbox).map(inboxFromRpc),
    classScheduleGrids: asArray(row.class_schedule_grids).map((item) =>
      classScheduleGridFromRow(item as unknown as ClassScheduleGridRow),
    ),
    notices: asArray(row.notices).map((item) => noticeFromRow(item as unknown as NoticeRow)),
  }
}

export async function rpcSubmitStudentQuestion(input: {
  accessKey: string
  date: string
  category: string
  title: string
  content: string
}): Promise<HubQuestion | null> {
  const { data, error } = await getSupabase().rpc('submit_student_question', {
    p_access_key: input.accessKey.trim(),
    p_date: input.date,
    p_category: input.category,
    p_title: input.title,
    p_content: input.content,
  })
  if (error) throw error
  const row = parseRpcJson(data)
  return row ? questionFromRpc(row) : null
}

export async function rpcPrepareQuestionAttachment(input: {
  accessKey: string
  questionId: string
  kind: string
  mime: string
  byteSize: number
  originalName: string
  durationMs: number | null
  ext: string
}): Promise<{ id: string; storagePath: string; bucket: string }> {
  const { data, error } = await getSupabase().rpc('prepare_hub_question_attachment', {
    p_access_key: input.accessKey.trim(),
    p_question_id: input.questionId,
    p_kind: input.kind,
    p_mime: input.mime,
    p_byte_size: input.byteSize,
    p_original_name: input.originalName,
    p_duration_ms: input.durationMs,
    p_ext: input.ext,
  })
  if (error) throw error
  const row = parseRpcJson(data)
  if (!row) throw new Error('첨부 준비에 실패했습니다.')
  return {
    id: String(row.id),
    storagePath: String(row.storage_path),
    bucket: String(row.bucket),
  }
}

export async function rpcFinalizeQuestionAttachment(accessKey: string, attachmentId: string): Promise<void> {
  const { error } = await getSupabase().rpc('finalize_hub_question_attachment', {
    p_access_key: accessKey.trim(),
    p_attachment_id: attachmentId,
  })
  if (error) throw error
}

export async function rpcSubmitHubInbox(input: {
  accessKey: string
  kind: 'material_request' | 'suggestion'
  title: string
  content: string
}): Promise<HubInboxItem | null> {
  const { data, error } = await getSupabase().rpc('submit_student_hub_inbox', {
    p_access_key: input.accessKey.trim(),
    p_kind: input.kind,
    p_title: input.title,
    p_content: input.content,
  })
  if (error) throw error
  const row = parseRpcJson(data)
  return row ? inboxFromRpc(row) : null
}

export async function rpcPrepareInboxAttachment(input: {
  accessKey: string
  inboxId: string
  mime: string
  byteSize: number
  originalName: string
  ext: string
}): Promise<{ id: string; storagePath: string; bucket: string }> {
  const { data, error } = await getSupabase().rpc('prepare_hub_inbox_attachment', {
    p_access_key: input.accessKey.trim(),
    p_inbox_id: input.inboxId,
    p_mime: input.mime,
    p_byte_size: input.byteSize,
    p_original_name: input.originalName,
    p_ext: input.ext,
  })
  if (error) throw error
  const row = parseRpcJson(data)
  if (!row) throw new Error('첨부 준비에 실패했습니다.')
  return {
    id: String(row.id),
    storagePath: String(row.storage_path),
    bucket: String(row.bucket),
  }
}

export async function rpcFinalizeInboxAttachment(accessKey: string, attachmentId: string): Promise<void> {
  const { error } = await getSupabase().rpc('finalize_hub_inbox_attachment', {
    p_access_key: accessKey.trim(),
    p_attachment_id: attachmentId,
  })
  if (error) throw error
}

function studyPlanFromRpc(row: Record<string, unknown>): StudentStudyPlan {
  return {
    id: String(row.id ?? ''),
    planDate: String(row.plan_date ?? ''),
    subject: String(row.subject ?? ''),
    content: String(row.content ?? ''),
    startTime: String(row.start_time ?? ''),
    endTime: String(row.end_time ?? ''),
    completed: row.completed === true,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  }
}

export async function rpcListStudentStudyPlans(
  accessKey: string,
  fromDate: string,
  toDate: string,
): Promise<StudentStudyPlan[]> {
  const { data, error } = await getSupabase().rpc('list_student_study_plans', {
    p_access_key: accessKey.trim(),
    p_from_date: fromDate,
    p_to_date: toDate,
  })
  if (error) throw error
  let parsed: unknown = data
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data)
    } catch {
      parsed = []
    }
  }
  return asArray(parsed).map(studyPlanFromRpc)
}

export async function rpcUpsertStudentStudyPlan(input: {
  accessKey: string
  id?: string | null
  planDate: string
  subject: string
  content: string
  startTime: string
  endTime: string
}): Promise<StudentStudyPlan> {
  const { data, error } = await getSupabase().rpc('upsert_student_study_plan', {
    p_access_key: input.accessKey.trim(),
    p_id: input.id ?? null,
    p_plan_date: input.planDate,
    p_subject: input.subject,
    p_content: input.content,
    p_start_time: input.startTime,
    p_end_time: input.endTime,
  })
  if (error) throw error
  const row = parseRpcJson(data)
  if (!row) throw new Error('학습 계획 저장에 실패했습니다.')
  return studyPlanFromRpc(row)
}

export async function rpcSetStudentStudyPlanCompleted(
  accessKey: string,
  planId: string,
  completed: boolean,
): Promise<StudentStudyPlan> {
  const { data, error } = await getSupabase().rpc('set_student_study_plan_completed', {
    p_access_key: accessKey.trim(),
    p_id: planId,
    p_completed: completed,
  })
  if (error) throw error
  const row = parseRpcJson(data)
  if (!row) throw new Error('완료 상태 변경에 실패했습니다.')
  return studyPlanFromRpc(row)
}

export async function rpcDeleteStudentStudyPlan(accessKey: string, planId: string): Promise<void> {
  const { error } = await getSupabase().rpc('delete_student_study_plan', {
    p_access_key: accessKey.trim(),
    p_id: planId,
  })
  if (error) throw error
}
