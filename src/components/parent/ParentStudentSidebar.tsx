import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Book,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  FileCheck,
  Home,
  MessageCircleQuestion,
  Newspaper,
  X,
} from 'lucide-react'
import { BrandMark } from '../brand/BrandMark'
import { useParentStudent } from '../../contexts/ParentStudentContext'

type ParentNavItem = {
  segment: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const navItems: ParentNavItem[] = [
  { segment: '', label: '홈', icon: Home, end: true },
  { segment: 'attendance', label: '출결', icon: ClipboardCheck },
  { segment: 'progress', label: '진도 과정', icon: Book },
  { segment: 'homework', label: '숙제관리', icon: BookOpen },
  { segment: 'daily-tests', label: '일일테스트', icon: FileCheck },
  { segment: 'monthly-evaluation', label: '월말평가', icon: CalendarCheck },
  { segment: 'makeup-plans', label: '보강계획', icon: CalendarClock },
  { segment: 'learning-notices', label: '학습정보 & 공지사항', icon: Newspaper },
  { segment: 'questions', label: '질문하기', icon: MessageCircleQuestion },
]

type ParentStudentSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export function ParentStudentSidebar({ isOpen, onClose }: ParentStudentSidebarProps) {
  const student = useParentStudent()
  const location = useLocation()
  const basePath = `/care/${student.studentAccessKey}`

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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="flex items-start justify-between gap-2">
            <BrandMark />
            <button
              type="button"
              aria-label="사이드바 닫기"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-4 text-sm font-semibold text-navy-900">{student.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {student.school} · {student.grade}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <ul className="space-y-1">
            {navItems.map(({ segment, label, icon: Icon, end }) => {
              const path = segment ? `${basePath}/${segment}` : basePath
              const isActive = end
                ? location.pathname === basePath
                : location.pathname.startsWith(path)
              return (
                <li key={segment || 'home'}>
                  <NavLink
                    to={path}
                    end={end}
                    onClick={onClose}
                    className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition ${
                      isActive
                        ? 'bg-navy-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        isActive
                          ? 'text-white/90'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
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
