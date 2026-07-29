import type { LucideIcon } from 'lucide-react'
import {
  Book,
  BookOpen,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  FileCheck,
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
  { segment: 'attendance', label: '출결', icon: ClipboardCheck, description: '출석·지각·결석·조퇴' },
  { segment: 'progress', label: '진도 과정', icon: Book, description: '교재·단원·학습 진행' },
  { segment: 'homework', label: '숙제', icon: BookOpen, description: '숙제 수행 상태' },
  { segment: 'daily-tests', label: '일일 테스트', icon: FileCheck, description: '차시별 통과 결과' },
  { segment: 'monthly-evaluation', label: '월말 평가', icon: CalendarCheck, description: '월별 평가·총평' },
  { segment: 'makeup-plans', label: '보강계획', icon: CalendarClock, description: '보강 일정·방식' },
  {
    segment: 'learning-notices',
    label: '학습정보 및 공지사항',
    icon: Newspaper,
    description: '학습정보·학원 공지',
  },
  { segment: 'questions', label: '질문하기', icon: MessageCircleQuestion, description: '질문·답변' },
]

export const parentTodayReportItem = {
  segment: 'today-report',
  label: 'Today Report',
  icon: ClipboardCheck,
  description: '오늘의 학습 리포트',
} as const
