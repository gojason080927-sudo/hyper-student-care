import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  LogOut,
  Megaphone,
  MessageSquare,
  QrCode,
  Users,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { TEACHER_MOBILE_LOGIN_PATH } from '../../lib/teacherLoginReturn'
import { HUB_ACADEMY_LOGO_PNG, HUB_ACADEMY_LOGO_WEBP } from '../../hub/types'
import '../../hub/hub.css'

const tiles = [
  { to: '/teacher/mobile/student-hub', title: '학생 학습자료', icon: BookOpen },
  { to: '/teacher/mobile/student-hub-share', title: '학생 Hub 배포', icon: QrCode },
  { to: '/teacher/mobile/students', title: '학생관리', icon: Users },
  { to: '/teacher/mobile/notices', title: '학습공지', icon: Megaphone },
  { to: '/teacher/mobile/questions', title: '질문관리', icon: MessageSquare },
  { to: '/teacher/mobile/makeup', title: '보강계획', icon: CalendarCheck },
  { to: '/teacher/mobile/monthly-learning-reports', title: '월간 학습진단', icon: FileBarChart2 },
  { to: '/teacher/mobile/evaluation', title: '월말평가', icon: GraduationCap },
  { to: '/teacher/mobile/admission-strategy', title: '입시전략', icon: GraduationCap },
] as const

export function TeacherMobileDashboardPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const teacherLabel = user?.email ?? '강사'

  const handleSignOut = async () => {
    await signOut()
    navigate(TEACHER_MOBILE_LOGIN_PATH, { replace: true })
  }

  return (
    <div className="student-hub-app teacher-hub-home flex min-h-0 flex-1 flex-col">
      <div className="hub-home mx-auto w-full max-w-lg px-3 pb-10">
        <section className="hub-hero" aria-label="강사 정보">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="teacher-hub-logout"
            aria-label="로그아웃"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
          <div className="hub-hero-brand">
            <picture>
              <source type="image/webp" srcSet={HUB_ACADEMY_LOGO_WEBP} />
              <img
                src={HUB_ACADEMY_LOGO_PNG}
                alt="HYPER ACADEMY"
                className="hub-hero-logo"
                width={720}
                height={720}
                decoding="async"
              />
            </picture>
            <p className="hub-hero-kicker">HYPER ACADEMY</p>
            <h1 className="hub-hero-title">강사 허브</h1>
          </div>
          <div className="hub-hero-identity">
            <p className="hub-hero-name">{teacherLabel}</p>
            <p className="hub-hero-meta">강사용 학생관리</p>
          </div>
        </section>

        <nav aria-label="강사 메뉴" className="hub-menu-grid grid grid-cols-3">
          {tiles.map((tile) => {
            const Icon = tile.icon
            return (
              <Link key={tile.to} to={tile.to} className="hub-tile">
                <span className="hub-tile-icon" aria-hidden>
                  <Icon strokeWidth={2.4} />
                </span>
                <span className="hub-tile-label">{tile.title}</span>
              </Link>
            )
          })}
        </nav>

        <Link to="/teacher/mobile/today-report" className="hub-feature-card">
          <span className="hub-feature-icon" aria-hidden>
            <ClipboardList strokeWidth={2.35} />
          </span>
          <span className="hub-feature-copy">
            <span className="hub-feature-title">Today Report 입력</span>
            <span className="hub-feature-sub">
              <span className="block break-keep">출결 · 숙제 · 교재준비</span>
              <span className="block break-keep">진도 · 일일테스트 · 수업태도</span>
            </span>
          </span>
          <span className="hub-feature-arrow" aria-hidden>
            <ChevronRight strokeWidth={2.4} />
          </span>
        </Link>
      </div>
    </div>
  )
}
