import { Check } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  DAILY_TEST_FULL_SCORE,
  getStatusMismatchWarning,
  parseScoreDraftToNumber,
} from '../../utils/dailyTest'
import {
  createEmptyMobileDailyTestRounds,
  isValidMobileScoreDraft,
  selectMobilePassRound,
  sessionsToMobileDailyTestRounds,
  updateMobileScoreDraft,
  mobileRoundsToSessionResults,
  type MobileDailyTestRound,
} from '../../utils/teacherMobileDailyTest'
import type { TestSessionResult } from '../../types/records'

type TeacherMobileDailyTestSessionFormProps = {
  sessions: TestSessionResult[]
  errors: Record<string, string>
}

export type TeacherMobileDailyTestSessionFormRef = {
  getRounds: () => MobileDailyTestRound[]
  commitToSessionResults: () => TestSessionResult[]
}

function getFinalPassLabel(rounds: MobileDailyTestRound[]): string {
  const passRound = rounds.find((round) => round.passed)
  return passRound ? `${passRound.round}차시 합격` : '미입력 또는 미합격'
}

function getMismatchFromRound(round: MobileDailyTestRound): string | null {
  if (!round.passed) return null
  const trimmed = round.score.trim()
  if (trimmed === '') return null
  const score = parseScoreDraftToNumber(trimmed)
  if (score === undefined) return null
  return getStatusMismatchWarning({
    session: round.round,
    status: '합격',
    score,
    totalScore: DAILY_TEST_FULL_SCORE,
  })
}

export const TeacherMobileDailyTestSessionForm = forwardRef<
  TeacherMobileDailyTestSessionFormRef,
  TeacherMobileDailyTestSessionFormProps
>(function TeacherMobileDailyTestSessionForm({ sessions, errors }, ref) {
  const [rounds, setRounds] = useState<MobileDailyTestRound[]>(() =>
    sessionsToMobileDailyTestRounds(sessions),
  )
  const loadRevisionRef = useRef('')

  useEffect(() => {
    const revision = JSON.stringify(
      sessions.map((session) => ({
        session: session.session,
        status: session.status,
        score: session.score,
      })),
    )
    if (revision !== loadRevisionRef.current) {
      loadRevisionRef.current = revision
      setRounds(sessionsToMobileDailyTestRounds(sessions))
    }
  }, [sessions])

  useImperativeHandle(
    ref,
    () => ({
      getRounds: () => rounds,
      commitToSessionResults: () => mobileRoundsToSessionResults(rounds),
    }),
    [rounds],
  )

  const handleScoreChange = (round: 1 | 2 | 3 | 4, raw: string) => {
    if (!isValidMobileScoreDraft(raw)) return
    setRounds((prev) => updateMobileScoreDraft(prev, round, raw))
  }

  const handleSelectPass = (round: 1 | 2 | 3 | 4) => {
    setRounds((prev) => selectMobilePassRound(prev, round))
  }

  const passRound = rounds.find((round) => round.passed)?.round ?? null

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rounds.map((round) => {
          const scoreKey = `session-${round.round}-score`
          const scoreErr = errors[scoreKey]
          const mismatch = getMismatchFromRound(round)
          const isPassSelected = passRound === round.round

          return (
            <div
              key={round.round}
              className="tm-card min-w-0 bg-[#F6F8FB]/80 p-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <p className="w-10 shrink-0 text-xs font-bold text-[#163A70]">{round.round}차시</p>
                <div className="flex min-h-9 min-w-0 flex-1 items-center gap-1 rounded-2xl border border-[rgba(22,58,112,0.1)] bg-white px-1.5">
                  <input
                    id={`mobile-daily-test-score-${round.round}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={round.score}
                    onChange={(e) => handleScoreChange(round.round, e.target.value)}
                    className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-center text-sm font-semibold text-[#1E293B] outline-none placeholder:font-normal placeholder:text-[#6B7280]"
                    placeholder="점수"
                    aria-label={`${round.round}차시 점수`}
                  />
                  <span className="shrink-0 text-xs font-medium text-[#6B7280]">점</span>
                </div>
                <button
                  type="button"
                  aria-pressed={isPassSelected}
                  onClick={() => handleSelectPass(round.round)}
                  className={`inline-flex min-h-9 min-w-[3.5rem] shrink-0 items-center justify-center gap-1 rounded-2xl border px-2 py-1 text-xs font-semibold transition duration-200 active:scale-[0.98] ${
                    isPassSelected
                      ? 'border-transparent bg-gradient-to-br from-[#163A70] to-[#28C7B7] text-white shadow-sm'
                      : 'border-[rgba(22,58,112,0.12)] bg-white text-[#6B7280]'
                  }`}
                >
                  {isPassSelected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                  합격
                </button>
              </div>
              {scoreErr && <p className="mt-2 text-sm text-rose-500">{scoreErr}</p>}
              {mismatch && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[10px] leading-snug text-amber-800">
                  {mismatch}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[11px] font-medium text-slate-500">
        최종 결과:{' '}
        <span className={passRound ? 'text-[#28C7B7] font-semibold' : 'text-[#6B7280]'}>
          {getFinalPassLabel(rounds)}
        </span>
      </p>
    </div>
  )
})

export function createInitialMobileDailyTestRoundsFromSessions(
  sessions: TestSessionResult[],
): MobileDailyTestRound[] {
  if (sessions.length === 0) return createEmptyMobileDailyTestRounds()
  return sessionsToMobileDailyTestRounds(sessions)
}
