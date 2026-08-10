import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type CategoryCardProps = {
  to: string
  title: string
  description?: string
  icon: LucideIcon
}

export function CategoryCard({ to, title, description, icon: Icon }: CategoryCardProps) {
  const isMultiline = title.includes('\n')
  const titleLines = isMultiline ? title.split('\n') : [title]

  return (
    <Link
      to={to}
      className="group flex min-h-[200px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-200 ease-out hover-capable:hover:border-navy-400 hover-capable:hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)] sm:min-h-[210px] sm:p-8"
    >
      <div className="flex flex-1 flex-col">
        <div
          className={`flex gap-3.5 ${isMultiline ? 'items-start' : 'items-center'}`}
        >
          <Icon
            className={`h-6 w-6 shrink-0 text-navy-600 transition-colors duration-200 ease-out hover-capable:group-hover:text-navy-700 ${isMultiline ? 'mt-0.5' : ''}`}
            aria-hidden
          />
          <h3 className="text-xl font-bold leading-snug text-navy-900 sm:text-[22px]">
            {titleLines.map((line, index) => (
              <span key={line} className={index > 0 ? 'block' : undefined}>
                {line}
              </span>
            ))}
          </h3>
        </div>
        {description ? (
          <p className="mt-4 flex-1 text-[15px] leading-relaxed text-slate-600 sm:text-base sm:leading-7">
            {description}
          </p>
        ) : (
          <div className="flex-1" aria-hidden />
        )}
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-400 transition-colors duration-200 ease-out hover-capable:group-hover:text-navy-700">
        메뉴로 이동
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  )
}
