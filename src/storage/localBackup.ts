import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ClassNoteRecord,
  ContentPost,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  ProgressRecord,
  QuestionRecord,
  StudentTextbookSlot,
  TodayAssignmentRecord,
} from '../types/records'
import type { Student } from '../types/student'
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from './keys'
import { hasStorageKey, loadFromStorage, saveToStorage } from './storage'

export type LocalBackupData = {
  students: Student[]
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  assignmentCompletion: AssignmentCompletionRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  questions: QuestionRecord[]
  progress: ProgressRecord[]
  studentTextbookSlots: StudentTextbookSlot[]
  makeupPlans: MakeupPlanRecord[]
  contentPosts: ContentPost[]
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
}

function loadArray<T>(newKey: string, legacyKey?: string): T[] {
  const fromNew = loadFromStorage<unknown[]>(newKey, [])
  if (Array.isArray(fromNew) && fromNew.length > 0) {
    return fromNew as T[]
  }
  if (legacyKey) {
    const fromLegacy = loadFromStorage<unknown[]>(legacyKey, [])
    if (Array.isArray(fromLegacy) && fromLegacy.length > 0) {
      return fromLegacy as T[]
    }
  }
  return []
}

/** localStorage에 백업 데이터가 하나라도 있는지 */
export function hasLocalBackup(): boolean {
  return Object.values(STORAGE_KEYS).some((key) => hasStorageKey(key))
}

/** Supabase 실패 시 fallback — localStorage에서만 읽음 (자동 이전 없음) */
export function loadLocalBackup(): LocalBackupData {
  return {
    students: loadArray<Student>(STORAGE_KEYS.students),
    attendance: loadArray<AttendanceRecord>(
      STORAGE_KEYS.attendance,
      LEGACY_STORAGE_KEYS.attendance,
    ),
    homework: loadArray<HomeworkRecord>(STORAGE_KEYS.homework, LEGACY_STORAGE_KEYS.homework),
    homeworkTextbookEntries: loadArray<HomeworkTextbookEntry>(
      STORAGE_KEYS.homeworkTextbookEntries,
    ),
    assignmentCompletion: loadArray<AssignmentCompletionRecord>(
      STORAGE_KEYS.assignmentCompletion,
      LEGACY_STORAGE_KEYS.assignmentCompletion,
    ),
    dailyTests: loadArray<DailyTestRecord>(
      STORAGE_KEYS.dailyTests,
      LEGACY_STORAGE_KEYS.dailyTests,
    ),
    monthlyEvaluations: loadArray<MonthlyEvaluationRecord>(STORAGE_KEYS.monthlyEvaluations),
    questions: loadArray<QuestionRecord>(STORAGE_KEYS.questions),
    progress: loadArray<ProgressRecord>(STORAGE_KEYS.progress),
    studentTextbookSlots: loadArray<StudentTextbookSlot>(STORAGE_KEYS.studentTextbookSlots),
    makeupPlans: loadArray<MakeupPlanRecord>(STORAGE_KEYS.makeupPlans),
    contentPosts: loadArray<ContentPost>(STORAGE_KEYS.contentPosts),
    todayAssignments: loadArray<TodayAssignmentRecord>(STORAGE_KEYS.todayAssignments),
    classNotes: loadArray<ClassNoteRecord>(STORAGE_KEYS.classNotes),
  }
}

/** Supabase 저장 성공 후 localStorage 백업 mirror (기존 데이터 삭제하지 않음) */
export function mirrorLocalBackup(data: LocalBackupData): void {
  saveToStorage(STORAGE_KEYS.students, data.students)
  saveToStorage(STORAGE_KEYS.attendance, data.attendance)
  saveToStorage(STORAGE_KEYS.homework, data.homework)
  saveToStorage(STORAGE_KEYS.homeworkTextbookEntries, data.homeworkTextbookEntries)
  saveToStorage(STORAGE_KEYS.assignmentCompletion, data.assignmentCompletion)
  saveToStorage(STORAGE_KEYS.dailyTests, data.dailyTests)
  saveToStorage(STORAGE_KEYS.monthlyEvaluations, data.monthlyEvaluations)
  saveToStorage(STORAGE_KEYS.questions, data.questions)
  saveToStorage(STORAGE_KEYS.progress, data.progress)
  saveToStorage(STORAGE_KEYS.studentTextbookSlots, data.studentTextbookSlots)
  saveToStorage(STORAGE_KEYS.makeupPlans, data.makeupPlans)
  saveToStorage(STORAGE_KEYS.contentPosts, data.contentPosts)
  saveToStorage(STORAGE_KEYS.todayAssignments, data.todayAssignments)
  saveToStorage(STORAGE_KEYS.classNotes, data.classNotes)
}

export function toLocalBackupData(
  data: LocalBackupData & { students: Student[] },
): LocalBackupData {
  return {
    students: data.students,
    attendance: data.attendance,
    homework: data.homework,
    homeworkTextbookEntries: data.homeworkTextbookEntries ?? [],
    assignmentCompletion: data.assignmentCompletion,
    dailyTests: data.dailyTests,
    monthlyEvaluations: data.monthlyEvaluations,
    questions: data.questions,
    progress: data.progress,
    studentTextbookSlots: data.studentTextbookSlots ?? [],
    makeupPlans: data.makeupPlans,
    contentPosts: data.contentPosts,
    todayAssignments: data.todayAssignments,
    classNotes: data.classNotes,
  }
}
