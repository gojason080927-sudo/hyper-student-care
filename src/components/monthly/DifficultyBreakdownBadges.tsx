import type { DifficultyBreakdown } from '../../types/records'
import { getDifficultyBadgeColor } from '../../utils/labels'

const DIFFICULTY_LABELS: { key: keyof DifficultyBreakdown; label: string }[] = [
  { key: 'highest', label: '최상' },
  { key: 'high', label: '상' },
  { key: 'middle', label: '중' },
  { key: 'basic', label: '기본' },
]

type DifficultyBreakdownBadgesProps = {
  breakdown: DifficultyBreakdown
  title?: string
}

export function DifficultyBreakdownBadges({
  breakdown,
  title = '시험 난이도',
}: DifficultyBreakdownBadgesProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <div className="flex flex-wrap gap-2">
        {DIFFICULTY_LABELS.map(({ key, label }) => (
          <span
            key={key}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold sm:text-sm ${getDifficultyBadgeColor(key, breakdown[key])}`}
          >
            {label} {breakdown[key]}문제
          </span>
        ))}
      </div>
    </div>
  )
}
