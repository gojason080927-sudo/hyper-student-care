import { Check } from 'lucide-react'
import type { MakeupMethod } from '../../types/records'
import { MAKEUP_METHODS } from '../../utils/labels'

const methodStyles: Record<MakeupMethod, { selected: string; unselected: string }> = {
  '학원 보강': {
    selected: 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200',
    unselected:
      'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50',
  },
  '영상 대체': {
    selected: 'border-violet-500 bg-violet-50 text-violet-800 ring-2 ring-violet-200',
    unselected:
      'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50/50',
  },
}

type MakeupMethodPickerProps = {
  value: MakeupMethod | ''
  onChange: (method: MakeupMethod) => void
  error?: string
}

export function MakeupMethodPicker({ value, onChange, error }: MakeupMethodPickerProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">보강 방식 *</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="보강 방식">
        {MAKEUP_METHODS.map((method) => {
          const selected = value === method
          const styles = methodStyles[method]
          return (
            <button
              key={method}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(method)}
              className={`flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition ${
                selected ? styles.selected : styles.unselected
              }`}
            >
              {selected ? (
                <Check className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <span className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {method}
            </button>
          )
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-rose-500">{error}</p>}
    </div>
  )
}
