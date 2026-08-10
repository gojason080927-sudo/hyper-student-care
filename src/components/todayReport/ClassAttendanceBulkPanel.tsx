import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import type { AttendanceRecord, AttendanceStatus } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import {
  ATTENDANCE_STATUSES,
  btnPrimary,
  btnSecondary,
  getAttendanceColor,
  inputClass,
} from '../../utils/labels'

type AttendanceDraft = {
  status: AttendanceStatus | ''
  reason: string
  recordId?: string
  memo: string
}

function draftFromRecord(record: AttendanceRecord | undefined): AttendanceDraft {
  if (!record) return { status: '', reason: '', memo: '' }
  return {
    status: record.status,
    reason: record.reason,
    recordId: record.id,
    memo: record.memo,
  }
}

type ClassAttendanceBulkPanelProps = {
  date: string
  grade: string
  className: string
  students: Student[]
  /** mobile PWA uses tighter row layout */
  compact?: boolean
}

export function ClassAttendanceBulkPanel({
  date,
  grade,
  className,
  students,
  compact = false,
}: ClassAttendanceBulkPanelProps) {
  const { attendance, saveAttendanceRecordAsync, showToast } = useData()
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, AttendanceDraft>>({})

  const dayRecordsByStudent = useMemo(() => {
    const map = new Map<string, AttendanceRecord>()
    for (const record of attendance) {
      if (record.date !== date) continue
      map.set(record.studentId, record)
    }
    return map
  }, [attendance, date])

  const studentIdsKey = useMemo(
    () => students.map((s) => s.id).join('|'),
    [students],
  )

  useEffect(() => {
    const next: Record<string, AttendanceDraft> = {}
    for (const student of students) {
      next[student.id] = draftFromRecord(dayRecordsByStudent.get(student.id))
    }
    setDrafts(next)
  }, [date, dayRecordsByStudent, studentIdsKey, students])

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setDrafts((prev) => {
      const current = prev[studentId] ?? { status: '', reason: '', memo: '' }
      return {
        ...prev,
        [studentId]: {
          ...current,
          status,
          reason: status === '출석' ? '' : current.reason,
        },
      }
    })
  }

  const setReason = (studentId: string, reason: string) => {
    setDrafts((prev) => {
      const current = prev[studentId] ?? { status: '', reason: '', memo: '' }
      return {
        ...prev,
        [studentId]: { ...current, reason },
      }
    })
  }

  const markAllPresent = () => {
    setDrafts((prev) => {
      const next: Record<string, AttendanceDraft> = { ...prev }
      for (const student of students) {
        const current = next[student.id] ?? { status: '', reason: '', memo: '' }
        next[student.id] = {
          ...current,
          status: '출석',
          reason: '',
        }
      }
      return next
    })
  }

  const handleSaveAll = async () => {
    if (saving || students.length === 0) return

    const missing = students.filter((s) => !drafts[s.id]?.status)
    if (missing.length > 0) {
      showToast(`출결 미선택: ${missing.map((s) => s.name).join(', ')}`)
      return
    }

    setSaving(true)
    const failures: string[] = []

    try {
      const results = await Promise.all(
        students.map(async (student) => {
          const draft = drafts[student.id]
          if (!draft?.status) {
            return { student, success: false as const }
          }
          try {
            const result = await saveAttendanceRecordAsync(
              {
                id: draft.recordId,
                studentId: student.id,
                date,
                status: draft.status,
                reason: draft.status === '출석' ? '' : draft.reason.trim(),
                memo: draft.memo,
              },
              { silent: true },
            )
            if (!result.success) {
              console.error('[class-attendance] save failed', {
                studentId: student.id,
                name: student.name,
                date,
                status: draft.status,
              })
              return { student, success: false as const }
            }
            return {
              student,
              success: true as const,
              recordId: result.recordId,
            }
          } catch (error) {
            console.error('[class-attendance] save threw', {
              studentId: student.id,
              name: student.name,
              date,
              error,
            })
            return { student, success: false as const }
          }
        }),
      )

      for (const result of results) {
        if (!result.success) {
          failures.push(result.student.name)
          continue
        }
        if (result.recordId) {
          setDrafts((prev) => ({
            ...prev,
            [result.student.id]: {
              ...(prev[result.student.id] ?? { status: '', reason: '', memo: '' }),
              recordId: result.recordId,
            },
          }))
        }
      }

      if (failures.length > 0) {
        console.error('[class-attendance] partial/full failure', {
          date,
          grade,
          className,
          failures,
        })
        showToast('출결 저장에 실패했습니다.')
        return
      }

      showToast('출결이 저장되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (students.length === 0) {
    return (
      <p className="px-1 py-3 text-center text-sm text-slate-500">
        표시할 학생이 없습니다.
      </p>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">
          {formatKoreanDate(date)} / {className || `${grade}`} · {students.length}명
        </p>
        <button
          type="button"
          onClick={markAllPresent}
          disabled={saving}
          className={`${btnSecondary} min-h-9 px-3 py-1.5 text-xs`}
        >
          전체 출석
        </button>
      </div>

      <div
        className={
          compact
            ? 'divide-y divide-[rgba(22,58,112,0.06)] rounded-xl border border-[rgba(22,58,112,0.08)] bg-white'
            : 'divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white'
        }
      >
        {students.map((student) => {
          const draft = drafts[student.id] ?? { status: '', reason: '', memo: '' }
          const showReason = Boolean(draft.status && draft.status !== '출석')
          return (
            <div key={student.id} className={compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}>
              <p
                className={
                  compact
                    ? 'mb-1.5 text-sm font-bold text-[#163A70]'
                    : 'mb-1.5 text-sm font-bold text-navy-900'
                }
              >
                {student.name}
              </p>
              <div className="flex flex-nowrap gap-1">
                {ATTENDANCE_STATUSES.map((status) => {
                  const selected = draft.status === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatus(student.id, status)}
                      disabled={saving}
                      className={`min-h-9 flex-1 rounded-lg border px-1.5 py-1 text-xs font-semibold transition sm:text-sm ${
                        selected
                          ? getAttendanceColor(status)
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  )
                })}
              </div>
              {showReason && (
                <input
                  value={draft.reason}
                  onChange={(e) => setReason(student.id, e.target.value)}
                  disabled={saving}
                  placeholder="사유 (선택)"
                  className={`${inputClass()} mt-1.5 min-h-9 py-1.5 text-xs`}
                />
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleSaveAll()}
        disabled={saving || students.length === 0}
        className={
          compact
            ? 'tm-btn-primary w-full min-h-11'
            : `${btnPrimary} w-full`
        }
      >
        {saving ? '저장 중…' : '전체 출결 저장'}
      </button>
    </div>
  )
}
