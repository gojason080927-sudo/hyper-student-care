import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarCheck,
  ClipboardList,
  FileBarChart2,
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
  /** 사이드바 클릭 시 항상 기본 화면으로 이동·상태 초기화 */
  resetOnNavigate?: boolean
}

export const MONTHLY_EVALUATION_SELECT_PATH = '/monthly-evaluations'

function isMonthlyEvaluationMenuActive(pathname: string): boolean {
  return (
    pathname === MONTHLY_EVALUATION_SELECT_PATH ||
    /^\/students\/[^/]+\/monthly-evaluation\/?$/.test(pathname)
  )
}

const navItems: NavItem[] = [
  { path: '/', label: '대시보드', icon: LayoutDashboard },
  { path: '/students', label: '학생관리', icon: Users },
  {
    path: '/teacher/today-report-bulk',
    label: 'Today Report 반별 통합입력',
    multilineLabel: ['Today Report', '반별 통합 입력'],
    icon: ClipboardList,
  },
  {
    path: '/monthly-learning-reports',
    label: '월간 학습진단 REPORT',
    multilineLabel: ['월간 학습진단', 'REPORT'],
    icon: FileBarChart2,
  },
  {
    path: MONTHLY_EVALUATION_SELECT_PATH,
    label: '월말평가',
    multilineLabel: ['월말평가', '결과'],
    icon: CalendarCheck,
    resetOnNavigate: true,
  },
  { path: '/teacher/learning-notices', label: '학습정보 & 공지사항', icon: Newspaper },
  { path: '/questions', label: '질문하기', icon: MessageCircleQuestion },
]

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavClick = (
    item: NavItem,
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    onClose()
    if (!item.resetOnNavigate) return

    event.preventDefault()
    const isSamePath = location.pathname === item.path
    navigate(item.path, {
      replace: isSamePath,
      state: { resetAt: Date.now() },
    })
  }

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
            {navItems.map((item) => {
              const { path, label, icon: Icon, multilineLabel } = item
              const isActive = item.resetOnNavigate
                ? isMonthlyEvaluationMenuActive(location.pathname)
                : path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path)
              return (
                <li key={path}>
                  <NavLink
                    to={path}
                    onClick={(event) => handleNavClick(item, event)}
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
