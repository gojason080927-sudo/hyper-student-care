import { Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FilterBar } from '../components/ui/FilterBar'
import { PageHeader } from '../components/ui/PageHeader'
import { SummaryCards } from '../components/ui/SummaryCards'
import { EmptyState } from '../components/ui/EmptyState'
import { useData } from '../hooks/useData'
import type { AttendanceRecord, AttendanceStatus } from '../types/records'
import type { Student, StudentFilters } from '../types'
import { filterStudentsLegacy } from '../utils/filters'
import { getTodayString, formatKoreanDate, isToday } from '../utils/date'
import { ATTENDANCE_STATUSES, btnPrimary, getAttendanceColor, inputClass } from '../utils/labels'

type Draft = { status: AttendanceStatus | ''; reason: string; memo: string; recordId?: string }

export function AttendancePage() {
  const { students, attendance, saveAttendanceRecord, deleteAttendanceRecord } = useData()
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="출결관리"
        description="날짜별 학생 출결을 입력하고 관리합니다."
        badge={<span className={`inline-block rounded-lg px-3 py-1 text-sm font-medium ${isToday(date) ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{formatKoreanDate(date)}</span>}
      />

      <FilterBar students={students} filters={filters} onChange={setFilters} showDate date={date} onDateChange={setDate} />

      {filteredStudents.length === 0 ? (
        <EmptyState title="표시할 학생이 없습니다." />
      ) : (
        <AttendanceStudentList
          key={date}
          date={date}
          students={filteredStudents}
          dayRecords={dayRecords}
          onSave={saveAttendanceRecord}
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
  onSave: ReturnType<typeof useData>['saveAttendanceRecord']
  onDelete: ReturnType<typeof useData>['deleteAttendanceRecord']
}) {
  const initialDrafts = useMemo(() => {
    const next: Record<string, Draft> = {}
    students.forEach((s) => {
      const record = dayRecords.find((a) => a.studentId === s.id)
      next[s.id] = record
        ? { status: record.status, reason: record.reason, memo: record.memo, recordId: record.id }
        : { status: '', reason: '', memo: '' }
    })
    return next
  }, [dayRecords, students])

  const [drafts, setDrafts] = useState(initialDrafts)

  const summary = useMemo(() => {
    const counts = { 출석: 0, 지각: 0, 결석: 0, 조퇴: 0, 미입력: 0 }
    students.forEach((s) => {
      const d = drafts[s.id]
      if (!d?.status) counts.미입력++
      else counts[d.status as AttendanceStatus]++
    })
    return counts
  }, [drafts, students])

  const updateDraft = (studentId: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }))
  }

  const saveOne = (studentId: string) => {
    const draft = drafts[studentId]
    if (!draft?.status) return
    onSave({
      id: draft.recordId,
      studentId,
      date,
      status: draft.status as AttendanceStatus,
      reason: draft.reason,
      memo: draft.memo,
    })
  }

  const saveAll = () => students.forEach((s) => saveOne(s.id))

  const clearOne = (studentId: string) => {
    const draft = drafts[studentId]
    if (draft?.recordId) onDelete(draft.recordId)
    updateDraft(studentId, { status: '', reason: '', memo: '', recordId: undefined })
  }

  return (
    <>
      <div className="flex justify-end">
        <button type="button" onClick={saveAll} className={`${btnPrimary} inline-flex items-center gap-2`}><Save className="h-4 w-4" />전체 저장</button>
      </div>

      <SummaryCards cards={[
        { label: '전체 학생', value: students.length },
        { label: '출석', value: summary.출석, accent: 'text-emerald-600' },
        { label: '지각', value: summary.지각, accent: 'text-amber-600' },
        { label: '결석', value: summary.결석, accent: 'text-rose-600' },
        { label: '조퇴', value: summary.조퇴, accent: 'text-violet-600' },
        { label: '미입력', value: summary.미입력, accent: 'text-slate-500' },
      ]} />

      <div className="space-y-3">
        {students.map((student) => {
          const draft = drafts[student.id] ?? { status: '', reason: '', memo: '' }
          const needsReason = draft.status && ['지각', '결석', '조퇴'].includes(draft.status)
          return (
            <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-base font-bold text-navy-900">{student.name}</p>
                  <p className="text-sm text-slate-500">{student.school} · {student.grade} · {student.className || '-'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ATTENDANCE_STATUSES.map((status) => (
                    <button key={status} type="button" onClick={() => updateDraft(student.id, { status: draft.status === status ? '' : status })}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${draft.status === status ? getAttendanceColor(status) + ' ring-2 ring-navy-900/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              {needsReason && (
                <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">사유</label><input value={draft.reason} onChange={(e) => updateDraft(student.id, { reason: e.target.value })} className={inputClass()} /></div>
                  <div><label className="mb-1 block text-xs font-medium text-slate-500">메모</label><input value={draft.memo} onChange={(e) => updateDraft(student.id, { memo: e.target.value })} className={inputClass()} /></div>
                </div>
              )}
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <button type="button" onClick={() => saveOne(student.id)} disabled={!draft.status} className={`${btnPrimary} disabled:opacity-40`}>저장</button>
                {draft.recordId && <button type="button" onClick={() => clearOne(student.id)} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50">삭제</button>}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
