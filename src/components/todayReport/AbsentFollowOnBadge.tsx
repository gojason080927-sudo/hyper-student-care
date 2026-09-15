import type { ReactNode } from 'react'
import { ABSENT_FOLLOW_ON_LABEL } from '../../utils/todayReportAbsence'

export function AbsentFollowOnBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full bg-slate-100 font-semibold text-slate-500 ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      {ABSENT_FOLLOW_ON_LABEL}
    </span>
  )
}

export function AbsentFollowOnHint({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? 'text-[11px] leading-5 text-slate-500' : 'text-xs leading-5 text-slate-500'}>
      결석으로 저장되어 이 날짜의 수업 참여 항목에서 제외됩니다.
    </p>
  )
}

export function StudentFollowOnRowHeader({
  name,
  excluded,
  compact = false,
  extra,
}: {
  name: string
  excluded: boolean
  compact?: boolean
  extra?: ReactNode
}) {
  return (
    <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
      <p
        className={`min-w-0 font-bold ${
          compact ? 'text-sm text-[#163A70]' : 'text-sm text-navy-900'
        }`}
      >
        {name}
      </p>
      {excluded ? <AbsentFollowOnBadge compact={compact} /> : null}
      {extra ? <div className="ml-auto min-w-0 max-w-full flex-1">{extra}</div> : null}
    </div>
  )
}
