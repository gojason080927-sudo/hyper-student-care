import { CLASS_ATTITUDE_ISSUE_LIST } from '../../utils/studentCare/constants'
import type { ClassAttitudeIssue } from '../../types/records'

type ClassAttitudePickerProps = {
  issues: ClassAttitudeIssue[]
  note: string
  onIssuesChange: (issues: ClassAttitudeIssue[]) => void
  onNoteChange: (note: string) => void
  compact?: boolean
  disabled?: boolean
}

export function ClassAttitudePicker({
  issues,
  note,
  onIssuesChange,
  onNoteChange,
  compact = false,
  disabled = false,
}: ClassAttitudePickerProps) {
  const toggle = (issue: ClassAttitudeIssue) => {
    if (issues.includes(issue)) {
      onIssuesChange(issues.filter((item) => item !== issue))
      return
    }
    onIssuesChange([...issues, issue])
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className={compact ? 'text-xs text-slate-500' : 'text-sm text-slate-500'}>
        기본값 우수 · 문제가 있을 때만 선택
      </p>
      <div className="flex flex-wrap gap-1.5">
        {CLASS_ATTITUDE_ISSUE_LIST.map((issue) => {
          const selected = issues.includes(issue)
          return (
            <button
              key={issue}
              type="button"
              disabled={disabled}
              onClick={() => toggle(issue)}
              className={`${compact ? 'min-h-8 rounded-md px-2 py-1 text-xs' : 'min-h-9 rounded-lg px-2.5 py-1 text-sm'} border font-semibold ${
                selected
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {issue}
            </button>
          )
        })}
      </div>
      {issues.length > 0 ? (
        <div>
          <label className="mb-0.5 block text-xs font-semibold text-slate-600">강사 메모</label>
          <textarea
            value={note}
            disabled={disabled}
            onChange={(e) => onNoteChange(e.target.value.slice(0, 500))}
            rows={compact ? 2 : 3}
            placeholder="예: 전날 수면 부족으로 보이며 2교시부터 회복"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
          />
        </div>
      ) : null}
    </div>
  )
}

export function classAttitudeDisplay(issues: ClassAttitudeIssue[] | undefined): string {
  if (!issues || issues.length === 0) return '우수'
  return issues.join(', ')
}
