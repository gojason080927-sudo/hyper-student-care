import { useParams } from 'react-router-dom'
import { ParentMonthlyEvaluationView } from '../components/monthly/ParentMonthlyEvaluationView'
import { useParentMonthlyEvaluationData } from '../hooks/useParentMonthlyEvaluationData'

export function StudentMonthlyEvaluationPage() {
  const { studentId = '' } = useParams()
  const { student, studentRecords, latest } = useParentMonthlyEvaluationData(studentId)

  if (!studentId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-700">학생 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-700">학생 정보를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <ParentMonthlyEvaluationView
      student={student}
      studentRecords={studentRecords}
      latest={latest}
    />
  )
}
