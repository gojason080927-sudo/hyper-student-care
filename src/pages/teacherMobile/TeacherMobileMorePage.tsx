import { Link } from 'react-router-dom'
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  FileBarChart2,
  GraduationCap,
  HelpCircle,
  Megaphone,
  Monitor,
  Compass,
  QrCode,
  TrendingUp,
} from 'lucide-react'
import { TeacherMobileHeader } from '../../components/teacherMobile/TeacherMobileHeader'
import { TeacherPushOptIn } from '../../components/teacherMobile/TeacherPushOptIn'

const links = [
  { to: '/teacher/mobile/student-hub', label: '학생 학습자료', icon: BookOpen },
  { to: '/teacher/mobile/student-hub-share', label: '학생 Hub 배포', icon: QrCode },
  { to: '/teacher/mobile/monthly-learning-reports', label: '월간 학습진단 REPORT', icon: FileBarChart2 },
  { to: '/entrance-exam', label: '신입생 평가 및 성향 진단', icon: ClipboardCheck },
  { to: '/teacher/mobile/career-assessment', label: '진로·학과 적성검사', icon: Compass },
  { to: '/teacher/mobile/notices', label: '학습정보 & 공지사항', icon: Megaphone },
  { to: '/teacher/mobile/makeup', label: '보강계획', icon: CalendarCheck },
  { to: '/teacher/mobile/admission-strategy', label: '고입 · 대입 입시전략', icon: GraduationCap },
  { to: '/teacher/mobile/questions', label: '질문하기', icon: HelpCircle },
  { to: '/teacher/mobile/progress', label: '학습진행 상황 (교재 진도)', icon: TrendingUp },
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
        <TeacherPushOptIn />
      </div>
    </div>
  )
}

