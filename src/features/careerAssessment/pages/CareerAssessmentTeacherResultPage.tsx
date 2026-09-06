import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../../components/ui/PageHeader'
import { useData } from '../../../hooks/useData'
import type { Student } from '../../../types/student'
import {
  fetchCareerResultsForStudent,
  fetchCareerStudentsByIds,
  type CareerResultRecord,
} from '../api/careerAssessmentApi'
import { CareerResultReport, runCareerResultPrint } from '../components/CareerResultReport'

export function CareerAssessmentTeacherResultPage() {
  const { studentId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { students } = useData()
  const location = useLocation()
  const listPath = location.pathname.startsWith('/teacher/mobile')
    ? '/teacher/mobile/career-assessment'
    : '/career-assessment'
  const rosterStudent = students.find((item) => item.id === studentId)
  const [linkedStudent, setLinkedStudent] = useState<Student | null>(null)
  const student = rosterStudent ?? linkedStudent
  const [results, setResults] = useState<CareerResultRecord[]>([])
  const [error, setError] = useState('')
  const requestedId = searchParams.get('result')

  useEffect(() => {
    void fetchCareerResultsForStudent(studentId)
      .then(setResults)
      .catch(() => setError('결과를 불러오지 못했습니다.'))
  }, [studentId])

  useEffect(() => {
    if (rosterStudent || !studentId) {
      setLinkedStudent(null)
      return
    }
    let cancelled = false
    void fetchCareerStudentsByIds([studentId])
      .then((rows) => {
        if (!cancelled) setLinkedStudent(rows[0] ?? null)
      })
      .catch(() => {
        if (!cancelled) setLinkedStudent(null)
      })
    return () => {
      cancelled = true
    }
  }, [rosterStudent, studentId])

  const current = useMemo(() => {
    if (requestedId) return results.find((row) => row.id === requestedId) ?? results[0]
    return results[0]
  }, [requestedId, results])

  useEffect(() => {
    if (searchParams.get('print') === '1' && current) {
      const timer = window.setTimeout(() => runCareerResultPrint(), 400)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [current, searchParams])

  if (!student) {
    return <p className="text-sm text-slate-500">학생을 찾을 수 없습니다.</p>
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${student.name} 진로·학과 적성검사 결과`}
        description={`${student.school} · ${student.grade}`}
        action={
          <Link to={listPath} className="text-sm font-semibold text-navy-800">
            ← 목록
          </Link>
        }
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {results.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {results.map((row, index) => (
            <Link
              key={row.id}
              to={`${listPath}/${studentId}?result=${row.id}`}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                current?.id === row.id ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {index === 0 ? '최신' : row.createdAt.slice(0, 10)}
            </Link>
          ))}
        </div>
      ) : null}
      {current ? (
        <CareerResultReport
          student={{ name: student.name, school: student.school, grade: student.grade }}
          testedAt={current.createdAt}
          scores={current.scores}
        />
      ) : (
        <p className="text-sm text-slate-500">아직 완료된 검사가 없습니다.</p>
      )}
    </div>
  )
}
