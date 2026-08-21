import { Link, useLocation } from 'react-router-dom'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { formatKoreanDateLong, getTodayString } from '../../utils/date'
import { parentCategoryItems, parentTodayReportItem } from './parentNavItems'

const todayReportHighlights = ['출결', '오늘의 진도', '과제 수행', '일일 테스트'] as const

export function ParentCategoryGrid() {
  const student = useParentStudent()
  const location = useLocation()
  const basePath = `/care/${student.studentAccessKey}`
  const todayLabel = formatKoreanDateLong(getTodayString())

  const todayPath = `${basePath}/${parentTodayReportItem.segment}`
  const TodayIcon = parentTodayReportItem.icon

  return (
    <div className="parent-home-menu space-y-3 sm:space-y-3.5">
      <Link to={todayPath} className="pm-featured-card">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <span className="pm-featured-icon">
            <TodayIcon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <span className="block text-lg font-bold leading-tight sm:text-xl">
              {parentTodayReportItem.label}
            </span>
            <span className="mt-1 block text-[15px] leading-snug text-white/90 sm:text-base">
              {student.name} · {todayLabel}
            </span>
            <span className="mt-1 block text-sm leading-snug text-white/80">
              {parentTodayReportItem.description}
            </span>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {todayReportHighlights.map((tag) => (
            <span key={tag} className="pm-featured-tag">
              {tag}
            </span>
          ))}
        </div>
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
              className={`pm-menu-card ${isActive ? 'pm-menu-card--active' : ''}`}
            >
              <span className="pm-menu-icon">
                <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
              </span>
              <span className="mt-2 min-w-0">
                <span className="pm-menu-title whitespace-pre-line break-keep">{label}</span>
                {description && (
                  <span className="pm-menu-desc line-clamp-2 break-anywhere">{description}</span>
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
