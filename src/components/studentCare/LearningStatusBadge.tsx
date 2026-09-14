import type { LearningRiskLevel } from '../../types/records'
import { riskLevelLabel, type LearningRiskResult } from '../../utils/studentCare'

const LEVEL_CLASS: Record<LearningRiskLevel, string> = {
  우수: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  주의: 'border-amber-200 bg-amber-50 text-amber-800',
  위험: 'border-rose-200 bg-rose-50 text-rose-800',
}

type LearningStatusBadgeProps = {
  result: LearningRiskResult
  onClick?: () => void
  compact?: boolean
}

export function LearningStatusBadge({ result, onClick, compact = false }: LearningStatusBadgeProps) {
  const className = `${compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'} inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-semibold ${LEVEL_CLASS[result.level]}`
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={`현재 학습상태 ${result.level}`}>
        {riskLevelLabel(result.level)}
      </button>
    )
  }
  return <span className={className}>{riskLevelLabel(result.level)}</span>
}

export function LearningRiskReasonPanel({ result }: { result: LearningRiskResult }) {
  return (
    <div className="space-y-1.5 text-sm text-slate-700">
      <p className="font-semibold text-navy-900">현재 학습상태 · {result.level}</p>
      {result.windowDates.length > 0 ? (
        <p className="text-xs text-slate-500">최근 {result.windowDates.length}회 수업 기준</p>
      ) : (
        <p className="text-xs text-slate-500">최근 수업 기록이 아직 없습니다.</p>
      )}
      {result.reasons.length === 0 ? (
        <p>최근 수업에서 감점 기록이 없습니다.</p>
      ) : (
        <ul className="list-disc space-y-0.5 pl-4">
          {result.reasons.map((reason, index) => (
            <li key={`${reason.date}-${reason.fact}-${index}`}>
              {reason.fact}
              {reason.date ? ` (${reason.date.slice(5).replace('-', '/')})` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
