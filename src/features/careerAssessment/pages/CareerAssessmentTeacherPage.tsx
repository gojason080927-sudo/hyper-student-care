import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StudentFilterBar } from '../../../components/students/StudentFilterBar'
import { useData } from '../../../hooks/useData'
import type { Student } from '../../../types/student'
import type { StudentListFilters } from '../../../types/student'
import { filterStudents } from '../../../utils/filters'
import {
  createOrGetCareerSessions,
  fetchCareerStudentsByIds,
  fetchTeacherCareerSessions,
  getCareerTestUrl,
  type TeacherCareerSession,
} from '../api/careerAssessmentApi'
import { CareerQrModal } from '../components/CareerQrModal'
import {
  deriveCareerListProgress,
  mergeStudentsById,
  missingCareerStudentIds,
} from '../utils/careerListProgress'

function statusTone(status: ReturnType<typeof deriveCareerListProgress>['status']): string {
  if (status === 'in_progress') return 'bg-amber-100 text-amber-800'
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800'
  return 'bg-slate-100 text-slate-700'
}

export function CareerAssessmentTeacherPage() {
  const { students } = useData()
  const location = useLocation()
  const listBase = location.pathname.startsWith('/teacher/mobile')
    ? '/teacher/mobile/career-assessment'
    : '/career-assessment'
  const [filters, setFilters] = useState<StudentListFilters>({
    search: '',
    school: '',
    grade: '',
    className: '',
    status: '재원',
    subject: '',
  })
  const [sessions, setSessions] = useState<TeacherCareerSession[]>([])
  const [linkedStudents, setLinkedStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [qr, setQr] = useState<{ token: string; name: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const listStudents = useMemo(
    () => mergeStudentsById(students, linkedStudents),
    [linkedStudents, students],
  )
  const filtered = useMemo(() => filterStudents(listStudents, filters), [filters, listStudents])
  const sessionByStudent = useMemo(() => {
    const map = new Map<string, TeacherCareerSession>()
    for (const session of sessions) {
      const current = map.get(session.studentId)
      if (!current || session.createdAt > current.createdAt) map.set(session.studentId, session)
    }
    return map
  }, [sessions])

  const reload = async (roster: Student[] = students) => {
    const rows = await fetchTeacherCareerSessions()
    setSessions(rows)
    const missing = missingCareerStudentIds(
      rows.map((row) => row.studentId),
      roster.map((student) => student.id),
    )
    setLinkedStudents(missing.length > 0 ? await fetchCareerStudentsByIds(missing) : [])
  }

  useEffect(() => {
    const load = () => {
      void reload(students).catch(() =>
        setError('검사 현황을 불러오지 못했습니다. 강사 로그인 후 다시 시도해 주세요.'),
      )
    }
    load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') load()
    }
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [students])

  const prepareLinks = async (studentIds: string[]) => {
    setError('')
    setBusyId(studentIds.length === 1 ? (studentIds[0] ?? 'bulk') : 'bulk')
    try {
      await createOrGetCareerSessions(studentIds)
      await reload()
    } catch {
      setError('검사 링크 생성에 실패했습니다. 로그인 상태를 확인해 주세요.')
    } finally {
      setBusyId(null)
    }
  }

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(getCareerTestUrl(token))
  }

  const selectedIds = filtered.filter((s) => selected[s.id]).map((s) => s.id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="진로·학과 적성검사"
        description="학생에게 검사 링크 또는 QR만 전달합니다. 답변은 학생이 직접 입력합니다."
      />

      <StudentFilterBar
        students={listStudents}
        filters={filters}
        totalCount={listStudents.length}
        enrolledCount={listStudents.filter((s) => s.status === '재원').length}
        onChange={setFilters}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={selectedIds.length === 0 || busyId === 'bulk'}
          onClick={() => void prepareLinks(selectedIds)}
          className="min-h-11 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          선택한 학생 검사 링크 준비
        </button>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((s) => selected[s.id])}
                  onChange={(e) => {
                    const next = { ...selected }
                    for (const student of filtered) next[student.id] = e.target.checked
                    setSelected(next)
                  }}
                />
              </th>
              <th className="px-3 py-3">학생</th>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3">진행</th>
              <th className="px-3 py-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((student) => {
              const session = sessionByStudent.get(student.id)
              const progress = deriveCareerListProgress(session)
              return (
                <tr key={student.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[student.id])}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [student.id]: e.target.checked }))
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-navy-900">{student.name}</div>
                    <div className="text-xs text-slate-500">
                      {student.school} · {student.grade} · {student.className}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(progress.status)}`}>
                      {progress.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {progress.answeredCount} / 88 · {progress.percent}%
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === student.id}
                        onClick={() => void prepareLinks([student.id])}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                      >
                        {session ? '검사 링크 보기' : '검사 링크 생성'}
                      </button>
                      {session ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void copyLink(session.accessToken)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            링크 복사
                          </button>
                          <button
                            type="button"
                            onClick={() => setQr({ token: session.accessToken, name: student.name })}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            QR 표시
                          </button>
                        </>
                      ) : null}
                      {progress.status === 'completed' && session?.latestResultId ? (
                        <>
                          <Link
                            to={`${listBase}/${student.id}?result=${session.latestResultId}`}
                            className="rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                          >
                            결과보기
                          </Link>
                          <Link
                            to={`${listBase}/${student.id}?result=${session.latestResultId}&print=1`}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            결과지 출력
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <CareerQrModal
        open={Boolean(qr)}
        token={qr?.token ?? ''}
        studentName={qr?.name ?? ''}
        onClose={() => setQr(null)}
      />
    </div>
  )
}
