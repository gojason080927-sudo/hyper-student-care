import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../../components/ui/PageHeader'
import { useData } from '../../../hooks/useData'
import type { Student } from '../../../types/student'
import {
  fetchCareerResultsForGuest,
  fetchCareerResultsForStudent,
  fetchCareerStudentsByIds,
  fetchTeacherCareerSessions,
  type CareerResultRecord,
} from '../api/careerAssessmentApi'
import { CareerResultReport, runCareerResultPrint } from '../components/CareerResultReport'

export function CareerAssessmentTeacherResultPage() {
  const { studentId = '', guestId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { students } = useData()
  const location = useLocation()
  const isGuest = Boolean(guestId)
  const subjectId = isGuest ? guestId : studentId
  const listPath = location.pathname.startsWith('/teacher/mobile')
    ? '/teacher/mobile/career-assessment'
    : '/career-assessment'
  const rosterStudent = !isGuest ? students.find((item) => item.id === studentId) : undefined
  const [linkedStudent, setLinkedStudent] = useState<Student | null>(null)
  const [guestInfo, setGuestInfo] = useState<{
    name: string
    school: string
    grade: string
    linkedStudentId: string | null
  } | null>(null)
  const student = rosterStudent ?? linkedStudent
  const [results, setResults] = useState<CareerResultRecord[]>([])
  const [error, setError] = useState('')
  const requestedId = searchParams.get('result')

  useEffect(() => {
    const load = isGuest ? fetchCareerResultsForGuest(subjectId) : fetchCareerResultsForStudent(subjectId)
    void load.then(setResults).catch(() => setError('결과를 불러오지 못했습니다.'))
  }, [isGuest, subjectId])

  useEffect(() => {
    if (isGuest) {
      void fetchTeacherCareerSessions()
        .then((rows) => {
          const session = rows.find((row) => row.guestId === guestId)
          if (session) {
            setGuestInfo({
              name: session.guestName ?? '상담생',
              school: session.guestSchool ?? '',
              grade: session.guestGrade ?? '',
              linkedStudentId: session.linkedStudentId,
            })
          }
        })
        .catch(() => setGuestInfo(null))
      return
    }
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
  }, [guestId, isGuest, rosterStudent, studentId])

  const display = isGuest
    ? {
        name: guestInfo?.name ?? '상담생',
        school: guestInfo?.school ?? '',
        grade: guestInfo?.grade ?? '',
      }
    : student
      ? { name: student.name, school: student.school, grade: student.grade }
      : null

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

  if (!isGuest && !display) {
    return <p className="text-sm text-slate-500">학생을 찾을 수 없습니다.</p>
  }

  const linkedName = guestInfo?.linkedStudentId
    ? students.find((item) => item.id === guestInfo.linkedStudentId)?.name
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${display?.name ?? '상담생'} 진로·학과 적성검사 결과`}
        description={`${display?.school ?? ''} · ${display?.grade ?? ''}${isGuest ? ' · 상담생' : ''}`}
        action={
          <Link to={listPath} className="text-sm font-semibold text-navy-800">
            ← 목록
          </Link>
        }
      />
      {linkedName ? (
        <p className="text-sm font-medium text-emerald-700">현재 재원생 연결됨 · {linkedName}</p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {results.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {results.map((row, index) => (
            <Link
              key={row.id}
              to={
                isGuest
                  ? `${listPath}/guest/${guestId}?result=${row.id}`
                  : `${listPath}/${studentId}?result=${row.id}`
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                current?.id === row.id ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {index === 0 ? '최신' : row.createdAt.slice(0, 10)}
            </Link>
          ))}
        </div>
      ) : null}
      {current && display ? (
        <CareerResultReport
          student={{ name: display.name, school: display.school, grade: display.grade }}
          testedAt={current.createdAt}
          scores={current.scores}
        />
      ) : (
        <p className="text-sm text-slate-500">아직 완료된 검사가 없습니다.</p>
      )}
    </div>
  )
}
