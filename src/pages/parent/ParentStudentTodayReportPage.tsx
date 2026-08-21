import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TodayReportView } from '../../components/todayReport/TodayReportView'
import { useParentStudent } from '../../contexts/ParentStudentContext'

export function ParentStudentTodayReportPage() {
  const { studentAccessKey = '' } = useParams()
  const navigate = useNavigate()
  const student = useParentStudent()
  const homePath = `/care/${studentAccessKey || student.studentAccessKey}`

  return (
    <div className="parent-page space-y-3 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="pm-btn-secondary"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          이전 화면
        </button>
        <Link to={homePath} className="pm-btn-secondary">
          홈으로
        </Link>
      </div>

      <TodayReportView
        student={student}
        readOnly
        dateMode="navigate"
        errorFallbackHomePath={homePath}
      />
    </div>
  )
}
