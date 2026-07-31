import { HeroProgressBar } from '../ui/HeroProgressBar'
import { RecordActions } from '../ui/RecordActions'
import type { ProgressRecord } from '../../types/records'
import type { Student } from '../../types/student'
import { estimateProgressCompletionDate } from '../../utils/calc'
import { formatKoreanDate } from '../../utils/date'

type ProgressRecordCardProps = {
  record: ProgressRecord
  student?: Student
  onEdit: () => void
  onDelete: () => void
}

function ProgressPageSummary({ currentPage, totalPage }: { currentPage: number; totalPage: number }) {
  return (
    <p className="mt-3 text-center text-base font-bold tabular-nums tracking-tight text-navy-900 sm:text-lg">
      {currentPage}P
      <span className="mx-2 font-normal text-slate-300">/</span>
      {totalPage}P
    </p>
  )
}

export function ProgressRecordCard({
  record,
  student,
  onEdit,
  onDelete,
}: ProgressRecordCardProps) {
  const hasPages = record.currentPage > 0 || record.totalPage > 0
  const isComplete = record.progressRate >= 100
  const estimatedEnd = estimateProgressCompletionDate(
    record.currentPage,
    record.totalPage,
    record.createdAt,
  )

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover-capable:hover:-translate-y-0.5 hover-capable:hover:border-slate-300 hover-capable:hover:shadow-md">
      {hasPages && (
        <div className="border-b border-slate-100 bg-gradient-to-b from-navy-50 to-white px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <HeroProgressBar value={record.progressRate} size="hero" />
          <ProgressPageSummary currentPage={record.currentPage} totalPage={record.totalPage} />
        </div>
      )}

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-bold text-navy-900 sm:text-xl">{student?.name ?? '-'}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-700">
                {record.subject}
              </span>
              {student?.className && (
                <span className="text-xs text-slate-500">{student.className}</span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <RecordActions onEdit={onEdit} onDelete={onDelete} />
          </div>
        </header>

        <h3 className="mt-4 break-anywhere text-xl font-extrabold leading-snug tracking-tight text-navy-900 sm:text-2xl">
          {record.textbookName}
        </h3>

        {record.currentProgress && (
          <p className="mt-3 break-anywhere text-base font-medium text-slate-700">
            <span className="text-slate-500">현재 단원 </span>
            {record.currentProgress}
          </p>
        )}

        {hasPages ? (
          <div className="mt-4 flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
            {isComplete ? (
              <p className="font-semibold text-emerald-700">교재 학습 완료</p>
            ) : estimatedEnd ? (
              <p>
                <span className="text-slate-500">예상 완료 </span>
                <span className="font-semibold text-navy-900">
                  {formatKoreanDate(estimatedEnd)}
                </span>
              </p>
            ) : null}
            <p className="text-slate-500">
              최근 학습{' '}
              <span className="font-medium text-slate-700">
                {formatKoreanDate(record.lastStudyDate)}
              </span>
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            최근 학습 {formatKoreanDate(record.lastStudyDate)}
          </p>
        )}

        {record.teacherMemo && (
          <p className="mt-5 break-anywhere rounded-xl bg-navy-50 px-4 py-3.5 text-[15px] leading-relaxed text-slate-700">
            {record.teacherMemo}
          </p>
        )}
      </div>
    </article>
  )
}
