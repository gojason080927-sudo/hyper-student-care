import { Link, useLocation } from 'react-router-dom'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { parentCategoryItems, parentTodayReportItem } from './parentNavItems'

const todayReportHighlights = ['출결', '오늘의 진도', '과제 수행', '일일 테스트'] as const

export function ParentCategoryGrid() {
  const student = useParentStudent()
  const location = useLocation()
  const basePath = `/care/${student.studentAccessKey}`

  const todayPath = `${basePath}/${parentTodayReportItem.segment}`
  const isTodayActive = location.pathname.startsWith(todayPath)
  const TodayIcon = parentTodayReportItem.icon

  return (
    <div className="parent-home-menu space-y-2 sm:space-y-2.5">
      <Link
        to={todayPath}
        className={`parent-today-hero block w-full min-h-[44px] rounded-xl border px-3.5 py-3.5 shadow-md transition sm:rounded-2xl sm:px-4 sm:py-4 ${
          isTodayActive
            ? 'border-navy-600 bg-gradient-to-br from-navy-50 to-blue-50 ring-2 ring-navy-200 shadow-navy-100/80'
            : 'border-navy-200 bg-gradient-to-br from-navy-50/90 to-blue-50/80 shadow-slate-200/80 hover:border-navy-300 hover:shadow-lg'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 ${
              isTodayActive ? 'bg-navy-900 text-white shadow-sm' : 'bg-navy-800 text-white shadow-sm'
            }`}
          >
            <TodayIcon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-base font-bold text-navy-900 sm:text-lg">
              {parentTodayReportItem.label}
            </span>
            <span className="mt-0.5 block text-sm leading-snug text-slate-600">
              {parentTodayReportItem.description}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {todayReportHighlights.map((tag) => (
            <span
              key={tag}
              className="inline-flex min-h-[28px] items-center rounded-full border border-navy-100 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-navy-700 sm:text-xs"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-3 text-sm font-semibold text-navy-700 sm:text-[15px]">
          오늘의 리포트 확인하기 →
        </p>
      </Link>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:max-w-2xl">
        {parentCategoryItems.map(({ segment, label, icon: Icon, description }) => {
          const path = `${basePath}/${segment}`
          const isActive =
            location.pathname === path || location.pathname.startsWith(`${path}/`)

          return (
            <Link
              key={segment}
              to={path}
              className={`flex min-h-[56px] flex-col justify-between rounded-lg border px-2.5 py-2 transition sm:min-h-[60px] sm:rounded-xl sm:px-3 sm:py-2.5 ${
                isActive
                  ? 'border-navy-600 bg-navy-50/80 ring-1 ring-navy-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-md sm:h-8 sm:w-8 ${
                  isActive ? 'bg-navy-900 text-white' : 'bg-slate-100 text-navy-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
              </span>
              <span className="mt-1.5 min-w-0">
                <span className="block break-keep text-[13px] font-semibold leading-snug text-navy-900 sm:text-sm">
                  {label}
                </span>
                {description && (
                  <span className="mt-0.5 block truncate text-[11px] leading-snug text-slate-500 sm:text-xs">
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
