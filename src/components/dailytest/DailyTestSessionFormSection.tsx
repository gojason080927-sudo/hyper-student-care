import { Check, Minus, X } from 'lucide-react'
import type { TestSessionResult, TestSessionStatus } from '../../types/records'
import {
  applyScoreToSession,
  getSessionPercentage,
  getStatusMismatchWarning,
  updateSessionInForm,
} from '../../utils/dailyTest'
import { getDailyTestSessionColor, getScoreColor } from '../../utils/labels'
import { validateScore } from '../../utils/validation'

const SESSION_STATUSES: TestSessionStatus[] = ['미응시', '불합격', '합격']

type DailyTestSessionFormSectionProps = {
  sessions: TestSessionResult[]
  onChange: (sessions: TestSessionResult[]) => void
  errors: Record<string, string>
}

export function DailyTestSessionFormSection({
  sessions,
  onChange,
  errors,
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
    setSession(sessionNum, {
      status,
      score: current.score ?? 0,
      totalScore: current.totalScore ?? 20,
      incorrectCount: current.incorrectCount ?? 0,
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-800">차시별 결과</p>
      {sessions.map((session) => {
        const active = session.status !== '미응시'
        const pct = getSessionPercentage(session)
        const mismatch = getStatusMismatchWarning(session)
        const scoreKey = `session-${session.session}-score`
        const scoreErr = errors[scoreKey]

        return (
          <div key={session.session} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-sm font-bold text-navy-900">{session.session}차시</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {SESSION_STATUSES.map((status) => {
                const selected = session.status === status
                const Icon = status === '합격' ? Check : status === '불합격' ? X : Minus
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">점수</label>
                <input
                  type="number"
                  min={0}
                  disabled={!active}
                  value={active ? (session.score ?? 0) : ''}
                  onChange={(e) => {
                    const score = Number(e.target.value)
                    const totalScore = session.totalScore ?? 20
                    setSession(
                      session.session,
                      applyScoreToSession(session, score, totalScore),
                    )
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">만점</label>
                <input
                  type="number"
                  min={1}
                  disabled={!active}
                  value={active ? (session.totalScore ?? 20) : ''}
                  onChange={(e) => {
                    const totalScore = Number(e.target.value)
                    const score = session.score ?? 0
                    setSession(
                      session.session,
                      applyScoreToSession(session, score, totalScore),
                    )
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">오답</label>
                <input
                  type="number"
                  min={0}
                  disabled={!active}
                  value={active ? (session.incorrectCount ?? 0) : ''}
                  onChange={(e) =>
                    setSession(session.session, {
                      incorrectCount: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100"
                />
              </div>
            </div>
            {active && pct !== null && (
              <p className="mt-2 text-sm text-slate-600">
                백분율: <strong className={getScoreColor(pct)}>{pct}%</strong>
              </p>
            )}
            {scoreErr && <p className="mt-1 text-sm text-rose-500">{scoreErr}</p>}
            {mismatch && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {mismatch}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function validateDailyTestSessions(
  sessions: TestSessionResult[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const session of sessions) {
    if (session.status === '미응시') continue
    const scoreErr = validateScore(session.score ?? 0, session.totalScore ?? 20)
    if (scoreErr) errors[`session-${session.session}-score`] = `${session.session}차시: ${scoreErr}`
    if ((session.incorrectCount ?? 0) < 0) {
      errors[`session-${session.session}-score`] = `${session.session}차시: 오답 개수는 0 이상이어야 합니다.`
    }
  }
  return errors
}
