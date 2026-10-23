import { getSupabase } from '../lib/supabase'

/** 학생앱 달력용: 반 공통 오늘 과제(class_today_report_common)를 읽기 전용으로 가져온다(보이는 한 주 범위 + 그 학생의 학년·반). */

export type HubDayAssignment = {
  id: string
  reportDate: string
  subjectLabel: string
  textbookName: string
  content: string
}

type Row = {
  id: string
  report_date: string
  subject: string | null
  slot_number: number | null
  textbook_name: string | null
  today_assignment: string | null
}

/** get_student_hub_bundle 의 「오늘의 과제」 표기와 같은 이름 */
export function hubSubjectLabel(subject: string | null, slot: number | null): string {
  const s = subject ?? ''
  if (s === '수학' && slot === 1) return '수학 · 개념교재'
  if (s === '수학' && slot === 2) return '수학 · 유형교재'
  if (s === '수학' && slot === 3) return '수학 · 부교재'
  if (s === '영어' && slot === 1) return '영어 · 문법교재'
  if (s === '영어' && slot === 2) return '영어 · 독해 교재'
  if (s === '영어' && slot === 3) return '영어 · 단어장'
  return s
}

const PAGE = 1000
const MAX_PAGES = 20

export async function fetchHubClassAssignmentsInRange(
  grade: string,
  className: string,
  from: string,
  to: string,
): Promise<HubDayAssignment[]> {
  const g = grade.trim()
  const c = className.trim()
  if (!g || !c) return []
  const rows: Row[] = []
  let offset = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await getSupabase()
      .from('class_today_report_common')
      .select('id, report_date, subject, slot_number, textbook_name, today_assignment')
      .eq('grade', g)
      .eq('class_name', c)
      .gte('report_date', from)
      .lte('report_date', to)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as Row[]
    if (batch.length === 0) break
    rows.push(...batch)
    offset += batch.length
  }
  return rows
    .filter((r) => (r.today_assignment ?? '').trim() !== '')
    .map((r) => ({
      id: r.id,
      reportDate: r.report_date,
      subjectLabel: hubSubjectLabel(r.subject, r.slot_number),
      textbookName: (r.textbook_name ?? '').trim(),
      content: (r.today_assignment ?? '').trim(),
    }))
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate) || a.subjectLabel.localeCompare(b.subjectLabel, 'ko'))
}
