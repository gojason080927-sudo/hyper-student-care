import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import { btnPrimary } from '../utils/labels'

/** 강사용 대시보드: 학생 월말평가 미리보기 선택 (관리자 링크 없음) */
export function MonthlyEvaluationSelectPage() {
  const { students } = useData()
  const navigate = useNavigate()
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const activeStudents = useMemo(
    () => students.filter((s) => s.status === '재원'),
    [students],
  )

  const handleView = () => {
    if (!selectedStudentId) return
    navigate(`/students/${selectedStudentId}/monthly-evaluation`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="월말평가"
        description="학생을 선택하면 해당 학생의 월말평가 결과를 확인할 수 있습니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold text-navy-900">학생을 먼저 선택해 주세요.</p>
        <p className="mt-1 text-sm text-slate-500">
          카카오톡 단톡방 링크로 접속한 경우 학생별 URL이 자동으로 연결됩니다.
        </p>

        <div className="mt-5 max-w-md space-y-4">
          <StudentSelect
            students={activeStudents}
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            label="학생"
            required
          />
          <button
            type="button"
            onClick={handleView}
            disabled={!selectedStudentId}
            className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            월말평가 보기
          </button>
        </div>
      </div>
    </div>
  )
}
