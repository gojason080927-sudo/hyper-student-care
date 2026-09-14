import type { MaterialPrepStatus } from '../../types/records'

type MaterialPrepPickerProps = {
  value: MaterialPrepStatus | null
  onChange: (value: MaterialPrepStatus) => void
  disabled?: boolean
  compact?: boolean
}

export function MaterialPrepPicker({
  value,
  onChange,
  disabled = false,
  compact = false,
}: MaterialPrepPickerProps) {
  const options: MaterialPrepStatus[] = ['지참', '부분 지참']
  return (
    <div className={compact ? 'flex gap-1' : 'flex flex-wrap gap-2'}>
      {options.map((option) => {
        const selected = value === option
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`${compact ? 'min-h-9 flex-1 rounded-lg px-2 py-1 text-xs' : 'min-h-10 rounded-lg px-3 py-1.5 text-sm'} border font-semibold ${
              selected
                ? option === '지참'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export function materialPrepDisplay(value: MaterialPrepStatus | null | undefined): string {
  if (value === '지참' || value === '부분 지참') return value
  return '기록 없음'
}
