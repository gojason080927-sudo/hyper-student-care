import { invokeHubPush } from '../hubPushInvoke'
import { getSupabase } from '../supabase'
import type { CompressedCapture } from '../schoolExamImage'
import {
  examFromRow,
  itemsToJson,
  reportsFromRpc,
  wrongItemsFromJson,
  type SchoolExam,
  type SchoolExamItem,
  type SchoolImage,
  type SchoolReportData,
  type SchoolTopProblem,
  type SchoolWrongItem,
} from '../../utils/schoolExamReport'

/** 학교 시험 개인 분석 리포트 — 강사 입력(authenticated) · 학부모 조회(access key RPC) */

type Row = Record<string, unknown>

export type SchoolExamMetaInput = {
  id?: string
  grade: string
  schoolName: string
  title: string
  subject: string
  examDate: string
  author: string
}

export type SchoolResultRow = {
  studentId: string
  absent: boolean
  wrongItems: SchoolWrongItem[]
  causeConfirmed: boolean
  score: number
  scoreManual: boolean
  teacherComment: string
  nextPlan: string[]
  status: 'draft' | 'sent'
  sentAt: string | null
}

export async function listSchoolExams(): Promise<SchoolExam[]> {
  const { data, error } = await getSupabase()
    .from('school_exams')
    .select('*')
    .order('exam_date', { ascending: false })
  if (error) throw new Error(`학교 시험을 불러오지 못했습니다: ${error.message}`)
  return ((data ?? []) as Row[]).map(examFromRow)
}

export async function saveSchoolExamMeta(input: SchoolExamMetaInput): Promise<SchoolExam> {
  const payload = {
    grade: input.grade.trim(),
    school_name: input.schoolName.trim(),
    title: input.title.trim(),
    subject: input.subject.trim(),
    exam_date: input.examDate,
    author: input.author.trim(),
  }
  const query = input.id
    ? getSupabase().from('school_exams').update(payload).eq('id', input.id)
    : getSupabase().from('school_exams').insert(payload)
  const { data, error } = await query.select('*').single()
  if (error) throw new Error(`시험 저장 실패: ${error.message}`)
  return examFromRow(data as Row)
}

export type PackageSaveInput = {
  examId: string
  rangeText: string
  totalPoints: number
  items: SchoolExamItem[]
  units: string[]
  topProblems: SchoolTopProblem[]
  sourceStudentId: string | null
  imagesClean: boolean
  images: Map<number, CompressedCapture>
}

/** 분석 패키지 저장: 문항·단원·이미지 공개 범위를 갱신하고 캡처를 올린다. */
export async function savePackage(input: PackageSaveInput): Promise<SchoolExam> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('school_exams')
    .update({
      range_text: input.rangeText,
      total_points: input.totalPoints,
      items: itemsToJson(input.items),
      units: input.units,
      top_problems: input.topProblems,
      source_student_id: input.sourceStudentId,
      images_clean: input.imagesClean,
      package_imported_at: new Date().toISOString(),
    })
    .eq('id', input.examId)
    .select('*')
    .single()
  if (error) throw new Error(`분석 패키지 저장 실패: ${error.message}`)

  const rows = [...input.images.entries()].map(([no, img]) => ({
    exam_id: input.examId,
    no,
    data: img.data,
    width: img.width,
    height: img.height,
  }))
  // 한 번에 너무 큰 요청이 되지 않도록 5장씩 올린다
  for (let i = 0; i < rows.length; i += 5) {
    const { error: imgError } = await sb
      .from('school_exam_images')
      .upsert(rows.slice(i, i + 5), { onConflict: 'exam_id,no' })
    if (imgError) throw new Error(`문항 캡처 저장 실패: ${imgError.message}`)
  }
  return examFromRow(data as Row)
}

/** 이미 올라간 캡처 번호 (미리보기·재가져오기 표시용) */
export async function listExamImageNos(examId: string): Promise<number[]> {
  const { data, error } = await getSupabase().from('school_exam_images').select('no').eq('exam_id', examId)
  if (error) throw new Error(`캡처 목록을 불러오지 못했습니다: ${error.message}`)
  return ((data ?? []) as Row[]).map((r) => Number(r.no)).sort((a, b) => a - b)
}

/** 강사용 — 캡처 한 장 (화면 표시) */
export async function getExamImage(examId: string, no: number): Promise<SchoolImage | null> {
  const { data, error } = await getSupabase()
    .from('school_exam_images')
    .select('no,data,width,height')
    .eq('exam_id', examId)
    .eq('no', no)
    .maybeSingle()
  if (error || !data) return null
  const r = data as Row
  return { no: Number(r.no), data: String(r.data), width: Number(r.width), height: Number(r.height) }
}

export async function listSchoolResults(examId: string): Promise<SchoolResultRow[]> {
  const { data, error } = await getSupabase().from('school_exam_results').select('*').eq('exam_id', examId)
  if (error) throw new Error(`학생별 입력을 불러오지 못했습니다: ${error.message}`)
  return ((data ?? []) as Row[]).map((row) => ({
    studentId: String(row.student_id),
    absent: row.absent === true,
    wrongItems: wrongItemsFromJson(row.wrong_items),
    causeConfirmed: row.cause_confirmed === true,
    score: Number(row.score) || 0,
    scoreManual: row.score_manual === true,
    teacherComment: String(row.teacher_comment ?? ''),
    nextPlan: Array.isArray(row.next_plan) ? (row.next_plan as unknown[]).map((p) => String(p)) : [],
    status: row.status === 'sent' ? 'sent' : 'draft',
    sentAt: (row.sent_at as string | null) ?? null,
  }))
}

/** status·sent_at 은 건드리지 않는다 (발송 상태 유지). 점수는 서버 발송 시 다시 계산된다. */
export async function saveSchoolResult(
  examId: string,
  result: Omit<SchoolResultRow, 'status' | 'sentAt'>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('school_exam_results')
    .upsert(
      {
        exam_id: examId,
        student_id: result.studentId,
        absent: result.absent,
        wrong_items: result.wrongItems,
        cause_confirmed: result.causeConfirmed,
        score: result.score,
        score_manual: result.scoreManual,
        teacher_comment: result.teacherComment,
        next_plan: result.nextPlan,
        // 결시로 바꾸면 발송 상태를 해제한다 (학부모 리포트에서 사라짐)
        ...(result.absent ? { status: 'draft', sent_at: null } : {}),
      },
      { onConflict: 'exam_id,student_id' },
    )
  if (error) throw new Error(`학생 입력 저장 실패: ${error.message}`)
}

export type SchoolPublishOutcome = {
  sentTotal: number
  newlySent: number
  skippedUnconfirmed: number
  pushStatus: string
}

/** 시험 단위 발송. 처음 발송되는 학생의 학부모에게만 푸시를 보낸다 (재저장은 알림 없음). */
export async function publishSchoolExam(examId: string, onlyStudentId?: string): Promise<SchoolPublishOutcome> {
  const { data, error } = await getSupabase().rpc('publish_school_exam_report', {
    p_exam_id: examId,
    p_student_id: onlyStudentId ?? null,
  })
  if (error) throw new Error(`발송 실패: ${error.message}`)
  const row = (data ?? {}) as { newly_sent?: string[]; sent_total?: number; skipped_unconfirmed?: number }
  const newly = row.newly_sent ?? []
  let pushStatus = 'none'
  if (newly.length > 0) {
    const result = await invokeHubPush({
      event: 'school_exam_report_sent',
      entityId: examId,
      studentIds: newly,
    })
    pushStatus = result.status ?? (result.ok ? 'sent' : 'push_failed')
  }
  return {
    sentTotal: row.sent_total ?? 0,
    newlySent: newly.length,
    skippedUnconfirmed: row.skipped_unconfirmed ?? 0,
    pushStatus,
  }
}

/** 학부모 — 자기 자녀의 발송된 리포트 (이미지 제외) */
export async function fetchParentSchoolReports(accessKey: string): Promise<SchoolReportData[]> {
  const { data, error } = await getSupabase().rpc('get_parent_school_exam_reports', {
    p_access_key: accessKey.trim(),
  })
  if (error) {
    console.warn('[SchoolExam] parent rpc failed', error.message)
    return []
  }
  return reportsFromRpc(data)
}

/** 학부모 — 허용된 캡처만 (오답 번호 + 1등급 완성 문제). 허용되지 않으면 빈 배열. */
export async function fetchParentSchoolImages(accessKey: string, examId: string, nos: number[]): Promise<SchoolImage[]> {
  if (nos.length === 0) return []
  const { data, error } = await getSupabase().rpc('get_parent_school_exam_images', {
    p_access_key: accessKey.trim(),
    p_exam_id: examId,
    p_nos: nos,
  })
  if (error || !Array.isArray(data)) return []
  return (data as Row[]).map((r) => ({
    no: Number(r.no),
    data: String(r.data),
    width: Number(r.width),
    height: Number(r.height),
  }))
}
