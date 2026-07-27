import { Check, Minus, X } from 'lucide-react'
import { useState } from 'react'
import type { DailyTestRecord, TestSessionResult, TestSessionStatus } from '../../types/records'
import {
  getFinalPassLabel,
  getSessionPercentage,
  migrateSessionResults,
} from '../../utils/dailyTest'
import { getDailyTestSessionColor } from '../../utils/labels'

type DailyTestSessionGridProps = {
  record: DailyTestRecord
  compact?: boolean
}

function SessionStatusIcon({ status }: { status: TestSessionStatus }) {
  if (status === '합격') return <Check className="h-4 w-4 shrink-0" aria-hidden />
  if (status === '불합격') return <X className="h-4 w-4 shrink-0" aria-hidden />
  return <Minus className="h-4 w-4 shrink-0" aria-hidden />
}

export function DailyTestSessionGrid({ record, compact = false }: DailyTestSessionGridProps) {
  const sessions = migrateSessionResults(record)
  const [expandedSession, setExpandedSession] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-navy-800">
        최종 결과: <span className="text-blue-700">{getFinalPassLabel(sessions)}</span>
      </p>
      <div className={`grid gap-2.5 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {sessions.map((session) => (
          <SessionCard
            key={session.session}
            session={session}
            expanded={expandedSession === session.session}
            onToggle={() =>
              setExpandedSession((prev) =>
                prev === session.session ? null : session.session,
              )
            }
          />
        ))}
      </div>
    </div>
  )
}

function SessionCard({
  session,
  expanded,
  onToggle,
}: {
  session: TestSessionResult
  expanded: boolean
  onToggle: () => void
}) {
  const pct = getSessionPercentage(session)
  const hasDetails = session.status !== '미응시' && session.score !== undefined

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex min-h-[88px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-center transition hover:opacity-90 ${getDailyTestSessionColor(session.status)}`}
    >
      <span className="text-xs font-semibold text-slate-600">{session.session}차시</span>
      <SessionStatusIcon status={session.status} />
      <span className="text-sm font-bold">{session.status}</span>
      {expanded && hasDetails && (
        <div className="mt-1 w-full border-t border-current/10 pt-2 text-xs leading-relaxed">
          <p>
            {session.score}/{session.totalScore}점
          </p>
          {pct !== null && <p>{pct}%</p>}
          <p>오답 {session.incorrectCount ?? 0}개</p>
        </div>
      )}
      {!expanded && hasDetails && (
        <span className="text-[11px] opacity-80">탭하여 상세 보기</span>
      )}
    </button>
  )
}
