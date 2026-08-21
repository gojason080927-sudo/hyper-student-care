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

/** 학부모 숙제 카드 제목: 교재 {n} - {교재명} */
export function resolveHomeworkCardTitle(slotNumber: number, textbookName: string): string {
  const name = textbookName.trim()
  if (name) return `교재 ${slotNumber} - ${name}`
  return `교재 ${slotNumber}`
}

export function calcDisplayProgressRate(currentPage: number, totalPage: number): number {
  if (totalPage <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((currentPage / totalPage) * 100)))
}

const PARENT_CARD_FIELD_LABEL_CLASS = 'text-sm font-semibold text-slate-600'

const HOMEWORK_FIELD_LABEL_CLASS = PARENT_CARD_FIELD_LABEL_CLASS

export function ParentHomeworkSlotCard({ item }: { item: HomeworkTextbookDisplay }) {
  const title = resolveHomeworkCardTitle(item.slotNumber, item.textbookName)

  return (
    <li className="pm-slot-card px-2.5 py-2 sm:px-3">
      <p className="break-words text-xl font-bold leading-snug text-navy-900 sm:text-2xl">{title}</p>
      <div className="mt-2 space-y-1.5">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={HOMEWORK_FIELD_LABEL_CLASS}>지난 과제</span>
            {item.status ? (
              <StatusBadge
                label={item.status}
                colorClass={getHomeworkColor(item.status)}
                compact
              />
            ) : null}
          </div>
          <p className="break-words text-sm leading-snug text-slate-800">
            {formatParentField(item.previousAssignment)}
          </p>
        </div>
        <div className="space-y-0.5">
          <span className={HOMEWORK_FIELD_LABEL_CLASS}>오늘 해야 할 과제</span>
          <p className="break-words text-sm leading-snug text-slate-800">
            {formatParentField(item.todayAssignment)}
          </p>
        </div>
      </div>
    </li>
  )
}

export function CompactProgressBar({
  value,
  compact = false,
}: {
  value: number
  compact?: boolean
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  const labelOnFill = clamped >= 42

  return (
    <div
      className={compact ? 'pm-progress-track pm-progress-track--compact' : 'pm-progress-track'}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`교재 진행률 ${clamped}%`}
    >
      <div
        className="pm-progress-fill"
        style={{ width: `${clamped}%`, minWidth: clamped > 0 ? '0.5rem' : undefined }}
      />
      {!compact ? (
        <span
          className={`absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums ${
            labelOnFill ? 'text-[#0E2752] drop-shadow-sm' : 'text-[#163A70]'
          }`}
        >
          {clamped}%
        </span>
      ) : null}
    </div>
  )
}

export function ParentProgressSlotCard({ item }: { item: ProgressTextbookDisplay }) {
  const title = resolveHomeworkCardTitle(item.slotNumber, item.textbookName)
  const hasPageValues = item.currentPage > 0 || item.totalPage > 0
  const progressRate = calcDisplayProgressRate(item.currentPage, item.totalPage)
  const progressContent = item.progressContent.trim()
  const pagePart = hasPageValues
    ? `${item.currentPage} / ${item.totalPage > 0 ? item.totalPage : '-'}`
    : ''
  const ratePart = hasPageValues ? `${progressRate}%` : ''
  const detailParts = [progressContent || null, pagePart || null, ratePart || null].filter(
    Boolean,
  )

  return (
    <li className="pm-slot-card px-2.5 py-2 sm:px-3">
      <p className="break-words text-base font-bold leading-snug text-navy-900 sm:text-lg">
        {title}
      </p>
      {detailParts.length > 0 ? (
        <p className="mt-1 text-sm leading-snug text-slate-700">
          {detailParts.join(' · ')}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">진행률 미입력</p>
      )}
      {hasPageValues ? (
        <div className="mt-1.5">
          <CompactProgressBar value={progressRate} compact />
        </div>
      ) : null}
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
      <p className="pm-subject-title">{subject}</p>
      <ul className="mt-1.5 space-y-2">{children}</ul>
    </div>
  )
}
