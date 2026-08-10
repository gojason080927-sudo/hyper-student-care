import type { LucideIcon } from 'lucide-react'
import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FileBarChart2,
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
  { segment: 'makeup-plans', label: '보강계획', icon: CalendarClock, description: '보강 일정 확인' },
  {
    segment: 'learning-notices',
    label: '학습정보 및 공지사항',
    icon: Newspaper,
    description: '학습정보·공지',
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
