import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { useData } from '../../hooks/useData'
import { useParentAdmissionStrategyMaterials } from '../../hooks/useParentAdmissionStrategyMaterials'
import { hasUnreadAdmissionStrategyMaterials } from '../../lib/db/admissionStrategyMaterial'
import { hasUnreadWeeklySummary } from '../../utils/studentCare/weeklySummaryDisplay'
import {
  parentHomeCategoryItems,
  parentTodayReportHighlights,
  parentTodayReportItem,
} from './parentNavItems'

export function ParentCategoryGrid() {
  const student = useParentStudent()
  const { materials } = useParentAdmissionStrategyMaterials()
  const { weeklyLearningSummaries, weeklySummaryRead, ensureWeeklyLearningSummaries } = useData()
  const admissionUnread = hasUnreadAdmissionStrategyMaterials(materials)
  const weeklyUnread = hasUnreadWeeklySummary(weeklyLearningSummaries, student.id, weeklySummaryRead)
  const basePath = `/care/${student.studentAccessKey}`
  const todayPath = `${basePath}/${parentTodayReportItem.segment}`
  const TodayIcon = parentTodayReportItem.icon
  const highlightLine = parentTodayReportHighlights.map((item) => item.label).join(' · ')

  useEffect(() => {
    void ensureWeeklyLearningSummaries()
  }, [ensureWeeklyLearningSummaries])

  return (
    <>
      <nav aria-label="학부모 메뉴" className="hub-menu-grid grid grid-cols-3">
        {parentHomeCategoryItems.map(({ segment, label, icon: Icon }) => {
          const showAdmissionUnread = segment === 'admission-strategy' && admissionUnread
          const showWeeklyUnread = segment === 'weekly-learning-summary' && weeklyUnread
          return (
            <Link key={segment} to={`${basePath}/${segment}`} className="hub-tile">
              {showAdmissionUnread || showWeeklyUnread ? (
                <span className="parent-hub-unread" aria-label="확인하지 않은 새 자료" />
              ) : null}
              <span className="hub-tile-icon" aria-hidden>
                <Icon strokeWidth={2.4} />
              </span>
              <span className="hub-tile-label">{label}</span>
            </Link>
          )
        })}
      </nav>

      <Link to={todayPath} className="hub-feature-card">
        <span className="hub-feature-icon" aria-hidden>
          <TodayIcon strokeWidth={2.35} />
        </span>
        <span className="hub-feature-copy">
          <span className="hub-feature-title">{parentTodayReportItem.label}</span>
          <span className="hub-feature-sub">
            <span className="block break-keep">{highlightLine}</span>
          </span>
        </span>
        <span className="hub-feature-arrow" aria-hidden>
          <ChevronRight strokeWidth={2.4} />
        </span>
      </Link>
    </>
  )
}
