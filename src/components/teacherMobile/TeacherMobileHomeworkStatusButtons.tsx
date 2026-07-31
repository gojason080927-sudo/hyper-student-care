import { Check } from 'lucide-react'
import type { HomeworkStatus } from '../../types/records'
import { HOMEWORK_STATUSES } from '../../utils/labels'
import { normalizeHomeworkStatus } from '../../utils/homework'

type TeacherMobileHomeworkStatusButtonsProps = {
  value: HomeworkStatus | string
  onChange: (status: HomeworkStatus) => void
  label?: string
  error?: string
  compact?: boolean
}

function resolveSelectedStatus(value: HomeworkStatus | string): HomeworkStatus | null {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return null
  return normalizeHomeworkStatus(value)
}

const STATUS_VARIANT: Record<HomeworkStatus, 'complete' | 'partial' | 'incomplete'> = {
  완료: 'complete',
  '부분 완료': 'partial',
  미완료: 'incomplete',
}

export function TeacherMobileHomeworkStatusButtons({
  value,
  onChange,
  label,
  error,
  compact = false,
}: TeacherMobileHomeworkStatusButtonsProps) {
  const current = resolveSelectedStatus(value)

  return (
    <div>
      {label && (
        <p className={`font-medium text-[#1E293B] ${compact ? 'mb-1 text-xs' : 'mb-2 text-sm'}`}>
          {label}
        </p>
      )}
      <div
        className={`flex flex-wrap gap-1.5 ${compact ? '' : 'grid grid-cols-1 gap-2 sm:grid-cols-3'}`}
        role="group"
        aria-label={label ?? '수행 상태'}
      >
        {HOMEWORK_STATUSES.map((status) => {
          const selected = current === status
          const variant = STATUS_VARIANT[status]
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(status)}
              className={[
                'tm-hw-status-btn',
                `tm-hw-status-btn--${variant}`,
                selected ? 'tm-hw-status-btn--selected' : '',
                compact
                  ? 'min-h-9 flex-1 px-2.5 py-1.5 text-sm sm:flex-none sm:min-w-[5.5rem]'
                  : 'min-h-[44px] gap-2 rounded-xl px-3 py-2.5 text-sm',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {selected ? (
                <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              {status}
            </button>
          )
        })}
      </div>
      {error && (
        <p className={`text-[#EF4444] ${compact ? 'mt-1 text-xs' : 'mt-1.5 text-sm'}`}>{error}</p>
      )}
    </div>
  )
}
