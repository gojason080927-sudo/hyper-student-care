import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { useData } from '../hooks/useData'
import { btnPrimary, inputClass } from '../utils/labels'
import {
  formatStudentSelectLabel,
  getEnrolledClassNames,
  getStudentsInClassName,
} from '../utils/studentGradeClass'

export type MonthlyEvaluationSelectLocationState = {
  resetAt?: number
}

function MonthlyEvaluationSelectScreen() {
  const { students, isLoading, dataSource } = useData()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialClassFromUrl = searchParams.get('class')?.trim() ?? ''
  const focusStudentId = searchParams.get('student')?.trim() ?? ''

  const [selectedClassName, setSelectedClassName] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [loadError, setLoadError] = useState(false)

  const activeStudents = useMemo(
    () => students.filter((student) => student.status === '재원'),
    [students],
  )

  const classNames = useMemo(
    () => getEnrolledClassNames(activeStudents),
    [activeStudents],
  )

  const classStudents = useMemo(
    () => getStudentsInClassName(activeStudents, selectedClassName),
    [activeStudents, selectedClassName],
  )

  useEffect(() => {
    if (isLoading) return
    if (dataSource === 'none' && activeStudents.length === 0) {
      console.error('[MonthlyEvaluationSelect] failed to load students')
      setLoadError(true)
    } else {
      setLoadError(false)
    }
  }, [activeStudents.length, dataSource, isLoading])

  useEffect(() => {
    if (isLoading || loadError) return
    if (!initialClassFromUrl && !focusStudentId) return

    if (initialClassFromUrl && classNames.includes(initialClassFromUrl)) {
      setSelectedClassName((current) => current || initialClassFromUrl)
      return
    }

    const student = activeStudents.find((item) => item.id === focusStudentId)
    if (!student?.className.trim()) return

    const studentClassName = student.className.trim()
    if (!classNames.includes(studentClassName)) return

    setSelectedClassName((current) => current || studentClassName)
  }, [activeStudents, classNames, focusStudentId, initialClassFromUrl, isLoading, loadError])

  useEffect(() => {
    if (isLoading || loadError || !focusStudentId || !selectedClassName) return

    const student = activeStudents.find((item) => item.id === focusStudentId)
    if (!student || student.className.trim() !== selectedClassName) return

    setSelectedStudentId((current) => current || focusStudentId)
  }, [activeStudents, focusStudentId, isLoading, loadError, selectedClassName])

  const handleClassChange = (className: string) => {
    setSelectedClassName(className)
    setSelectedStudentId('')
  }

  const handleView = () => {
    if (!selectedClassName || !selectedStudentId) return
    navigate(`/students/${selectedStudentId}/monthly-evaluation`)
  }

  const canView = Boolean(selectedClassName && selectedStudentId)
  const studentSelectDisabled = !selectedClassName || isLoading || loadError
  const studentPlaceholder = !selectedClassName
    ? '먼저 반을 선택해 주세요.'
    : classStudents.length === 0
      ? '이 반에 등록된 학생이 없습니다.'
      : '학생 선택'

  return (
    <div className="space-y-6">
      <PageHeader
        title="학습진행 상황 · 월말평가 결과"
        description="반과 학생을 선택하면 월간 학습 진행과 월말평가 결과를 확인할 수 있습니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold text-navy-900">반과 학생을 선택해 주세요.</p>
        <p className="mt-1 text-sm text-slate-500">
          카카오톡 단톡방 링크로 접속한 경우 학생별 URL이 자동으로 연결됩니다.
        </p>

        {loadError && (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            반 또는 학생 목록을 불러오지 못했습니다.
          </p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="monthly-eval-class"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              반
              <span className="text-rose-500"> *</span>
            </label>
            <select
              id="monthly-eval-class"
              value={selectedClassName}
              onChange={(e) => handleClassChange(e.target.value)}
              disabled={isLoading || loadError}
              className={`${inputClass()} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            >
              <option value="">
                {isLoading ? '반 목록 불러오는 중...' : '반 선택'}
              </option>
              {!isLoading &&
                classNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="monthly-eval-student"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              학생
              <span className="text-rose-500"> *</span>
            </label>
            <select
              id="monthly-eval-student"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={studentSelectDisabled || classStudents.length === 0}
              className={`${inputClass()} disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            >
              <option value="">{studentPlaceholder}</option>
              {classStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {formatStudentSelectLabel(student, classStudents)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 max-w-md">
          <button
            type="button"
            onClick={handleView}
            disabled={!canView}
            className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            월말평가 보기
          </button>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <Link
            to="/teacher/monthly-evaluation"
            className="text-sm font-medium text-slate-600 transition hover:text-navy-900"
          >
            강사용 평가 관리 →
          </Link>
        </div>
      </div>
    </div>
  )
}

/** 사이드바 재진입·resetAt 변경 시 key로 상태를 완전히 초기화 */
export function MonthlyEvaluationSelectPage() {
  const location = useLocation()
  const resetAt = (location.state as MonthlyEvaluationSelectLocationState | null)?.resetAt
  const remountKey = resetAt ?? location.key

  return <MonthlyEvaluationSelectScreen key={remountKey} />
}
