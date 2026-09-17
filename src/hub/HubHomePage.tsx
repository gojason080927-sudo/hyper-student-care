import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Clapperboard,
  ClipboardList,
  FileQuestion,
  FolderOpen,
  Megaphone,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { useHub } from './HubContext'

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

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-8 pt-4">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#28c7b7]">HYPER ACADEMY</p>
          <h1 className="mt-1 text-lg font-black text-[#163A70]">학습 허브</h1>
        </div>
        <div className="max-w-[46%] text-right">
          <p className="truncate text-sm font-bold text-[#163A70]">{student.name}</p>
          <p className="truncate text-[11px] text-slate-500">
            {[student.school, student.grade, student.className].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      <nav aria-label="학생 학습 허브" className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => {
          const Icon = tile.icon
          const count = badges[tile.badge]
          return (
            <Link key={tile.to} to={`/hub/${accessKey}/${tile.to}`} className="hub-tile">
              {count > 0 ? <span className="hub-badge">{count > 9 ? '9+' : count}</span> : null}
              <Icon className="h-6 w-6 text-[#28c7b7]" strokeWidth={2.2} />
              <span className="hub-tile-label">{tile.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
