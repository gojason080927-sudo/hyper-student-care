import { useEffect, useState } from 'react'
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
  const [expanded, setExpanded] = useState(issues.length > 0)

  useEffect(() => {
    if (issues.length > 0) setExpanded(true)
  }, [issues.length])

  const collapseToExcellent = () => {
    if (issues.length > 0) onIssuesChange([])
    if (note) onNoteChange('')
    setExpanded(false)
  }

  const toggle = (issue: ClassAttitudeIssue) => {
    if (issues.includes(issue)) {
      const next = issues.filter((item) => item !== issue)
      onIssuesChange(next)
      if (next.length === 0) {
        if (note) onNoteChange('')
        setExpanded(false)
      }
      return
    }
    onIssuesChange([...issues, issue])
  }

  const chip = compact ? 'min-h-8 rounded-md px-2 py-1 text-xs' : 'min-h-9 rounded-lg px-2.5 py-1 text-sm'
  const excellentSelected = issues.length === 0

  if (!expanded) {
    return (
      <div className={compact ? 'space-y-2' : 'space-y-3'} data-attitude-state="excellent">
        <button
          type="button"
          disabled={disabled}
          aria-label="수업태도 우수 — 문제가 있으면 눌러 선택"
          onClick={() => setExpanded(true)}
          className={`${chip} border font-semibold border-emerald-300 bg-emerald-50 text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          우수
        </button>
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'} data-attitude-state="editing">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          aria-label="수업태도 우수"
          onClick={collapseToExcellent}
          className={`${chip} border font-semibold ${
            excellentSelected
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          우수
        </button>
        {CLASS_ATTITUDE_ISSUE_LIST.map((issue) => {
          const selected = issues.includes(issue)
          return (
            <button
              key={issue}
              type="button"
              disabled={disabled}
              onClick={() => toggle(issue)}
              className={`${chip} border font-semibold ${
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
        <div data-attitude-note="">
          <label className="mb-0.5 block text-xs font-semibold text-slate-600">강사 메모</label>
          <textarea
            value={note}
            disabled={disabled}
            onChange={(e) => onNoteChange(e.target.value.slice(0, 500))}
            rows={compact ? 2 : 3}
            placeholder="수업 중 확인한 내용을 간단히 입력"
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
