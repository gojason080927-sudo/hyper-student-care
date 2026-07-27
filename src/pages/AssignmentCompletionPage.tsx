import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { ProgressBar } from '../components/ui/ProgressBar'
import { RecordActions } from '../components/ui/RecordActions'
import { StatusBadge } from '../components/ui/StatusBadge'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import type { AssignmentCompletionRecord } from '../types/records'
import { sortByDateDesc } from '../utils/filters'
import { calcCompletionRate } from '../utils/calc'
import { formatKoreanDate, getTodayString } from '../utils/date'
import { btnPrimary, btnSecondary, getAssignmentColor, inputClass } from '../utils/labels'
import { requireDate, requireNonEmpty, validateCounts } from '../utils/validation'

type FormState = {
  id?: string
  studentId: string
  date: string
  assignmentName: string
  totalCount: number
  completedCount: number
  memo: string
}

const emptyForm = (): FormState => ({
  studentId: '', date: getTodayString(), assignmentName: '', totalCount: 10, completedCount: 0, memo: '',
})

export function AssignmentCompletionPage() {
  const { students, assignmentCompletion, saveAssignmentRecord, deleteAssignmentRecord } = useData()
  const [dateFilter, setDateFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<AssignmentCompletionRecord | null>(null)

  const filtered = useMemo(() => {
    let list = sortByDateDesc(assignmentCompletion)
    if (dateFilter) list = list.filter((a) => a.date === dateFilter)
    if (studentFilter) list = list.filter((a) => a.studentId === studentFilter)
    return list
  }, [assignmentCompletion, dateFilter, studentFilter])

  const previewRate = calcCompletionRate(form.completedCount, form.totalCount)

  const openAdd = () => { setForm(emptyForm()); setErrors({}); setModalOpen(true) }
  const openEdit = (r: AssignmentCompletionRecord) => {
    setForm({ id: r.id, studentId: r.studentId, date: r.date, assignmentName: r.assignmentName, totalCount: r.totalCount, completedCount: r.completedCount, memo: r.memo })
    setErrors({}); setModalOpen(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.studentId) next.studentId = '학생을 선택해 주세요.'
    const dateErr = requireDate(form.date); if (dateErr) next.date = dateErr
    const nameErr = requireNonEmpty(form.assignmentName, '과제명'); if (nameErr) next.assignmentName = nameErr
    const countErr = validateCounts(form.completedCount, form.totalCount); if (countErr) next.totalCount = countErr
    setErrors(next); return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveAssignmentRecord(form)
    setModalOpen(false)
  }

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name ?? '-'

  return (
    <div className="space-y-6">
      <PageHeader title="과제완성" description="과제 수행량과 완료율을 기록합니다." action={<button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}><Plus className="h-4 w-4" />기록 추가</button>} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm font-medium text-slate-600">날짜</label><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className={inputClass()} /></div>
          <div><StudentSelect students={students} value={studentFilter} onChange={setStudentFilter} label="학생 필터" /></div>
        </div>
      </div>

      {filtered.length === 0 ? <EmptyState title="과제완성 기록이 없습니다." /> : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-bold text-navy-900">{getStudentName(record.studentId)}</p>
                    <StatusBadge label={record.status} colorClass={getAssignmentColor(record.status)} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{formatKoreanDate(record.date)} · {record.assignmentName}</p>
                  <p className="mt-1 text-sm text-slate-600">{record.completedCount} / {record.totalCount} 완료</p>
                  <div className="mt-3 max-w-md"><ProgressBar value={record.completionRate} label="완료율" /></div>
                  {record.memo && <p className="mt-2 text-sm text-slate-500">{record.memo}</p>}
                </div>
                <RecordActions onEdit={() => openEdit(record)} onDelete={() => setDeleteTarget(record)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={form.id ? '과제완성 수정' : '과제완성 추가'} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StudentSelect students={students.filter((s) => s.status === '재원')} value={form.studentId} onChange={(v) => setForm({ ...form, studentId: v })} error={errors.studentId} required />
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">날짜 *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass(errors.date)} />{errors.date && <p className="mt-1 text-sm text-rose-500">{errors.date}</p>}</div>
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">과제명 *</label><input value={form.assignmentName} onChange={(e) => setForm({ ...form, assignmentName: e.target.value })} className={inputClass(errors.assignmentName)} />{errors.assignmentName && <p className="mt-1 text-sm text-rose-500">{errors.assignmentName}</p>}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1.5 block text-sm font-medium text-slate-700">전체 수 *</label><input type="number" min={1} value={form.totalCount} onChange={(e) => setForm({ ...form, totalCount: Number(e.target.value) })} className={inputClass(errors.totalCount)} /></div>
            <div><label className="mb-1.5 block text-sm font-medium text-slate-700">완료 수 *</label><input type="number" min={0} value={form.completedCount} onChange={(e) => setForm({ ...form, completedCount: Number(e.target.value) })} className={inputClass(errors.totalCount)} /></div>
          </div>
          {errors.totalCount && <p className="text-sm text-rose-500">{errors.totalCount}</p>}
          <ProgressBar value={previewRate} label="완료율 (자동 계산)" />
          <div><label className="mb-1.5 block text-sm font-medium text-slate-700">메모</label><textarea value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} rows={2} className={inputClass()} /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>취소</button><button type="submit" className={btnPrimary}>저장</button></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteTarget} title="과제완성 삭제" message="이 기록을 삭제하시겠습니까?" onCancel={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) deleteAssignmentRecord(deleteTarget.id); setDeleteTarget(null) }} />
    </div>
  )
}
