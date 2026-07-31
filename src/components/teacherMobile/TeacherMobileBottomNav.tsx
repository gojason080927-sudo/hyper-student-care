import { NavLink } from 'react-router-dom'
import { ClipboardList, GraduationCap, Home, MoreHorizontal, Users } from 'lucide-react'

const navItems = [
  { to: '/teacher/mobile', label: '홈', icon: Home, end: true },
  { to: '/teacher/mobile/today-report', label: 'Today Report', icon: ClipboardList },
  { to: '/teacher/mobile/students', label: '학생', icon: Users },
  { to: '/teacher/mobile/evaluation', label: '평가', icon: GraduationCap },
  { to: '/teacher/mobile/more', label: '더보기', icon: MoreHorizontal },
] as const

export function TeacherMobileBottomNav() {
  return (
    <nav
      className="tm-bottom-nav fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      aria-label="강사용 모바일 메뉴"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
        {navItems.map(({ to, label, icon: Icon, ...rest }) => (
          <li key={to} className="flex-1 px-0.5">
            <NavLink
              to={to}
              end={'end' in rest ? rest.end : false}
              className={({ isActive }) =>
                `tm-nav-link w-full ${isActive ? 'tm-nav-link--active' : ''}`
              }
            >
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />
              <span className="max-w-full truncate leading-tight">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
