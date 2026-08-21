import { Check } from 'lucide-react'
import type { HomeworkStatus } from '../../types/records'
import { HOMEWORK_STATUSES } from '../../utils/labels'
import { resolveSelectedHomeworkStatus } from '../../utils/homework'

export const homeworkStatusStyles: Record<
  HomeworkStatus,
  { selected: string; unselected: string }
> = {
  완료: {
    selected: 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-200',
    unselected:
      'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50',
  },
  '부분 완료': {
    selected: 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-200',
    unselected:
      'border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50/50',
  },
  미완료: {
    selected: 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-200',
    unselected:
      'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/50',
  },
}

type HomeworkStatusButtonsProps = {
  value: HomeworkStatus | string
  onChange: (status: HomeworkStatus) => void
  label?: string
  labelClassName?: string
  error?: string
  compact?: boolean
}

export function HomeworkStatusButtons({
  value,
  onChange,
  label,
  labelClassName,
  error,
  compact = false,
}: HomeworkStatusButtonsProps) {
  // Empty/unset must not look selected as 미완료 (normalize maps empty → 미완료)
  const current = resolveSelectedHomeworkStatus(value)

  const labelClass =
    labelClassName ??
    (compact ? 'mb-1 text-xs font-medium text-slate-700' : 'mb-2 text-sm font-medium text-slate-700')

  return (
    <div>
      {label && (
        <p className={labelClass}>{label}</p>
      )}
      <div
        className={`flex flex-wrap gap-1.5 ${compact ? '' : 'grid grid-cols-1 gap-2 sm:grid-cols-3'}`}
        role="group"
        aria-label={label ?? '지난 과제'}
      >
        {HOMEWORK_STATUSES.map((status) => {
          const selected = current === status
          const styles = homeworkStatusStyles[status]
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(status)}
              className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border font-medium transition ${
                compact
                  ? 'min-h-9 flex-1 px-2.5 py-1.5 text-sm sm:flex-none sm:min-w-[5.5rem]'
                  : 'min-h-[44px] gap-2 rounded-xl px-3 py-2.5 text-sm'
              } ${selected ? styles.selected : styles.unselected}`}
            >
              {selected ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {status}
            </button>
          )
        })}
      </div>
      {error && <p className={`text-rose-500 ${compact ? 'mt-1 text-xs' : 'mt-1.5 text-sm'}`}>{error}</p>}
    </div>
  )
}
