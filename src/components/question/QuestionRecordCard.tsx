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
  actions?: React.ReactNode
}

export function QuestionRecordCard({
  record,
  studentName,
  showStudentName = false,
  compactImages = true,
  actions,
}: QuestionRecordCardProps) {
  const questionImages = record.questionImages ?? []
  const answerImages = record.answerImages ?? []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
          <p className="font-medium text-navy-800">{record.title}</p>
          <p className="whitespace-pre-wrap text-sm text-slate-600">{record.content}</p>

          {questionImages.length > 0 && (
            <QuestionImageGallery title="질문 사진" images={questionImages} compact={compactImages} />
          )}

          {record.answer && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 whitespace-pre-wrap text-sm text-blue-900">
              답변: {record.answer}
            </p>
          )}

          {answerImages.length > 0 && (
            <QuestionImageGallery title="답변 사진" images={answerImages} compact={compactImages} />
          )}
        </div>
        {actions}
      </div>
    </div>
  )
}
