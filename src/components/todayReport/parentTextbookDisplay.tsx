import type { ReactNode } from 'react'
import type {
  HomeworkTextbookDisplay,
  ProgressTextbookDisplay,
} from '../../utils/textbookSlots'
import type { TextbookSlotNumber, TextbookSubject } from '../../types/records'
import { getTextbookSlotHeading } from '../../utils/teacherMobileTextbookSlots'
import {
  HOMEWORK_CARD_TITLE_CLASS,
} from '../../utils/homeworkCardTypography'
import { HomeworkResultDisplay } from '../homework/HomeworkResultFields'

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

/** 학부모 카드 제목: 슬롯 제목(개념교재·부교재 등) + 교재명 */
export function resolveParentSlotCardTitle(
  subject: TextbookSubject,
  slotNumber: number,
  textbookName: string,
): string {
  const heading = getTextbookSlotHeading(subject, slotNumber as TextbookSlotNumber)
  const name = textbookName.trim()
  if (heading) {
    return name ? `${heading} · ${name}` : heading
  }
  return resolveHomeworkCardTitle(slotNumber, textbookName)
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

export function ParentHomeworkSlotCard({ item }: { item: HomeworkTextbookDisplay }) {
  const title = resolveParentSlotCardTitle(item.subject, item.slotNumber, item.textbookName)
  const pastValue = item.status?.trim() || PARENT_FIELD_EMPTY

  return (
    <li className="tm-card px-2.5 py-2.5 sm:px-3 sm:py-3">
      <p className={HOMEWORK_CARD_TITLE_CLASS}>{title}</p>
      <div className="mt-2.5">
        <HomeworkResultDisplay
          pastValue={pastValue}
          todayValue={formatParentField(item.todayAssignment)}
        />
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
      className={compact ? 'tm-progress-track tm-progress-track--compact' : 'tm-progress-track'}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`교재 진행률 ${clamped}%`}
    >
      <div
        className="tm-progress-fill"
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
  const detailParts = [progressContent, pagePart, ratePart].filter(Boolean)
  const summaryLine = detailParts.length > 0 ? `${title} ${detailParts.join(' ')}` : title

  return (
    <li className="tm-card px-2.5 py-1.5 sm:px-3 sm:py-2">
      <p className="text-[13px] font-semibold leading-snug text-[#163A70] sm:text-sm">
        {summaryLine}
      </p>
      {hasPageValues ? (
        <div className="mt-1">
          <CompactProgressBar value={progressRate} compact />
        </div>
      ) : progressContent ? null : (
        <p className="mt-0.5 text-xs text-slate-500">진행률 미입력</p>
      )}
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
      <p className="pm-subject-title text-sm font-bold text-[var(--tm-navy)] sm:text-base">
        {subject}
      </p>
      <ul className="mt-1.5 space-y-1.5">{children}</ul>
    </div>
  )
}
