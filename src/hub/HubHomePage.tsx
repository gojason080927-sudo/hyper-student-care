import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  ClipboardList,
  FileQuestion,
  FolderOpen,
  Megaphone,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { StudentPushOptIn } from '../components/hub/StudentPushOptIn'
import { useHub } from './HubContext'
import { HUB_ACADEMY_LOGO_PNG, HUB_ACADEMY_LOGO_WEBP } from './types'

const tiles = [
  { to: 'weekly', label: '주간 SUMMARY', icon: Sparkles, badge: 'weekly' },
  { to: 'assignments', label: '오늘의 과제', icon: ClipboardList, badge: 'assignments' },
  { to: 'materials', label: '문제 자료실', icon: FolderOpen, badge: 'materials' },
  { to: 'videos', label: '영상 자료실', icon: Clapperboard, badge: 'videos' },
  { to: 'questions', label: '질문방', icon: MessageSquare, badge: 'questions' },
  { to: 'requests', label: '자료 요청실', icon: FileQuestion, badge: 'requests' },
  { to: 'schedule', label: '시간표 안내', icon: CalendarDays, badge: 'schedule' },
  { to: 'notices', label: '공지사항', icon: Megaphone, badge: 'notices' },
  { to: 'suggestions', label: '건의사항', icon: BookOpen, badge: 'suggestions' },
] as const

export function HubHomePage() {
  const { accessKey, student, assignments, materials, videos, questions, inbox, notices } = useHub()

  const badges = useMemo(() => {
    const unanswered = questions.filter((item) => item.status !== '답변완료').length
    return {
      weekly: 0,
      assignments: assignments.length > 0 ? 1 : 0,
      materials: materials.length > 0 ? Math.min(materials.length, 9) : 0,
      videos: videos.length > 0 ? Math.min(videos.length, 9) : 0,
      questions: unanswered,
      requests: inbox.filter((item) => item.kind === 'material_request' && item.status !== '완료').length,
      schedule: 0,
      notices: notices.filter((item) => item.isPublished).length > 0 ? 0 : 0,
      suggestions: inbox.filter((item) => item.kind === 'suggestion' && item.status !== '완료').length,
    }
  }, [assignments.length, inbox, materials.length, notices, questions, videos.length])

  const meta = [student.school, student.grade, student.className].filter(Boolean).join(' · ')

  return (
    <div className="hub-home mx-auto w-full max-w-lg px-3 pb-10">
      <section className="hub-hero" aria-label="학생 정보">
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
          <h1 className="hub-hero-title">학습 허브</h1>
        </div>
        <div className="hub-hero-identity">
          <p className="hub-hero-name">{student.name}</p>
          {meta ? <p className="hub-hero-meta">{meta}</p> : null}
        </div>
      </section>

      <nav aria-label="학생 학습 허브" className="hub-menu-grid grid grid-cols-3">
        {tiles.map((tile) => {
          const Icon = tile.icon
          const count = badges[tile.badge]
          return (
            <Link key={tile.to} to={`/hub/${accessKey}/${tile.to}`} className="hub-tile">
              {count > 0 ? <span className="hub-badge">{count > 9 ? '9+' : count}</span> : null}
              <span className="hub-tile-icon" aria-hidden>
                <Icon strokeWidth={2.4} />
              </span>
              <span className="hub-tile-label">{tile.label}</span>
            </Link>
          )
        })}
      </nav>

      <Link to={`/hub/${accessKey}/study-plan`} className="hub-feature-card">
        <span className="hub-feature-icon" aria-hidden>
          <CalendarCheck strokeWidth={2.35} />
        </span>
        <span className="hub-feature-copy">
          <span className="hub-feature-title">My Study Plan</span>
          <span className="hub-feature-sub">나만의 학습 계획 관리</span>
        </span>
        <span className="hub-feature-arrow" aria-hidden>
          <ChevronRight strokeWidth={2.4} />
        </span>
      </Link>

      <StudentPushOptIn accessKey={accessKey} />
    </div>
  )
}
