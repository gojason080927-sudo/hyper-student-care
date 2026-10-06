import { invokeHubPush } from '../hubPushInvoke'
import { getSupabase } from '../supabase'
import {
  examFromRow,
  reportsFromRpc,
  type MathExamItem,
  type MathExamUnit,
  type MathMonthlyExam,
  type MathMonthlyReportData,
  type MathPlanLine,
  type MathWrongItem,
} from '../../utils/mathMonthlyReport'

/** 수학 월말평가 — 강사 입력(authenticated) · 학부모 조회(RPC) */

export type MathExamInput = {
  id?: string
  grade: string
  className: string
  examDate: string
  year: number
  month: number
  title: string
  teacherName: string
  items: MathExamItem[]
  units: MathExamUnit[]
}

export type MathResultRow = {
  studentId: string
  absent: boolean
  wrongItems: MathWrongItem[]
  score: number
  strengths: string
  improvements: string
  teacherComment: string
  nextPlan: MathPlanLine[]
  status: 'draft' | 'sent'
  sentAt: string | null
}

type Row = Record<string, unknown>

export async function listMathExams(): Promise<MathMonthlyExam[]> {
  const { data, error } = await getSupabase()
    .from('math_monthly_exams')
    .select('*')
    .order('year', { ascending: false })
    .order('month', { ascending: false })
  if (error) throw new Error(`수학 월말평가 설정을 불러오지 못했습니다: ${error.message}`)
  return ((data ?? []) as Row[]).map(examFromRow)
}

export async function saveMathExam(input: MathExamInput): Promise<MathMonthlyExam> {
  const payload = {
    grade: input.grade,
    class_name: input.className,
    exam_date: input.examDate,
    year: input.year,
    month: input.month,
    title: input.title.trim(),
    teacher_name: input.teacherName.trim(),
    question_count: input.items.length,
    items: input.items,
    units: input.units,
  }
  const query = input.id
    ? getSupabase().from('math_monthly_exams').update(payload).eq('id', input.id)
    : getSupabase().from('math_monthly_exams').insert(payload)
  const { data, error } = await query.select('*').single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('이 반의 해당 연·월 시험 설정이 이미 있습니다. (한 반에 한 달 1회)')
    }
    throw new Error(`시험 설정 저장 실패: ${error.message}`)
  }
  return examFromRow(data as Row)
}

export async function listMathResults(examId: string): Promise<MathResultRow[]> {
  const { data, error } = await getSupabase().from('math_monthly_results').select('*').eq('exam_id', examId)
  if (error) throw new Error(`학생별 입력을 불러오지 못했습니다: ${error.message}`)
  return ((data ?? []) as Row[]).map((row) => ({
    studentId: String(row.student_id),
    absent: row.absent === true,
    wrongItems: ((row.wrong_items as MathWrongItem[] | null) ?? []).map((w) => ({
      no: Number(w.no),
      cause: w.cause ?? '',
    })),
    score: Number(row.score) || 0,
    strengths: String(row.strengths ?? ''),
    improvements: String(row.improvements ?? ''),
    teacherComment: String(row.teacher_comment ?? ''),
    nextPlan: ((row.next_plan as MathPlanLine[] | null) ?? []).map((p) => ({
      content: String(p.content ?? ''),
      goal: String(p.goal ?? ''),
    })),
    status: row.status === 'sent' ? 'sent' : 'draft',
    sentAt: (row.sent_at as string | null) ?? null,
  }))
}

/** status·sent_at 은 건드리지 않는다 (발송 상태 유지). 점수는 서버 발송 시 다시 계산된다. */
export async function saveMathResult(
  examId: string,
  result: Omit<MathResultRow, 'status' | 'sentAt'>,
): Promise<void> {
  const { error } = await getSupabase()
    .from('math_monthly_results')
    .upsert(
      {
        exam_id: examId,
        student_id: result.studentId,
        absent: result.absent,
        wrong_items: result.wrongItems,
        score: result.score,
        strengths: result.strengths,
        improvements: result.improvements,
        teacher_comment: result.teacherComment,
        next_plan: result.nextPlan,
        // 결시로 바꾸면 발송 상태를 해제한다 (학부모 보고서에서 사라짐)
        ...(result.absent ? { status: 'draft', sent_at: null } : {}),
      },
      { onConflict: 'exam_id,student_id' },
    )
  if (error) throw new Error(`학생 입력 저장 실패: ${error.message}`)
}

export type PublishOutcome = { sentTotal: number; newlySent: number; pushStatus: string }

/** 반 단위 발송. 처음 발송되는 학생의 학부모에게만 푸시 알림을 보낸다 (재저장은 알림 없음). */
export async function publishMathExam(examId: string, onlyStudentId?: string): Promise<PublishOutcome> {
  const { data, error } = await getSupabase().rpc('publish_math_monthly_exam', {
    p_exam_id: examId,
    p_student_id: onlyStudentId ?? null,
  })
  if (error) throw new Error(`발송 실패: ${error.message}`)
  const row = (data ?? {}) as { newly_sent?: string[]; sent_total?: number }
  const newly = row.newly_sent ?? []
  let pushStatus = 'none'
  if (newly.length > 0) {
    const result = await invokeHubPush({
      event: 'math_monthly_report_sent',
      entityId: examId,
      studentIds: newly,
    })
    pushStatus = result.status ?? (result.ok ? 'sent' : 'push_failed')
  }
  return { sentTotal: row.sent_total ?? 0, newlySent: newly.length, pushStatus }
}

/** 학부모 — 자기 자녀의 발송된 보고서 + 서버에서 집계한 반 평균만 받는다. */
export async function fetchParentMathReports(accessKey: string): Promise<MathMonthlyReportData[]> {
  const { data, error } = await getSupabase().rpc('get_parent_math_monthly_reports', {
    p_access_key: accessKey.trim(),
  })
  if (error) {
    console.warn('[MathMonthly] parent rpc failed', error.message)
    return []
  }
  return reportsFromRpc(data)
}
