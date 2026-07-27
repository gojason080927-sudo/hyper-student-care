import { Check } from 'lucide-react'
import type { HomeworkStatus } from '../../types/records'
import { HOMEWORK_STATUSES } from '../../utils/labels'
import { normalizeHomeworkStatus } from '../../utils/homework'

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
  error?: string
}

export function HomeworkStatusButtons({
  value,
  onChange,
  label,
  error,
}: HomeworkStatusButtonsProps) {
  const current = normalizeHomeworkStatus(value)

  return (
    <div>
      {label && (
        <p className="mb-2 text-sm font-medium text-slate-700">{label}</p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={label ?? '수행 상태'}>
        {HOMEWORK_STATUSES.map((status) => {
          const selected = current === status
          const styles = homeworkStatusStyles[status]
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(status)}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                selected ? styles.selected : styles.unselected
              }`}
            >
              {selected ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {status}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-rose-500">{error}</p>}
    </div>
  )
}
