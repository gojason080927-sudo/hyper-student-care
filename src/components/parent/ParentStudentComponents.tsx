import type { ReactNode } from 'react'
import type { Student } from '../../types/student'
import { formatKoreanDateLong, getTodayString } from '../../utils/date'

type ParentStudentInfoCardProps = {
  student: Student
  dateLabel?: string
  compact?: boolean
}

/** 학부모 홈 상단 학생 정보 — 간결한 흰색 카드 */
export function ParentStudentInfoCard({
  student,
  dateLabel,
  compact = false,
}: ParentStudentInfoCardProps) {
  const displayDate = dateLabel ?? formatKoreanDateLong(getTodayString())

  if (compact) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm sm:rounded-2xl sm:px-4 sm:py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-600">
          Hyper Student Care
        </p>
        <h1 className="mt-1.5 text-lg font-bold text-navy-900">{student.name}</h1>
        <p className="mt-1 break-anywhere text-sm text-slate-600">
          {student.school} · {student.grade}
          {student.teacher ? ` · ${student.teacher}` : ''}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">{displayDate}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:px-5 sm:py-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-600">
        Hyper Student Care
      </p>
      <p className="mt-0.5 text-xs text-slate-500">하이퍼 학생 관리 시스템</p>

      <h1 className={`mt-3 font-bold text-navy-900 ${compact ? 'text-lg' : 'text-xl'}`}>
        {student.name}
      </h1>

      <dl className={`mt-3 space-y-2 text-sm ${compact ? 'text-slate-600' : ''}`}>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-slate-500">학교 · 학년</dt>
          <dd className="break-anywhere font-medium text-slate-800">
            {student.school} · {student.grade}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-slate-500">담당 강사</dt>
          <dd className="font-medium text-slate-800">{student.teacher || '-'}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-slate-500">날짜</dt>
          <dd className="font-medium text-slate-800">{displayDate}</dd>
        </div>
      </dl>
    </section>
  )
}

type ParentRecordCardProps = {
  title?: ReactNode
  date?: string
  status?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** 학부모 카테고리 공통 기록 카드 */
export function ParentRecordCard({
  title,
  date,
  status,
  children,
  footer,
}: ParentRecordCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {(title || date || status) && (
        <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            {date && (
              <p className="text-sm font-semibold text-navy-900">{date}</p>
            )}
            {title && (
              <h3 className="break-anywhere text-base font-semibold text-navy-900">{title}</h3>
            )}
          </div>
          {status && <div className="flex flex-wrap gap-2">{status}</div>}
        </header>
      )}
      <div className="space-y-2 text-[15px] leading-relaxed text-slate-700 sm:text-sm">
        {children}
      </div>
      {footer && <footer className="mt-3 border-t border-slate-100 pt-3">{footer}</footer>}
    </article>
  )
}

/** 학부모 빈 상태 */
export function ParentEmptyState({ message = '등록된 내용이 없습니다.' }: { message?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  )
}

type ParentPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

/** 학부모 카테고리 페이지 헤더 — 모바일 가독성 우선 */
export function ParentPageHeader({ title, description, action }: ParentPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-navy-900 sm:text-xl">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
