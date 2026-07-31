import type { ReactNode } from 'react'
import { TeacherMobileHeader } from './TeacherMobileHeader'

export function TeacherMobilePageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="tm-animate-in flex min-h-0 flex-1 flex-col">
      <TeacherMobileHeader title={title} subtitle={subtitle} />
      <div className="tm-page-content flex-1">{children}</div>
    </div>
  )
}
