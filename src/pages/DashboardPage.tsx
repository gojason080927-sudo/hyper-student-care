import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileBarChart2,
  FileType2,
  FolderOpen,
  GraduationCap,
  Layers,
  Library,
  MessageCircleQuestion,
  Newspaper,
  QrCode,
  Search,
  Users,
} from 'lucide-react'
import { HY, accentTile, card, darkTile, inset } from '../components/hyperUi'
import { WORKSHEET_PATH } from '../components/Sidebar'

type Menu = { to: string; title: string; description: string; icon: LucideIcon; isNew?: boolean }

const sections: { title: string; items: Menu[] }[] = [
  {
    title: '수업',
    items: [
      { to: '/students', title: '학생관리', description: '학생 정보와 기본사항 관리', icon: Users },
      { to: '/teacher/today-report-bulk', title: 'Today Report', description: '출결 · 과제 · 진도 · 일일테스트 입력', icon: ClipboardList },
      { to: '/teacher/student-hub', title: '학생 학습자료', description: '학생 앱의 문제 · 영상 자료 등록', icon: BookOpen },
      { to: '/teacher/student-hub-share', title: '학생 Hub 배포', description: '학생별 링크 · QR · 반 단위 배포', icon: QrCode },
    ],
  },
  {
    title: '제작',
    items: [
      { to: WORKSHEET_PATH, title: '문제은행', description: '단원별 자동 출제 · 채점 · 오답Bank', icon: Layers, isNew: true },
      { to: '/teacher/textbook-studio', title: '교재 제작', description: 'HYPER 교재를 만들고 인쇄', icon: Library },
      { to: '/teacher/content-library', title: '영상 · 콘텐츠 보관함', description: '강사 전용 URL · 파일 · 메모 보관', icon: FolderOpen },
      { to: '/teacher/pdf-to-docx', title: 'PDF → DOCX 변환', description: 'PDF를 편집할 수 있는 문서로 변환', icon: FileType2 },
    ],
  },
  {
    title: '평가',
    items: [
      { to: '/monthly-learning-reports', title: '월간 학습진단 REPORT', description: '실시간 예상점수 · 확정 공개', icon: FileBarChart2 },
      { to: '/monthly-evaluations', title: '월말평가 결과', description: '결과 입력 · 학부모 앱 발송', icon: CalendarCheck },
      { to: '/entrance-exam', title: '신입생 평가\n성향 진단', description: '시험지 · 응시 · 종합진단 REPORT', icon: ClipboardCheck },
      { to: '/career-assessment', title: '진로 · 학과 적성검사', description: '학생 링크 · QR · 결과 확인 · A4 결과지', icon: Compass },
    ],
  },
  {
    title: '소통',
    items: [
      { to: '/teacher/learning-notices', title: '학습정보 & 공지사항', description: '학습자료와 학원 공지사항 확인', icon: Newspaper },
      { to: '/teacher/admission-strategy', title: '고입 · 대입 입시전략', description: '진학 · 입시 정보 관리', icon: GraduationCap },
      { to: '/questions', title: '질문하기', description: '학생 질문과 강사 답변 관리', icon: MessageCircleQuestion },
    ],
  },
]

export function DashboardPage() {
  const [q, setQ] = useState('')
  const k = q.replace(/\s/g, '')
  const hit = (m: Menu) => !k || (m.title + m.description).replace(/\s/g, '').includes(k)

  return (
    <div className="flex w-full flex-col gap-[26px]" style={{ fontFamily: HY.font, color: HY.ink }}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-[26px] font-bold tracking-[-0.02em]">전체 메뉴</h1>
        <label className="flex h-11 min-w-[260px] items-center gap-2.5 px-3.5" style={inset}>
          <Search className="h-4 w-4" color={HY.sub} aria-hidden />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="학생 · 메뉴 검색"
            aria-label="검색"
            className="flex-1 border-none bg-transparent text-[14px] outline-none"
          />
        </label>
      </header>

      {sections.map((s) => {
        const items = s.items.filter(hit)
        if (!items.length) return null
        return (
          <section key={s.title} aria-label={s.title} className="flex flex-wrap items-stretch gap-4">
            <h2
              className="m-0 flex min-h-11 flex-[0_0_56px] items-center justify-center rounded-[14px] text-[14px] font-bold tracking-[0.1em]"
              style={darkTile}
            >
              {s.title}
            </h2>
            <div className="grid min-w-0 flex-[999_1_480px] gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
              {items.map(({ to, title, description, icon: Icon, isNew }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-[164px] flex-col gap-3.5 px-5 py-[22px] transition hover:-translate-y-0.5"
                  style={{ ...card, color: HY.ink }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]"
                      style={{ ...darkTile, color: HY.accent, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), 0 2px 0 #000000, 0 6px 10px rgba(23,22,28,0.25)' }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span className="whitespace-pre-line text-[17px] font-bold tracking-[-0.01em]">{title}</span>
                    {isNew && (
                      <span className="ml-auto rounded-full px-[9px] py-[3px] text-[11px] font-bold" style={accentTile}>
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] leading-[1.5]" style={{ color: HY.sub }}>
                    {description}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
