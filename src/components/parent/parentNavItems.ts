import type { LucideIcon } from 'lucide-react'
import {
  CalendarCheck,
  CalendarClock,
  ClipboardList,
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
  { segment: 'monthly-evaluation', label: '월말 평가', icon: CalendarCheck, description: '월별 평가 결과' },
  { segment: 'makeup-plans', label: '보강계획', icon: CalendarClock, description: '보강 일정 확인' },
  {
    segment: 'learning-notices',
    label: '학습정보 및 공지사항',
    icon: Newspaper,
    description: '학습정보·공지',
  },
  { segment: 'questions', label: '질문하기', icon: MessageCircleQuestion, description: '학습 질문·답변' },
]

export const parentTodayReportItem = {
  segment: 'today-report',
  label: 'Today Report',
  icon: ClipboardList,
  description: '오늘의 학습 한눈에 보기',
} as const
