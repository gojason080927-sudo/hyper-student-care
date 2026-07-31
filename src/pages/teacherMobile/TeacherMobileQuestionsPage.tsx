import { Check, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { RecordActions } from '../../components/ui/RecordActions'
import { ImageAttachmentInput } from '../../components/question/ImageAttachmentInput'
import { ImageLightbox } from '../../components/question/ImageLightbox'
import {
  emptyQuestionForm,
  QuestionFormFields,
  questionRecordToForm,
  type QuestionFormState,
} from '../../components/question/QuestionFormFields'
import { useData } from '../../hooks/useData'
import type { QuestionImageAttachment, QuestionRecord } from '../../types/records'
import { formatKoreanDate } from '../../utils/date'
import { requireDate, requireNonEmpty } from '../../utils/validation'

function QuestionStatusBadge({ status }: { status: string }) {
  return (
    <span className={status === '답변완료' ? 'tm-badge-done' : 'tm-badge-wait'}>
      {status}
    </span>
  )
}

type TabId = 'list' | 'answer'

function sortQuestionsForMobile(questions: QuestionRecord[]): QuestionRecord[] {
  return [...questions].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === '답변대기') return -1
      if (b.status === '답변대기') return 1
    }
    const dateCmp = b.date.localeCompare(a.date)
    if (dateCmp !== 0) return dateCmp
    return b.createdAt.localeCompare(a.createdAt)
  })
}

function hasAnswerContent(answer: string, answerImages: QuestionImageAttachment[]): boolean {
  return answer.trim().length > 0 || answerImages.length > 0
}

type MobileQuestionListCardProps = {
  record: QuestionRecord
  studentName: string
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

function MobileQuestionListCard({
  record,
  studentName,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: MobileQuestionListCardProps) {
  const [previewImage, setPreviewImage] = useState<QuestionImageAttachment | null>(null)
  const firstImage = record.questionImages?.[0]

  return (
    <article
      className={`tm-card p-3 transition ${
        selected ? 'ring-2 ring-[rgba(40,199,183,0.45)]' : ''
      }`}
    >
      <button type="button" onClick={onSelect} className="w-full text-left">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-bold text-[#163A70]">{studentName}</p>
              <QuestionStatusBadge status={record.status} />
            </div>
            <p className="text-xs text-slate-500">{formatKoreanDate(record.date)}</p>
            <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {record.category}
            </span>
            {record.title && (
              <p className="text-sm font-medium text-navy-800">{record.title}</p>
            )}
            <p className="line-clamp-3 whitespace-pre-wrap break-anywhere text-sm text-slate-600">
              {record.content}
            </p>
          </div>
          {firstImage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setPreviewImage(firstImage)
              }}
              className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-slate-200"
              aria-label="질문 이미지 크게 보기"
            >
              <img
                src={firstImage.dataUrl}
                alt={firstImage.name}
                className="h-full w-full object-cover"
              />
            </button>
          )}
        </div>
        {selected && (
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-navy-700">
            <Check className="h-3.5 w-3.5" aria-hidden />
            선택됨 · 답변 올리기 탭에서 작성
          </p>
        )}
      </button>
      <div className="mt-2 flex justify-end border-t border-slate-100 pt-2">
        <RecordActions onEdit={onEdit} onDelete={onDelete} />
      </div>
      <ImageLightbox
        open={!!previewImage}
        src={previewImage?.dataUrl ?? ''}
        alt={previewImage?.name ?? ''}
        onClose={() => setPreviewImage(null)}
      />
    </article>
  )
}

type AnswerDraft = {
  answer: string
  answerImages: QuestionImageAttachment[]
}

function emptyAnswerDraft(): AnswerDraft {
  return { answer: '', answerImages: [] }
}

function answerDraftFromRecord(record: QuestionRecord): AnswerDraft {
  return {
    answer: record.answer ?? '',
    answerImages: record.answerImages ?? [],
  }
}

export function TeacherMobileQuestionsPage() {
  const { students, questions, saveQuestionRecord, deleteQuestionRecord, showToast } = useData()
  const [activeTab, setActiveTab] = useState<TabId>('list')
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [answerDraft, setAnswerDraft] = useState<AnswerDraft>(emptyAnswerDraft())
  const [saving, setSaving] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<QuestionFormState>(emptyQuestionForm())
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<QuestionRecord | null>(null)

  const sortedQuestions = useMemo(() => sortQuestionsForMobile(questions), [questions])
  const selectedQuestion = useMemo(
    () => sortedQuestions.find((q) => q.id === selectedQuestionId) ?? null,
    [selectedQuestionId, sortedQuestions],
  )

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name ?? '-'

  const selectQuestion = (record: QuestionRecord) => {
    setSelectedQuestionId(record.id)
    setAnswerDraft(answerDraftFromRecord(record))
    setActiveTab('answer')
  }

  const validateEditForm = () => {
    const next: Record<string, string> = {}
    if (!editForm.studentId) next.studentId = '학생을 선택해 주세요.'
    const dateErr = requireDate(editForm.date)
    if (dateErr) next.date = dateErr
    const titleErr = requireNonEmpty(editForm.title, '제목')
    if (titleErr) next.title = titleErr
    const contentErr = requireNonEmpty(editForm.content, '질문 내용')
    if (contentErr) next.content = contentErr
    setEditErrors(next)
    return Object.keys(next).length === 0
  }

  const openEdit = (record: QuestionRecord) => {
    setEditForm(questionRecordToForm(record))
    setEditErrors({})
    setEditModalOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateEditForm()) return
    const hasAnswer = hasAnswerContent(editForm.answer, editForm.answerImages)
    saveQuestionRecord({
      ...editForm,
      status: hasAnswer ? '답변완료' : editForm.status,
      questionImages: editForm.questionImages,
      answerImages: editForm.answerImages,
    })
    setEditModalOpen(false)
    if (selectedQuestionId === editForm.id) {
      setAnswerDraft({
        answer: editForm.answer,
        answerImages: editForm.answerImages,
      })
    }
  }

  const handleSaveAnswer = async () => {
    if (!selectedQuestion) return
    if (!hasAnswerContent(answerDraft.answer, answerDraft.answerImages)) {
      showToast('답변 내용 또는 답변 이미지를 입력해 주세요.')
      return
    }
    setSaving(true)
    try {
      const ok = saveQuestionRecord({
        id: selectedQuestion.id,
        studentId: selectedQuestion.studentId,
        date: selectedQuestion.date,
        category: selectedQuestion.category,
        title: selectedQuestion.title,
        content: selectedQuestion.content,
        answer: answerDraft.answer.trim(),
        questionImages: selectedQuestion.questionImages ?? [],
        answerImages: answerDraft.answerImages,
        status: '답변완료',
      })
      if (ok) {
        setActiveTab('list')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteQuestionRecord(deleteTarget.id)
    if (selectedQuestionId === deleteTarget.id) {
      setSelectedQuestionId(null)
      setAnswerDraft(emptyAnswerDraft())
      setActiveTab('list')
    }
    setDeleteTarget(null)
  }

  const isEditingExistingAnswer =
    selectedQuestion != null &&
    (selectedQuestion.status === '답변완료' ||
      hasAnswerContent(selectedQuestion.answer, selectedQuestion.answerImages ?? []))

  return (
    <div className="space-y-3">
      <div className="tm-tabs">
        {(
          [
            { id: 'list' as const, label: '등록된 질문' },
            { id: 'answer' as const, label: '답변 올리기' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`tm-tab ${activeTab === tab.id ? 'tm-tab--active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' ? (
        sortedQuestions.length === 0 ? (
          <EmptyState title="등록된 질문이 없습니다." />
        ) : (
          <div className="space-y-2">
            {sortedQuestions.map((record) => (
              <MobileQuestionListCard
                key={record.id}
                record={record}
                studentName={getStudentName(record.studentId)}
                selected={selectedQuestionId === record.id}
                onSelect={() => selectQuestion(record)}
                onEdit={() => openEdit(record)}
                onDelete={() => setDeleteTarget(record)}
              />
            ))}
          </div>
        )
      ) : !selectedQuestion ? (
        <div className="tm-card border-dashed px-4 py-10 text-center">
          <p className="text-sm font-medium text-[#6B7280]">
            등록된 질문에서 답변할 질문을 선택해 주세요.
          </p>
        </div>
      ) : (
        <div className="space-y-4 tm-animate-in">
          <section className="tm-card p-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-bold text-[#163A70]">
                  {getStudentName(selectedQuestion.studentId)}
                </p>
                <QuestionStatusBadge status={selectedQuestion.status} />
              </div>
              <p className="text-sm text-slate-500">{formatKoreanDate(selectedQuestion.date)}</p>
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {selectedQuestion.category}
              </span>
              {selectedQuestion.title && (
                <p className="font-medium text-navy-800">{selectedQuestion.title}</p>
              )}
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  학생 질문
                </p>
                <p className="whitespace-pre-wrap break-anywhere text-sm text-slate-700">
                  {selectedQuestion.content}
                </p>
              </div>
              {(selectedQuestion.questionImages?.length ?? 0) > 0 && (
                <ImageAttachmentInput
                  label="학생 질문 이미지"
                  images={selectedQuestion.questionImages ?? []}
                  onChange={() => {}}
                  disabled
                />
              )}
            </div>
          </section>

          <section className="tm-card p-4">
            <p className="mb-3 text-sm font-bold text-[#163A70]">강사 답변</p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="mobile-answer-text"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  답변 내용
                </label>
                <textarea
                  id="mobile-answer-text"
                  value={answerDraft.answer}
                  onChange={(e) =>
                    setAnswerDraft((prev) => ({ ...prev, answer: e.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
                  placeholder="답변 내용을 입력해 주세요."
                />
              </div>
              <ImageAttachmentInput
                label="답변 이미지"
                buttonLabel="답변 사진 추가"
                images={answerDraft.answerImages}
                onChange={(answerImages) =>
                  setAnswerDraft((prev) => ({ ...prev, answerImages }))
                }
                onError={showToast}
                mobilePickers
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveAnswer()}
                className="tm-btn-primary w-full"
              >
                {saving
                  ? '저장 중…'
                  : isEditingExistingAnswer
                    ? '답변 수정 저장'
                    : '답변 올리기'}
              </button>
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => openEdit(selectedQuestion)}
              className="tm-btn-secondary inline-flex items-center gap-1.5 px-3 text-sm"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              질문 수정
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(selectedQuestion)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-semibold text-rose-700"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              질문 삭제
            </button>
          </div>
        </div>
      )}

      <Modal
        open={editModalOpen}
        title={editForm.id ? '질문 수정' : '질문 등록'}
        onClose={() => setEditModalOpen(false)}
        wide
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <QuestionFormFields
            form={editForm}
            errors={editErrors}
            onChange={setEditForm}
            onImageError={showToast}
            students={students.filter((s) => s.status === '재원')}
            showStudentSelect
            allowQuestionImages
            allowAnswerEdit
            allowAnswerImages
          />
          <div className="flex justify-end gap-3 pb-[env(safe-area-inset-bottom)]">
            <button type="button" onClick={() => setEditModalOpen(false)} className="tm-btn-secondary">
              취소
            </button>
            <button type="submit" className="tm-btn-primary">
              저장
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="질문 삭제"
        message="이 질문과 연결된 답변도 함께 삭제됩니다. 계속하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
