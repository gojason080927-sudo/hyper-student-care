import type { ReactNode } from 'react'
import { getHomeworkColor } from '../../utils/labels'
import type {
  HomeworkTextbookDisplay,
  ProgressTextbookDisplay,
} from '../../utils/textbookSlots'
import type { TextbookSubject } from '../../types/records'
import { StatusBadge } from '../ui/StatusBadge'

export const PARENT_FIELD_EMPTY = '미입력'

export function formatParentField(value: string | undefined | null): string {
  const trimmed = value?.trim() ?? ''
  return trimmed || PARENT_FIELD_EMPTY
}

export function resolveTextbookTitle(
  textbookName: string,
  subject: TextbookSubject,
  slotNumber: number,
): string {
  if (textbookName.trim()) return textbookName.trim()
  return `${subject} 교재 ${slotNumber}`
}

export function calcDisplayProgressRate(currentPage: number, totalPage: number): number {
  if (totalPage <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((currentPage / totalPage) * 100)))
}

function ParentFieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="break-words text-sm leading-snug text-slate-800">{value}</p>
    </div>
  )
}

export function ParentHomeworkSlotCard({ item }: { item: HomeworkTextbookDisplay }) {
  const title = resolveTextbookTitle(item.textbookName, item.subject, item.slotNumber)

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-3.5">
      <p className="break-words text-xl font-bold leading-snug text-navy-900 sm:text-2xl">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {item.subject} · 교재 {item.slotNumber}
      </p>
      <div className="mt-3 space-y-2.5">
        <ParentFieldRow label="지난 과제" value={formatParentField(item.previousAssignment)} />
        <ParentFieldRow label="오늘 해야 할 과제" value={formatParentField(item.todayAssignment)} />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500">수행 상태</p>
          {item.status ? (
            <StatusBadge label={item.status} colorClass={getHomeworkColor(item.status)} />
          ) : (
            <p className="text-sm text-slate-800">{PARENT_FIELD_EMPTY}</p>
          )}
        </div>
      </div>
    </li>
  )
}

export function CompactProgressBar({ value }: { value: number }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  const labelOnFill = clamped >= 42

  return (
    <div
      className="relative h-[22px] w-full max-w-[85%] overflow-hidden rounded-full bg-navy-100/70"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`교재 진행률 ${clamped}%`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-navy-800 to-navy-600 transition-all duration-300"
        style={{ width: `${clamped}%`, minWidth: clamped > 0 ? '0.5rem' : undefined }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums ${
          labelOnFill ? 'text-white drop-shadow-sm' : 'text-navy-800'
        }`}
      >
        {clamped}%
      </span>
    </div>
  )
}

export function ParentProgressSlotCard({ item }: { item: ProgressTextbookDisplay }) {
  const title = resolveTextbookTitle(item.textbookName, item.subject, item.slotNumber)
  const hasPageValues = item.currentPage > 0 || item.totalPage > 0
  const progressRate = calcDisplayProgressRate(item.currentPage, item.totalPage)
  const progressContent = item.progressContent.trim()

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 sm:px-3.5">
      <p className="break-words text-xl font-bold leading-snug text-navy-900 sm:text-2xl">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {item.subject} · 교재 {item.slotNumber}
      </p>
      <div className="mt-3 space-y-2.5">
        {progressContent ? (
          <ParentFieldRow label="현재 진도" value={progressContent} />
        ) : null}
        {hasPageValues ? (
          <>
            <ParentFieldRow
              label="진행도"
              value={`${item.currentPage} / ${item.totalPage > 0 ? item.totalPage : PARENT_FIELD_EMPTY}`}
            />
            <CompactProgressBar value={progressRate} />
          </>
        ) : (
          <p className="text-xs text-slate-500">진행률 미입력</p>
        )}
      </div>
    </li>
  )
}

export function ParentSubjectSlotList({
  subject,
  children,
}: {
  subject: TextbookSubject
  children: ReactNode
}) {
  return (
    <div>
      <p className="text-base font-bold text-navy-900">{subject}</p>
      <ul className="mt-2 space-y-3">{children}</ul>
    </div>
  )
}
