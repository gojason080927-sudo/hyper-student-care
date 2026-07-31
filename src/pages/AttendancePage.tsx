import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilterBar } from '../components/ui/FilterBar'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLoadingState } from '../components/ui/PageLoadingState'
import { SummaryCards } from '../components/ui/SummaryCards'
import { EmptyState } from '../components/ui/EmptyState'
import { useData } from '../hooks/useData'
import type { AttendanceRecord, AttendanceStatus } from '../types/records'
import type { Student, StudentFilters } from '../types'
import { filterStudentsLegacy, formatSubjects } from '../utils/filters'
import { getTodayString, formatKoreanDate, isToday } from '../utils/date'
import {
  ATTENDANCE_STATUSES,
  getAttendanceButtonClass,
  inputClass,
} from '../utils/labels'

type Draft = { status: AttendanceStatus | ''; reason: string; memo: string; recordId?: string }

type SaveFlash = 'saved' | 'updated' | 'failed'

function draftFromRecord(record: AttendanceRecord | undefined): Draft {
  return record
    ? {
        status: record.status,
        reason: record.reason,
        memo: record.memo,
        recordId: record.id,
      }
    : { status: '', reason: '', memo: '' }
}

export function AttendancePage() {
  const {
    students,
    attendance,
    saveAttendanceRecordAsync,
    deleteAttendanceRecord,
    isLoading,
  } = useData()
  const [date, setDate] = useState(getTodayString())
  const [filters, setFilters] = useState<StudentFilters>({
    search: '', school: '', grade: '', className: '', subject: '',
  })

  const filteredStudents = useMemo(
    () => filterStudentsLegacy(students.filter((s) => s.status === '재원'), filters),
    [filters, students],
  )

  const dayRecords = useMemo(
    () => attendance.filter((a) => a.date === date),
    [attendance, date],
  )

  if (isLoading) {
    return <PageLoadingState message="출결 데이터를 불러오는 중…" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="출결관리"
        description="날짜별 학생 출결을 선택하면 자동으로 저장됩니다."
        badge={
          <span
            className={`inline-block rounded-lg px-3 py-1 text-sm font-medium ${isToday(date) ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {formatKoreanDate(date)}
          </span>
        }
      />

      <FilterBar
        students={students}
        filters={filters}
        onChange={setFilters}
        showDate
        date={date}
        onDateChange={setDate}
      />

      {filteredStudents.length === 0 ? (
        <EmptyState title="표시할 학생이 없습니다." />
      ) : (
        <AttendanceStudentList
          key={date}
          date={date}
          students={filteredStudents}
          dayRecords={dayRecords}
          onSave={saveAttendanceRecordAsync}
          onDelete={deleteAttendanceRecord}
        />
      )}
    </div>
  )
}

function AttendanceStudentList({
  date,
  students,
  dayRecords,
  onSave,
  onDelete,
}: {
  date: string
  students: Student[]
  dayRecords: AttendanceRecord[]
  onSave: ReturnType<typeof useData>['saveAttendanceRecordAsync']
  onDelete: ReturnType<typeof useData>['deleteAttendanceRecord']
}) {
  const initialDrafts = useMemo(() => {
    const next: Record<string, Draft> = {}
    students.forEach((s) => {
      const record = dayRecords.find((a) => a.studentId === s.id)
      next[s.id] = draftFromRecord(record)
    })
    return next
  }, [dayRecords, students])

  const [drafts, setDrafts] = useState(initialDrafts)
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set())
  const [flashByStudent, setFlashByStudent] = useState<Record<string, SaveFlash>>({})

  const draftsRef = useRef(drafts)
  const committedRef = useRef<Record<string, Draft>>(initialDrafts)
  const savingIdsRef = useRef<Set<string>>(new Set())
  const flashTimersRef = useRef<Record<string, number>>({})
  const reasonTimersRef = useRef<Record<string, number>>({})

  draftsRef.current = drafts
  savingIdsRef.current = savingIds

  useEffect(() => {
    committedRef.current = initialDrafts
    setDrafts((prev) => {
      const next = { ...prev }
      students.forEach((s) => {
        if (savingIdsRef.current.has(s.id)) return
        next[s.id] = initialDrafts[s.id]
      })
      return next
    })
  }, [initialDrafts, students])

  useEffect(() => {
    return () => {
      Object.values(flashTimersRef.current).forEach((id) => window.clearTimeout(id))
      Object.values(reasonTimersRef.current).forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const summary = useMemo(() => {
    const counts = { 출석: 0, 지각: 0, 결석: 0, 조퇴: 0 }
    students.forEach((s) => {
      const d = drafts[s.id]
      if (d?.status) counts[d.status as AttendanceStatus]++
    })
    return counts
  }, [drafts, students])

  const showFlash = useCallback((studentId: string, flash: SaveFlash) => {
    setFlashByStudent((prev) => ({ ...prev, [studentId]: flash }))
    if (flashTimersRef.current[studentId]) {
      window.clearTimeout(flashTimersRef.current[studentId])
    }
    if (flash !== 'failed') {
      flashTimersRef.current[studentId] = window.setTimeout(() => {
        setFlashByStudent((prev) => {
          const next = { ...prev }
          delete next[studentId]
          return next
        })
      }, 1000)
    }
  }, [])

  const persistDraft = useCallback(
    async (
      studentId: string,
      options?: { flash?: SaveFlash | false; previousCommitted?: Draft },
    ) => {
      const draft = draftsRef.current[studentId]
      if (!draft?.status) return { success: false as const }

      if (savingIdsRef.current.has(studentId)) return { success: false as const }

      const committed = options?.previousCommitted ?? committedRef.current[studentId]
      const isUpdate = Boolean(committed?.recordId)

      setSavingIds((prev) => new Set(prev).add(studentId))

      const result = await onSave(
        {
          id: draft.recordId,
          studentId,
          date,
          status: draft.status as AttendanceStatus,
          reason: draft.reason,
          memo: draft.memo,
        },
        { silent: true },
      )

      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })

      if (result.success) {
        const savedDraft: Draft = {
          ...draft,
          recordId: result.recordId ?? draft.recordId,
        }
        committedRef.current[studentId] = savedDraft
        setDrafts((prev) => ({ ...prev, [studentId]: savedDraft }))
        if (options?.flash !== false) {
          showFlash(studentId, options?.flash ?? (isUpdate ? 'updated' : 'saved'))
        }
        return { success: true as const }
      }

      const rollback = committed ?? draftFromRecord(undefined)
      setDrafts((prev) => ({ ...prev, [studentId]: rollback }))
      committedRef.current[studentId] = rollback
      showFlash(studentId, 'failed')
      return { success: false as const }
    },
    [date, onSave, showFlash],
  )

  const handleStatusSelect = (studentId: string, status: AttendanceStatus) => {
    if (savingIdsRef.current.has(studentId)) return

    const current = draftsRef.current[studentId]
    if (current?.status === status) return

    const committed = committedRef.current[studentId] ?? draftFromRecord(undefined)
    const nextDraft: Draft = {
      ...(current ?? draftFromRecord(undefined)),
      status,
    }

    setDrafts((prev) => ({ ...prev, [studentId]: nextDraft }))
    setFlashByStudent((prev) => {
      const next = { ...prev }
      delete next[studentId]
      return next
    })

    void persistDraft(studentId, { previousCommitted: committed })
  }

  const updateDraft = (studentId: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }))
    if (patch.reason !== undefined || patch.memo !== undefined) {
      const draft = { ...draftsRef.current[studentId], ...patch }
      if (!draft.status) return

      if (reasonTimersRef.current[studentId]) {
        window.clearTimeout(reasonTimersRef.current[studentId])
      }
      reasonTimersRef.current[studentId] = window.setTimeout(() => {
        void persistDraft(studentId, { flash: false })
      }, 600)
    }
  }

  const clearOne = (studentId: string) => {
    const draft = draftsRef.current[studentId]
    if (draft?.recordId) onDelete(draft.recordId)
    const empty = draftFromRecord(undefined)
    committedRef.current[studentId] = empty
    setDrafts((prev) => ({ ...prev, [studentId]: empty }))
    setFlashByStudent((prev) => {
      const next = { ...prev }
      delete next[studentId]
      return next
    })
  }

  return (
    <>
      <SummaryCards
        variant="stat"
        cards={[
          { label: '전체 학생', value: students.length },
          { label: '출석', value: summary.출석, accent: 'text-emerald-600' },
          { label: '지각', value: summary.지각, accent: 'text-amber-600' },
          { label: '결석', value: summary.결석, accent: 'text-rose-600' },
          { label: '조퇴', value: summary.조퇴, accent: 'text-blue-600' },
        ]}
      />

      <div className="space-y-3.5">
        {students.map((student) => {
          const draft = drafts[student.id] ?? draftFromRecord(undefined)
          const needsReason =
            draft.status && ['지각', '결석', '조퇴'].includes(draft.status)
          const subjectsText = formatSubjects(student.subjects)
          const isSavingRow = savingIds.has(student.id)
          const flash = flashByStudent[student.id]

          return (
            <div
              key={student.id}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-6 shadow-sm transition-all duration-200 ease hover-capable:hover:-translate-y-0.5 hover-capable:hover:border-slate-300 hover-capable:hover:shadow-md sm:px-6 sm:py-7"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5 lg:gap-6">
                <div className="min-w-0 shrink-0 md:w-[min(100%,220px)] lg:w-[min(100%,260px)]">
                  <p className="text-[1.35rem] font-extrabold leading-tight tracking-tight text-navy-900 sm:text-2xl">
                    {student.name}
                  </p>
                  <p className="mt-2 text-xs leading-snug text-slate-500 sm:text-[13px]">
                    {student.school} · {student.grade} · {student.className || '-'}
                  </p>
                  {subjectsText && (
                    <p className="mt-1 text-[11px] font-medium text-slate-400">{subjectsText}</p>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3.5 md:flex-row md:items-center md:justify-end md:gap-4">
                  <div className="grid w-full grid-cols-4 gap-2.5 md:flex md:w-auto md:flex-nowrap md:gap-2">
                    {ATTENDANCE_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={isSavingRow}
                        onClick={() => handleStatusSelect(student.id, status)}
                        className={`${getAttendanceButtonClass(status, draft.status === status)} w-full md:w-auto disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="flex shrink-0 items-center justify-end gap-3 md:min-w-[6rem] md:justify-end">
                    {flash === 'saved' && (
                      <p className="text-sm font-semibold text-emerald-600">✓ 저장됨</p>
                    )}
                    {flash === 'updated' && (
                      <p className="text-sm font-semibold text-emerald-600">✓ 수정됨</p>
                    )}
                    {flash === 'failed' && (
                      <p className="text-sm font-semibold text-rose-600" role="alert">
                        저장 실패
                      </p>
                    )}

                    {draft.recordId && (
                      <button
                        type="button"
                        onClick={() => clearOne(student.id)}
                        disabled={isSavingRow}
                        className="min-h-11 shrink-0 whitespace-nowrap rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {needsReason && (
                <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 md:mt-5">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">사유</label>
                    <input
                      value={draft.reason}
                      disabled={isSavingRow}
                      onChange={(e) => updateDraft(student.id, { reason: e.target.value })}
                      className={inputClass()}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">메모</label>
                    <input
                      value={draft.memo}
                      disabled={isSavingRow}
                      onChange={(e) => updateDraft(student.id, { memo: e.target.value })}
                      className={inputClass()}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
