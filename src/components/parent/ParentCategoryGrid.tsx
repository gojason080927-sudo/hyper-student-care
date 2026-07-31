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
    <div className="parent-home-menu space-y-3 sm:space-y-3.5">
      <Link
        to={todayPath}
        className={`parent-today-hero block w-full min-h-[44px] rounded-xl border px-4 py-4 shadow-md transition sm:rounded-2xl sm:px-5 sm:py-5 ${
          isTodayActive
            ? 'border-navy-600 bg-gradient-to-br from-navy-50 to-blue-50 ring-2 ring-navy-200 shadow-navy-100/80'
            : 'border-navy-200 bg-gradient-to-br from-navy-50/90 to-blue-50/80 shadow-slate-200/80 hover:border-navy-300 hover:shadow-lg'
        }`}
      >
        <div className="flex items-start gap-3.5 sm:gap-4">
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl sm:h-16 sm:w-16 ${
              isTodayActive ? 'bg-navy-900 text-white shadow-sm' : 'bg-navy-800 text-white shadow-sm'
            }`}
          >
            <TodayIcon className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-lg font-bold text-navy-900 sm:text-xl">
              {parentTodayReportItem.label}
            </span>
            <span className="mt-1 block text-[15px] leading-snug text-slate-600 sm:text-base">
              {parentTodayReportItem.description}
            </span>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {todayReportHighlights.map((tag) => (
            <span
              key={tag}
              className="inline-flex min-h-[30px] items-center rounded-full border border-navy-100 bg-white/80 px-3 py-0.5 text-xs font-medium text-navy-700 sm:text-[13px]"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-3.5 text-[15px] font-semibold text-navy-700 sm:text-base">
          오늘의 리포트 확인하기 →
        </p>
      </Link>

      <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:gap-3 lg:max-w-2xl">
        {parentCategoryItems.map(({ segment, label, icon: Icon, description }) => {
          const path = `${basePath}/${segment}`
          const isActive =
            location.pathname === path || location.pathname.startsWith(`${path}/`)

          return (
            <Link
              key={segment}
              to={path}
              className={`flex h-full min-h-[72px] flex-col justify-between rounded-lg border px-3 py-3 transition sm:min-h-[80px] sm:rounded-xl sm:px-3.5 sm:py-3.5 ${
                isActive
                  ? 'border-navy-600 bg-navy-50/80 ring-1 ring-navy-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80'
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-md sm:h-10 sm:w-10 ${
                  isActive ? 'bg-navy-900 text-white' : 'bg-slate-100 text-navy-700'
                }`}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden />
              </span>
              <span className="mt-2 min-w-0">
                <span className="block whitespace-pre-line break-keep text-sm font-semibold leading-snug text-navy-900 sm:text-[15px]">
                  {label}
                </span>
                {description && (
                  <span className="mt-0.5 block line-clamp-2 break-anywhere text-xs leading-snug text-slate-500 sm:text-[13px]">
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
