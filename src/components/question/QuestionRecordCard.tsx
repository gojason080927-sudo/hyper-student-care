import { formatKoreanDate } from '../../utils/date'
import type { QuestionRecord } from '../../types/records'
import { StatusBadge } from '../ui/StatusBadge'
import { getQuestionStatusColor } from '../../utils/labels'
import { QuestionImageGallery } from './QuestionImageGallery'

type QuestionRecordCardProps = {
  record: QuestionRecord
  studentName?: string
  showStudentName?: boolean
  compactImages?: boolean
  fullWidthImages?: boolean
  /** 학부모 앱: 질문/답변 구역 분리 및 답변 대기 문구 */
  parentView?: boolean
  actions?: React.ReactNode
}

function hasAnswer(record: QuestionRecord): boolean {
  return (
    record.status === '답변완료' ||
    Boolean(record.answer?.trim()) ||
    (record.answerImages?.length ?? 0) > 0
  )
}

export function QuestionRecordCard({
  record,
  studentName,
  showStudentName = false,
  compactImages = true,
  fullWidthImages = false,
  parentView = false,
  actions,
}: QuestionRecordCardProps) {
  const questionImages = record.questionImages ?? []
  const answerImages = record.answerImages ?? []
  const answered = hasAnswer(record)

  if (parentView) {
    return (
      <div className="tm-question-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={record.status} colorClass={getQuestionStatusColor(record.status)} />
              <span className="rounded-lg bg-[rgba(22,58,112,0.06)] px-2 py-0.5 text-xs font-medium text-[#6B7280]">
                {record.category}
              </span>
            </div>
            <p className="text-sm text-[#6B7280]">{formatKoreanDate(record.date)}</p>
            {record.title && (
              <p className="break-anywhere font-medium text-[#163A70]">{record.title}</p>
            )}

            <section className="tm-question-section space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">학생 질문</p>
              <p className="whitespace-pre-wrap break-anywhere text-sm text-slate-700">
                {record.content}
              </p>
              {questionImages.length > 0 && (
                <QuestionImageGallery
                  title="질문 이미지"
                  images={questionImages}
                  compact={false}
                  fullWidth={fullWidthImages}
                />
              )}
            </section>

            <section className="tm-answer-section space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[#163A70]">강사 답변</p>
              {answered ? (
                <>
                  {record.answer?.trim() && (
                    <p className="whitespace-pre-wrap break-anywhere text-sm text-blue-950">
                      {record.answer}
                    </p>
                  )}
                  {answerImages.length > 0 && (
                    <QuestionImageGallery
                      title="답변 이미지"
                      images={answerImages}
                      compact={false}
                      fullWidth={fullWidthImages}
                    />
                  )}
                  <p className="text-xs text-blue-700/80">
                    답변 등록: {formatKoreanDate(record.updatedAt.slice(0, 10))}
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">답변을 준비하고 있습니다.</p>
              )}
            </section>
          </div>
          {actions}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {showStudentName && studentName && (
              <p className="text-base font-bold text-navy-900">{studentName}</p>
            )}
            <StatusBadge label={record.status} colorClass={getQuestionStatusColor(record.status)} />
            <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {record.category}
            </span>
          </div>

          <p className="text-sm text-slate-500">{formatKoreanDate(record.date)}</p>
          <p className="break-anywhere font-medium text-navy-800">{record.title}</p>
          <p className="whitespace-pre-wrap break-anywhere text-sm text-slate-600">{record.content}</p>

          {questionImages.length > 0 && (
            <QuestionImageGallery
              title="질문 사진"
              images={questionImages}
              compact={compactImages}
              fullWidth={fullWidthImages}
            />
          )}

          {record.answer && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 whitespace-pre-wrap break-anywhere text-sm text-blue-900">
              답변: {record.answer}
            </p>
          )}

          {answerImages.length > 0 && (
            <QuestionImageGallery
              title="답변 사진"
              images={answerImages}
              compact={compactImages}
              fullWidth={fullWidthImages}
            />
          )}
        </div>
        {actions}
      </div>
    </div>
  )
}

