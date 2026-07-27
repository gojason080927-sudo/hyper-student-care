import type { QuestionCategory, QuestionImageAttachment, QuestionStatus } from '../../types/records'
import { getTodayString } from '../../utils/date'
import { ImageAttachmentInput } from './ImageAttachmentInput'
import { StudentSelect } from '../ui/StudentSelect'
import type { Student } from '../../types/student'
import { QUESTION_CATEGORIES, inputClass } from '../../utils/labels'

export type QuestionFormState = {
  id?: string
  studentId: string
  date: string
  category: QuestionCategory
  title: string
  content: string
  answer: string
  questionImages: QuestionImageAttachment[]
  answerImages: QuestionImageAttachment[]
  status: QuestionStatus
}

export function emptyQuestionForm(): QuestionFormState {
  return {
    studentId: '',
    date: getTodayString(),
    category: '수업질문',
    title: '',
    content: '',
    answer: '',
    questionImages: [],
    answerImages: [],
    status: '답변대기',
  }
}

export function questionRecordToForm(record: {
  id: string
  studentId: string
  date: string
  category: QuestionCategory
  title: string
  content: string
  answer: string
  questionImages?: QuestionImageAttachment[]
  answerImages?: QuestionImageAttachment[]
  status: QuestionStatus
}): QuestionFormState {
  return {
    id: record.id,
    studentId: record.studentId,
    date: record.date,
    category: record.category,
    title: record.title,
    content: record.content,
    answer: record.answer,
    questionImages: record.questionImages ?? [],
    answerImages: record.answerImages ?? [],
    status: record.status,
  }
}

type QuestionFormFieldsProps = {
  form: QuestionFormState
  errors: Record<string, string>
  onChange: (form: QuestionFormState) => void
  onImageError?: (message: string) => void
  students?: Student[]
  showStudentSelect?: boolean
  allowQuestionImages?: boolean
  allowAnswerEdit?: boolean
  allowAnswerImages?: boolean
}

export function QuestionFormFields({
  form,
  errors,
  onChange,
  onImageError,
  students = [],
  showStudentSelect = false,
  allowQuestionImages = true,
  allowAnswerEdit = true,
  allowAnswerImages = true,
}: QuestionFormFieldsProps) {
  return (
    <div className="space-y-4">
      {showStudentSelect && (
        <StudentSelect
          students={students}
          value={form.studentId}
          onChange={(studentId) => onChange({ ...form, studentId })}
          error={errors.studentId}
          required
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">날짜 *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value })}
            className={inputClass(errors.date)}
          />
          {errors.date && <p className="mt-1 text-sm text-rose-500">{errors.date}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">분류</label>
          <select
            value={form.category}
            onChange={(e) =>
              onChange({ ...form, category: e.target.value as QuestionCategory })
            }
            className={inputClass()}
          >
            {QUESTION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">제목 *</label>
        <input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          className={inputClass(errors.title)}
        />
        {errors.title && <p className="mt-1 text-sm text-rose-500">{errors.title}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">질문 내용 *</label>
        <textarea
          value={form.content}
          onChange={(e) => onChange({ ...form, content: e.target.value })}
          rows={3}
          className={inputClass(errors.content)}
        />
        {errors.content && <p className="mt-1 text-sm text-rose-500">{errors.content}</p>}
      </div>

      {allowQuestionImages && (
        <ImageAttachmentInput
          label="질문 사진 첨부"
          images={form.questionImages}
          onChange={(questionImages) => onChange({ ...form, questionImages })}
          onError={onImageError}
        />
      )}

      {allowAnswerEdit && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">강사 답변</label>
          <textarea
            value={form.answer}
            onChange={(e) =>
              onChange({
                ...form,
                answer: e.target.value,
                status: e.target.value.trim() ? '답변완료' : '답변대기',
              })
            }
            rows={3}
            className={inputClass()}
            placeholder="답변을 입력하면 자동으로 답변완료 처리됩니다."
          />
        </div>
      )}

      {allowAnswerImages && allowAnswerEdit && (
        <ImageAttachmentInput
          label="답변 사진 첨부"
          images={form.answerImages}
          onChange={(answerImages) => onChange({ ...form, answerImages })}
          onError={onImageError}
        />
      )}
    </div>
  )
}
