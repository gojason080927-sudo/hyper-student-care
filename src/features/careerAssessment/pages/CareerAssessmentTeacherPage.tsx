import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PageHeader } from '../../../components/ui/PageHeader'
import { StudentFilterBar } from '../../../components/students/StudentFilterBar'
import { useData } from '../../../hooks/useData'
import type { Student } from '../../../types/student'
import type { StudentListFilters } from '../../../types/student'
import {
  createCareerGuest,
  createOrGetCareerSessions,
  deleteCareerSession,
  fetchCareerStudentsByIds,
  fetchTeacherCareerSessions,
  getCareerTestUrl,
  linkCareerGuest,
  type TeacherCareerSession,
} from '../api/careerAssessmentApi'
import { CareerConfirmModal } from '../components/CareerConfirmModal'
import { CareerGuestCreateModal } from '../components/CareerGuestCreateModal'
import { CareerGuestLinkModal } from '../components/CareerGuestLinkModal'
import { CareerQrModal } from '../components/CareerQrModal'
import {
  deriveCareerListProgress,
  mergeStudentsById,
  missingCareerStudentIds,
} from '../utils/careerListProgress'
import {
  buildCareerListRows,
  filterCareerListRows,
  type CareerKindFilter,
  type CareerListRow,
} from '../utils/careerListRows'
import { copyCareerLink } from '../utils/copyCareerLink'
import { careerSessionDeleteCopy } from '../utils/careerSessionDelete'

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
  const [kindFilter, setKindFilter] = useState<CareerKindFilter>('')
  const [sessions, setSessions] = useState<TeacherCareerSession[]>([])
  const [linkedStudents, setLinkedStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [qr, setQr] = useState<{ token: string; name: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [guestOpen, setGuestOpen] = useState(false)
  const [linkGuestId, setLinkGuestId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CareerListRow | null>(null)

  const listStudents = useMemo(
    () => mergeStudentsById(students, linkedStudents),
    [linkedStudents, students],
  )
  const rows = useMemo(
    () => buildCareerListRows({ students: listStudents, sessions }),
    [listStudents, sessions],
  )
  const filtered = useMemo(
    () =>
      filterCareerListRows(rows, {
        search: filters.search,
        school: filters.school,
        grade: filters.grade,
        className: filters.className,
        status: filters.status,
        kind: kindFilter,
      }),
    [filters, kindFilter, rows],
  )

  const reload = async (roster: Student[] = students) => {
    const next = await fetchTeacherCareerSessions()
    setSessions(next)
    const missing = missingCareerStudentIds(
      next.map((row) => row.studentId).filter((id): id is string => Boolean(id)),
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

  const copyLink = async (token: string, rowKey: string) => {
    const ok = await copyCareerLink(getCareerTestUrl(token))
    if (!ok) {
      setError('링크 복사에 실패했습니다. 주소를 직접 선택해 복사해 주세요.')
      return
    }
    setCopiedId(rowKey)
    window.setTimeout(() => setCopiedId(''), 1600)
  }

  const selectedIds = filtered.filter((row) => row.kind === 'student' && selected[row.id]).map((row) => row.id)
  const linkingRow = rows.find((row) => row.kind === 'guest' && row.id === linkGuestId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="진로·학과 적성검사"
        description="재원생은 기존처럼 학생을 선택하고, 상담생은 학생 DB에 등록하지 않고 검사할 수 있습니다."
      />

      <StudentFilterBar
        students={listStudents}
        filters={filters}
        totalCount={listStudents.length}
        enrolledCount={listStudents.filter((s) => s.status === '재원').length}
        onChange={setFilters}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-slate-600">
          학생구분
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as CareerKindFilter)}
            className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">전체</option>
            <option value="student">재원생</option>
            <option value="guest">상담생</option>
          </select>
        </label>
        <button
          type="button"
          disabled={selectedIds.length === 0 || busyId === 'bulk'}
          onClick={() => void prepareLinks(selectedIds)}
          className="min-h-11 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          선택한 학생 검사 링크 준비
        </button>
        <button
          type="button"
          onClick={() => setGuestOpen(true)}
          className="min-h-11 rounded-xl border border-navy-900 px-4 text-sm font-semibold text-navy-900"
        >
          상담생 검사 만들기
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
                  checked={
                    filtered.some((row) => row.kind === 'student') &&
                    filtered.filter((row) => row.kind === 'student').every((row) => selected[row.id])
                  }
                  onChange={(e) => {
                    const next = { ...selected }
                    for (const row of filtered) {
                      if (row.kind === 'student') next[row.id] = e.target.checked
                    }
                    setSelected(next)
                  }}
                />
              </th>
              <th className="px-3 py-3">학생</th>
              <th className="px-3 py-3">구분</th>
              <th className="px-3 py-3">상태</th>
              <th className="px-3 py-3">진행</th>
              <th className="px-3 py-3">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const session = row.session
              const progress = deriveCareerListProgress(session)
              const resultPath =
                row.kind === 'guest'
                  ? `${listBase}/guest/${row.id}?result=${session?.latestResultId ?? ''}`
                  : `${listBase}/${row.id}?result=${session?.latestResultId ?? ''}`
              return (
                <tr key={row.key} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    {row.kind === 'student' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(selected[row.id])}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
                        }
                      />
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-navy-900">{row.name}</div>
                    <div className="text-xs text-slate-500">
                      {row.school} · {row.grade} · {row.kind === 'guest' ? '-' : row.className}
                    </div>
                    {row.linkedStudentName ? (
                      <div className="mt-1 text-xs font-medium text-emerald-700">
                        현재 재원생 연결됨 · {row.linkedStudentName}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.kind === 'guest' ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {row.kind === 'guest' ? '상담생' : '재원생'}
                    </span>
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
                      {row.kind === 'student' ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void prepareLinks([row.id])}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                        >
                          {session ? '검사 링크 보기' : '검사 링크 생성'}
                        </button>
                      ) : null}
                      {session ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void copyLink(session.accessToken, row.key)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            {copiedId === row.key ? '복사됨' : '링크 복사'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setQr({ token: session.accessToken, name: row.name })}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            QR 표시
                          </button>
                        </>
                      ) : null}
                      {progress.status === 'completed' && session?.latestResultId ? (
                        <>
                          <Link
                            to={resultPath}
                            className="rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                          >
                            결과보기
                          </Link>
                          <Link
                            to={`${resultPath}&print=1`}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                          >
                            결과지 출력
                          </Link>
                        </>
                      ) : null}
                      {row.kind === 'guest' && progress.status === 'completed' ? (
                        <button
                          type="button"
                          onClick={() => setLinkGuestId(row.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold"
                        >
                          재원생으로 연결
                        </button>
                      ) : null}
                      {session ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(row)}
                          className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700"
                        >
                          삭제
                        </button>
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
      <CareerGuestCreateModal
        open={guestOpen}
        busy={busyId === 'guest-create'}
        onClose={() => setGuestOpen(false)}
        onSubmit={async (input) => {
          setBusyId('guest-create')
          setError('')
          try {
            const created = await createCareerGuest(input)
            await reload()
            setGuestOpen(false)
            setQr({ token: created.session.accessToken, name: created.guest.name })
          } catch {
            setError('상담생 검사 생성에 실패했습니다.')
          } finally {
            setBusyId(null)
          }
        }}
      />
      <CareerGuestLinkModal
        open={Boolean(linkGuestId)}
        guestName={linkingRow?.name ?? ''}
        students={listStudents}
        busy={busyId === 'guest-link'}
        onClose={() => setLinkGuestId(null)}
        onLink={async (studentId) => {
          if (!linkGuestId) return
          setBusyId('guest-link')
          try {
            await linkCareerGuest(linkGuestId, studentId)
            await reload()
            setLinkGuestId(null)
          } catch {
            setError('재원생 연결에 실패했습니다.')
          } finally {
            setBusyId(null)
          }
        }}
      />
      <CareerConfirmModal
        open={Boolean(deleteTarget?.session)}
        title={
          deleteTarget
            ? careerSessionDeleteCopy({
                name: deleteTarget.name,
                status: deleteTarget.session?.status,
                answeredCount: deleteTarget.session?.answeredCount,
                latestResultId: deleteTarget.session?.latestResultId,
              }).title
            : '검사 삭제'
        }
        message={
          deleteTarget
            ? careerSessionDeleteCopy({
                name: deleteTarget.name,
                status: deleteTarget.session?.status,
                answeredCount: deleteTarget.session?.answeredCount,
                latestResultId: deleteTarget.session?.latestResultId,
              }).message
            : ''
        }
        confirmLabel="검사 삭제"
        busy={busyId === 'session-delete'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          const sessionId = deleteTarget?.session?.id
          if (!sessionId) return
          setBusyId('session-delete')
          void deleteCareerSession(sessionId)
            .then(() => reload())
            .then(() => setDeleteTarget(null))
            .catch(() => setError('검사 삭제에 실패했습니다.'))
            .finally(() => setBusyId(null))
        }}
      />
    </div>
  )
}
