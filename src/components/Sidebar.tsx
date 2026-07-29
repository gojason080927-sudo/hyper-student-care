import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Book,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  LayoutDashboard,
  MessageCircleQuestion,
  Newspaper,
  Users,
  X,
} from 'lucide-react'
import { BrandMark } from './brand/BrandMark'

type NavItem = {
  path: string
  label: string
  icon: LucideIcon
  multilineLabel?: [string, string]
}

const navItems: NavItem[] = [
  { path: '/', label: '대시보드', icon: LayoutDashboard },
  { path: '/students', label: '학생관리', icon: Users },
  { path: '/attendance', label: '출결관리', icon: ClipboardCheck },
  { path: '/progress', label: '진도 과정', icon: Book },
  { path: '/homework', label: '숙제관리', icon: BookOpen },
  { path: '/daily-tests', label: '일일테스트', icon: FileCheck },
  {
    path: '/teacher/today-report-bulk',
    label: 'Today Report 반별 통합입력',
    multilineLabel: ['Today Report', '반별 통합 입력'],
    icon: ClipboardList,
  },
  { path: '/teacher/monthly-evaluation', label: '월말평가', icon: CalendarCheck },
  { path: '/makeup-plans', label: '보강계획', icon: CalendarClock },
  { path: '/teacher/learning-notices', label: '학습정보 & 공지사항', icon: Newspaper },
  { path: '/questions', label: '질문하기', icon: MessageCircleQuestion },
]

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()

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
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-6">
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

        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="space-y-2">
            {navItems.map(({ path, label, icon: Icon, multilineLabel }) => {
              const isActive =
                path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path)
              return (
                <li key={path}>
                  <NavLink
                    to={path}
                    onClick={onClose}
                    className={`group flex w-full items-center gap-3.5 rounded-xl px-3.5 text-[15px] font-medium transition ${
                      multilineLabel ? 'py-3' : 'py-3.5 leading-none'
                    } ${
                      isActive
                        ? 'bg-navy-900 text-white shadow-sm ring-1 ring-navy-700/30'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-navy-900'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 self-center ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-400 group-hover:text-navy-600'
                      }`}
                      aria-hidden
                    />
                    {multilineLabel ? (
                      <span className="min-w-0 leading-snug">
                        <span className="block">{multilineLabel[0]}</span>
                        <span className="block">{multilineLabel[1]}</span>
                      </span>
                    ) : (
                      <span className="truncate">{label}</span>
                    )}
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
