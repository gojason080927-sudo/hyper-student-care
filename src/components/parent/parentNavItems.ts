import type { LucideIcon } from 'lucide-react'
import {
  CalendarCheck,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  MessageCircleQuestion,
  Newspaper,
} from 'lucide-react'

export type ParentCategoryItem = {
  segment: string
  label: string
  icon: LucideIcon
  description?: string
}

/** 학부모 홈·사이드바 공통 카테고리 (Today Report는 별도) */
export const parentCategoryItems: ParentCategoryItem[] = [
  {
    segment: 'monthly-learning-report',
    label: '월간 학습진단\nREPORT',
    icon: FileBarChart2,
    description: '확정된 월간 진단 보고서',
  },
  { segment: 'monthly-evaluation', label: '월말평가 결과', icon: CalendarCheck, description: '월말평가 점수' },
  {
    segment: 'notices-makeup',
    label: '공지사항 · 보강계획',
    icon: Newspaper,
    description: '학원 공지 · 보강 일정',
  },
  {
    segment: 'admission-strategy',
    label: '고입 · 대입\n입시전략',
    icon: GraduationCap,
    description: '진학 · 입시 정보',
  },
  { segment: 'questions', label: '질문하기', icon: MessageCircleQuestion, description: '학습 질문·답변' },
]

/** 사이드바·더보기용 (홈 카테고리와 동일 목록) */
export const parentSidebarItems: ParentCategoryItem[] = [...parentCategoryItems]

export const parentTodayReportItem = {
  segment: 'today-report',
  label: 'Today Report',
  icon: ClipboardList,
  description: '오늘의 학습 한눈에 보기',
} as const

/** 홈 카드·사이드바 활성 표시. 구 경로(공지/보강)도 통합 메뉴로 취급한다. */
export function isParentCategoryPathActive(segment: string, pathname: string): boolean {
  if (segment === 'notices-makeup') {
    return (
      pathname.includes('/notices-makeup') ||
      pathname.includes('/learning-notices') ||
      pathname.includes('/makeup-plans') ||
      pathname.includes('/career-result')
    )
  }
  return pathname === `/${segment}` || pathname.includes(`/${segment}`)
}
