import { HeroProgressBar } from '../ui/HeroProgressBar'
import type { ProgressRecord } from '../../types/records'
import { estimateProgressCompletionDate } from '../../utils/calc'
import { formatKoreanDate } from '../../utils/date'

type ParentProgressCardProps = {
  record: ProgressRecord
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

export function ParentProgressCard({ record }: ParentProgressCardProps) {
  const hasPages = record.currentPage > 0 || record.totalPage > 0
  const isComplete = record.progressRate >= 100
  const estimatedEnd = estimateProgressCompletionDate(
    record.currentPage,
    record.totalPage,
    record.createdAt,
  )

  return (
    <article className="tm-card overflow-hidden">
      {hasPages && (
        <div className="border-b border-[rgba(22,58,112,0.06)] bg-gradient-to-b from-[rgba(22,58,112,0.04)] to-white px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <HeroProgressBar value={record.progressRate} size="hero" />
          <ProgressPageSummary currentPage={record.currentPage} totalPage={record.totalPage} />
        </div>
      )}

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-1">
          <span className="inline-block rounded-full bg-[rgba(40,199,183,0.12)] px-2.5 py-0.5 text-xs font-semibold text-[#163A70]">
            {record.subject}
          </span>
          <h3 className="break-anywhere text-xl font-extrabold leading-snug tracking-tight text-navy-900 sm:text-2xl">
            {record.textbookName}
          </h3>
        </div>

        {record.currentProgress && (
          <p className="mt-3 break-anywhere text-base font-medium text-slate-700 sm:text-[17px]">
            {record.currentProgress}
          </p>
        )}

        {hasPages ? (
          <div className="mt-4 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
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
            {!isComplete && record.totalPage > record.currentPage && (
              <p className="text-slate-500">
                남은{' '}
                <span className="font-semibold text-navy-800">
                  {record.totalPage - record.currentPage}페이지
                </span>
              </p>
            )}
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
          <p className="mt-5 break-anywhere rounded-xl bg-[rgba(22,58,112,0.04)] px-4 py-3.5 text-[15px] leading-relaxed text-[#1E293B]">
            {record.teacherMemo}
          </p>
        )}
      </div>
    </article>
  )
}
