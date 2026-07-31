import { NavLink, useLocation } from 'react-router-dom'
import { ClipboardList, Home, X } from 'lucide-react'
import { BrandMark } from '../brand/BrandMark'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { parentCategoryItems, parentTodayReportItem } from './parentNavItems'

type ParentStudentSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export function ParentStudentSidebar({ isOpen, onClose }: ParentStudentSidebarProps) {
  const student = useParentStudent()
  const location = useLocation()
  const basePath = `/care/${student.studentAccessKey}`

  const linkClass = (isActive: boolean) =>
    `pm-nav-link ${isActive ? 'pm-nav-link--active' : ''}`

  const iconClass = (isActive: boolean) =>
    `h-[18px] w-[18px] shrink-0 ${isActive ? '' : 'text-[#6B7280]'}`

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-40 bg-[rgba(22,58,112,0.2)] backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`pm-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col shadow-xl transition-transform duration-300 lg:static lg:w-64 lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-[rgba(22,58,112,0.06)] px-4 py-5 sm:px-5">
          <div className="flex items-start justify-between gap-2">
            <BrandMark />
            <button
              type="button"
              aria-label="사이드바 닫기"
              className="pm-menu-btn lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          <p className="mt-4 text-sm font-semibold text-[#163A70]">{student.name}</p>
          <p className="mt-0.5 break-anywhere text-xs text-[#6B7280]">
            {student.school} · {student.grade}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
          <ul className="space-y-1">
            <li>
              <NavLink
                to={basePath}
                end
                onClick={onClose}
                className={({ isActive }) => linkClass(isActive)}
              >
                <Home
                  className={iconClass(location.pathname === basePath)}
                  strokeWidth={2}
                  aria-hidden
                />
                홈
              </NavLink>
            </li>
            <li>
              <NavLink
                to={`${basePath}/${parentTodayReportItem.segment}`}
                onClick={onClose}
                className={({ isActive }) => linkClass(isActive)}
              >
                <ClipboardList
                  className={iconClass(location.pathname.includes('today-report'))}
                  strokeWidth={2}
                  aria-hidden
                />
                {parentTodayReportItem.label}
              </NavLink>
            </li>
            {parentCategoryItems.map(({ segment, label, icon: Icon }) => {
              const path = `${basePath}/${segment}`
              const isActive =
                location.pathname === path || location.pathname.startsWith(`${path}/`)
              return (
                <li key={segment}>
                  <NavLink
                    to={path}
                    onClick={onClose}
                    className={({ isActive: linkActive }) => linkClass(linkActive || isActive)}
                  >
                    <Icon className={iconClass(isActive)} strokeWidth={2} aria-hidden />
                    <span className="whitespace-pre-line leading-snug">{label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
