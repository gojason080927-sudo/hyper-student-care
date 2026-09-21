import type { LucideIcon } from 'lucide-react'
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FileBarChart2,
  GraduationCap,
  MessageCircleQuestion,
  Newspaper,
  NotebookPen,
} from 'lucide-react'

export type ParentCategoryItem = {
  segment: string
  label: string
  icon: LucideIcon
  description?: string
}

export const weeklyLearningSummaryItem: ParentCategoryItem = {
  segment: 'weekly-learning-summary',
  label: '주간 학습\nSUMMARY',
  icon: NotebookPen,
  description: '이번 주 학습관리 한눈에 보기',
}

/** 학부모 사이드바 카테고리 (월간 학습진단 유지) */
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

export const parentWeeklyWrongVocabItem: ParentCategoryItem = {
  segment: 'weekly-wrong-vocab',
  label: '주간 수학 오답\n영어 단어 누적',
  icon: FileBarChart2,
  description: '주간 수학 오답 · 영어 단어 누적 현황',
}

export const parentScheduleItem: ParentCategoryItem = {
  segment: 'schedule',
  label: '시간표',
  icon: CalendarDays,
  description: '내 수업 시간표',
}

export const parentSuggestionsItem: ParentCategoryItem = {
  segment: 'suggestions',
  label: '건의사항',
  icon: MessageCircleQuestion,
  description: '학부모 건의 · 학원 답변',
}

/** HOME 3×2 타일. 사이드바 문구와 달리 짧은 Hub 타일용 라벨을 쓴다. */
export const parentHomeCategoryItems: ParentCategoryItem[] = [
  { ...weeklyLearningSummaryItem, label: '주간 SUMMARY' },
  parentWeeklyWrongVocabItem,
  parentScheduleItem,
  { ...parentCategoryItems[3], label: '입시전략' },
  { ...parentCategoryItems[2], label: '공지사항 보강계획' },
  parentSuggestionsItem,
]

/** 사이드바·더보기용 — 주간 SUMMARY 추가, 월간 학습진단 유지 */
export const parentSidebarItems: ParentCategoryItem[] = [
  weeklyLearningSummaryItem,
  ...parentCategoryItems,
]

export const parentTodayReportItem = {
  segment: 'today-report',
  label: 'Today Report',
  icon: ClipboardList,
  description: '오늘의 학습 한눈에 보기',
} as const

export const parentTodayReportHighlights = [
  { id: 'attendance', label: '출결' },
  { id: 'progress', label: '오늘의 진도' },
  { id: 'homework', label: '과제 수행' },
  { id: 'dailyTest', label: '일일 테스트' },
  { id: 'attitude', label: '수업태도' },
] as const

export function parentTodayReportSectionHash(id: (typeof parentTodayReportHighlights)[number]['id']): string {
  return `today-report-section-${id}`
}

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
