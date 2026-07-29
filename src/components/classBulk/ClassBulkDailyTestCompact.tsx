import type { TestSessionResult, TestSessionStatus } from '../../types/records'
import {
  clearSessionResult,
  DAILY_TEST_FULL_SCORE,
  getSessionScoreOnFullScale,
  updateSessionInForm,
  updateSessionScoreOnly,
  updateSessionStatusOnly,
} from '../../utils/dailyTest'
import { getDailyTestSessionColor } from '../../utils/labels'

type ClassBulkDailyTestCompactProps = {
  sessions: TestSessionResult[]
  onChange: (sessions: TestSessionResult[]) => void
}

const RESULT_STATUSES: Exclude<TestSessionStatus, '미응시'>[] = ['합격', '불합격']

export function ClassBulkDailyTestCompact({ sessions, onChange }: ClassBulkDailyTestCompactProps) {
  const setSession = (sessionNum: 1 | 2 | 3 | 4, patch: Partial<TestSessionResult>) => {
    onChange(updateSessionInForm(sessions, sessionNum, patch))
  }

  const setStatus = (sessionNum: 1 | 2 | 3 | 4, status: TestSessionStatus) => {
    const current = sessions.find((s) => s.session === sessionNum)!
    if (status === '미응시') {
      setSession(sessionNum, clearSessionResult(current))
      return
    }
    setSession(sessionNum, updateSessionStatusOnly(current, status))
  }

  return (
    <div className="space-y-1.5">
      {sessions.map((session) => {
        const displayScore = getSessionScoreOnFullScale(session)
        const showScore = displayScore !== '' ? displayScore : ''

        return (
          <div key={session.session} className="flex items-center gap-1.5">
            <span className="w-7 shrink-0 text-xs font-semibold text-slate-600">
              {session.session}차
            </span>
            <input
              type="number"
              min={0}
              max={DAILY_TEST_FULL_SCORE}
              value={showScore !== '' ? showScore : ''}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === '') {
                  setStatus(session.session, '미응시')
                  return
                }
                setSession(session.session, updateSessionScoreOnly(session, Number(raw)))
              }}
              placeholder="점수"
              aria-label={`${session.session}차시 점수`}
              className="w-12 shrink-0 rounded-md border border-slate-200 px-1 py-1 text-center text-xs outline-none focus:border-blue-500"
            />
            {RESULT_STATUSES.map((status) => {
              const selected = session.status === status
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setStatus(session.session, status)}
                  className={`min-h-7 flex-1 rounded-md border px-1 py-0.5 text-[11px] font-medium ${
                    selected
                      ? getDailyTestSessionColor(status)
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
