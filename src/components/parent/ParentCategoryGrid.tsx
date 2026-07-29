import { Link, useLocation } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { parentCategoryItems, parentTodayReportItem } from './parentNavItems'

export function ParentCategoryGrid() {
  const student = useParentStudent()
  const location = useLocation()
  const basePath = `/care/${student.studentAccessKey}`

  const todayPath = `${basePath}/${parentTodayReportItem.segment}`
  const isTodayActive = location.pathname.startsWith(todayPath)

  return (
    <div className="space-y-4">
      <Link
        to={todayPath}
        className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-4 py-3.5 transition sm:rounded-2xl ${
          isTodayActive
            ? 'border-navy-700 bg-navy-50 ring-1 ring-navy-200'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isTodayActive ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-700'
          }`}
        >
          <ClipboardList className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy-900">
            {parentTodayReportItem.label}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500">
            {parentTodayReportItem.description}
          </span>
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-3 sm:gap-3.5">
        {parentCategoryItems.map(({ segment, label, icon: Icon, description }) => {
          const path = `${basePath}/${segment}`
          const isActive =
            location.pathname === path || location.pathname.startsWith(`${path}/`)

          return (
            <Link
              key={segment}
              to={path}
              className={`flex min-h-[88px] flex-col justify-between rounded-xl border px-3 py-3.5 transition sm:min-h-[96px] sm:px-4 sm:py-4 ${
                isActive
                  ? 'border-navy-700 bg-navy-50 ring-1 ring-navy-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  isActive ? 'bg-navy-900 text-white' : 'bg-slate-100 text-navy-700'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="mt-3 min-w-0">
                <span className="block break-keep text-sm font-semibold leading-snug text-navy-900">
                  {label}
                </span>
                {description && (
                  <span className="mt-1 block text-[11px] leading-snug text-slate-500 line-clamp-2">
                    {description}
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
