import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MakeupMethodPicker } from '../components/makeup/MakeupMethodPicker'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordActions } from '../components/ui/RecordActions'
import { StatusBadge } from '../components/ui/StatusBadge'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import type { MakeupMethod, MakeupPlanRecord, MakeupPlanStatus } from '../types/records'
import { formatKoreanDateTime, getTodayString } from '../utils/date'
import { sortMakeupPlans } from '../utils/makeupPlan'
import {
  MAKEUP_METHODS,
  MAKEUP_PLAN_STATUSES,
  SUBJECTS,
  btnPrimary,
  btnSecondary,
  getMakeupMethodColor,
  getMakeupPlanStatusColor,
  getMakeupSubjectColor,
  inputClass,
} from '../utils/labels'
import { requireDate, requireTime } from '../utils/validation'

type FormState = {
  id?: string
  studentId: string
  scheduledDate: string
  scheduledTime: string
  method: MakeupMethod | ''
  subject: string
  reason: string
  memo: string
  status: MakeupPlanStatus
}

const emptyForm = (): FormState => ({
  studentId: '',
  scheduledDate: getTodayString(),
  scheduledTime: '19:00',
  method: '',
  subject: '수학',
  reason: '',
  memo: '',
  status: '예정',
})

export function MakeupPlanPage() {
  const { students, makeupPlans, saveMakeupPlanRecord, deleteMakeupPlanRecord } = useData()
  const [dateFilter, setDateFilter] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [deleteTarget, setDeleteTarget] = useState<MakeupPlanRecord | null>(null)

  const getStudent = (id: string) => students.find((s) => s.id === id)

  const filtered = useMemo(() => {
    let list = sortMakeupPlans(makeupPlans)
    if (dateFilter) list = list.filter((r) => r.scheduledDate === dateFilter)
    if (methodFilter) list = list.filter((r) => r.method === methodFilter)
    if (statusFilter) list = list.filter((r) => r.status === statusFilter)
    if (studentSearch.trim()) {
      const q = studentSearch.trim()
      list = list.filter((r) => {
        const student = getStudent(r.studentId)
        return student?.name.includes(q) ?? false
      })
    }
    return list
  }, [dateFilter, makeupPlans, methodFilter, statusFilter, studentSearch, students])

  const openAdd = () => {
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (record: MakeupPlanRecord) => {
    setForm({
      id: record.id,
      studentId: record.studentId,
      scheduledDate: record.scheduledDate,
      scheduledTime: record.scheduledTime,
      method: record.method,
      subject: record.subject,
      reason: record.reason,
      memo: record.memo,
      status: record.status,
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.studentId) next.studentId = '학생을 선택해 주세요.'
    const dateErr = requireDate(form.scheduledDate, '보강 예정 날짜')
    if (dateErr) next.scheduledDate = dateErr
    const timeErr = requireTime(form.scheduledTime)
    if (timeErr) next.scheduledTime = timeErr
    if (!form.method) next.method = '보강 방식을 선택해 주세요.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveMakeupPlanRecord({
      ...form,
      method: form.method as MakeupMethod,
      id: form.id,
    })
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="보강계획"
        description="학생별 보강 예정 날짜와 진행 방식을 관리합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            보강계획 추가
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">날짜</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">학생 검색</label>
            <input
              type="search"
              placeholder="학생 이름"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">보강 방식</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className={inputClass()}
            >
              <option value="">전체</option>
              {MAKEUP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">진행 상태</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass()}
            >
              <option value="">전체</option>
              {MAKEUP_PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="보강계획이 없습니다." />
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const student = getStudent(record.studentId)
            return (
              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-bold text-navy-900">
                        {student?.name ?? '-'}
                      </p>
                      {student && (
                        <span className="text-sm text-slate-500">
                          {student.school} · {student.grade}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatKoreanDateTime(record.scheduledDate, record.scheduledTime)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <StatusBadge
                        label={record.method}
                        colorClass={getMakeupMethodColor(record.method)}
                      />
                      {record.subject.trim() && (
                        <StatusBadge
                          label={record.subject.trim()}
                          colorClass={getMakeupSubjectColor()}
                        />
                      )}
                      <StatusBadge
                        label={record.status}
                        colorClass={getMakeupPlanStatusColor(record.status)}
                      />
                    </div>
                    {record.reason && (
                      <p className="text-sm text-slate-600">{record.reason}</p>
                    )}
                    {record.memo.trim() && (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">메모: </span>
                        {record.memo}
                      </p>
                    )}
                  </div>
                  <RecordActions
                    onEdit={() => openEdit(record)}
                    onDelete={() => setDeleteTarget(record)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id ? '보강계획 수정' : '보강계획 추가'}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <StudentSelect
            students={students.filter((s) => s.status === '재원')}
            value={form.studentId}
            onChange={(v) => setForm({ ...form, studentId: v })}
            error={errors.studentId}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                보강 예정 날짜 *
              </label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className={inputClass(errors.scheduledDate)}
              />
              {errors.scheduledDate && (
                <p className="mt-1 text-sm text-rose-500">{errors.scheduledDate}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                보강 예정 시간 *
              </label>
              <input
                type="time"
                value={form.scheduledTime}
                onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                className={inputClass(errors.scheduledTime)}
              />
              {errors.scheduledTime && (
                <p className="mt-1 text-sm text-rose-500">{errors.scheduledTime}</p>
              )}
            </div>
          </div>
          <MakeupMethodPicker
            value={form.method}
            onChange={(method) => setForm({ ...form, method })}
            error={errors.method}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">과목</label>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className={inputClass()}
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">보강 사유</label>
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="보강 사유"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
            <textarea
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              rows={2}
              placeholder="메모 (선택)"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">진행 상태</label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as MakeupPlanStatus })
              }
              className={inputClass()}
            >
              {MAKEUP_PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
              취소
            </button>
            <button type="submit" className={btnPrimary}>
              저장
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="보강계획 삭제"
        message="이 보강계획을 삭제하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMakeupPlanRecord(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
