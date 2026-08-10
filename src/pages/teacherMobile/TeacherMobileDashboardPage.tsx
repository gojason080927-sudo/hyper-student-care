import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  HelpCircle,
  Megaphone,
  Users,
} from 'lucide-react'
import { TeacherMobileHeader } from '../../components/teacherMobile/TeacherMobileHeader'
import { useAuth } from '../../contexts/AuthContext'

type MenuCard = {
  to: string
  title: string
  description?: string
  icon: typeof ClipboardList
}

const featured: MenuCard = {
  to: '/teacher/mobile/today-report',
  title: 'Today Report 입력',
  description: '출결·과제·진도·일일테스트·특이사항',
  icon: ClipboardList,
}

const gridCards: Array<MenuCard | { placeholder: true; title: string }> = [
  {
    to: '/teacher/mobile/students',
    title: '학생관리',
    description: '학생 등록·수정',
    icon: Users,
  },
  {
    to: '/teacher/mobile/monthly-learning-reports',
    title: '월간 학습진단\nREPORT',
    description: '현재 예상점수',
    icon: FileBarChart2,
  },
  {
    to: '/teacher/mobile/evaluation',
    title: '월말평가',
    description: '평가 결과',
    icon: GraduationCap,
  },
  {
    to: '/teacher/mobile/notices',
    title: '학습공지',
    description: '공지사항',
    icon: Megaphone,
  },
  {
    to: '/teacher/mobile/questions',
    title: '질문하기',
    description: 'Q&A 답변',
    icon: HelpCircle,
  },
  {
    placeholder: true,
    title: '향후 기능',
  },
]

export function TeacherMobileDashboardPage() {
  const { user } = useAuth()
  const teacherLabel = user?.email ?? '강사'
  const FeaturedIcon = featured.icon

  return (
    <div className="tm-animate-in flex min-h-0 flex-1 flex-col">
      <TeacherMobileHeader subtitle={teacherLabel} />
      <div className="teacher-mobile-home flex min-h-0 flex-1 flex-col px-4 pb-2 pt-3">
        <div className="flex min-h-0 flex-1 flex-col space-y-3">
          <Link to={featured.to} className="tm-featured-card">
            <div className="flex items-center gap-3">
              <span className="tm-featured-icon">
                <FeaturedIcon className="h-7 w-7" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold leading-tight">{featured.title}</p>
                <p className="mt-1 text-[15px] leading-snug text-white/85">{featured.description}</p>
              </div>
              <span className="tm-featured-arrow" aria-hidden>
                <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
              </span>
            </div>
          </Link>

          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2.5 sm:gap-3">
            {gridCards.map((item, index) => {
              if ('placeholder' in item) {
                return (
                  <div
                    key={`placeholder-${index}`}
                    className="tm-menu-card pointer-events-none opacity-45"
                    aria-hidden
                  >
                    <span className="tm-menu-icon bg-slate-100" />
                    <span className="mt-2 min-w-0">
                      <span className="tm-menu-title text-slate-400">{item.title}</span>
                      <span className="tm-menu-desc">준비 중</span>
                    </span>
                  </div>
                )
              }
              const Icon = item.icon
              return (
                <Link key={item.to} to={item.to} className="tm-menu-card">
                  <span className="tm-menu-icon">
                    <Icon className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="mt-2 min-w-0">
                    <span className="tm-menu-title whitespace-pre-line">{item.title}</span>
                    {item.description ? (
                      <span className="tm-menu-desc line-clamp-2">{item.description}</span>
                    ) : null}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
