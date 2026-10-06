import { useCallback } from 'react'
import { fetchParentSchoolImages } from '../../lib/db/schoolExamRepo'
import type { SchoolReportData } from '../../utils/schoolExamReport'
import { SchoolExamReport } from './SchoolExamReport'

type Props = { student: { name: string; studentAccessKey: string }; reports: SchoolReportData[] }

/** 학부모 월말평가 → "학교 시험" 탭 본문 */
export function SchoolExamParentTab({ student, reports }: Props) {
  const key = student.studentAccessKey
  const loadImages = useCallback(
    (exam: { id: string }, nos: number[]) => fetchParentSchoolImages(key, exam.id, nos),
    [key],
  )
  return <SchoolExamReport student={student} reports={reports} loadImages={loadImages} />
}
