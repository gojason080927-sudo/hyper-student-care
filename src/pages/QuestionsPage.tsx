import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  emptyQuestionForm,
  QuestionFormFields,
  questionRecordToForm,
  type QuestionFormState,
} from '../components/question/QuestionFormFields'
import { QuestionRecordCard } from '../components/question/QuestionRecordCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordActions } from '../components/ui/RecordActions'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import type { QuestionRecord, QuestionStatus } from '../types/records'
import { sortByDateDesc } from '../utils/filters'
import { QUESTION_CATEGORIES, QUESTION_STATUSES, btnPrimary, btnSecondary, inputClass } from '../utils/labels'
import { requireDate, requireNonEmpty } from '../utils/validation'

export function QuestionsPage() {
  const { students, questions, saveQuestionRecord, deleteQuestionRecord, showToast } = useData()
  const [studentFilter, setStudentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<QuestionFormState>(emptyQuestionForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<QuestionRecord | null>(null)

  const filtered = useMemo(() => {
    let list = sortByDateDesc(questions)
    if (studentFilter) list = list.filter((q) => q.studentId === studentFilter)
    if (categoryFilter) list = list.filter((q) => q.category === categoryFilter)
    if (statusFilter) list = list.filter((q) => q.status === statusFilter)
    return list
  }, [categoryFilter, questions, statusFilter, studentFilter])

  const openAdd = () => {
    setForm(emptyQuestionForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (record: QuestionRecord) => {
    setForm(questionRecordToForm(record))
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.studentId) next.studentId = '학생을 선택해 주세요.'
    const dateErr = requireDate(form.date)
    if (dateErr) next.date = dateErr
    const titleErr = requireNonEmpty(form.title, '제목')
    if (titleErr) next.title = titleErr
    const contentErr = requireNonEmpty(form.content, '질문 내용')
    if (contentErr) next.content = contentErr
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const status: QuestionStatus = form.answer.trim() ? '답변완료' : form.status
    saveQuestionRecord({
      ...form,
      status,
      questionImages: form.questionImages,
      answerImages: form.answerImages,
    })
    setModalOpen(false)
  }

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name ?? '-'

  return (
    <div className="space-y-6">
      <PageHeader
        title="질문하기"
        description="학생 질문과 강사 답변을 기록합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            질문 등록
          </button>
        }
      />

      <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        향후 AI 답변 기능을 연결할 수 있습니다. 현재는 강사가 직접 답변을 입력합니다.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StudentSelect students={students} value={studentFilter} onChange={setStudentFilter} label="학생" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">분류</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass()}>
              <option value="">전체</option>
              {QUESTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">상태</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass()}>
              <option value="">전체</option>
              {QUESTION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="질문이 없습니다." />
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <QuestionRecordCard
              key={record.id}
              record={record}
              studentName={getStudentName(record.studentId)}
              showStudentName
              actions={
                <RecordActions onEdit={() => openEdit(record)} onDelete={() => setDeleteTarget(record)} />
              }
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={form.id ? '질문 수정' : '질문 등록'} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <QuestionFormFields
            form={form}
            errors={errors}
            onChange={setForm}
            onImageError={showToast}
            students={students.filter((s) => s.status === '재원')}
            showStudentSelect
            allowQuestionImages
            allowAnswerEdit
            allowAnswerImages
          />
          <div className="flex justify-end gap-3">
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
        title="질문 삭제"
        message="이 질문을 삭제하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteQuestionRecord(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
