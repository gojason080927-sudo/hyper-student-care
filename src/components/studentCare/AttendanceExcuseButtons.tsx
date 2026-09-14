import type { AttendanceExcuseKind, AttendanceStatus } from '../../types/records'

type AttendanceExcuseButtonsProps = {
  status: AttendanceStatus | ''
  excuseKind: AttendanceExcuseKind | null
  onChange: (excuseKind: AttendanceExcuseKind) => void
  disabled?: boolean
  compact?: boolean
}

export function AttendanceExcuseButtons({
  status,
  excuseKind,
  onChange,
  disabled = false,
  compact = false,
}: AttendanceExcuseButtonsProps) {
  if (status !== '지각' && status !== '결석') return null
  const options: AttendanceExcuseKind[] = ['인정', '무단']
  return (
    <div className={compact ? 'mt-1.5 flex gap-1' : 'mt-2 flex gap-2'}>
      {options.map((option) => {
        const selected = excuseKind === option
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`${compact ? 'min-h-8 flex-1 rounded-md px-2 py-1 text-xs' : 'min-h-9 rounded-lg px-3 py-1.5 text-sm'} border font-semibold ${
              selected
                ? option === '인정'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-rose-300 bg-rose-50 text-rose-800'
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

export function attendanceNeedsExcuse(status: AttendanceStatus | ''): boolean {
  return status === '지각' || status === '결석'
}
