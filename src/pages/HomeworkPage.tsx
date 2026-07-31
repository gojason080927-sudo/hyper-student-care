import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { HomeworkContentDisplay } from '../components/homework/HomeworkContentDisplay'
import { HomeworkStatusButtons } from '../components/homework/HomeworkStatusButtons'
import { HomeworkStatusPicker } from '../components/homework/HomeworkStatusPicker'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { PageLoadingState } from '../components/ui/PageLoadingState'
import { RecordActions } from '../components/ui/RecordActions'
import { StatusBadge } from '../components/ui/StatusBadge'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import type { HomeworkRecord, HomeworkStatus } from '../types/records'
import { sortByDateDesc } from '../utils/filters'
import { formatKoreanDate, getTodayString } from '../utils/date'
import {
  getHomeworkContent,
  homeworkRecordToSavePayload,
  normalizeHomeworkStatus,
} from '../utils/homework'
import {
  btnPrimary,
  btnSecondary,
  getHomeworkColor,
  inputClass,
} from '../utils/labels'
import { requireDate } from '../utils/validation'

type FormState = {
  id?: string
  studentId: string
  date: string
  content: string
  status: HomeworkStatus | ''
  teacherMemo: string
}

const emptyForm = (): FormState => ({
  studentId: '',
  date: getTodayString(),
  content: '',
  status: '',
  teacherMemo: '',
})

export function HomeworkPage() {
  const { students, homework, saveHomeworkRecord, deleteHomeworkRecord, isLoading, isSaving } =
    useData()
  const [dateFilter, setDateFilter] = useState('')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [deleteTarget, setDeleteTarget] = useState<HomeworkRecord | null>(null)

  const filtered = useMemo(() => {
    let list = sortByDateDesc(homework)
    if (dateFilter) list = list.filter((h) => h.date === dateFilter)
    if (search.trim()) {
      const q = search.trim()
      list = list.filter((h) => {
        const student = students.find((s) => s.id === h.studentId)
        const content = getHomeworkContent(h)
        return content.includes(q) || (student?.name.includes(q) ?? false)
      })
    }
    return list
  }, [dateFilter, homework, search, students])

  const openAdd = () => {
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (r: HomeworkRecord) => {
    setForm({
      id: r.id,
      studentId: r.studentId,
      date: r.date,
      content: getHomeworkContent(r),
      status: normalizeHomeworkStatus(r.status),
      teacherMemo: r.teacherMemo,
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleCardStatusChange = (record: HomeworkRecord, status: HomeworkStatus) => {
    const current = normalizeHomeworkStatus(record.status)
    if (current === status) return
    saveHomeworkRecord({
      id: record.id,
      studentId: record.studentId,
      date: record.date,
      title: record.title,
      description: record.description,
      status,
      teacherMemo: record.teacherMemo,
    })
  }

  const validate = () => {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (!form.studentId) next.studentId = '학생을 선택해 주세요.'
    const dateErr = requireDate(form.date)
    if (dateErr) next.date = dateErr
    if (!form.date) next.date = '날짜를 선택해 주세요.'
    if (!form.content.trim()) next.content = '숙제 내용을 입력해 주세요.'
    if (!form.status) next.status = '수행 상태를 선택해 주세요.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveHomeworkRecord(
      homeworkRecordToSavePayload({
        ...form,
        status: form.status as HomeworkStatus,
      }),
    )
    setModalOpen(false)
  }

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name ?? '-'

  if (isLoading) {
    return <PageLoadingState message="숙제 데이터를 불러오는 중…" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="숙제관리"
        description="학생별 숙제 수행 상태를 기록합니다."
        action={
          <button
            type="button"
            onClick={openAdd}
            className={`${btnPrimary} inline-flex items-center gap-2`}
          >
            <Plus className="h-4 w-4" />
            기록 추가
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <label className="mb-1.5 block text-sm font-medium text-slate-600">숙제 내용</label>
            <input
              type="search"
              placeholder="숙제 내용을 입력하세요."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="숙제 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => {
            const status = normalizeHomeworkStatus(record.status)
            return (
              <div
                key={record.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-bold text-navy-900">
                          {getStudentName(record.studentId)}
                        </p>
                        <StatusBadge
                          label={status}
                          colorClass={getHomeworkColor(status)}
                        />
                      </div>
                      <p className="text-sm text-slate-500">{formatKoreanDate(record.date)}</p>
                      <HomeworkContentDisplay content={getHomeworkContent(record)} />
                      {record.teacherMemo.trim() && (
                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          <span className="font-medium text-slate-700">강사 메모: </span>
                          {record.teacherMemo}
                        </p>
                      )}
                    </div>
                  </div>

                  <HomeworkStatusButtons
                    value={status}
                    onChange={(next) => handleCardStatusChange(record, next)}
                    label="수행 상태"
                  />

                  <div className="flex justify-end border-t border-slate-100 pt-3">
                    <RecordActions
                      onEdit={() => openEdit(record)}
                      onDelete={() => setDeleteTarget(record)}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id ? '숙제 수정' : '숙제 추가'}
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">날짜 *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputClass(errors.date)}
            />
            {errors.date && <p className="mt-1 text-sm text-rose-500">{errors.date}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">숙제 내용 *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder={'교재명, 페이지, 문항 또는 해야 할 과제를 입력하세요.\n예: RPM 수학Ⅱ p.120~125, 1번~20번'}
              className={inputClass(errors.content)}
            />
            {errors.content && <p className="mt-1 text-sm text-rose-500">{errors.content}</p>}
          </div>
          <HomeworkStatusPicker
            value={form.status}
            onChange={(next) => setForm({ ...form, status: next })}
            error={errors.status}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">강사 메모</label>
            <textarea
              value={form.teacherMemo}
              onChange={(e) => setForm({ ...form, teacherMemo: e.target.value })}
              rows={2}
              placeholder="강사 메모 (선택)"
              className={inputClass()}
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
              취소
            </button>
            <button type="submit" disabled={isSaving} className={btnPrimary}>
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="숙제 삭제"
        message="이 숙제 기록을 삭제하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteHomeworkRecord(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
