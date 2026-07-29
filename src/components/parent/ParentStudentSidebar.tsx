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

  const navLinkClass = (isActive: boolean) =>
    `group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
      isActive
        ? 'bg-navy-900 text-white'
        : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'
    }`

  const iconClass = (isActive: boolean) =>
    `h-[18px] w-[18px] shrink-0 ${
      isActive ? 'text-white/90' : 'text-slate-400 group-hover:text-slate-600'
    }`

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:static lg:w-64 lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-slate-100 px-4 py-5 sm:px-5">
          <div className="flex items-start justify-between gap-2">
            <BrandMark />
            <button
              type="button"
              aria-label="사이드바 닫기"
              className="min-h-11 min-w-11 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-4 text-sm font-semibold text-navy-900">{student.name}</p>
          <p className="mt-0.5 break-anywhere text-xs text-slate-500">
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
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <Home className={iconClass(location.pathname === basePath)} aria-hidden />
                홈
              </NavLink>
            </li>
            <li>
              <NavLink
                to={`${basePath}/${parentTodayReportItem.segment}`}
                onClick={onClose}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                <ClipboardList className={iconClass(location.pathname.includes('today-report'))} aria-hidden />
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
                    className={({ isActive: linkActive }) => navLinkClass(linkActive || isActive)}
                  >
                    <Icon className={iconClass(isActive)} aria-hidden />
                    {label}
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
