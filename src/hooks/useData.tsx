import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
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
  ClassNoteRecord,
  ClassTodayReportCommon,
} from '../types/records'
import type { Student, StudentFormData } from '../types/student'
import { loadAppData, loadParentCareData as fetchParentCareData, loadTodayReportFromSupabase, shouldDeferInitialLoadForParentRoute, type DataSource } from '../lib/dataLoader'
import { rpcSubmitParentQuestion } from '../lib/db/parentAccessRpc'
import { getParentAccessKeyFromPath } from '../lib/supabase'
import { mergeTodayReportIntoState } from '../lib/db/mergeTodayReport'
import { mergeClassTodayReportCommonRecords } from '../utils/mergeClassTodayReportCommon'
import { findProgressRecordIndex, findProgressRecordIndexForDate } from '../utils/progressRecord'
import { findHomeworkTextbookEntry, findTextbookSlot, slotKey, dedupeStudentTextbookSlots } from '../utils/textbookSlots'
import {
  deleteAssignmentCompletion,
  deleteAttendance,
  deleteDailyTest,
  deleteHomework,
  deleteMakeupPlan,
  deleteMonthlyEvaluation,
  deleteNotice,
  deleteProgress,
  deleteQuestion,
  deleteStudentById,
  upsertAssignmentCompletion,
  upsertAttendance,
  upsertClassNote,
  upsertDailyTest,
  upsertHomework,
  upsertHomeworkTextbookEntry,
  upsertClassTodayReportCommon,
  upsertMakeupPlan,
  upsertMonthlyEvaluation,
  upsertNotice,
  upsertProgress,
  upsertQuestion,
  RepositoryError,
  upsertStudentTextbookSlot,
  upsertStudent,
  upsertTodayAssignment,
} from '../lib/db/repository'
import { mirrorLocalBackup, toLocalBackupData } from '../storage/localBackup'
import { createId } from '../utils/id'
import { normalizeContentPostRecord } from '../utils/contentPost'
import { normalizeDailyTestRecord } from '../utils/dailyTest'
import { normalizeHomeworkStatus } from '../utils/homework'
import {
  normalizeDifficultyBreakdown,
  normalizeMonthlyEvaluationRecord,
} from '../utils/monthlyEvaluation'
import { createTimestamps, touchRecord } from '../utils/recordStorage'
import { copyTextToClipboard } from '../utils/copyToClipboard'
import {
  createStudentFromForm,
  ensureUniqueStudentAccessKey,
  findStudentByAccessKeyRaw,
  formDataToStudentUpdate,
  getStudentByAccessKey as findStudentByAccessKey,
  hasStudentAccessKey,
} from '../utils/studentStorage'
import { getStudentCareUrl, tryGetStudentCareUrl } from '../utils/studentCareUrl'
import {
  calcCompletionRate,
  calcPercentage,
  calcProgressRate,
  getAssignmentStatusFromRate,
} from '../utils/calc'
import {
  buildClassCommonRecord,
  buildSyncedHomeworkEntryForPeer,
  buildSyncedProgressRecordForPeer,
  classTrackIncludesSubject,
  findClassTodayReportCommon,
  normalizeProgressPages,
  type ClassTodayReportSyncContext,
} from '../utils/classTodayReportCommon'

type ToastMessage = { id: string; text: string }

export type DataContextValue = {
  students: Student[]
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  homeworkTextbookEntries: HomeworkTextbookEntry[]
  assignmentCompletion: AssignmentCompletionRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  questions: QuestionRecord[]
  progressRecords: ProgressRecord[]
  studentTextbookSlots: StudentTextbookSlot[]
  makeupPlans: MakeupPlanRecord[]
  contentPosts: ContentPost[]
  todayAssignments: TodayAssignmentRecord[]
  classNotes: ClassNoteRecord[]
  classTodayReportCommon: ClassTodayReportCommon[]
  addStudent: (data: StudentFormData) => void
  updateStudent: (id: string, data: StudentFormData) => void
  deleteStudent: (id: string) => void
  getStudentById: (id: string) => Student | undefined
  getStudentByAccessKey: (accessKey: string) => Student | undefined
  findStudentByAccessKeyAny: (accessKey: string) => Student | undefined
  copyStudentCareLink: (studentId: string) => Promise<boolean>
  generateStudentAccessKeyForStudent: (studentId: string) => Promise<string | null>
  openStudentCareInNewTab: (studentId: string) => boolean
  regenerateStudentAccessKey: (studentId: string) => Promise<string | null>
  setStudentAccessKeyActive: (studentId: string, active: boolean) => void
  saveAttendanceRecord: (
    data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  saveAttendanceRecordAsync: (
    data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    options?: { silent?: boolean },
  ) => Promise<{ success: boolean; recordId?: string }>
  deleteAttendanceRecord: (id: string) => void
  saveHomeworkRecord: (
    data: Omit<HomeworkRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  saveHomeworkTextbookEntry: (
    data: Omit<HomeworkTextbookEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  saveHomeworkTextbookEntryAsync: (
    data: Omit<HomeworkTextbookEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    options?: { silent?: boolean },
  ) => Promise<{ success: boolean; error?: string }>
  saveHomeworkSubjectWithClassSync: (
    anchorStudentId: string,
    classSync: ClassTodayReportSyncContext,
    date: string,
    subject: HomeworkTextbookEntry['subject'],
    slots: Array<{
      slotNumber: HomeworkTextbookEntry['slotNumber']
      previousAssignment: string
      todayAssignment: string
      status: HomeworkTextbookEntry['status']
      entryId?: string
    }>,
  ) => Promise<boolean>
  saveStudentTextbookSlot: (
    data: Omit<StudentTextbookSlot, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => Promise<boolean>
  deleteHomeworkRecord: (id: string) => void
  saveAssignmentRecord: (
    data: Omit<
      AssignmentCompletionRecord,
      'id' | 'createdAt' | 'updatedAt' | 'completionRate' | 'status'
    > & { id?: string },
  ) => boolean
  deleteAssignmentRecord: (id: string) => void
  saveDailyTestRecord: (
    data: Omit<DailyTestRecord, 'id' | 'createdAt' | 'updatedAt' | 'percentage'> & {
      id?: string
    },
  ) => boolean
  deleteDailyTestRecord: (id: string) => void
  saveMonthlyEvaluationRecord: (
    data: Omit<
      MonthlyEvaluationRecord,
      'id' | 'createdAt' | 'updatedAt' | 'percentage' | 'difficultyBreakdown'
    > & { id?: string; difficultyBreakdown?: MonthlyEvaluationRecord['difficultyBreakdown'] },
  ) => boolean
  deleteMonthlyEvaluationRecord: (id: string) => void
  saveQuestionRecord: (
    data: Omit<QuestionRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  deleteQuestionRecord: (id: string) => void
  saveProgressRecord: (
    data: Omit<ProgressRecord, 'id' | 'createdAt' | 'updatedAt' | 'progressRate'> & {
      id?: string
    },
  ) => boolean
  saveProgressRecordAsync: (
    data: Omit<ProgressRecord, 'id' | 'createdAt' | 'updatedAt' | 'progressRate'> & {
      id?: string
    },
    options?: { silent?: boolean },
  ) => Promise<{ success: boolean; error?: string }>
  saveProgressSubjectWithClassSync: (
    anchorStudentId: string,
    classSync: ClassTodayReportSyncContext,
    date: string,
    subject: ProgressRecord['subject'],
    teacherMemo: string,
    slots: Array<{
      slotNumber: ProgressRecord['slotNumber']
      currentProgress: string
      currentPage: number
      totalPage: number
      recordId?: string
    }>,
  ) => Promise<boolean>
  deleteProgressRecord: (id: string) => void
  saveMakeupPlanRecord: (
    data: Omit<MakeupPlanRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  deleteMakeupPlanRecord: (id: string) => void
  saveContentPost: (
    data: Omit<ContentPost, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  deleteContentPost: (id: string) => void
  saveTodayAssignmentRecord: (
    data: Omit<TodayAssignmentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  saveClassNoteRecord: (
    data: Omit<ClassNoteRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  isLoading: boolean
  isSaving: boolean
  dataSource: DataSource
  refreshTodayReport: (studentId: string, date: string) => Promise<void>
  reloadData: () => Promise<void>
  loadParentCareData: (accessKey: string) => Promise<void>
  showToast: (text: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [homework, setHomework] = useState<HomeworkRecord[]>([])
  const [homeworkTextbookEntries, setHomeworkTextbookEntries] = useState<
    HomeworkTextbookEntry[]
  >([])
  const [assignmentCompletion, setAssignmentCompletion] = useState<
    AssignmentCompletionRecord[]
  >([])
  const [dailyTests, setDailyTests] = useState<DailyTestRecord[]>([])
  const [monthlyEvaluations, setMonthlyEvaluations] = useState<
    MonthlyEvaluationRecord[]
  >([])
  const [questions, setQuestions] = useState<QuestionRecord[]>([])
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([])
  const [studentTextbookSlots, setStudentTextbookSlots] = useState<StudentTextbookSlot[]>([])
  const [makeupPlans, setMakeupPlans] = useState<MakeupPlanRecord[]>([])
  const [contentPosts, setContentPosts] = useState<ContentPost[]>([])
  const [todayAssignments, setTodayAssignments] = useState<TodayAssignmentRecord[]>([])
  const [classNotes, setClassNotes] = useState<ClassNoteRecord[]>([])
  const [classTodayReportCommon, setClassTodayReportCommon] = useState<
    ClassTodayReportCommon[]
  >([])
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [dataSource, setDataSource] = useState<DataSource>('none')
  const reloadRef = useRef<(() => Promise<void>) | null>(null)
  const loadIdRef = useRef(0)
  const savingRef = useRef(false)
  const stateRef = useRef({
    attendance,
    progress: progressRecords,
    assignmentCompletion,
    homework,
    homeworkTextbookEntries,
    studentTextbookSlots,
    todayAssignments,
    classNotes,
    dailyTests,
  })

  stateRef.current = {
    attendance,
    progress: progressRecords,
    assignmentCompletion,
    homework,
    homeworkTextbookEntries,
    studentTextbookSlots,
    todayAssignments,
    classNotes,
    dailyTests,
  }

  const mirrorCurrentBackup = useCallback(() => {
    mirrorLocalBackup(
      toLocalBackupData({
        students,
        attendance,
        homework,
        homeworkTextbookEntries,
        assignmentCompletion,
        dailyTests,
        monthlyEvaluations,
        questions,
        progress: progressRecords,
        studentTextbookSlots,
        makeupPlans,
        contentPosts,
        todayAssignments,
        classNotes,
      }),
    )
  }, [
    assignmentCompletion,
    attendance,
    classNotes,
    contentPosts,
    dailyTests,
    homework,
    homeworkTextbookEntries,
    makeupPlans,
    monthlyEvaluations,
    progressRecords,
    questions,
    students,
    todayAssignments,
  ])

  useEffect(() => {
    if (isLoading) return
    mirrorCurrentBackup()
  }, [
    isLoading,
    mirrorCurrentBackup,
    students,
    attendance,
        homework,
        homeworkTextbookEntries,
        assignmentCompletion,
    dailyTests,
    monthlyEvaluations,
    questions,
    progressRecords,
    makeupPlans,
    contentPosts,
    todayAssignments,
    classNotes,
  ])

  const showToast = useCallback((text: string) => {
    const id = createId()
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500)
  }, [])

  const handlePersistError = useCallback(
    (message: string) => {
      showToast(message)
      void reloadRef.current?.()
    },
    [showToast],
  )

  const applyLoadedData = useCallback((data: Awaited<ReturnType<typeof loadAppData>>['data']) => {
    setStudents(
      data.students.map((student) => ({
        ...student,
        accessKeyActive: student.accessKeyActive ?? true,
      })),
    )
    setAttendanceRecords(data.attendance)
    setHomework(data.homework)
    setHomeworkTextbookEntries(data.homeworkTextbookEntries ?? [])
    setAssignmentCompletion(data.assignmentCompletion)
    setDailyTests(data.dailyTests)
    setMonthlyEvaluations(data.monthlyEvaluations)
    setQuestions(data.questions)
    setProgressRecords(data.progress)
    setStudentTextbookSlots(dedupeStudentTextbookSlots(data.studentTextbookSlots ?? []))
    setMakeupPlans(data.makeupPlans)
    setContentPosts(data.contentPosts)
    setTodayAssignments(data.todayAssignments)
    setClassNotes(data.classNotes)
    setClassTodayReportCommon(data.classTodayReportCommon ?? [])
  }, [])

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const loadId = ++loadIdRef.current
    if (!options?.silent) setIsLoading(true)

    if (shouldDeferInitialLoadForParentRoute()) {
      console.log('[ParentAccess] deferring initial DataProvider load until care header is set')
      if (loadId === loadIdRef.current && !options?.silent) {
        setIsLoading(false)
      }
      return
    }

    try {
      const result = await loadAppData()
      if (loadId !== loadIdRef.current) return
      applyLoadedData(result.data)
      setDataSource(result.source)
      if (result.source === 'localStorage') {
        showToast('Supabase 연결 실패 — localStorage 백업 데이터를 표시합니다.')
      }
    } catch {
      if (loadId !== loadIdRef.current) return
      showToast('데이터를 불러오지 못했습니다.')
      setDataSource('none')
    } finally {
      if (loadId === loadIdRef.current && !options?.silent) {
        setIsLoading(false)
      }
    }
  }, [applyLoadedData, showToast])

  useEffect(() => {
    reloadRef.current = () => load({ silent: true })
    void load()
  }, [load])

  const reloadData = useCallback(async () => {
    await load({ silent: true })
  }, [load])

  const loadParentCareData = useCallback(
    async (accessKey: string) => {
      try {
        const result = await fetchParentCareData(accessKey)
        applyLoadedData(result.data)
        setDataSource(result.source)
      } catch (error) {
        console.error('[ParentAccess] loadParentCareData failed:', error)
        throw error
      }
    },
    [applyLoadedData],
  )

  const refreshTodayReport = useCallback(async (studentId: string, date: string) => {
    const report = await loadTodayReportFromSupabase(studentId, date)
    if (!report) return

    const merged = mergeTodayReportIntoState(stateRef.current, report, { studentId, date })
    setAttendanceRecords(merged.attendance)
    setProgressRecords(merged.progress)
    setAssignmentCompletion(merged.assignmentCompletion)
    setHomework(merged.homework)
    setHomeworkTextbookEntries(merged.homeworkTextbookEntries)
    setStudentTextbookSlots(merged.studentTextbookSlots)
    setTodayAssignments(merged.todayAssignments)
    setClassNotes(merged.classNotes)
    setDailyTests(merged.dailyTests)
    if (report.classTodayReportCommon?.length) {
      setClassTodayReportCommon((prev) =>
        mergeClassTodayReportCommonRecords(prev, report.classTodayReportCommon!),
      )
    }
  }, [])

  /** Supabase 저장 성공 후 최신 데이터 재조회 (다중 강사 동시 접속 대응) */
  type ReloadScope =
    | { type: 'full' }
    | { type: 'todayReport'; studentId: string; date: string }
    | { type: 'parentCare'; accessKey: string }

  const persistWithReload = useCallback(
    async (
      persist: () => Promise<void>,
      errorMessage: string,
      reload: ReloadScope = { type: 'full' },
    ) => {
      if (savingRef.current) return
      savingRef.current = true
      setIsSaving(true)
      try {
        await persist()
        if (reload.type === 'todayReport') {
          await refreshTodayReport(reload.studentId, reload.date)
        } else if (reload.type === 'parentCare') {
          await fetchParentCareData(reload.accessKey).then((result) => {
            applyLoadedData(result.data)
            setDataSource(result.source)
          })
        } else {
          await load({ silent: true })
        }
      } catch {
        handlePersistError(errorMessage)
      } finally {
        savingRef.current = false
        setIsSaving(false)
      }
    },
    [applyLoadedData, handlePersistError, load, refreshTodayReport],
  )

  const studentIds = useMemo(() => new Set(students.map((s) => s.id)), [students])

  const validateStudent = useCallback(
    (studentId: string) => studentIds.has(studentId),
    [studentIds],
  )

  const addStudent = useCallback(
    (data: StudentFormData) => {
      const base = createStudentFromForm(data)
      const student = {
        ...base,
        studentAccessKey: ensureUniqueStudentAccessKey(students, base.id),
      }
      setStudents((prev) => [...prev, student])
      void persistWithReload(() => upsertStudent(student), '학생 등록에 실패했습니다.')
      showToast('학생이 등록되었습니다.')
    },
    [handlePersistError, showToast, students],
  )

  const updateStudent = useCallback(
    (id: string, data: StudentFormData) => {
      let updated: Student | undefined
      setStudents((prev) =>
        prev.map((student) => {
          if (student.id !== id) return student
          updated = formDataToStudentUpdate(student, data)
          return updated
        }),
      )
      if (updated) {
        const saved = updated
        void persistWithReload(() => upsertStudent(saved), '학생 정보 수정에 실패했습니다.')
      }
      showToast('학생 정보가 수정되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const deleteStudent = useCallback(
    (id: string) => {
      setStudents((prev) => prev.filter((s) => s.id !== id))
      setAttendanceRecords((prev) => prev.filter((a) => a.studentId !== id))
      setHomework((prev) => prev.filter((h) => h.studentId !== id))
      setHomeworkTextbookEntries((prev) => prev.filter((h) => h.studentId !== id))
      setAssignmentCompletion((prev) => prev.filter((a) => a.studentId !== id))
      setDailyTests((prev) => prev.filter((d) => d.studentId !== id))
      setMonthlyEvaluations((prev) => prev.filter((m) => m.studentId !== id))
      setQuestions((prev) => prev.filter((q) => q.studentId !== id))
      setProgressRecords((prev) => prev.filter((p) => p.studentId !== id))
      setStudentTextbookSlots((prev) => prev.filter((p) => p.studentId !== id))
      setMakeupPlans((prev) => prev.filter((p) => p.studentId !== id))
      setTodayAssignments((prev) => prev.filter((p) => p.studentId !== id))
      setClassNotes((prev) => prev.filter((p) => p.studentId !== id))
      void persistWithReload(() => deleteStudentById(id), '학생 삭제에 실패했습니다.')
      showToast('학생이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const getStudentById = useCallback(
    (id: string) => students.find((s) => s.id === id),
    [students],
  )

  const getStudentByAccessKey = useCallback(
    (accessKey: string) => findStudentByAccessKey(students, accessKey),
    [students],
  )

  const findStudentByAccessKeyAny = useCallback(
    (accessKey: string) => findStudentByAccessKeyRaw(students, accessKey),
    [students],
  )

  const copyStudentCareLink = useCallback(
    async (studentId: string) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return false
      if (!hasStudentAccessKey(student.studentAccessKey)) {
        showToast('접근 키가 없습니다. 먼저 링크를 생성해 주세요.')
        return false
      }
      const url = getStudentCareUrl(student.studentAccessKey)
      const result = await copyTextToClipboard(url)
      if (result.ok) {
        showToast('학부모 전용 링크가 복사되었습니다.')
        return true
      }
      showToast(result.error)
      return false
    },
    [showToast, students],
  )

  const openStudentCareInNewTab = useCallback(
    (studentId: string) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return false
      const url = tryGetStudentCareUrl(student.studentAccessKey)
      if (!url) {
        showToast('접근 키가 없습니다. 먼저 링크를 생성해 주세요.')
        return false
      }
      window.open(url, '_blank', 'noopener,noreferrer')
      return true
    },
    [showToast, students],
  )

  const generateStudentAccessKeyForStudent = useCallback(
    async (studentId: string) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return null
      if (hasStudentAccessKey(student.studentAccessKey)) {
        showToast('이미 접근 키가 있습니다.')
        return student.studentAccessKey
      }

      const nextKey = ensureUniqueStudentAccessKey(students, studentId)
      let updated: Student | undefined

      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== studentId) return s
          updated = {
            ...s,
            studentAccessKey: nextKey,
            accessKeyActive: true,
            updatedAt: new Date().toISOString(),
          }
          return updated
        }),
      )

      if (!updated) return null

      const saved = updated
      try {
        await upsertStudent(saved)
        await load({ silent: true })
        showToast(`${student.name} 학생의 학부모 링크가 생성되었습니다.`)
        return nextKey
      } catch {
        handlePersistError('링크 생성에 실패했습니다.')
        return null
      }
    },
    [handlePersistError, load, showToast, students],
  )

  const regenerateStudentAccessKey = useCallback(
    async (studentId: string) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return null

      const nextKey = ensureUniqueStudentAccessKey(students, studentId)
      let updated: Student | undefined

      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== studentId) return s
          updated = {
            ...s,
            studentAccessKey: nextKey,
            accessKeyActive: true,
            updatedAt: new Date().toISOString(),
          }
          return updated
        }),
      )

      if (!updated) return null

      const saved = updated
      try {
        await upsertStudent(saved)
        await load({ silent: true })
        const url = getStudentCareUrl(nextKey)
        const copied = await copyTextToClipboard(url)
        showToast(
          copied.ok
            ? '링크가 재발급되었습니다. 새 링크가 클립보드에 복사되었습니다.'
            : '링크가 재발급되었습니다. 새 링크 복사에 실패했습니다. 학생 상세에서 다시 복사해 주세요.',
        )
        return nextKey
      } catch {
        handlePersistError('개인 링크 재발급에 실패했습니다.')
        return null
      }
    },
    [handlePersistError, load, showToast, students],
  )

  const setStudentAccessKeyActive = useCallback(
    (studentId: string, active: boolean) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return

      let updated: Student | undefined
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== studentId) return s
          updated = {
            ...s,
            accessKeyActive: active,
            updatedAt: new Date().toISOString(),
          }
          return updated
        }),
      )

      if (updated) {
        const saved = updated
        void persistWithReload(
          () => upsertStudent(saved),
          active ? '링크 활성화에 실패했습니다.' : '링크 비활성화에 실패했습니다.',
        )
      }

      showToast(
        active
          ? `${student.name} 학생의 개인 링크가 활성화되었습니다.`
          : `${student.name} 학생의 개인 링크가 비활성화되었습니다.`,
      )
    },
    [handlePersistError, showToast, students],
  )

  const saveAttendanceRecordAsync = useCallback(
    async (
      data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
      options?: { silent?: boolean },
    ): Promise<{ success: boolean; recordId?: string }> => {
      if (!validateStudent(data.studentId)) {
        if (!options?.silent) showToast('존재하지 않는 학생입니다.')
        return { success: false }
      }

      const ts = createTimestamps()
      const snapshot = data.id ? attendance.find((r) => r.id === data.id) : undefined
      let record: AttendanceRecord

      if (data.id) {
        const existing = attendance.find((r) => r.id === data.id)
        record = touchRecord({
          ...(existing ?? { id: data.id, ...ts }),
          ...data,
          id: data.id,
        })
        setAttendanceRecords((prev) =>
          prev.map((r) => (r.id === data.id ? record : r)),
        )
      } else {
        record = { ...data, id: createId(), ...ts }
        setAttendanceRecords((prev) => [...prev, record])
      }

      try {
        await upsertAttendance(record)
        await refreshTodayReport(record.studentId, record.date)
        if (!options?.silent) showToast('출결 기록이 저장되었습니다.')
        return { success: true, recordId: record.id }
      } catch {
        handlePersistError('출결 기록 저장에 실패했습니다.')
        if (data.id && snapshot) {
          setAttendanceRecords((prev) =>
            prev.map((r) => (r.id === data.id ? snapshot : r)),
          )
        } else {
          setAttendanceRecords((prev) => prev.filter((r) => r.id !== record.id))
        }
        await load({ silent: true })
        return { success: false }
      }
    },
    [attendance, handlePersistError, load, refreshTodayReport, showToast, validateStudent],
  )

  const saveAttendanceRecord = useCallback(
    (
      data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      void saveAttendanceRecordAsync(data)
      return true
    },
    [saveAttendanceRecordAsync, showToast, validateStudent],
  )

  const deleteAttendanceRecord = useCallback(
    (id: string) => {
      setAttendanceRecords((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(() => deleteAttendance(id), '출결 기록 삭제에 실패했습니다.')
      showToast('출결 기록이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveHomeworkRecord = useCallback(
    (
      data: Omit<HomeworkRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const normalizedData = {
        ...data,
        status: normalizeHomeworkStatus(data.status),
      }
      const ts = createTimestamps()
      let record: HomeworkRecord
      if (data.id) {
        const existing = homework.find((r) => r.id === data.id)
        record = touchRecord({
          ...(existing ?? { id: data.id, ...ts }),
          ...normalizedData,
          id: data.id,
        })
        setHomework((prev) => prev.map((r) => (r.id === data.id ? record : r)))
        showToast('숙제 기록이 수정되었습니다.')
      } else {
        record = { ...normalizedData, id: createId(), ...ts }
        setHomework((prev) => [...prev, record])
        showToast('숙제 기록이 저장되었습니다.')
      }
      void persistWithReload(
        () => upsertHomework(record),
        '숙제 기록 저장에 실패했습니다.',
        { type: 'todayReport', studentId: record.studentId, date: record.date },
      )
      return true
    },
    [handlePersistError, homework, showToast, validateStudent],
  )

  const saveHomeworkTextbookEntry = useCallback(
    (
      data: Omit<HomeworkTextbookEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      const existing = data.id
        ? homeworkTextbookEntries.find((record) => record.id === data.id)
        : findHomeworkTextbookEntry(
            homeworkTextbookEntries,
            data.studentId,
            data.date,
            data.subject,
            data.slotNumber,
          )
      const id = data.id ?? existing?.id ?? createId()
      const record: HomeworkTextbookEntry = {
        id,
        studentId: data.studentId,
        date: data.date,
        subject: data.subject,
        slotNumber: data.slotNumber,
        previousAssignment: data.previousAssignment.trim(),
        todayAssignment: data.todayAssignment.trim(),
        status: data.status ? normalizeHomeworkStatus(data.status) : '',
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      setHomeworkTextbookEntries((prev) => {
        const withoutDuplicate = prev.filter(
          (item) =>
            !(
              item.studentId === data.studentId &&
              item.date === data.date &&
              item.subject === data.subject &&
              item.slotNumber === data.slotNumber
            ) && item.id !== id,
        )
        return [...withoutDuplicate, record]
      })
      void persistWithReload(
        () => upsertHomeworkTextbookEntry(record),
        '교재별 숙제 저장에 실패했습니다.',
        { type: 'todayReport', studentId: record.studentId, date: record.date },
      )
      if (import.meta.env.DEV) {
        console.log('[HomeworkSave] persisted homework_textbook_entries', {
          id: record.id,
          studentId: record.studentId,
          date: record.date,
          subject: record.subject,
          slotNumber: record.slotNumber,
          status: record.status,
        })
      }
      return true
    },
    [handlePersistError, homeworkTextbookEntries, showToast, validateStudent],
  )

  const saveHomeworkTextbookEntryAsync = useCallback(
    async (
      data: Omit<HomeworkTextbookEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
      options?: { silent?: boolean },
    ): Promise<{ success: boolean; error?: string }> => {
      if (!validateStudent(data.studentId)) {
        const message = '존재하지 않는 학생입니다.'
        if (!options?.silent) showToast(message)
        return { success: false, error: message }
      }

      const ts = createTimestamps()
      const existing = data.id
        ? homeworkTextbookEntries.find((record) => record.id === data.id)
        : findHomeworkTextbookEntry(
            homeworkTextbookEntries,
            data.studentId,
            data.date,
            data.subject,
            data.slotNumber,
          )
      const id = data.id ?? existing?.id ?? createId()
      const record: HomeworkTextbookEntry = {
        id,
        studentId: data.studentId,
        date: data.date,
        subject: data.subject,
        slotNumber: data.slotNumber,
        previousAssignment: data.previousAssignment.trim(),
        todayAssignment: data.todayAssignment.trim(),
        status: data.status ? normalizeHomeworkStatus(data.status) : '',
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      const snapshot = homeworkTextbookEntries

      if (import.meta.env.DEV) {
        console.log('[HomeworkSave] saveHomeworkTextbookEntryAsync', {
          functionName: 'saveHomeworkTextbookEntryAsync',
          selectedStudentId: data.studentId,
          reportDate: data.date,
          subject: data.subject,
          slotNumber: data.slotNumber,
          inputValues: {
            previousAssignment: data.previousAssignment,
            todayAssignment: data.todayAssignment,
            status: data.status,
          },
          table: 'homework_textbook_entries',
          payload: record,
        })
      }

      setHomeworkTextbookEntries((prev) => {
        const withoutDuplicate = prev.filter(
          (item) =>
            !(
              item.studentId === data.studentId &&
              item.date === data.date &&
              item.subject === data.subject &&
              item.slotNumber === data.slotNumber
            ) && item.id !== id,
        )
        return [...withoutDuplicate, record]
      })

      try {
        await upsertHomeworkTextbookEntry(record)
        if (import.meta.env.DEV) {
          console.log('[HomeworkSave] Supabase success', {
            table: 'homework_textbook_entries',
            data: record,
            error: null,
          })
        }
        await refreshTodayReport(record.studentId, record.date)
        if (!options?.silent) showToast('과제가 저장되었습니다.')
        return { success: true }
      } catch (error) {
        console.error('[HomeworkSave] Supabase error:', error)
        setHomeworkTextbookEntries(snapshot)
        const detail =
          error instanceof RepositoryError
            ? error.message
            : error instanceof Error
              ? error.message
              : '알 수 없는 오류'
        if (!options?.silent) showToast(`과제 저장 실패: ${detail}`)
        return { success: false, error: detail }
      }
    },
    [homeworkTextbookEntries, refreshTodayReport, showToast, validateStudent],
  )

  const saveStudentTextbookSlot = useCallback(
    async (
      data: Omit<StudentTextbookSlot, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ): Promise<boolean> => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      const existing = data.id
        ? studentTextbookSlots.find((record) => record.id === data.id)
        : findTextbookSlot(
            studentTextbookSlots,
            data.studentId,
            data.subject,
            data.slotNumber,
          )
      const id = data.id ?? existing?.id ?? createId()
      const record: StudentTextbookSlot = {
        id,
        studentId: data.studentId,
        subject: data.subject,
        slotNumber: data.slotNumber,
        textbookName: data.textbookName.trim(),
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      const snapshot = studentTextbookSlots
      setStudentTextbookSlots((prev) => {
        const withoutDuplicate = prev.filter(
          (item) =>
            slotKey(item.studentId, item.subject, item.slotNumber) !==
              slotKey(record.studentId, record.subject, record.slotNumber) &&
            item.id !== id,
        )
        return [...withoutDuplicate, record]
      })

      try {
        await upsertStudentTextbookSlot(record)
        showToast('교재명이 저장되었습니다.')
        return true
      } catch (error) {
        console.error('[HyperStudentCare] 교재명 저장 실패:', error)
        setStudentTextbookSlots(snapshot)
        const detail =
          error instanceof RepositoryError
            ? error.message
            : error instanceof Error
              ? error.message
              : '알 수 없는 오류'
        showToast(`교재명 저장 실패: ${detail}`)
        return false
      }
    },
    [showToast, studentTextbookSlots, validateStudent],
  )

  const deleteHomeworkRecord = useCallback(
    (id: string) => {
      setHomework((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(() => deleteHomework(id), '숙제 기록 삭제에 실패했습니다.')
      showToast('숙제 기록이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveAssignmentRecord = useCallback(
    (
      data: Omit<
        AssignmentCompletionRecord,
        'id' | 'createdAt' | 'updatedAt' | 'completionRate' | 'status'
      > & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const completionRate = calcCompletionRate(data.completedCount, data.totalCount)
      const status = getAssignmentStatusFromRate(completionRate)
      const ts = createTimestamps()
      const full = { ...data, completionRate, status }
      let record: AssignmentCompletionRecord
      if (data.id) {
        const existing = assignmentCompletion.find((r) => r.id === data.id)
        record = touchRecord({
          ...(existing ?? { id: data.id, ...ts }),
          ...full,
          id: data.id,
        })
        setAssignmentCompletion((prev) =>
          prev.map((r) => (r.id === data.id ? record : r)),
        )
      } else {
        record = { ...full, id: createId(), ...ts }
        setAssignmentCompletion((prev) => [...prev, record])
      }
      void persistWithReload(
        () => upsertAssignmentCompletion(record),
        '과제완성 기록 저장에 실패했습니다.',
      )
      showToast('과제완성 기록이 저장되었습니다.')
      return true
    },
    [assignmentCompletion, handlePersistError, showToast, validateStudent],
  )

  const deleteAssignmentRecord = useCallback(
    (id: string) => {
      setAssignmentCompletion((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(
        () => deleteAssignmentCompletion(id),
        '과제완성 기록 삭제에 실패했습니다.',
      )
      showToast('과제완성 기록이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveDailyTestRecord = useCallback(
    (
      data: Omit<DailyTestRecord, 'id' | 'createdAt' | 'updatedAt' | 'percentage'> & {
        id?: string
      },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      const existing = data.id
        ? dailyTests.find((r) => r.id === data.id)
        : dailyTests.find(
            (r) =>
              r.studentId === data.studentId &&
              r.date === data.date &&
              r.subject === data.subject,
          )
      const recordId = data.id ?? existing?.id ?? createId()
      const draft: DailyTestRecord = {
        id: recordId,
        studentId: data.studentId,
        date: data.date,
        testName: data.testName,
        subject: data.subject,
        memo: data.memo,
        score: data.score,
        totalScore: data.totalScore,
        percentage: calcPercentage(data.score, data.totalScore),
        incorrectCount: data.incorrectCount,
        sessionResults: data.sessionResults ?? [],
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      const record = touchRecord(normalizeDailyTestRecord(draft))
      if (existing || data.id) {
        setDailyTests((prev) => {
          const withoutDuplicate = prev.filter(
            (item) =>
              !(
                item.studentId === record.studentId &&
                item.date === record.date &&
                item.subject === record.subject
              ) && item.id !== record.id,
          )
          return [...withoutDuplicate, record]
        })
      } else {
        setDailyTests((prev) => [...prev, record])
      }
      void persistWithReload(
        () => upsertDailyTest(record),
        '일일테스트 기록 저장에 실패했습니다.',
        { type: 'todayReport', studentId: record.studentId, date: record.date },
      )
      showToast('일일테스트 기록이 저장되었습니다.')
      return true
    },
    [dailyTests, handlePersistError, showToast, validateStudent],
  )

  const deleteDailyTestRecord = useCallback(
    (id: string) => {
      setDailyTests((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(() => deleteDailyTest(id), '일일테스트 기록 삭제에 실패했습니다.')
      showToast('일일테스트 기록이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveMonthlyEvaluationRecord = useCallback(
    (
      data: Omit<
        MonthlyEvaluationRecord,
        'id' | 'createdAt' | 'updatedAt' | 'percentage' | 'difficultyBreakdown'
      > & { id?: string; difficultyBreakdown?: MonthlyEvaluationRecord['difficultyBreakdown'] },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      const existing = data.id
        ? monthlyEvaluations.find((r) => r.id === data.id)
        : undefined
      const draft: MonthlyEvaluationRecord = {
        id: data.id ?? createId(),
        studentId: data.studentId,
        evaluationDate: data.evaluationDate,
        year: data.year,
        month: data.month,
        subject: data.subject,
        score: data.score,
        totalScore: data.totalScore,
        percentage: calcPercentage(data.score, data.totalScore),
        difficultyBreakdown: normalizeDifficultyBreakdown(
          data.difficultyBreakdown ?? existing?.difficultyBreakdown,
        ),
        teacherComment: data.teacherComment,
        strengths: data.strengths,
        improvements: data.improvements,
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      const record = touchRecord(normalizeMonthlyEvaluationRecord(draft))
      if (data.id) {
        setMonthlyEvaluations((prev) =>
          prev.map((r) => (r.id === data.id ? record : r)),
        )
      } else {
        setMonthlyEvaluations((prev) => [...prev, record])
      }
      void persistWithReload(
        () => upsertMonthlyEvaluation(record),
        '월말평가 저장에 실패했습니다.',
      )
      showToast('월말평가가 저장되었습니다.')
      return true
    },
    [handlePersistError, monthlyEvaluations, showToast, validateStudent],
  )

  const deleteMonthlyEvaluationRecord = useCallback(
    (id: string) => {
      setMonthlyEvaluations((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(
        () => deleteMonthlyEvaluation(id),
        '월말평가 삭제에 실패했습니다.',
      )
      showToast('월말평가가 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveQuestionRecord = useCallback(
    (
      data: Omit<QuestionRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }

      const parentAccessKey = getParentAccessKeyFromPath()
      if (parentAccessKey && !data.id) {
        void persistWithReload(
          () =>
            rpcSubmitParentQuestion(parentAccessKey, {
              date: data.date,
              category: data.category,
              title: data.title.trim(),
              content: data.content.trim(),
              questionImages: data.questionImages ?? [],
            }).then((record) => {
              if (!record) {
                throw new Error('질문 저장에 실패했습니다.')
              }
            }),
          '질문 저장에 실패했습니다.',
          { type: 'parentCare', accessKey: parentAccessKey },
        )
        showToast('질문이 저장되었습니다.')
        return true
      }

      const ts = createTimestamps()
      const status = data.answer.trim() ? '답변완료' : data.status
      const full = {
        ...data,
        status,
        questionImages: data.questionImages ?? [],
        answerImages: data.answerImages ?? [],
      }
      let record: QuestionRecord
      if (data.id) {
        const existing = questions.find((r) => r.id === data.id)
        record = touchRecord({
          ...(existing ?? { id: data.id, ...ts }),
          ...full,
          id: data.id,
        })
        setQuestions((prev) => prev.map((r) => (r.id === data.id ? record : r)))
      } else {
        record = { ...full, id: createId(), ...ts }
        setQuestions((prev) => [...prev, record])
      }
      void persistWithReload(() => upsertQuestion(record), '질문 저장에 실패했습니다.')
      showToast('질문이 저장되었습니다.')
      return true
    },
    [persistWithReload, questions, showToast, validateStudent],
  )

  const deleteQuestionRecord = useCallback(
    (id: string) => {
      setQuestions((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(() => deleteQuestion(id), '질문 삭제에 실패했습니다.')
      showToast('질문이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveProgressRecord = useCallback(
    (
      data: Omit<ProgressRecord, 'id' | 'createdAt' | 'updatedAt' | 'progressRate'> & {
        id?: string
      },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const progressRate = calcProgressRate(data.currentPage, data.totalPage)
      const ts = createTimestamps()
      const full = { ...data, slotNumber: data.slotNumber ?? 1, progressRate }
      let record: ProgressRecord
      if (data.id) {
        const existing = progressRecords.find((r) => r.id === data.id)
        record = touchRecord({
          ...(existing ?? { id: data.id, ...ts }),
          ...full,
          id: data.id,
        })
        setProgressRecords((prev) => prev.map((r) => (r.id === data.id ? record : r)))
      } else {
        const lookupRecord = {
          id: data.id ?? '',
          studentId: data.studentId,
          subject: data.subject,
          slotNumber: data.slotNumber ?? 1,
          lastStudyDate: data.lastStudyDate,
        }
        const existingIndex = data.lastStudyDate
          ? findProgressRecordIndexForDate(progressRecords, lookupRecord)
          : findProgressRecordIndex(progressRecords, lookupRecord)
        const existing =
          existingIndex >= 0 ? progressRecords[existingIndex] : undefined
        if (existing) {
          record = touchRecord({
            ...existing,
            ...full,
            id: existing.id,
          })
          setProgressRecords((prev) =>
            prev.map((r) => (r.id === existing.id ? record : r)),
          )
        } else {
          record = { ...full, id: createId(), ...ts }
          setProgressRecords((prev) => [...prev, record])
        }
      }
      void persistWithReload(
        () => upsertProgress(record),
        '진도 기록 저장에 실패했습니다.',
        record.lastStudyDate
          ? { type: 'todayReport', studentId: record.studentId, date: record.lastStudyDate }
          : { type: 'full' },
      )
      showToast('진도 기록이 저장되었습니다.')
      return true
    },
    [handlePersistError, progressRecords, showToast, validateStudent],
  )

  const saveProgressRecordAsync = useCallback(
    async (
      data: Omit<ProgressRecord, 'id' | 'createdAt' | 'updatedAt' | 'progressRate'> & {
        id?: string
      },
      options?: { silent?: boolean },
    ): Promise<{ success: boolean; error?: string }> => {
      if (!validateStudent(data.studentId)) {
        const message = '존재하지 않는 학생입니다.'
        if (!options?.silent) showToast(message)
        return { success: false, error: message }
      }

      const progressRate = calcProgressRate(data.currentPage, data.totalPage)
      const ts = createTimestamps()
      const full = { ...data, slotNumber: data.slotNumber ?? 1, progressRate }
      const snapshot = progressRecords
      let record: ProgressRecord

      if (data.id) {
        const existing = progressRecords.find((r) => r.id === data.id)
        record = touchRecord({
          ...(existing ?? { id: data.id, ...ts }),
          ...full,
          id: data.id,
        })
        setProgressRecords((prev) => prev.map((r) => (r.id === data.id ? record : r)))
      } else {
        const lookupRecord = {
          id: data.id ?? '',
          studentId: data.studentId,
          subject: data.subject,
          slotNumber: data.slotNumber ?? 1,
          lastStudyDate: data.lastStudyDate,
        }
        const existingIndex = data.lastStudyDate
          ? findProgressRecordIndexForDate(progressRecords, lookupRecord)
          : findProgressRecordIndex(progressRecords, lookupRecord)
        const existing =
          existingIndex >= 0 ? progressRecords[existingIndex] : undefined
        if (existing) {
          record = touchRecord({
            ...existing,
            ...full,
            id: existing.id,
          })
          setProgressRecords((prev) =>
            prev.map((r) => (r.id === existing.id ? record : r)),
          )
        } else {
          record = { ...full, id: createId(), ...ts }
          setProgressRecords((prev) => [...prev, record])
        }
      }

      if (import.meta.env.DEV) {
        console.log('[ProgressSave] saveProgressRecordAsync', {
          functionName: 'saveProgressRecordAsync',
          selectedStudentId: data.studentId,
          reportDate: data.lastStudyDate,
          subject: data.subject,
          slotNumber: data.slotNumber ?? 1,
          inputValues: {
            currentProgress: data.currentProgress,
            currentPage: data.currentPage,
            totalPage: data.totalPage,
            teacherMemo: data.teacherMemo,
          },
          table: 'progress',
          payload: record,
        })
      }

      try {
        await upsertProgress(record)
        if (import.meta.env.DEV) {
          console.log('[ProgressSave] Supabase success', {
            table: 'progress',
            data: record,
            error: null,
          })
        }
        if (record.lastStudyDate) {
          await refreshTodayReport(record.studentId, record.lastStudyDate)
        } else {
          await load({ silent: true })
        }
        if (!options?.silent) showToast('진도 기록이 저장되었습니다.')
        return { success: true }
      } catch (error) {
        console.error('[ProgressSave] Supabase error:', error)
        setProgressRecords(snapshot)
        const detail =
          error instanceof RepositoryError
            ? error.message
            : error instanceof Error
              ? error.message
              : '알 수 없는 오류'
        if (!options?.silent) showToast(`진도 저장 실패: ${detail}`)
        return { success: false, error: detail }
      }
    },
    [load, progressRecords, refreshTodayReport, showToast, validateStudent],
  )

  const deleteProgressRecord = useCallback(
    (id: string) => {
      setProgressRecords((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(() => deleteProgress(id), '진도 기록 삭제에 실패했습니다.')
      showToast('진도 기록이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveHomeworkSubjectWithClassSync = useCallback(
    async (
      anchorStudentId: string,
      classSync: ClassTodayReportSyncContext,
      date: string,
      subject: HomeworkTextbookEntry['subject'],
      slots: Array<{
        slotNumber: HomeworkTextbookEntry['slotNumber']
        previousAssignment: string
        todayAssignment: string
        status: HomeworkTextbookEntry['status']
        entryId?: string
      }>,
    ): Promise<boolean> => {
      if (import.meta.env.DEV) {
        console.log('[ClassSync][HomeworkSave] saveHomeworkSubjectWithClassSync', {
          functionName: 'saveHomeworkSubjectWithClassSync',
          anchorStudentId,
          reportDate: date,
          subject,
          classGrade: classSync.grade,
          className: classSync.className,
          peerStudentIds: classSync.peerStudentIds,
          slots,
        })
      }

      if (!classSync.grade.trim() || !classSync.className.trim()) {
        showToast('반 정보를 찾지 못했습니다. 현재 학생 과제는 저장되었습니다.')
        return false
      }
      if (!classTrackIncludesSubject(classSync.className, subject)) {
        return true
      }

      const slotsToSync = slots.filter(
        (slot) =>
          slot.previousAssignment.trim() || slot.todayAssignment.trim(),
      )
      if (slotsToSync.length === 0) {
        return true
      }

      const peerIdsToSync = classSync.peerStudentIds.filter((id) => id !== anchorStudentId)

      if (savingRef.current) {
        showToast('다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.')
        return false
      }
      savingRef.current = true
      setIsSaving(true)

      const ts = createTimestamps()
      const commonRecords: ClassTodayReportCommon[] = []
      const homeworkRecords: HomeworkTextbookEntry[] = []

      try {
        for (const slot of slotsToSync) {
          const existingCommon = findClassTodayReportCommon(
            classTodayReportCommon,
            classSync.grade,
            classSync.className,
            date,
            subject,
            slot.slotNumber,
          )
          commonRecords.push(
            buildClassCommonRecord({
              grade: classSync.grade,
              className: classSync.className,
              reportDate: date,
              subject,
              slotNumber: slot.slotNumber,
              previousAssignment: slot.previousAssignment,
              todayAssignment: slot.todayAssignment,
              existing: existingCommon,
              timestamps: ts,
              createId,
            }),
          )

          for (const peerId of peerIdsToSync) {
            homeworkRecords.push(
              buildSyncedHomeworkEntryForPeer({
                peerStudentId: peerId,
                anchorStudentId,
                date,
                subject,
                slotNumber: slot.slotNumber,
                previousAssignment: slot.previousAssignment,
                todayAssignment: slot.todayAssignment,
                anchorStatus: slot.status,
                existingEntries: homeworkTextbookEntries,
                timestamps: ts,
                createId,
              }),
            )
          }
        }

        for (const entry of homeworkRecords) {
          if (import.meta.env.DEV) {
            console.log('[ClassSync][HomeworkSave] upsert peer homework', {
              table: 'homework_textbook_entries',
              payload: entry,
            })
          }
          await upsertHomeworkTextbookEntry(entry)
        }

        if (homeworkRecords.length > 0) {
          setHomeworkTextbookEntries((prev) => {
            let next = [...prev]
            for (const entry of homeworkRecords) {
              next = next.filter(
                (item) =>
                  !(
                    item.studentId === entry.studentId &&
                    item.date === entry.date &&
                    item.subject === entry.subject &&
                    item.slotNumber === entry.slotNumber
                  ) && item.id !== entry.id,
              )
              next.push(entry)
            }
            return next
          })
        }

        let commonSyncFailed = false
        let commonSyncError = ''
        for (const common of commonRecords) {
          try {
            if (import.meta.env.DEV) {
              console.log('[ClassSync][HomeworkSave] upsert common', {
                table: 'class_today_report_common',
                payload: common,
              })
            }
            await upsertClassTodayReportCommon(common)
            setClassTodayReportCommon((prev) => {
              const next = prev.filter(
                (item) =>
                  !(
                    item.grade === common.grade &&
                    item.className === common.className &&
                    item.reportDate === common.reportDate &&
                    item.subject === common.subject &&
                    item.slotNumber === common.slotNumber
                  ),
              )
              return [...next, common]
            })
          } catch (error) {
            commonSyncFailed = true
            commonSyncError =
              error instanceof RepositoryError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : '반 공통 저장 실패'
            console.error('[ClassSync][HomeworkSave] common upsert failed:', error)
          }
        }

        if (commonSyncFailed && peerIdsToSync.length > 0) {
          showToast(
            `같은 반 ${peerIdsToSync.length}명 연동은 완료했으나 반 공통 저장 실패: ${commonSyncError}`,
          )
        } else if (commonSyncFailed) {
          showToast(`과제는 저장되었으나 반 공통 연동 실패: ${commonSyncError}`)
        } else if (peerIdsToSync.length > 0) {
          showToast(
            `같은 반 ${peerIdsToSync.length}명에게 과제 내용이 연동되었습니다.`,
          )
        }

        await load({ silent: true })
        return !commonSyncFailed || peerIdsToSync.length > 0
      } catch (error) {
        console.error('[ClassSync] homework peer sync failed:', error)
        const detail =
          error instanceof RepositoryError
            ? error.message
            : error instanceof Error
              ? error.message
              : '반별 과제 연동에 실패했습니다.'
        showToast(`같은 반 연동 실패: ${detail}. 현재 학생 과제는 저장되었습니다.`)
        await load({ silent: true })
        return false
      } finally {
        savingRef.current = false
        setIsSaving(false)
      }
    },
    [classTodayReportCommon, homeworkTextbookEntries, load, showToast],
  )

  const saveProgressSubjectWithClassSync = useCallback(
    async (
      anchorStudentId: string,
      classSync: ClassTodayReportSyncContext,
      date: string,
      subject: ProgressRecord['subject'],
      teacherMemo: string,
      slots: Array<{
        slotNumber: ProgressRecord['slotNumber']
        currentProgress: string
        currentPage: number
        totalPage: number
        recordId?: string
      }>,
    ): Promise<boolean> => {
      if (import.meta.env.DEV) {
        console.log('[ClassSync][ProgressSave] saveProgressSubjectWithClassSync', {
          functionName: 'saveProgressSubjectWithClassSync',
          anchorStudentId,
          reportDate: date,
          subject,
          classGrade: classSync.grade,
          className: classSync.className,
          peerStudentIds: classSync.peerStudentIds,
          slots,
          teacherMemo,
        })
      }

      if (!classSync.grade.trim() || !classSync.className.trim()) {
        showToast('반 정보를 찾지 못했습니다. 현재 학생 진도는 저장되었습니다.')
        return false
      }
      if (
        !classTrackIncludesSubject(
          classSync.className,
          subject as HomeworkTextbookEntry['subject'],
        )
      ) {
        return true
      }

      const memo = teacherMemo.trim()
      const slotsToSync = slots.filter(
        (slot) =>
          slot.currentProgress.trim() ||
          slot.currentPage > 0 ||
          slot.totalPage > 0 ||
          memo,
      )
      if (slotsToSync.length === 0) {
        return true
      }

      const peerIdsToSync = classSync.peerStudentIds.filter((id) => id !== anchorStudentId)

      if (savingRef.current) {
        showToast('다른 저장 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.')
        return false
      }
      savingRef.current = true
      setIsSaving(true)

      const ts = createTimestamps()
      const commonRecords: ClassTodayReportCommon[] = []
      const progressToSave: ProgressRecord[] = []

      try {
        for (const slot of slotsToSync) {
          const pages = normalizeProgressPages(slot.currentPage, slot.totalPage)
          const existingCommon = findClassTodayReportCommon(
            classTodayReportCommon,
            classSync.grade,
            classSync.className,
            date,
            subject as HomeworkTextbookEntry['subject'],
            slot.slotNumber as HomeworkTextbookEntry['slotNumber'],
          )
          commonRecords.push(
            buildClassCommonRecord({
              grade: classSync.grade,
              className: classSync.className,
              reportDate: date,
              subject: subject as HomeworkTextbookEntry['subject'],
              slotNumber: slot.slotNumber as HomeworkTextbookEntry['slotNumber'],
              currentProgress: slot.currentProgress,
              currentPage: pages.currentPage,
              totalPage: pages.totalPage,
              existing: existingCommon,
              timestamps: ts,
              createId,
            }),
          )

          for (const peerId of peerIdsToSync) {
            const built = buildSyncedProgressRecordForPeer({
              peerStudentId: peerId,
              anchorStudentId,
              subject: subject as HomeworkTextbookEntry['subject'],
              slotNumber: slot.slotNumber as HomeworkTextbookEntry['slotNumber'],
              date,
              syncedContent: {
                currentProgress: slot.currentProgress,
                currentPage: pages.currentPage,
                totalPage: pages.totalPage,
              },
              anchorTeacherMemo: memo,
              existingRecords: progressRecords,
              timestamps: ts,
              createId,
            })
            if (built) {
              progressToSave.push(built)
            }
          }
        }

        for (const record of progressToSave) {
          if (import.meta.env.DEV) {
            console.log('[ClassSync][ProgressSave] upsert peer progress', {
              table: 'progress',
              payload: record,
            })
          }
          await upsertProgress(record)
        }

        if (progressToSave.length > 0) {
          setProgressRecords((prev) => {
            let next = [...prev]
            for (const record of progressToSave) {
              const existingIndex = findProgressRecordIndexForDate(next, record)
              if (existingIndex >= 0) {
                next = next.map((item, index) => (index === existingIndex ? record : item))
              } else {
                next = [...next, record]
              }
            }
            return next
          })
        }

        let commonSyncFailed = false
        let commonSyncError = ''
        for (const common of commonRecords) {
          try {
            if (import.meta.env.DEV) {
              console.log('[ClassSync][ProgressSave] upsert common', {
                table: 'class_today_report_common',
                payload: common,
              })
            }
            await upsertClassTodayReportCommon(common)
            setClassTodayReportCommon((prev) => {
              const next = prev.filter(
                (item) =>
                  !(
                    item.grade === common.grade &&
                    item.className === common.className &&
                    item.reportDate === common.reportDate &&
                    item.subject === common.subject &&
                    item.slotNumber === common.slotNumber
                  ),
              )
              return [...next, common]
            })
          } catch (error) {
            commonSyncFailed = true
            commonSyncError =
              error instanceof RepositoryError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : '반 공통 저장 실패'
            console.error('[ClassSync][ProgressSave] common upsert failed:', error)
          }
        }

        if (commonSyncFailed && peerIdsToSync.length > 0) {
          showToast(
            `같은 반 ${peerIdsToSync.length}명 연동은 완료했으나 반 공통 저장 실패: ${commonSyncError}`,
          )
        } else if (commonSyncFailed) {
          showToast(`진도는 저장되었으나 반 공통 연동 실패: ${commonSyncError}`)
        } else if (peerIdsToSync.length > 0) {
          showToast(
            `같은 반 ${peerIdsToSync.length}명에게 진도 내용이 연동되었습니다.`,
          )
        }

        await load({ silent: true })
        return !commonSyncFailed || peerIdsToSync.length > 0
      } catch (error) {
        console.error('[ClassSync] progress peer sync failed:', error)
        const detail =
          error instanceof RepositoryError
            ? error.message
            : error instanceof Error
              ? error.message
              : '반별 진도 연동에 실패했습니다.'
        showToast(`같은 반 연동 실패: ${detail}. 현재 학생 진도는 저장되었습니다.`)
        await load({ silent: true })
        return false
      } finally {
        savingRef.current = false
        setIsSaving(false)
      }
    },
    [classTodayReportCommon, load, progressRecords, showToast],
  )

  const saveMakeupPlanRecord = useCallback(
    (
      data: Omit<MakeupPlanRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      let record: MakeupPlanRecord
      if (data.id) {
        const existing = makeupPlans.find((r) => r.id === data.id)
        record = touchRecord({
          ...(existing ?? { id: data.id, ...ts }),
          ...data,
          id: data.id,
        })
        setMakeupPlans((prev) => prev.map((r) => (r.id === data.id ? record : r)))
        showToast('보강계획이 수정되었습니다.')
      } else {
        record = { ...data, id: createId(), ...ts }
        setMakeupPlans((prev) => [...prev, record])
        showToast('보강계획이 저장되었습니다.')
      }
      void persistWithReload(() => upsertMakeupPlan(record), '보강계획 저장에 실패했습니다.')
      return true
    },
    [handlePersistError, makeupPlans, showToast, validateStudent],
  )

  const deleteMakeupPlanRecord = useCallback(
    (id: string) => {
      setMakeupPlans((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(() => deleteMakeupPlan(id), '보강계획 삭제에 실패했습니다.')
      showToast('보강계획이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveContentPost = useCallback(
    (
      data: Omit<ContentPost, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      const ts = createTimestamps()
      const existing = data.id ? contentPosts.find((r) => r.id === data.id) : undefined
      const draft: ContentPost = {
        id: data.id ?? createId(),
        category: data.category,
        title: data.title,
        content: data.content,
        summary: data.summary,
        sourceName: data.sourceName,
        originalArticleTitle: data.originalArticleTitle,
        authorName: data.authorName,
        isPinned: data.isPinned,
        isPublished: data.isPublished,
        publishedAt: data.publishedAt,
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      const record = touchRecord(normalizeContentPostRecord(draft))
      if (data.id) {
        setContentPosts((prev) => prev.map((r) => (r.id === data.id ? record : r)))
        showToast('게시글이 수정되었습니다.')
      } else {
        setContentPosts((prev) => [...prev, record])
        showToast('게시글이 저장되었습니다.')
      }
      void persistWithReload(() => upsertNotice(record), '게시글 저장에 실패했습니다.')
      return true
    },
    [contentPosts, handlePersistError, showToast],
  )

  const deleteContentPost = useCallback(
    (id: string) => {
      setContentPosts((prev) => prev.filter((r) => r.id !== id))
      void persistWithReload(() => deleteNotice(id), '게시글 삭제에 실패했습니다.')
      showToast('게시글이 삭제되었습니다.')
    },
    [handlePersistError, showToast],
  )

  const saveTodayAssignmentRecord = useCallback(
    (
      data: Omit<TodayAssignmentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      const existing = data.id
        ? todayAssignments.find((record) => record.id === data.id)
        : todayAssignments.find(
            (record) => record.studentId === data.studentId && record.date === data.date,
          )
      const id = data.id ?? existing?.id ?? createId()
      const record: TodayAssignmentRecord = {
        id,
        studentId: data.studentId,
        date: data.date,
        assignment1: data.assignment1.trim(),
        assignment2: data.assignment2.trim(),
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      setTodayAssignments((prev) => {
        const withoutDuplicate = prev.filter(
          (item) =>
            !(item.studentId === data.studentId && item.date === data.date) &&
            item.id !== id,
        )
        return [...withoutDuplicate, record]
      })
      void persistWithReload(
        () => upsertTodayAssignment(record),
        '오늘의 과제 저장에 실패했습니다.',
        { type: 'todayReport', studentId: record.studentId, date: record.date },
      )
      showToast('오늘의 과제가 저장되었습니다.')
      return true
    },
    [handlePersistError, showToast, todayAssignments, validateStudent],
  )

  const saveClassNoteRecord = useCallback(
    (
      data: Omit<ClassNoteRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      const existing = data.id
        ? classNotes.find((record) => record.id === data.id)
        : classNotes.find(
            (record) => record.studentId === data.studentId && record.date === data.date,
          )
      const id = data.id ?? existing?.id ?? createId()
      const record: ClassNoteRecord = {
        id,
        studentId: data.studentId,
        date: data.date,
        hasClassNote: data.hasClassNote,
        note: data.note.slice(0, 500),
        createdAt: existing?.createdAt ?? ts.createdAt,
        updatedAt: ts.updatedAt,
      }
      setClassNotes((prev) => {
        const withoutDuplicate = prev.filter(
          (item) =>
            !(item.studentId === data.studentId && item.date === data.date) &&
            item.id !== id,
        )
        return [...withoutDuplicate, record]
      })
      void persistWithReload(
        () => upsertClassNote(record),
        '수업 중 특이사항 저장에 실패했습니다.',
        { type: 'todayReport', studentId: record.studentId, date: record.date },
      )
      showToast('수업 중 특이사항이 저장되었습니다.')
      return true
    },
    [classNotes, handlePersistError, showToast, validateStudent],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      students,
      attendance,
      homework,
      homeworkTextbookEntries,
      assignmentCompletion,
      dailyTests,
      monthlyEvaluations,
      questions,
      progressRecords,
      studentTextbookSlots,
      makeupPlans,
      contentPosts,
      todayAssignments,
      classNotes,
      classTodayReportCommon,
      addStudent,
      updateStudent,
      deleteStudent,
      getStudentById,
      getStudentByAccessKey,
      findStudentByAccessKeyAny,
      copyStudentCareLink,
      generateStudentAccessKeyForStudent,
      openStudentCareInNewTab,
      regenerateStudentAccessKey,
      setStudentAccessKeyActive,
      saveAttendanceRecord,
      saveAttendanceRecordAsync,
      deleteAttendanceRecord,
      saveHomeworkRecord,
      saveHomeworkTextbookEntry,
      saveHomeworkTextbookEntryAsync,
      saveHomeworkSubjectWithClassSync,
      saveStudentTextbookSlot,
      deleteHomeworkRecord,
      saveAssignmentRecord,
      deleteAssignmentRecord,
      saveDailyTestRecord,
      deleteDailyTestRecord,
      saveMonthlyEvaluationRecord,
      deleteMonthlyEvaluationRecord,
      saveQuestionRecord,
      deleteQuestionRecord,
      saveProgressRecord,
      saveProgressRecordAsync,
      saveProgressSubjectWithClassSync,
      deleteProgressRecord,
      saveMakeupPlanRecord,
      deleteMakeupPlanRecord,
      saveContentPost,
      deleteContentPost,
      saveTodayAssignmentRecord,
      saveClassNoteRecord,
      isLoading,
      isSaving,
      dataSource,
      refreshTodayReport,
      reloadData,
      loadParentCareData,
      showToast,
    }),
    [
      addStudent,
      assignmentCompletion,
      attendance,
      classNotes,
      classTodayReportCommon,
      contentPosts,
      copyStudentCareLink,
      dailyTests,
      dataSource,
      deleteAssignmentRecord,
      deleteAttendanceRecord,
      deleteContentPost,
      deleteDailyTestRecord,
      deleteHomeworkRecord,
      deleteMakeupPlanRecord,
      deleteMonthlyEvaluationRecord,
      deleteProgressRecord,
      deleteQuestionRecord,
      deleteStudent,
      findStudentByAccessKeyAny,
      generateStudentAccessKeyForStudent,
      getStudentByAccessKey,
      getStudentById,
      homework,
      homeworkTextbookEntries,
      isLoading,
      isSaving,
      makeupPlans,
      monthlyEvaluations,
      openStudentCareInNewTab,
      progressRecords,
      studentTextbookSlots,
      questions,
      regenerateStudentAccessKey,
      reloadData,
      loadParentCareData,
      refreshTodayReport,
      setStudentAccessKeyActive,
      saveAssignmentRecord,
      saveAttendanceRecord,
      saveAttendanceRecordAsync,
      saveClassNoteRecord,
      saveContentPost,
      saveDailyTestRecord,
      saveHomeworkRecord,
      saveHomeworkTextbookEntry,
      saveHomeworkTextbookEntryAsync,
      saveHomeworkSubjectWithClassSync,
      saveStudentTextbookSlot,
      saveMakeupPlanRecord,
      saveMonthlyEvaluationRecord,
      saveProgressRecord,
      saveProgressRecordAsync,
      saveProgressSubjectWithClassSync,
      saveQuestionRecord,
      saveTodayAssignmentRecord,
      showToast,
      students,
      todayAssignments,
      updateStudent,
    ],
  )

  return (
    <DataContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-xl bg-navy-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
            role="status"
          >
            {toast.text}
          </div>
        ))}
      </div>
    </DataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
