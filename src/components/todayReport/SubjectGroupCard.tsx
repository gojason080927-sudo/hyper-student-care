import type { ReactNode } from 'react'
import type { TextbookSubject } from '../../types/records'

type SubjectGroupCardProps = {
  subject: TextbookSubject
  title: string
  children: ReactNode
  className?: string
}

/**
 * Teacher Today Report subject framing.
 * Math = soft blue card, English = soft mint card.
 * Used by mobile (/teacher/mobile) and desktop bulk panels.
 */
export function SubjectGroupCard({
  subject,
  title,
  children,
  className = '',
}: SubjectGroupCardProps) {
  const isMath = subject === '수학'

  return (
    <section
      data-subject-group={subject}
      className={[
        'tm-subject-group min-w-0 overflow-hidden rounded-2xl border-2 px-3 py-3',
        isMath ? 'tm-subject-group--math' : 'tm-subject-group--english',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      <h4
        className={[
          'tm-subject-group__title mb-2.5 border-b pb-2 text-base font-extrabold tracking-tight',
          isMath ? 'tm-subject-group__title--math' : 'tm-subject-group__title--english',
        ].join(' ')}
      >
        {title}
      </h4>
      <div className="tm-subject-group__body min-w-0 divide-y divide-[rgba(15,23,42,0.1)]">
        {children}
      </div>
    </section>
  )
}

export function subjectGroupTitle(
  subject: TextbookSubject,
  variant: 'plain' | 'assignment' | 'progress',
): string {
  if (variant === 'assignment') {
    return subject === '수학' ? '수학 과제' : '영어 과제'
  }
  if (variant === 'progress') {
    return subject === '수학' ? '수학 진도' : '영어 진도'
  }
  return subject
}
