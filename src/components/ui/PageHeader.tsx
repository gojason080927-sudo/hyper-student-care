import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  action?: ReactNode
  badge?: ReactNode
}

export function PageHeader({ title, description, action, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">{title}</h2>
        {description && (
          <p className="mt-2 text-base leading-relaxed text-slate-600">{description}</p>
        )}
        {badge && <div className="mt-3">{badge}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
