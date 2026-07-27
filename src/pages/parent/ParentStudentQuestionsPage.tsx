import { Plus } from 'lucide-react'
import { useState } from 'react'
import {
  emptyQuestionForm,
  QuestionFormFields,
  type QuestionFormState,
} from '../../components/question/QuestionFormFields'
import { QuestionRecordCard } from '../../components/question/QuestionRecordCard'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { useData } from '../../hooks/useData'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import { requireDate, requireNonEmpty } from '../../utils/validation'

export function ParentStudentQuestionsPage() {
  const student = useParentStudent()
  const { questions } = useParentStudentRecords()
  const { saveQuestionRecord, showToast } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<QuestionFormState>(() => ({
    ...emptyQuestionForm(),
    studentId: student.id,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const openAdd = () => {
    setForm({ ...emptyQuestionForm(), studentId: student.id })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
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
    saveQuestionRecord({
      studentId: student.id,
      date: form.date,
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      answer: '',
      questionImages: form.questionImages,
      answerImages: [],
      status: '답변대기',
    })
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="질문하기"
        description="학습 관련 질문을 등록하고 답변을 확인합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            질문 등록
          </button>
        }
      />

      {questions.length === 0 ? (
        <EmptyState title="등록된 질문이 없습니다." />
      ) : (
        <div className="space-y-3">
          {questions.map((record) => (
            <QuestionRecordCard key={record.id} record={record} compactImages={false} />
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="질문 등록" onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-navy-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-500">질문 학생</p>
            <p className="mt-1 text-base font-semibold text-navy-900">{student.name}</p>
          </div>
          <QuestionFormFields
            form={form}
            errors={errors}
            onChange={setForm}
            onImageError={showToast}
            allowQuestionImages
            allowAnswerEdit={false}
            allowAnswerImages={false}
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
              취소
            </button>
            <button type="submit" className={btnPrimary}>
              등록
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
