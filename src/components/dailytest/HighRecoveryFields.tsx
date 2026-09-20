import { useMemo } from 'react'
import {
  parseHighCountDraft,
  parseHighEndSession,
  type HighRecoveryDrafts,
  type HighRecoveryEndSession,
} from '../../utils/mathHighRecovery'

const END_SESSIONS: HighRecoveryEndSession[] = [1, 2, 3, 4]

type HighRecoveryFieldsProps = {
  drafts: HighRecoveryDrafts
  onChange: (drafts: HighRecoveryDrafts) => void
  error?: string
  compact?: boolean
  disabled?: boolean
}

function acceptCountDraft(raw: string, maxDigits: number): boolean {
  return raw === '' || new RegExp(`^\\d{1,${maxDigits}}$`).test(raw)
}

export function HighRecoveryFields({
  drafts,
  onChange,
  error,
  compact = false,
  disabled = false,
}: HighRecoveryFieldsProps) {
  const firstWrong = parseHighCountDraft(drafts.firstWrong)
  const endSession = parseHighEndSession(drafts.endSession)
  const allowedEnds = useMemo(() => {
    if (firstWrong == null) return END_SESSIONS
    if (firstWrong === 0) return [1] as const
    return [2, 3, 4] as const
  }, [firstWrong])

  const update = (patch: Partial<HighRecoveryDrafts>) => {
    const next: HighRecoveryDrafts = { ...drafts, ...patch }
    const nextWrong = parseHighCountDraft(next.firstWrong)
    const nextEnd = parseHighEndSession(next.endSession)
    if (nextWrong === 0) {
      next.endSession = 1
      next.session3Questions = ''
      next.session4Questions = ''
    } else if (nextWrong != null && nextWrong > 0 && nextEnd === 1) {
      next.endSession = ''
      next.session3Questions = ''
      next.session4Questions = ''
    }
    if (next.endSession === 1 || next.endSession === 2 || next.endSession === '') {
      next.session3Questions = ''
      next.session4Questions = ''
    } else if (next.endSession === 3) {
      next.session4Questions = ''
    }
    onChange(next)
  }

  const inputClass = compact
    ? 'min-h-8 w-16 min-w-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[#163A70]/40'
    : 'min-h-9 w-20 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[#163A70]/40'

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
      <p className={compact ? 'text-xs font-semibold text-slate-800' : 'text-sm font-semibold text-slate-800'}>
        고등 오답 추적
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-700">
        <span className={compact ? 'text-[12px]' : undefined}>1차 오답</span>
        <input
          type="text"
          inputMode="numeric"
          value={drafts.firstWrong}
          disabled={disabled}
          onChange={(event) => {
            if (acceptCountDraft(event.target.value, 2)) {
              update({ firstWrong: event.target.value })
            }
          }}
          placeholder="0~10"
          aria-label="1차 오답 수"
          className={inputClass}
        />
        <span className={compact ? 'text-[12px]' : undefined}>개</span>
      </div>
      <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
        <p className={compact ? 'text-[11px] font-medium text-slate-600' : 'text-xs font-medium text-slate-600'}>
          종료 차시
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {END_SESSIONS.map((session) => {
            const enabled = (allowedEnds as readonly number[]).includes(session)
            const selected = endSession === session
            return (
              <button
                key={session}
                type="button"
                disabled={disabled || !enabled}
                aria-pressed={selected}
                onClick={() => update({ endSession: session })}
                className={`rounded-lg border font-semibold ${
                  compact ? 'min-h-9 text-xs' : 'min-h-11 text-sm'
                } ${
                  selected
                    ? 'border-navy-300 bg-navy-50 text-navy-900'
                    : enabled
                      ? 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      : 'border-slate-100 bg-slate-50 text-slate-300'
                }`}
              >
                {session}차
              </button>
            )
          })}
        </div>
      </div>
      {endSession != null && endSession >= 3 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-700">
          <span className={compact ? 'text-[12px]' : undefined}>3차 문제 수</span>
          <input
            type="text"
            inputMode="numeric"
            value={drafts.session3Questions}
            disabled={disabled}
            onChange={(event) => {
              if (acceptCountDraft(event.target.value, 2)) {
                update({ session3Questions: event.target.value })
              }
            }}
            placeholder="3의 배수"
            aria-label="3차 실제 문제 수"
            className={inputClass}
          />
        </div>
      ) : null}
      {endSession === 4 ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-slate-700">
          <span className={compact ? 'text-[12px]' : undefined}>4차 문제 수</span>
          <input
            type="text"
            inputMode="numeric"
            value={drafts.session4Questions}
            disabled={disabled}
            onChange={(event) => {
              if (acceptCountDraft(event.target.value, 3)) {
                update({ session4Questions: event.target.value })
              }
            }}
            placeholder="5의 배수"
            aria-label="4차 실제 문제 수"
            className={inputClass}
          />
        </div>
      ) : null}
      {error ? <p className="text-[11px] font-medium text-rose-500">{error}</p> : null}
    </div>
  )
}
