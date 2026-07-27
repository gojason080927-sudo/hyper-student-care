import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

type CategoryCardProps = {
  to: string
  title: string
  description: string
}

export function CategoryCard({ to, title, description }: CategoryCardProps) {
  return (
    <Link
      to={to}
      className="group flex min-h-[140px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-8"
    >
      <div>
        <h3 className="text-lg font-bold text-navy-900 sm:text-xl">{title}</h3>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          {description}
        </p>
      </div>
      <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition group-hover:text-navy-700">
        메뉴로 이동
        <ChevronRight className="h-4 w-4" />
      </span>
    </Link>
  )
}
