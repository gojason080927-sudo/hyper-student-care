import { Link, useLocation } from 'react-router-dom'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { parentCategoryItems, parentTodayReportItem } from './parentNavItems'

export function ParentCategoryGrid() {
  const student = useParentStudent()
  const location = useLocation()
  const basePath = `/care/${student.studentAccessKey}`

  const todayPath = `${basePath}/${parentTodayReportItem.segment}`
  const isTodayActive = location.pathname.startsWith(todayPath)
  const TodayIcon = parentTodayReportItem.icon

  return (
    <div className="parent-home-menu space-y-2.5 sm:space-y-3">
      <Link
        to={todayPath}
        className={`flex w-full min-h-[58px] items-center gap-3 rounded-xl border px-3.5 py-3 transition sm:min-h-[64px] sm:rounded-2xl sm:px-4 sm:py-3.5 ${
          isTodayActive
            ? 'border-navy-700 bg-navy-50 ring-1 ring-navy-200'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${
            isTodayActive ? 'bg-navy-900 text-white' : 'bg-navy-50 text-navy-700'
          }`}
        >
          <TodayIcon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy-900 sm:text-[15px]">
            {parentTodayReportItem.label}
          </span>
          <span className="mt-0.5 block truncate text-xs leading-snug text-slate-500">
            {parentTodayReportItem.description}
          </span>
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:max-w-2xl">
        {parentCategoryItems.map(({ segment, label, icon: Icon, description }) => {
          const path = `${basePath}/${segment}`
          const isActive =
            location.pathname === path || location.pathname.startsWith(`${path}/`)

          return (
            <Link
              key={segment}
              to={path}
              className={`flex min-h-[78px] flex-col justify-between rounded-xl border px-3 py-2.5 transition sm:min-h-[88px] sm:px-3.5 sm:py-3 lg:min-h-[96px] lg:px-4 lg:py-3.5 ${
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
              <span className="mt-2 min-w-0 sm:mt-2.5">
                <span className="block break-keep text-sm font-semibold leading-snug text-navy-900">
                  {label}
                </span>
                {description && (
                  <span className="mt-0.5 block truncate text-xs leading-snug text-slate-500">
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
