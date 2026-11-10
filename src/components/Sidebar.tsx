import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { TeacherPushOptIn } from './teacherMobile/TeacherPushOptIn'
import { HY, accentTile } from './hyperUi'

type NavItem = {
  path: string
  label: string
  /** 사이드바 클릭 시 항상 기본 화면으로 이동·상태 초기화 */
  resetOnNavigate?: boolean
  /** 이 경로들에서도 활성 표시 */
  alsoActive?: string[]
}

export const MONTHLY_EVALUATION_SELECT_PATH = '/monthly-evaluations'
export const WORKSHEET_PATH = '/teacher/worksheet'
export const ODAP_BANK_PATH = '/teacher/odap-bank'

function isMonthlyEvaluationMenuActive(pathname: string): boolean {
  return (
    pathname === MONTHLY_EVALUATION_SELECT_PATH ||
    /^\/students\/[^/]+\/monthly-evaluation\/?$/.test(pathname)
  )
}

const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [{ path: '/', label: '홈' }] },
  {
    title: '수업',
    items: [
      { path: '/students', label: '학생관리' },
      { path: '/teacher/today-report-bulk', label: 'Today Report 반별 입력' },
      { path: '/teacher/student-hub', label: '학생 학습자료' },
      { path: '/teacher/student-hub-share', label: '학생 Hub 배포' },
    ],
  },
  {
    title: '제작',
    items: [
      { path: WORKSHEET_PATH, label: '문제은행', alsoActive: [ODAP_BANK_PATH] },
      { path: '/teacher/textbook-studio', label: '교재 제작' },
      { path: '/teacher/content-library', label: '영상·콘텐츠 보관함' },
      { path: '/teacher/pdf-to-docx', label: 'PDF → DOCX 변환' },
    ],
  },
  {
    title: '평가',
    items: [
      { path: '/monthly-learning-reports', label: '월간 학습진단 REPORT' },
      { path: MONTHLY_EVALUATION_SELECT_PATH, label: '월말평가 결과', resetOnNavigate: true },
      { path: '/entrance-exam', label: '신입생 평가·성향 진단' },
      { path: '/career-assessment', label: '진로·학과 적성검사' },
    ],
  },
  {
    title: '소통',
    items: [
      { path: '/teacher/learning-notices', label: '학습정보 & 공지사항' },
      { path: '/teacher/admission-strategy', label: '고입·대입 입시전략' },
      { path: '/questions', label: '질문하기' },
    ],
  },
]

const activeStyle = {
  backgroundColor: '#26232F',
  backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 50%, rgba(0,209,255,0.28))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 0 #000000, 0 6px 12px rgba(0,0,0,0.35)',
  color: '#FFFFFF',
}

type SidebarProps = {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavClick = (item: NavItem, event: React.MouseEvent<HTMLAnchorElement>) => {
    onClose()
    if (!item.resetOnNavigate) return

    event.preventDefault()
    const isSamePath = location.pathname === item.path
    navigate(item.path, {
      replace: isSamePath,
      state: { resetAt: Date.now() },
    })
  }

  const isActive = (item: NavItem) => {
    const p = location.pathname
    if (item.resetOnNavigate) return isMonthlyEvaluationMenuActive(p)
    if (item.path === '/') return p === '/'
    return [item.path, ...(item.alsoActive ?? [])].some((x) => p === x || p.startsWith(`${x}/`))
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
        aria-label="주 메뉴"
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col gap-7 overflow-y-auto px-[18px] py-7 shadow-xl transition-transform duration-300 lg:static lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#141318', color: '#C9C6D6', fontFamily: HY.font }}
      >
        <div className="flex items-center gap-2.5 px-2">
          <div
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] text-[18px] font-bold"
            style={{ ...accentTile, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.35)', fontFamily: HY.display }}
          >
            H
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-bold tracking-[0.12em] text-white" style={{ fontFamily: HY.display }}>
              HYPER
            </span>
            <span className="text-[11px] tracking-[0.08em] text-[#8E8A9E]">강사 콘솔</span>
          </div>
          <button
            type="button"
            aria-label="사이드바 닫기"
            className="ml-auto rounded-lg p-1.5 text-[#8E8A9E] hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {navGroups.map((g) => (
            <div key={g.title ?? 'home'} className="flex flex-col gap-1">
              {g.title && (
                <span className="px-3 pb-1 pt-3.5 text-[12px] tracking-[0.1em] text-[#8E8A9E]">{g.title}</span>
              )}
              {g.items.map((item) => {
                const on = isActive(item)
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={(event) => handleNavClick(item, event)}
                    className={`flex items-center gap-3 rounded-[10px] px-3 text-[14.5px] transition hover:text-white ${on ? 'py-[11px] font-medium' : 'py-[9px]'}`}
                    style={on ? activeStyle : { color: '#C9C6D6' }}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-[3px]" style={{ background: on ? HY.accent : '#4A4658' }} />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <TeacherPushOptIn placement="sidebar" />
          <div className="rounded-xl border border-[#2E2B38] p-3.5 text-[12px] leading-[1.6] text-[#8E8A9E]">
            24시간 학습을 설계하다
            <br />
            <span className="text-[#C9C6D6]">하이퍼 영수 전문학원</span>
          </div>
        </div>
      </aside>
    </>
  )
}
