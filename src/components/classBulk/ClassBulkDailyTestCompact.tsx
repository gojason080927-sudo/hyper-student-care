import { Check } from 'lucide-react'
import type { TestSessionResult } from '../../types/records'
import {
  DAILY_TEST_FULL_SCORE,
  getSelectedPassRound,
  getSessionScoreOnFullScale,
  getStatusMismatchWarning,
  normalizeSessionResultsForForm,
  setSessionStatusInForm,
  updateSessionInForm,
  updateSessionScoreOnly,
  type SelectedPassRound,
} from '../../utils/dailyTest'
import { getDailyTestSessionColor } from '../../utils/labels'

type ClassBulkDailyTestCompactProps = {
  sessions: TestSessionResult[]
  onChange: (sessions: TestSessionResult[]) => void
}

function getBulkFinalPassLabel(selectedPassRound: SelectedPassRound): string {
  return selectedPassRound ? `${selectedPassRound}차시 합격` : '미입력 또는 미합격'
}

export function ClassBulkDailyTestCompact({ sessions, onChange }: ClassBulkDailyTestCompactProps) {
  const normalizedSessions = normalizeSessionResultsForForm(sessions)
  const selectedPassRound = getSelectedPassRound(normalizedSessions)

  const applySessions = (next: TestSessionResult[]) => {
    onChange(normalizeSessionResultsForForm(next))
  }

  const setSession = (sessionNum: 1 | 2 | 3 | 4, patch: Partial<TestSessionResult>) => {
    applySessions(updateSessionInForm(normalizedSessions, sessionNum, patch))
  }

  const selectPassRound = (round: 1 | 2 | 3 | 4) => {
    applySessions(setSessionStatusInForm(normalizedSessions, round, '합격'))
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {normalizedSessions.map((session) => {
          const displayScore = getSessionScoreOnFullScale(session)
          const showScore = displayScore !== '' ? displayScore : ''
          const roundNumber = session.session
          const isPassSelected = selectedPassRound === roundNumber
          const mismatch = getStatusMismatchWarning(session)

          return (
            <div key={session.session} className="min-w-0 space-y-1">
              <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5">
                <span className="w-9 shrink-0 text-xs font-semibold text-slate-600">
                  {session.session}차시
                </span>
                <input
                  type="number"
                  min={0}
                  max={DAILY_TEST_FULL_SCORE}
                  value={showScore !== '' ? showScore : ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      applySessions(
                        setSessionStatusInForm(normalizedSessions, session.session, '미응시'),
                      )
                      return
                    }
                    setSession(session.session, updateSessionScoreOnly(session, Number(raw)))
                  }}
                  placeholder="점수"
                  aria-label={`${session.session}차시 점수`}
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 text-center text-xs outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  aria-pressed={isPassSelected}
                  onClick={() => selectPassRound(roundNumber)}
                  className={`inline-flex shrink-0 items-center justify-center gap-0.5 rounded-md border px-2 py-1 text-[11px] font-semibold transition min-h-7 min-w-[3.25rem] ${
                    isPassSelected
                      ? getDailyTestSessionColor('합격')
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {isPassSelected ? <Check className="h-3 w-3 shrink-0" aria-hidden /> : null}
                  합격
                </button>
              </div>
              {mismatch ? (
                <p className="px-0.5 text-[10px] leading-snug text-amber-700">{mismatch}</p>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="text-[11px] font-medium text-slate-500">
        최종 결과:{' '}
        <span className={selectedPassRound ? 'text-emerald-700' : 'text-slate-400'}>
          {getBulkFinalPassLabel(selectedPassRound)}
        </span>
      </p>
    </div>
  )
}
