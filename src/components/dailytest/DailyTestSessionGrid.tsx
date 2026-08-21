import { Check, Minus, X } from 'lucide-react'
import { useState } from 'react'
import type { DailyTestRecord, TestSessionResult, TestSessionStatus } from '../../types/records'
import {
  getFinalPassLabel,
  getSessionScoreOnFullScale,
  migrateSessionResults,
} from '../../utils/dailyTest'
import { getDailyTestSessionColor } from '../../utils/labels'

type DailyTestSessionGridProps = {
  record: DailyTestRecord
  compact?: boolean
  dense?: boolean
  /** 학부모 Today Report: 차시별 점수 + 합격/불합격 */
  variant?: 'default' | 'parentReport'
  /** 학부모 화면: 표시만, 클릭·수정 불가 */
  readOnly?: boolean
}

function SessionStatusIcon({ status }: { status: TestSessionStatus }) {
  if (status === '합격') return <Check className="h-4 w-4 shrink-0" aria-hidden />
  if (status === '불합격') return <X className="h-4 w-4 shrink-0" aria-hidden />
  return <Minus className="h-4 w-4 shrink-0" aria-hidden />
}

export function DailyTestSessionGrid({
  record,
  compact = false,
  dense = false,
  variant = 'default',
  readOnly = false,
}: DailyTestSessionGridProps) {
  const sessions = migrateSessionResults(record)
  const [expandedSession, setExpandedSession] = useState<number | null>(null)

  if (variant === 'parentReport') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {sessions.map((session) => (
          <ParentReportSessionCard key={session.session} session={session} />
        ))}
      </div>
    )
  }

  if (dense) {
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {sessions.map((session) => (
          <div
            key={session.session}
            className={`flex h-9 flex-col items-center justify-center rounded-lg border px-1 text-center ${getDailyTestSessionColor(session.status)}`}
          >
            <span className="text-[10px] font-medium leading-none text-slate-600">
              {session.session}차시
            </span>
            <span className="text-[11px] font-bold leading-tight">{session.status}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className={`font-semibold text-navy-800 ${compact ? 'text-xs' : 'text-sm'}`}>
        최종 결과: <span className="text-blue-700">{getFinalPassLabel(sessions)}</span>
      </p>
      <div
        className={`grid ${compact ? 'grid-cols-4 gap-1.5' : 'grid-cols-2 gap-2.5 sm:grid-cols-4'}`}
      >
        {sessions.map((session) => (
          <SessionCard
            key={session.session}
            session={session}
            expanded={expandedSession === session.session}
            compact={compact}
            readOnly={readOnly}
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

function ParentReportSessionCard({ session }: { session: TestSessionResult }) {
  const scoreOnFullScale = getSessionScoreOnFullScale(session)
  const isAbsent = session.status === '미응시'
  const hasScore = !isAbsent && scoreOnFullScale !== ''

  return (
    <div
      className={`flex min-h-[4.25rem] flex-col items-center justify-center rounded-xl border px-2.5 py-2 text-center ${getDailyTestSessionColor(session.status)}`}
    >
      <p className="text-xs font-semibold text-slate-600">{session.session}차시</p>
      {hasScore ? (
        <p className="mt-1 text-base font-bold leading-none">{scoreOnFullScale}점</p>
      ) : null}
      <p className={`font-bold ${hasScore ? 'mt-0.5 text-sm' : 'mt-1 text-sm'}`}>
        {session.status}
      </p>
    </div>
  )
}

function SessionCard({
  session,
  expanded,
  compact,
  readOnly,
  onToggle,
}: {
  session: TestSessionResult
  expanded: boolean
  compact?: boolean
  readOnly?: boolean
  onToggle: () => void
}) {
  const scoreOnFullScale = getSessionScoreOnFullScale(session)
  const hasDetails = session.status !== '미응시' && scoreOnFullScale !== ''

  const className = `flex w-full flex-col items-center justify-center rounded-xl border text-center ${
    readOnly ? '' : 'transition hover:opacity-90'
  } ${getDailyTestSessionColor(session.status)} ${
    compact ? 'min-h-[44px] gap-0.5 px-1 py-1.5' : 'min-h-[88px] gap-1.5 px-3 py-3'
  }`

  const content = (
    <>
      <span className={`font-semibold text-slate-600 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {session.session}차시
      </span>
      {!compact && <SessionStatusIcon status={session.status} />}
      <span className={`font-bold ${compact ? 'text-[11px]' : 'text-sm'}`}>{session.status}</span>
      {expanded && hasDetails && !compact && (
        <div className="mt-1 w-full border-t border-current/10 pt-2 text-xs leading-relaxed">
          <p>{scoreOnFullScale}점</p>
        </div>
      )}
      {!readOnly && !expanded && hasDetails && !compact && (
        <span className="text-[11px] opacity-80">탭하여 상세 보기</span>
      )}
    </>
  )

  if (readOnly) {
    return <div className={className}>{content}</div>
  }

  return (
    <button type="button" onClick={onToggle} className={className}>
      {content}
    </button>
  )
}
