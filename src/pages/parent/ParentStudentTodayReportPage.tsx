import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ParentPageHeader } from '../../components/parent/ParentStudentComponents'
import { TodayReportErrorBoundary } from '../../components/todayReport/TodayReportErrorBoundary'
import { TodayReportView } from '../../components/todayReport/TodayReportView'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { btnSecondary } from '../../utils/labels'

export function ParentStudentTodayReportPage() {
  const { studentAccessKey = '' } = useParams()
  const navigate = useNavigate()
  const student = useParentStudent()
  const homePath = `/care/${studentAccessKey || student.studentAccessKey}`

  return (
    <div className="parent-page space-y-4 pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`${btnSecondary} inline-flex min-h-11 items-center gap-1.5`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          이전 화면
        </button>
        <Link to={homePath} className={`${btnSecondary} inline-flex min-h-11 items-center`}>
          홈으로
        </Link>
      </div>

      <ParentPageHeader
        title="Today Report"
        description="선택한 날짜의 학습 기록을 확인합니다."
      />

      <TodayReportErrorBoundary homePath={homePath}>
        <TodayReportView student={student} readOnly dateMode="navigate" />
      </TodayReportErrorBoundary>
    </div>
  )
}
