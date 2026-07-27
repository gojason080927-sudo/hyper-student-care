import { CategoryCard } from '../components/dashboard/CategoryCard'

const categories = [
  {
    to: '/students',
    title: '학생관리',
    description: '학생 정보와 기본사항 관리',
  },
  {
    to: '/attendance',
    title: '출결관리',
    description: '출석·지각·결석·조퇴 기록',
  },
  {
    to: '/progress',
    title: '진도 과정',
    description: '교재 진행 상황과 학습 진도 관리',
  },
  {
    to: '/homework',
    title: '숙제관리',
    description: '숙제 수행 상태 기록',
  },
  {
    to: '/daily-tests',
    title: '일일테스트',
    description: '일일평가 점수와 오답 기록',
  },
  {
    to: '/monthly-evaluations',
    title: '월말평가',
    description: '매월 평가 결과와 성적 변화 확인',
  },
  {
    to: '/makeup-plans',
    title: '보강계획',
    description: '보강 예정일과 진행 방식을 관리합니다.',
  },
  {
    to: '/teacher/learning-notices',
    title: '학습정보 & 공지사항',
    description: '유용한 학습정보와 학원 공지사항을 확인합니다.',
  },
  {
    to: '/questions',
    title: '질문하기',
    description: '학생 질문과 강사 답변 관리',
  },
]

export function DashboardPage() {
  return (
    <div>
      <header className="mb-8 space-y-3 sm:mb-9">
        <h1 className="text-[28px] font-black leading-[1.15] tracking-[-0.5px] text-[#0F172A] [text-shadow:0_1px_1px_rgba(255,255,255,0.6),0_2px_6px_rgba(15,23,42,0.08)] sm:text-[34px] lg:text-[42px]">
          HYPER STUDENT CARE
        </h1>
        <p className="max-w-2xl text-[16px] font-semibold leading-[1.6] text-[#475569] [text-shadow:0_1px_1px_rgba(255,255,255,0.5),0_1px_4px_rgba(15,23,42,0.06)] sm:text-[18px] lg:text-[19px]">
          학생별 학습 기록을 항목별로 확인하고 관리합니다.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard key={category.to} {...category} />
        ))}
      </section>
    </div>
  )
}
