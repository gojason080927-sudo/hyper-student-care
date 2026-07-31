import { Link } from 'react-router-dom'
import {
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Megaphone,
  Monitor,
  TrendingUp,
} from 'lucide-react'
import { TeacherMobileHeader } from '../../components/teacherMobile/TeacherMobileHeader'

const links = [
  { to: '/teacher/mobile/makeup', label: '보강계획', icon: CalendarCheck },
  { to: '/teacher/mobile/notices', label: '학습정보 & 공지사항', icon: Megaphone },
  { to: '/teacher/mobile/questions', label: '질문하기', icon: HelpCircle },
  { to: '/teacher/mobile/progress', label: '학습진행 상황', icon: TrendingUp },
  { to: '/teacher/mobile/evaluation', label: '월말평가 결과', icon: GraduationCap },
  { to: '/teacher/mobile/today-report', label: 'Today Report', icon: ClipboardList },
] as const

export function TeacherMobileMorePage() {
  return (
    <div className="tm-animate-in">
      <TeacherMobileHeader title="더보기" />
      <div className="tm-page-content space-y-2.5">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="tm-list-row">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(40,199,183,0.12)]">
              <Icon className="h-[22px] w-[22px] tm-list-row-icon" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-5 w-5 text-[#6B7280]" strokeWidth={2} aria-hidden />
          </Link>
        ))}
        <a
          href="/"
          className="tm-list-row bg-[#F6F8FB] text-[#6B7280]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
            <Monitor className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
          </span>
          <span className="flex-1">PC 강사용 화면</span>
          <ExternalLink className="h-4 w-4 opacity-60" strokeWidth={2} aria-hidden />
        </a>
      </div>
    </div>
  )
}
