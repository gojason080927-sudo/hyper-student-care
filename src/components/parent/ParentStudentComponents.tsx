import { Bell, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useParentUnread } from '../../contexts/ParentUnreadContext'
import type { Student } from '../../types/student'
import { formatKoreanDateLong, getTodayString } from '../../utils/date'
import { formatStudentGradeClassLine } from '../../utils/studentGradeClass'
import { ParentUnreadDot } from './ParentUnreadDot'

type ParentStudentInfoCardProps = {
  student: Student
  dateLabel?: string
  compact?: boolean
  /** 홈에서 상단 헤더 제거 후 — 학습 공지 알림을 카드 우측 상단에 표시 */
  showNotificationLink?: boolean
}

function StudentInfoNotificationLink({ studentAccessKey }: { studentAccessKey: string }) {
  const { isCategoryUnread } = useParentUnread()
  const unread = isCategoryUnread('learning-notices')

  return (
    <Link
      to={`/care/${studentAccessKey}/learning-notices`}
      className="tm-icon-btn relative -mr-0.5 -mt-0.5 h-8 w-8 shrink-0 text-[var(--tm-navy)]"
      aria-label="수업 시간표 & 학습 공지사항"
    >
      <Bell className="h-4 w-4" strokeWidth={2} />
      {unread && <ParentUnreadDot className="right-1 top-1" size="sm" />}
    </Link>
  )
}

/** 학부모 홈 상단 학생 정보 — 프리미엄 헤더 카드 */
export function ParentStudentInfoCard({
  student,
  dateLabel,
  compact = false,
  showNotificationLink = false,
}: ParentStudentInfoCardProps) {
  const displayDate = dateLabel ?? formatKoreanDateLong(getTodayString())

  if (compact) {
    return (
      <section className="tm-student-info-card">
        <div className="min-w-0 flex-1">
          <p className="tm-header-kicker">HYPER STUDENT CARE</p>
          <h1 className="mt-1.5 text-xl font-bold leading-tight text-[var(--tm-navy)] sm:text-2xl">
            {student.name}
          </h1>
          <p className="mt-1 line-clamp-2 break-anywhere text-[15px] leading-snug text-[var(--tm-text-muted)] sm:text-base">
            {[student.school, formatStudentGradeClassLine(student)].filter(Boolean).join(' · ')}
          </p>
          {student.teacher && (
            <p className="mt-0.5 text-sm text-[var(--tm-text-muted)]">
              담당강사 ·{' '}
              <span className="font-medium text-[var(--tm-text)]">{student.teacher}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 self-stretch">
          {showNotificationLink && (
            <StudentInfoNotificationLink studentAccessKey={student.studentAccessKey} />
          )}
          <span className={`tm-student-info-avatar ${showNotificationLink ? 'mt-auto mb-auto' : ''}`} aria-hidden>
            <User className="h-6 w-6" strokeWidth={2} />
          </span>
        </div>
      </section>
    )
  }

  return (
    <section className="tm-student-info-card flex-col items-stretch sm:flex-row">
      <div className="min-w-0 flex-1">
        <p className="tm-header-kicker">HYPER STUDENT CARE</p>
        <p className="mt-0.5 text-xs text-[var(--tm-text-muted)]">하이퍼 학생 관리 시스템</p>

        <h1 className="mt-3 text-xl font-bold text-[var(--tm-navy)]">{student.name}</h1>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-[var(--tm-text-muted)]">학년 · 반/과정</dt>
          <dd className="break-anywhere font-medium text-[var(--tm-text)]">
            {formatStudentGradeClassLine(student)}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-[var(--tm-text-muted)]">학교</dt>
          <dd className="break-anywhere font-medium text-[var(--tm-text)]">{student.school || '-'}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-[var(--tm-text-muted)]">담당 강사</dt>
          <dd className="font-medium text-[var(--tm-text)]">{student.teacher || '-'}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <dt className="text-[var(--tm-text-muted)]">날짜</dt>
          <dd className="font-medium text-[var(--tm-text)]">{displayDate}</dd>
        </div>
      </dl>
      </div>
      <span className="tm-student-info-avatar self-start" aria-hidden>
        <User className="h-6 w-6" strokeWidth={2} />
      </span>
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
    <article className="tm-card p-4 sm:p-5">
      {(title || date || status) && (
        <header className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            {date && <p className="text-sm font-semibold text-[var(--tm-navy)]">{date}</p>}
            {title && (
              <h3 className="break-anywhere text-base font-semibold text-[var(--tm-navy)]">{title}</h3>
            )}
          </div>
          {status && <div className="flex flex-wrap gap-2">{status}</div>}
        </header>
      )}
      <div className="space-y-2 text-[15px] leading-relaxed text-[var(--tm-text)] sm:text-sm">
        {children}
      </div>
      {footer && <footer className="mt-3 border-t border-[rgba(22,58,112,0.06)] pt-3">{footer}</footer>}
    </article>
  )
}

/** 학부모 빈 상태 */
export function ParentEmptyState({ message = '등록된 내용이 없습니다.' }: { message?: string }) {
  return (
    <div className="tm-empty-state rounded-xl border border-dashed border-[rgba(22,58,112,0.12)] px-4 py-12 text-center">
      <p className="text-sm text-[var(--tm-text-muted)]">{message}</p>
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
        <h2 className="tm-header-title text-lg sm:text-xl">{title}</h2>
        {description && (
          <p className="tm-header-sub mt-1 text-sm leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
