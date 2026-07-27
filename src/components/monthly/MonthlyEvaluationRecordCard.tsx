import type { MonthlyEvaluationRecord } from '../../types/records'
import { formatKoreanDate } from '../../utils/date'
import { getScoreColor } from '../../utils/labels'
import { DifficultyBreakdownBadges } from './DifficultyBreakdownBadges'

type MonthlyEvaluationRecordCardProps = {
  record: MonthlyEvaluationRecord
  showDate?: boolean
}

export function MonthlyEvaluationRecordCard({
  record,
  showDate = true,
}: MonthlyEvaluationRecordCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="space-y-3">
        {showDate && (
          <p className="text-base font-bold text-navy-900">
            {formatKoreanDate(record.evaluationDate)}
          </p>
        )}
        <p className="text-sm font-semibold text-slate-600">{record.subject}</p>
        <p className={`text-xl font-bold ${getScoreColor(record.percentage)}`}>
          {record.score}/{record.totalScore}점 ({record.percentage}%)
        </p>
        <DifficultyBreakdownBadges breakdown={record.difficultyBreakdown} />
        {record.teacherComment && (
          <div className="space-y-1 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-700">시험 총평</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {record.teacherComment}
            </p>
          </div>
        )}
        {(record.strengths || record.improvements) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {record.strengths && (
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-xs font-semibold text-emerald-800">잘한 점</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">
                  {record.strengths}
                </p>
              </div>
            )}
            {record.improvements && (
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                <p className="text-xs font-semibold text-amber-800">보완할 점</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">
                  {record.improvements}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
