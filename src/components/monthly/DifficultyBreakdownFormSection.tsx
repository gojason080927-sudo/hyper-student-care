import type { DifficultyBreakdown } from '../../types/records'
import {
  getDifficultyTotal,
  getQuestionCountMismatchMessage,
} from '../../utils/monthlyEvaluation'
import { inputClass } from '../../utils/labels'

type DifficultyBreakdownFormSectionProps = {
  breakdown: DifficultyBreakdown
  totalScore: number
  onChange: (breakdown: DifficultyBreakdown) => void
  errors: Record<string, string>
}

const FIELDS: { key: keyof DifficultyBreakdown; label: string }[] = [
  { key: 'highest', label: '최상 문항 수' },
  { key: 'high', label: '상 문항 수' },
  { key: 'middle', label: '중 문항 수' },
  { key: 'basic', label: '기본 문항 수' },
]

function parseCount(value: string): number {
  if (value === '') return 0
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.floor(num)
}

export function DifficultyBreakdownFormSection({
  breakdown,
  totalScore,
  onChange,
  errors,
}: DifficultyBreakdownFormSectionProps) {
  const total = getDifficultyTotal(breakdown)
  const mismatch = getQuestionCountMismatchMessage(breakdown, totalScore)

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-slate-800">시험 난이도별 문항 수</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
            <input
              type="number"
              min={0}
              step={1}
              value={breakdown[key]}
              onChange={(e) =>
                onChange({ ...breakdown, [key]: parseCount(e.target.value) })
              }
              className={inputClass(errors[`difficulty-${key}`])}
            />
            {errors[`difficulty-${key}`] && (
              <p className="mt-1 text-xs text-rose-500">{errors[`difficulty-${key}`]}</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-navy-800">총 문항 수: {total}문제</p>
      {mismatch && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{mismatch}</p>
      )}
    </div>
  )
}

export function validateDifficultyBreakdown(
  breakdown: DifficultyBreakdown,
): Record<string, string> {
  const errors: Record<string, string> = {}
  const keys: (keyof DifficultyBreakdown)[] = ['highest', 'high', 'middle', 'basic']
  const labels = { highest: '최상', high: '상', middle: '중', basic: '기본' }

  for (const key of keys) {
    const value = breakdown[key]
    if (!Number.isInteger(value) || value < 0) {
      errors[`difficulty-${key}`] = `${labels[key]} 문항 수는 0 이상의 정수만 입력할 수 있습니다.`
    }
  }
  return errors
}
