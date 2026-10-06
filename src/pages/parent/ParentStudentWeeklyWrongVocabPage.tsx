import { Navigate } from 'react-router-dom'
import { useParentStudent } from '../../contexts/ParentStudentContext'

/** 예전 주소(/weekly-wrong-vocab) 링크 유지 — 주간 SUMMARY 화면으로 이동 */
export function ParentStudentWeeklyWrongVocabPage() {
  const student = useParentStudent()
  return <Navigate to={`/care/${student.studentAccessKey}/weekly-learning-summary`} replace />
}
