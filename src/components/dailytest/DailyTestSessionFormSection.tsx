import { Check, X } from 'lucide-react'
import type { TestSessionResult, TestSessionStatus } from '../../types/records'
import {
  DAILY_TEST_FULL_SCORE,
  getSessionScoreOnFullScale,
  getStatusMismatchWarning,
  updateSessionInForm,
  updateSessionScoreOnly,
} from '../../utils/dailyTest'
import { getDailyTestSessionColor } from '../../utils/labels'
import { validateScore } from '../../utils/validation'

const RESULT_STATUSES: Exclude<TestSessionStatus, '미응시'>[] = ['불합격', '합격']

type DailyTestSessionFormSectionProps = {
  sessions: TestSessionResult[]
  onChange: (sessions: TestSessionResult[]) => void
  errors: Record<string, string>
  compact?: boolean
  showHeader?: boolean
}

export function DailyTestPassRuleBadge() {
  return (
    <span className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 ring-1 ring-rose-200 sm:text-sm">
      [ 85점 이상 합격 ]
    </span>
  )
}

export function DailyTestSessionFormSection({
  sessions,
  onChange,
  errors,
  compact = false,
  showHeader = true,
}: DailyTestSessionFormSectionProps) {
  const setSession = (sessionNum: 1 | 2 | 3 | 4, patch: Partial<TestSessionResult>) => {
    onChange(updateSessionInForm(sessions, sessionNum, patch))
  }

  const setStatus = (sessionNum: 1 | 2 | 3 | 4, status: TestSessionStatus) => {
    if (status === '미응시') {
      setSession(sessionNum, {
        status: '미응시',
        score: undefined,
        totalScore: undefined,
        incorrectCount: undefined,
      })
      return
    }
    const current = sessions.find((s) => s.session === sessionNum)!
    const scoreOnFullScale = getSessionScoreOnFullScale(current)
    setSession(sessionNum, {
      status,
      score: scoreOnFullScale === '' ? 0 : scoreOnFullScale,
      totalScore: DAILY_TEST_FULL_SCORE,
      incorrectCount: 0,
    })
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3 sm:space-y-4'}>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">차시별 결과</p>
          <DailyTestPassRuleBadge />
        </div>
      )}
      <div
        className={
          compact
            ? 'grid grid-cols-1 gap-2 sm:grid-cols-2'
            : 'grid grid-cols-1 gap-3 sm:grid-cols-2'
        }
      >
        {sessions.map((session) => {
          const mismatch = getStatusMismatchWarning(session)
          const scoreKey = `session-${session.session}-score`
          const scoreErr = errors[scoreKey]
          const displayScore = getSessionScoreOnFullScale(session)
          const showScore =
            session.status !== '미응시' ? displayScore : session.score !== undefined ? session.score : ''

          return (
            <div
              key={session.session}
              className={`rounded-xl border border-slate-200 bg-slate-50/60 ${compact ? 'p-3' : 'p-4'}`}
            >
              <p className={`mb-2 font-bold text-navy-900 ${compact ? 'text-xs' : 'text-sm'}`}>
                {session.session}차시
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`flex min-h-[44px] items-center gap-1 rounded-xl border bg-white px-2 ${
                    session.status === '미응시'
                      ? 'border-slate-200'
                      : 'border-navy-200 ring-1 ring-navy-100'
                  }`}
                >
                  <input
                    id={`daily-test-score-${session.session}`}
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
                      const score = Number(raw)
                      setSession(session.session, updateSessionScoreOnly(session, score))
                    }}
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-center text-sm font-semibold text-navy-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    placeholder="점수"
                    aria-label={`${session.session}차시 점수`}
                  />
                  <span className="shrink-0 text-xs font-medium text-slate-400">점</span>
                </div>
                {RESULT_STATUSES.map((status) => {
                  const selected = session.status === status
                  const Icon = status === '합격' ? Check : X
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setStatus(session.session, status)}
                      className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold sm:text-sm ${
                        selected
                          ? getDailyTestSessionColor(status)
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {status}
                    </button>
                  )
                })}
              </div>
              {scoreErr && <p className="mt-2 text-sm text-rose-500">{scoreErr}</p>}
              {mismatch && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {mismatch}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function validateDailyTestSessions(
  sessions: TestSessionResult[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const session of sessions) {
    if (session.status === '미응시') continue
    const scoreOnFullScale = getSessionScoreOnFullScale(session)
    const score = scoreOnFullScale === '' ? 0 : scoreOnFullScale
    const scoreErr = validateScore(score, DAILY_TEST_FULL_SCORE)
    if (scoreErr) errors[`session-${session.session}-score`] = `${session.session}차시: ${scoreErr}`
  }
  return errors
}
