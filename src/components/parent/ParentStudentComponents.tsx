import type { ReactNode } from 'react'
import type { Student } from '../../types/student'
import { formatKoreanDateLong, getTodayString } from '../../utils/date'

type ParentStudentInfoCardProps = {
  student: Student
  dateLabel?: string
  compact?: boolean
}

/** 학부모 홈 상단 학생 정보 — 프리미엄 헤더 카드 */
export function ParentStudentInfoCard({
  student,
  dateLabel,
  compact = false,
}: ParentStudentInfoCardProps) {
  const displayDate = dateLabel ?? formatKoreanDateLong(getTodayString())

  if (compact) {
    return (
      <section className="pm-student-header px-4 py-3.5 sm:px-5 sm:py-4">
        <p className="pm-student-header-kicker">Hyper Student Care</p>
        <h1 className="mt-1.5 text-xl font-bold leading-tight text-[#163A70] sm:text-2xl">
          {student.name}
        </h1>
        <p className="mt-1 line-clamp-2 break-anywhere text-[15px] leading-snug text-[#6B7280] sm:text-base">
          {[student.school, student.grade, student.className, student.teacher]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <p className="mt-1 text-sm font-medium text-[#163A70]">{displayDate}</p>
      </section>
    )
  }

  return (
    <section className="pm-student-header px-4 py-4 sm:px-5 sm:py-5">
      <p className="pm-student-header-kicker">Hyper Student Care</p>
      <p className="mt-0.5 text-xs text-[#6B7280]">하이퍼 학생 관리 시스템</p>

      <h1 className="mt-3 text-xl font-bold text-[#163A70]">{student.name}</h1>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-[#6B7280]">학교 · 학년</dt>
          <dd className="break-anywhere font-medium text-[#1E293B]">
            {student.school} · {student.grade}
          </dd>
        </div>
        {student.className && (
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            <dt className="text-[#6B7280]">수강반</dt>
            <dd className="break-anywhere font-medium text-[#1E293B]">{student.className}</dd>
          </div>
        )}
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-[#6B7280]">담당 강사</dt>
          <dd className="font-medium text-[#1E293B]">{student.teacher || '-'}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-[#6B7280]">날짜</dt>
          <dd className="font-medium text-[#1E293B]">{displayDate}</dd>
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
    <article className="pm-card p-4 sm:p-5">
      {(title || date || status) && (
        <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            {date && <p className="text-sm font-semibold text-[#163A70]">{date}</p>}
            {title && (
              <h3 className="break-anywhere text-base font-semibold text-[#163A70]">{title}</h3>
            )}
          </div>
          {status && <div className="flex flex-wrap gap-2">{status}</div>}
        </header>
      )}
      <div className="space-y-2 text-[15px] leading-relaxed text-[#1E293B] sm:text-sm">
        {children}
      </div>
      {footer && <footer className="mt-3 border-t border-[rgba(22,58,112,0.06)] pt-3">{footer}</footer>}
    </article>
  )
}

/** 학부모 빈 상태 */
export function ParentEmptyState({ message = '등록된 내용이 없습니다.' }: { message?: string }) {
  return (
    <div className="pm-empty-state">
      <p className="text-sm">{message}</p>
    </div>
  )
}

type ParentPageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
}

/** 학부모 카테고리 페이지 헤더 */
export function ParentPageHeader({ title, description, action }: ParentPageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="pm-page-title">{title}</h2>
        {description && <p className="pm-page-desc mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
