import {
  CalendarCheck,
  ClipboardCheck,
  ClipboardList,
  FileBarChart2,
  MessageCircleQuestion,
  Newspaper,
  Users,
} from 'lucide-react'
import { CategoryCard } from '../components/dashboard/CategoryCard'

const categories = [
  {
    to: '/students',
    title: '학생관리',
    description: '학생 정보와 기본사항 관리',
    icon: Users,
  },
  {
    to: '/teacher/today-report-bulk',
    title: 'Today Report\n반별 통합 입력',
    description: '출결, 진도, 과제, 일일테스트 통합 관리',
    icon: ClipboardList,
  },
  {
    to: '/monthly-learning-reports',
    title: '월간 학습진단\nREPORT',
    description: '실시간 예상점수 · 확정 공개',
    icon: FileBarChart2,
  },
  {
    to: '/monthly-evaluations',
    title: '월말평가 결과',
    icon: CalendarCheck,
  },
  {
    to: '/entrance-exam',
    title: '신입생 평가 및\n성향 진단',
    description: '문제은행 · 시험지 · 응시 · 종합진단 REPORT',
    icon: ClipboardCheck,
  },
  {
    to: '/teacher/learning-notices',
    title: '학습정보 & 공지사항',
    description: '학습자료와 학원 공지사항 확인',
    icon: Newspaper,
  },
  {
    to: '/questions',
    title: '질문하기',
    description: '학생 질문과 강사 답변 관리',
    icon: MessageCircleQuestion,
  },
]

export function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-10 space-y-3 sm:mb-12 lg:mb-14">
        <h1 className="text-[28px] font-black leading-[1.15] tracking-[-0.5px] text-[#0F172A] [text-shadow:0_1px_1px_rgba(255,255,255,0.6),0_2px_6px_rgba(15,23,42,0.08)] sm:text-[34px] lg:text-[42px]">
          HYPER STUDENT CARE
        </h1>
        <p className="max-w-2xl text-[16px] font-semibold leading-[1.6] text-[#475569] [text-shadow:0_1px_1px_rgba(255,255,255,0.5),0_1px_4px_rgba(15,23,42,0.06)] sm:text-[18px] lg:text-[19px]">
          학생별 학습 기록을 항목별로 확인하고 관리합니다.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-6 lg:gap-7 xl:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard key={category.to} {...category} />
        ))}
      </section>
    </div>
  )
}
