import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  emptyQuestionForm,
  QuestionFormFields,
  type QuestionFormState,
} from '../../components/question/QuestionFormFields'
import { QuestionRecordCard } from '../../components/question/QuestionRecordCard'
import {
  ParentEmptyState,
  ParentPageHeader,
} from '../../components/parent/ParentStudentComponents'
import { Modal } from '../../components/ui/Modal'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { useData } from '../../hooks/useData'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import {
  filterParentSuggestions,
  PARENT_SUGGESTION_CATEGORY,
} from '../../utils/parentSuggestions'
import { writeParentSuggestionLastRead } from '../../utils/parentUnread'
import { requireDate, requireNonEmpty } from '../../utils/validation'

export function ParentStudentSuggestionsPage() {
  const student = useParentStudent()
  const { questions } = useParentStudentRecords()
  const { saveQuestionRecord, showToast } = useData()
  const suggestions = useMemo(() => filterParentSuggestions(questions), [questions])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<QuestionFormState>(() => ({
    ...emptyQuestionForm(),
    studentId: student.id,
    category: PARENT_SUGGESTION_CATEGORY,
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    writeParentSuggestionLastRead(student.studentAccessKey)
  }, [student.studentAccessKey])

  const openAdd = () => {
    setForm({
      ...emptyQuestionForm(),
      studentId: student.id,
      category: PARENT_SUGGESTION_CATEGORY,
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
    const dateErr = requireDate(form.date)
    if (dateErr) next.date = dateErr
    const titleErr = requireNonEmpty(form.title, '제목')
    if (titleErr) next.title = titleErr
    const contentErr = requireNonEmpty(form.content, '건의 내용')
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
      category: PARENT_SUGGESTION_CATEGORY,
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
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader
        title="건의사항"
        description="학원에 전하고 싶은 점을 남기고 답변을 확인합니다. 연결된 학생 기준으로 전달됩니다."
        action={
          <button
            type="button"
            onClick={openAdd}
            className={`${btnPrimary} inline-flex min-h-11 items-center gap-2`}
          >
            <Plus className="h-4 w-4" />
            건의 등록
          </button>
        }
      />

      {suggestions.length === 0 ? (
        <ParentEmptyState message="등록된 건의가 없습니다." />
      ) : (
        <div className="parent-record-list space-y-3">
          {suggestions.map((record) => (
            <QuestionRecordCard
              key={record.id}
              record={record}
              parentView
              compactImages={false}
              fullWidthImages
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} title="건의 등록" onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-navy-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-500">작성 학생</p>
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
            lockCategory
            contentLabel="건의 내용"
          />
          <div className="flex justify-end gap-3 pb-[env(safe-area-inset-bottom)]">
            <button type="button" onClick={() => setModalOpen(false)} className={`${btnSecondary} min-h-11`}>
              취소
            </button>
            <button type="submit" className={`${btnPrimary} min-h-11`}>
              등록
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
