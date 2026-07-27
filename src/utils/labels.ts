import type {
  AssignmentStatus,
  AttendanceStatus,
  ContentPostCategory,
  HomeworkStatus,
  MakeupMethod,
  MakeupPlanStatus,
  QuestionStatus,
  TestSessionStatus,
} from '../types/records'
import { normalizeHomeworkStatus } from './homework'

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  '출석',
  '지각',
  '결석',
  '조퇴',
]

export const HOMEWORK_STATUSES: HomeworkStatus[] = ['완료', '부분 완료', '미완료']

export const MAKEUP_METHODS: MakeupMethod[] = ['학원 보강', '영상 대체']

export const MAKEUP_PLAN_STATUSES: MakeupPlanStatus[] = ['예정', '완료', '취소']

export const ASSIGNMENT_STATUSES: AssignmentStatus[] = ['완료', '보충필요']

export const QUESTION_CATEGORIES = [
  '수업질문',
  '숙제질문',
  '시험질문',
  '상담요청',
  '기타',
] as const

export const QUESTION_STATUSES: QuestionStatus[] = ['답변대기', '답변완료']

export const GRADES = [
  '초1',
  '초2',
  '초3',
  '초4',
  '초5',
  '초6',
  '중1',
  '중2',
  '중3',
  '고1',
  '고2',
  '고3',
] as const

export const SUBJECTS = ['영어', '수학', '영어·수학'] as const

export const STUDENT_STATUSES = ['재원', '휴원', '퇴원'] as const

export function getAttendanceColor(status: AttendanceStatus): string {
  switch (status) {
    case '출석':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case '지각':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case '결석':
      return 'bg-rose-100 text-rose-800 border-rose-200'
    case '조퇴':
      return 'bg-violet-100 text-violet-800 border-violet-200'
  }
}

export function getHomeworkColor(status: HomeworkStatus | string): string {
  switch (normalizeHomeworkStatus(status)) {
    case '완료':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case '부분 완료':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case '미완료':
      return 'bg-rose-100 text-rose-800 border-rose-200'
  }
}

export function getMakeupMethodColor(method: MakeupMethod): string {
  switch (method) {
    case '학원 보강':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case '영상 대체':
      return 'bg-violet-100 text-violet-800 border-violet-200'
  }
}

export function getDailyTestSessionColor(status: TestSessionStatus): string {
  switch (status) {
    case '합격':
      return 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
    case '불합격':
      return 'border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-200'
    case '미응시':
      return 'border-slate-200 bg-slate-50 text-slate-500'
  }
}

export function getMakeupSubjectColor(): string {
  return 'bg-sky-100 text-sky-900 border-sky-200'
}

type DifficultyLevel = 'highest' | 'high' | 'middle' | 'basic'

export function getDifficultyBadgeColor(level: DifficultyLevel, count: number): string {
  const faded = count === 0 ? ' opacity-60' : ''
  switch (level) {
    case 'highest':
      return `border-indigo-700 bg-indigo-50 text-indigo-900${faded}`
    case 'high':
      return `border-blue-500 bg-blue-50 text-blue-900${faded}`
    case 'middle':
      return `border-teal-500 bg-teal-50 text-teal-900${faded}`
    case 'basic':
      return `border-slate-400 bg-slate-50 text-slate-700${faded}`
  }
}

export function getMakeupPlanStatusColor(status: MakeupPlanStatus): string {
  switch (status) {
    case '예정':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case '완료':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case '취소':
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function getContentPostCategoryColor(category: ContentPostCategory): string {
  switch (category) {
    case '학습정보':
      return 'bg-cyan-100 text-cyan-900 border-cyan-200'
    case '공지사항':
      return 'bg-orange-100 text-orange-900 border-orange-200'
  }
}

export function getContentPostPublishColor(isPublished: boolean): string {
  return isPublished
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : 'bg-slate-100 text-slate-600 border-slate-200'
}

export function getAssignmentColor(status: AssignmentStatus): string {
  switch (status) {
    case '완료':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case '보충필요':
      return 'bg-amber-100 text-amber-800 border-amber-200'
  }
}

export function getQuestionStatusColor(status: QuestionStatus): string {
  switch (status) {
    case '답변완료':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case '답변대기':
      return 'bg-amber-100 text-amber-800 border-amber-200'
  }
}

export function getStudentStatusColor(status: string): string {
  switch (status) {
    case '재원':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case '휴원':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case '퇴원':
      return 'bg-slate-100 text-slate-600 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

export function getScoreColor(percentage: number): string {
  if (percentage >= 90) return 'text-emerald-700'
  if (percentage >= 70) return 'text-blue-700'
  if (percentage >= 50) return 'text-amber-700'
  return 'text-rose-700'
}

export const inputClass = (error?: string) =>
  `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${
    error
      ? 'border-rose-300 focus:border-rose-500'
      : 'border-slate-200 focus:border-blue-500'
  }`

export const btnPrimary =
  'rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700'

export const btnSecondary =
  'rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50'
