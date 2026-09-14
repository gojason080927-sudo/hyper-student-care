import type { LearningRiskLevel } from '../../types/records'
import { formatKoreanDate } from '../../utils/date'
import {
  priorDayLearningGradeLabel,
  riskLevelLabel,
  type LearningRiskResult,
  type PriorDayLearningEvaluation,
  type PriorDayLearningGrade,
} from '../../utils/studentCare'

const LEVEL_CLASS: Record<LearningRiskLevel, string> = {
  우수: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  주의: 'border-amber-200 bg-amber-50 text-amber-800',
  위험: 'border-rose-200 bg-rose-50 text-rose-800',
}

const PRIOR_DAY_GRADE_CLASS: Record<PriorDayLearningGrade, string> = {
  우수: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  양호: 'border-sky-200 bg-sky-50 text-sky-800',
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

export function PriorDayLearningGradeBadge({
  grade,
  onClick,
}: {
  grade: PriorDayLearningGrade
  onClick?: () => void
}) {
  const className = `px-2 py-0.5 text-xs inline-flex shrink-0 items-center whitespace-nowrap rounded-full border font-semibold ${PRIOR_DAY_GRADE_CLASS[grade]}`
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={className}
        aria-label={`일일 학습 종합 평가 ${grade}`}
      >
        {priorDayLearningGradeLabel(grade)}
      </button>
    )
  }
  return <span className={className}>{priorDayLearningGradeLabel(grade)}</span>
}

export function PriorDayLearningEvaluationRow({
  result,
  onToggle,
}: {
  result: PriorDayLearningEvaluation
  onToggle?: () => void
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <p className="text-xs font-semibold leading-snug text-slate-500">일일 학습 종합 평가</p>
      <PriorDayLearningGradeBadge grade={result.grade} onClick={onToggle} />
    </div>
  )
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

export function PriorDayLearningReasonPanel({ result }: { result: PriorDayLearningEvaluation }) {
  return (
    <div className="space-y-1.5 text-sm text-slate-700">
      <p className="font-semibold text-navy-900">일일 학습 종합 평가 · {result.grade}</p>
      <p className="text-xs text-slate-500">
        {formatKoreanDate(result.reportDate)} 수업의 출결·숙제·교재 준비·일일테스트·수업태도 기준
      </p>
      {result.reasons.length === 0 ? (
        <p>이 날짜에는 감점 기록이 없습니다.</p>
      ) : (
        <ul className="list-disc space-y-0.5 pl-4">
          {result.reasons.map((reason, index) => (
            <li key={`${reason.date}-${reason.fact}-${index}`}>{reason.fact}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
