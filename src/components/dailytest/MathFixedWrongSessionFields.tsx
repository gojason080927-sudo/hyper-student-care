import {
  MATH_FIXED_WRONG_SESSIONS,
  mathSessionQuestionCount,
  maxEnabledFixedWrongSession,
  sessionPreviewFromDraft,
  type MathFixedWrongDrafts,
  type MathFixedWrongSession,
} from '../../utils/mathDailyTest'
import { getDailyTestSessionColor } from '../../utils/labels'

type MathFixedWrongSessionFieldsProps = {
  drafts: MathFixedWrongDrafts
  onChange: (drafts: MathFixedWrongDrafts) => void
  error?: string
  compact?: boolean
  disabled?: boolean
  showHeader?: boolean
}

export function MathFixedWrongPassRuleBadge() {
  return (
    <span className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 ring-1 ring-rose-200 sm:text-sm">
      [ 80점 이상 합격 ]
    </span>
  )
}

function acceptWrongDraft(session: MathFixedWrongSession, raw: string): boolean {
  if (raw === '') return true
  if (!/^\d{1,2}$/.test(raw)) return false
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 && value <= mathSessionQuestionCount(session)
}

export function MathFixedWrongSessionFields({
  drafts,
  onChange,
  error,
  compact = false,
  disabled = false,
  showHeader = true,
}: MathFixedWrongSessionFieldsProps) {
  const enabledThrough = maxEnabledFixedWrongSession(drafts)

  const updateSession = (session: MathFixedWrongSession, raw: string) => {
    if (!acceptWrongDraft(session, raw)) return
    const next: MathFixedWrongDrafts = { ...drafts, [session]: raw }
    const preview = sessionPreviewFromDraft(session, raw)
    if (!preview || preview.status === '합격') {
      for (const later of MATH_FIXED_WRONG_SESSIONS) {
        if (later > session) next[later] = ''
      }
    }
    onChange(next)
  }

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
      {showHeader ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={compact ? 'text-xs font-semibold text-slate-800' : 'text-sm font-semibold text-slate-800'}>
            차시별 오답
          </p>
          <MathFixedWrongPassRuleBadge />
        </div>
      ) : (
        <MathFixedWrongPassRuleBadge />
      )}
      <div
        className={
          compact ? 'grid grid-cols-1 gap-1.5 sm:grid-cols-2' : 'grid grid-cols-1 gap-3 sm:grid-cols-2'
        }
      >
        {MATH_FIXED_WRONG_SESSIONS.map((session) => {
          const total = mathSessionQuestionCount(session)
          const enabled = session <= enabledThrough
          const preview = sessionPreviewFromDraft(session, drafts[session] ?? '')
          return (
            <div
              key={session}
              className={`rounded-xl border bg-slate-50/60 ${
                compact ? 'p-2' : 'p-4'
              } ${enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
            >
              <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-1' : 'mb-2'}`}>
                <p className={`font-bold text-navy-900 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {session}차시
                </p>
                <p className={compact ? 'text-[11px] text-slate-500' : 'text-xs text-slate-500'}>
                  총 {total}문제
                </p>
              </div>
              <div className={`flex min-w-0 items-center gap-1.5 ${compact ? 'min-h-9' : 'min-h-[44px]'}`}>
                <span className={compact ? 'shrink-0 text-[11px] text-slate-600' : 'shrink-0 text-xs text-slate-600'}>
                  오답
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={drafts[session] ?? ''}
                  disabled={disabled || !enabled}
                  onChange={(event) => updateSession(session, event.target.value)}
                  placeholder="개수"
                  aria-label={`${session}차시 오답 개수`}
                  className={`min-w-0 flex-1 rounded-lg border bg-white text-center font-semibold text-navy-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-navy-200 ${
                    compact ? 'min-h-9 px-1.5 text-sm' : 'min-h-[44px] px-2 text-sm'
                  } ${enabled ? 'border-slate-200' : 'border-slate-100'}`}
                />
                <span className="shrink-0 text-xs text-slate-400">개</span>
                <span
                  className={`inline-flex min-w-[4.5rem] shrink-0 items-center justify-center rounded-md border px-1.5 text-[11px] font-semibold ${
                    compact ? 'min-h-9' : 'min-h-[44px]'
                  } ${
                    preview
                      ? getDailyTestSessionColor(preview.status)
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {preview ? `${preview.score} ${preview.status}` : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {error ? <p className="text-[11px] font-medium text-rose-500">{error}</p> : null}
    </div>
  )
}
