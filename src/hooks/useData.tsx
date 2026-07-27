import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  ContentPost,
  DailyTestRecord,
  HomeworkRecord,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  ProgressRecord,
  QuestionRecord,
} from '../types/records'
import type { Student, StudentFormData } from '../types/student'
import { createId } from '../utils/id'
import { normalizeContentPostRecord } from '../utils/contentPost'
import { normalizeDailyTestRecord } from '../utils/dailyTest'
import { normalizeHomeworkStatus } from '../utils/homework'
import { normalizeMonthlyEvaluationRecord, normalizeDifficultyBreakdown } from '../utils/monthlyEvaluation'
import {
  createTimestamps,
  loadAllRecords,
  saveAssignments,
  saveAttendance,
  saveDailyTests,
  saveHomework,
  saveMakeupPlans,
  saveContentPosts,
  saveMonthlyEvaluations,
  saveProgress,
  saveQuestions,
  touchRecord,
} from '../utils/recordStorage'
import {
  createStudentFromForm,
  formDataToStudentUpdate,
  getStudentByAccessKey as findStudentByAccessKey,
  loadStudents,
  saveStudents,
} from '../utils/studentStorage'
import { buildStudentCareUrl, generateStudentAccessKey } from '../utils/studentAccessKey'
import {
  calcCompletionRate,
  calcPercentage,
  calcProgressRate,
  getAssignmentStatusFromRate,
} from '../utils/calc'

type ToastMessage = { id: string; text: string }

export type DataContextValue = {
  students: Student[]
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  assignmentCompletion: AssignmentCompletionRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  questions: QuestionRecord[]
  progressRecords: ProgressRecord[]
  makeupPlans: MakeupPlanRecord[]
  contentPosts: ContentPost[]
  addStudent: (data: StudentFormData) => void
  updateStudent: (id: string, data: StudentFormData) => void
  deleteStudent: (id: string) => void
  getStudentById: (id: string) => Student | undefined
  getStudentByAccessKey: (accessKey: string) => Student | undefined
  copyStudentCareLink: (studentId: string) => boolean
  regenerateStudentAccessKey: (studentId: string) => string | null
  saveAttendanceRecord: (
    data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  deleteAttendanceRecord: (id: string) => void
  saveHomeworkRecord: (
    data: Omit<HomeworkRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
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
  deleteProgressRecord: (id: string) => void
  saveMakeupPlanRecord: (
    data: Omit<MakeupPlanRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  deleteMakeupPlanRecord: (id: string) => void
  saveContentPost: (
    data: Omit<ContentPost, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ) => boolean
  deleteContentPost: (id: string) => void
  showToast: (text: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

const initialData = (() => {
  const loadedStudents = loadStudents()
  const records = loadAllRecords(loadedStudents)
  return { students: loadedStudents, ...records }
})()

export function DataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(initialData.students)
  const [attendance, setAttendanceRecords] = useState<AttendanceRecord[]>(
    initialData.attendance,
  )
  const [homework, setHomework] = useState<HomeworkRecord[]>(initialData.homework)
  const [assignmentCompletion, setAssignmentCompletion] = useState<
    AssignmentCompletionRecord[]
  >(initialData.assignmentCompletion)
  const [dailyTests, setDailyTests] = useState<DailyTestRecord[]>(
    initialData.dailyTests,
  )
  const [monthlyEvaluations, setMonthlyEvaluations] = useState<
    MonthlyEvaluationRecord[]
  >(initialData.monthlyEvaluations)
  const [questions, setQuestions] = useState<QuestionRecord[]>(initialData.questions)
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>(
    initialData.progress,
  )
  const [makeupPlans, setMakeupPlans] = useState<MakeupPlanRecord[]>(
    initialData.makeupPlans,
  )
  const [contentPosts, setContentPosts] = useState<ContentPost[]>(
    initialData.contentPosts,
  )
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const studentIds = useMemo(() => new Set(students.map((s) => s.id)), [students])

  const showToast = useCallback((text: string) => {
    const id = createId()
    setToasts((prev) => [...prev, { id, text }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500)
  }, [])

  const validateStudent = useCallback(
    (studentId: string) => studentIds.has(studentId),
    [studentIds],
  )

  const persistStudents = useCallback((next: Student[]) => {
    setStudents(next)
    saveStudents(next)
  }, [])

  const addStudent = useCallback(
    (data: StudentFormData) => {
      persistStudents([...students, createStudentFromForm(data)])
      showToast('학생이 등록되었습니다.')
    },
    [persistStudents, showToast, students],
  )

  const updateStudent = useCallback(
    (id: string, data: StudentFormData) => {
      persistStudents(
        students.map((s) => (s.id === id ? formDataToStudentUpdate(s, data) : s)),
      )
      showToast('학생 정보가 수정되었습니다.')
    },
    [persistStudents, showToast, students],
  )

  const deleteStudent = useCallback(
    (id: string) => {
      persistStudents(students.filter((s) => s.id !== id))
      const nextAttendance = attendance.filter((a) => a.studentId !== id)
      const nextHomework = homework.filter((h) => h.studentId !== id)
      const nextAssignments = assignmentCompletion.filter((a) => a.studentId !== id)
      const nextTests = dailyTests.filter((d) => d.studentId !== id)
      const nextMonthly = monthlyEvaluations.filter((m) => m.studentId !== id)
      const nextQuestions = questions.filter((q) => q.studentId !== id)
      const nextProgress = progressRecords.filter((p) => p.studentId !== id)
      const nextMakeupPlans = makeupPlans.filter((p) => p.studentId !== id)
      setAttendanceRecords(nextAttendance)
      saveAttendance(nextAttendance)
      setHomework(nextHomework)
      saveHomework(nextHomework)
      setAssignmentCompletion(nextAssignments)
      saveAssignments(nextAssignments)
      setDailyTests(nextTests)
      saveDailyTests(nextTests)
      setMonthlyEvaluations(nextMonthly)
      saveMonthlyEvaluations(nextMonthly)
      setQuestions(nextQuestions)
      saveQuestions(nextQuestions)
      setProgressRecords(nextProgress)
      saveProgress(nextProgress)
      setMakeupPlans(nextMakeupPlans)
      saveMakeupPlans(nextMakeupPlans)
      showToast('학생이 삭제되었습니다.')
    },
    [
      assignmentCompletion,
      attendance,
      dailyTests,
      homework,
      monthlyEvaluations,
      persistStudents,
      progressRecords,
      makeupPlans,
      questions,
      showToast,
      students,
    ],
  )

  const getStudentById = useCallback(
    (id: string) => students.find((s) => s.id === id),
    [students],
  )

  const getStudentByAccessKey = useCallback(
    (accessKey: string) => findStudentByAccessKey(students, accessKey),
    [students],
  )

  const copyStudentCareLink = useCallback(
    (studentId: string) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return false
      const url = buildStudentCareUrl(student.studentAccessKey)
      void navigator.clipboard.writeText(url).then(() => {
        showToast(`${student.name} 학생의 HYPER CARE 링크가 복사되었습니다.`)
      })
      return true
    },
    [showToast, students],
  )

  const regenerateStudentAccessKey = useCallback(
    (studentId: string) => {
      const student = students.find((s) => s.id === studentId)
      if (!student) return null

      const used = new Set(students.filter((s) => s.id !== studentId).map((s) => s.studentAccessKey))
      let nextKey = generateStudentAccessKey()
      while (used.has(nextKey)) {
        nextKey = generateStudentAccessKey()
      }

      const next = students.map((s) =>
        s.id === studentId
          ? { ...s, studentAccessKey: nextKey, updatedAt: new Date().toISOString() }
          : s,
      )
      setStudents(next)
      saveStudents(next)
      showToast(`${student.name} 학생의 개인 링크가 재발급되었습니다.`)
      return nextKey
    },
    [showToast, students],
  )

  const saveAttendanceRecord = useCallback(
    (
      data: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      if (data.id) {
        const next = attendance.map((r) =>
          r.id === data.id
            ? touchRecord({ ...r, ...data, id: data.id })
            : r,
        )
        setAttendanceRecords(next)
        saveAttendance(next)
      } else {
        const next = [
          ...attendance,
          { ...data, id: createId(), ...ts },
        ]
        setAttendanceRecords(next)
        saveAttendance(next)
      }
      showToast('출결 기록이 저장되었습니다.')
      return true
    },
    [attendance, showToast, validateStudent],
  )

  const deleteAttendanceRecord = useCallback(
    (id: string) => {
      const next = attendance.filter((r) => r.id !== id)
      setAttendanceRecords(next)
      saveAttendance(next)
      showToast('출결 기록이 삭제되었습니다.')
    },
    [attendance, showToast],
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
      if (data.id) {
        const next = homework.map((r) =>
          r.id === data.id ? touchRecord({ ...r, ...normalizedData, id: data.id }) : r,
        )
        setHomework(next)
        saveHomework(next)
        showToast('숙제 기록이 수정되었습니다.')
      } else {
        const next = [...homework, { ...normalizedData, id: createId(), ...ts }]
        setHomework(next)
        saveHomework(next)
        showToast('숙제 기록이 저장되었습니다.')
      }
      return true
    },
    [homework, showToast, validateStudent],
  )

  const deleteHomeworkRecord = useCallback(
    (id: string) => {
      const next = homework.filter((r) => r.id !== id)
      setHomework(next)
      saveHomework(next)
      showToast('숙제 기록이 삭제되었습니다.')
    },
    [homework, showToast],
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
      const completionRate = calcCompletionRate(
        data.completedCount,
        data.totalCount,
      )
      const status = getAssignmentStatusFromRate(completionRate)
      const ts = createTimestamps()
      const full = { ...data, completionRate, status }
      if (data.id) {
        const next = assignmentCompletion.map((r) =>
          r.id === data.id ? touchRecord({ ...r, ...full, id: data.id }) : r,
        )
        setAssignmentCompletion(next)
        saveAssignments(next)
      } else {
        const next = [...assignmentCompletion, { ...full, id: createId(), ...ts }]
        setAssignmentCompletion(next)
        saveAssignments(next)
      }
      showToast('과제완성 기록이 저장되었습니다.')
      return true
    },
    [assignmentCompletion, showToast, validateStudent],
  )

  const deleteAssignmentRecord = useCallback(
    (id: string) => {
      const next = assignmentCompletion.filter((r) => r.id !== id)
      setAssignmentCompletion(next)
      saveAssignments(next)
      showToast('과제완성 기록이 삭제되었습니다.')
    },
    [assignmentCompletion, showToast],
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
      const existing = data.id ? dailyTests.find((r) => r.id === data.id) : undefined
      const draft: DailyTestRecord = {
        id: data.id ?? createId(),
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
      const normalized = normalizeDailyTestRecord(draft)
      if (data.id) {
        const next = dailyTests.map((r) =>
          r.id === data.id ? touchRecord({ ...normalized, id: data.id }) : r,
        )
        setDailyTests(next)
        saveDailyTests(next)
      } else {
        const next = [...dailyTests, { ...normalized, id: draft.id, ...ts }]
        setDailyTests(next)
        saveDailyTests(next)
      }
      showToast('일일테스트 기록이 저장되었습니다.')
      return true
    },
    [dailyTests, showToast, validateStudent],
  )

  const deleteDailyTestRecord = useCallback(
    (id: string) => {
      const next = dailyTests.filter((r) => r.id !== id)
      setDailyTests(next)
      saveDailyTests(next)
      showToast('일일테스트 기록이 삭제되었습니다.')
    },
    [dailyTests, showToast],
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
      const existing = data.id ? monthlyEvaluations.find((r) => r.id === data.id) : undefined
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
      const normalized = normalizeMonthlyEvaluationRecord(draft)
      if (data.id) {
        const next = monthlyEvaluations.map((r) =>
          r.id === data.id ? touchRecord({ ...normalized, id: data.id }) : r,
        )
        setMonthlyEvaluations(next)
        saveMonthlyEvaluations(next)
      } else {
        const next = [...monthlyEvaluations, { ...normalized, id: draft.id, ...ts }]
        setMonthlyEvaluations(next)
        saveMonthlyEvaluations(next)
      }
      showToast('월말평가가 저장되었습니다.')
      return true
    },
    [monthlyEvaluations, showToast, validateStudent],
  )

  const deleteMonthlyEvaluationRecord = useCallback(
    (id: string) => {
      const next = monthlyEvaluations.filter((r) => r.id !== id)
      setMonthlyEvaluations(next)
      saveMonthlyEvaluations(next)
      showToast('월말평가가 삭제되었습니다.')
    },
    [monthlyEvaluations, showToast],
  )

  const saveQuestionRecord = useCallback(
    (
      data: Omit<QuestionRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    ) => {
      if (!validateStudent(data.studentId)) {
        showToast('존재하지 않는 학생입니다.')
        return false
      }
      const ts = createTimestamps()
      const status = data.answer.trim() ? '답변완료' : data.status
      const full = {
        ...data,
        status,
        questionImages: data.questionImages ?? [],
        answerImages: data.answerImages ?? [],
      }
      if (data.id) {
        const next = questions.map((r) =>
          r.id === data.id ? touchRecord({ ...r, ...full, id: data.id }) : r,
        )
        setQuestions(next)
        saveQuestions(next)
      } else {
        const next = [...questions, { ...full, id: createId(), ...ts }]
        setQuestions(next)
        saveQuestions(next)
      }
      showToast('질문이 저장되었습니다.')
      return true
    },
    [questions, showToast, validateStudent],
  )

  const deleteQuestionRecord = useCallback(
    (id: string) => {
      const next = questions.filter((r) => r.id !== id)
      setQuestions(next)
      saveQuestions(next)
      showToast('질문이 삭제되었습니다.')
    },
    [questions, showToast],
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
      const full = { ...data, progressRate }
      if (data.id) {
        const next = progressRecords.map((r) =>
          r.id === data.id ? touchRecord({ ...r, ...full, id: data.id }) : r,
        )
        setProgressRecords(next)
        saveProgress(next)
      } else {
        const next = [...progressRecords, { ...full, id: createId(), ...ts }]
        setProgressRecords(next)
        saveProgress(next)
      }
      showToast('진도 기록이 저장되었습니다.')
      return true
    },
    [progressRecords, showToast, validateStudent],
  )

  const deleteProgressRecord = useCallback(
    (id: string) => {
      const next = progressRecords.filter((r) => r.id !== id)
      setProgressRecords(next)
      saveProgress(next)
      showToast('진도 기록이 삭제되었습니다.')
    },
    [progressRecords, showToast],
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
      if (data.id) {
        const next = makeupPlans.map((r) =>
          r.id === data.id ? touchRecord({ ...r, ...data, id: data.id }) : r,
        )
        setMakeupPlans(next)
        saveMakeupPlans(next)
        showToast('보강계획이 수정되었습니다.')
      } else {
        const next = [...makeupPlans, { ...data, id: createId(), ...ts }]
        setMakeupPlans(next)
        saveMakeupPlans(next)
        showToast('보강계획이 저장되었습니다.')
      }
      return true
    },
    [makeupPlans, showToast, validateStudent],
  )

  const deleteMakeupPlanRecord = useCallback(
    (id: string) => {
      const next = makeupPlans.filter((r) => r.id !== id)
      setMakeupPlans(next)
      saveMakeupPlans(next)
      showToast('보강계획이 삭제되었습니다.')
    },
    [makeupPlans, showToast],
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
      const normalized = normalizeContentPostRecord(draft)
      if (data.id) {
        const next = contentPosts.map((r) =>
          r.id === data.id ? touchRecord({ ...normalized, id: data.id }) : r,
        )
        setContentPosts(next)
        saveContentPosts(next)
        showToast('게시글이 수정되었습니다.')
      } else {
        const next = [...contentPosts, { ...normalized, id: draft.id, ...ts }]
        setContentPosts(next)
        saveContentPosts(next)
        showToast('게시글이 저장되었습니다.')
      }
      return true
    },
    [contentPosts, showToast],
  )

  const deleteContentPost = useCallback(
    (id: string) => {
      const next = contentPosts.filter((r) => r.id !== id)
      setContentPosts(next)
      saveContentPosts(next)
      showToast('게시글이 삭제되었습니다.')
    },
    [contentPosts, showToast],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      students,
      attendance,
      homework,
      assignmentCompletion,
      dailyTests,
      monthlyEvaluations,
      questions,
      progressRecords,
      makeupPlans,
      contentPosts,
      addStudent,
      updateStudent,
      deleteStudent,
      getStudentById,
      getStudentByAccessKey,
      copyStudentCareLink,
      regenerateStudentAccessKey,
      saveAttendanceRecord,
      deleteAttendanceRecord,
      saveHomeworkRecord,
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
      deleteProgressRecord,
      saveMakeupPlanRecord,
      deleteMakeupPlanRecord,
      saveContentPost,
      deleteContentPost,
      showToast,
    }),
    [
      addStudent,
      assignmentCompletion,
      attendance,
      contentPosts,
      dailyTests,
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
      getStudentByAccessKey,
      getStudentById,
      copyStudentCareLink,
      regenerateStudentAccessKey,
      homework,
      makeupPlans,
      monthlyEvaluations,
      progressRecords,
      questions,
      saveAssignmentRecord,
      saveAttendanceRecord,
      saveContentPost,
      saveDailyTestRecord,
      saveHomeworkRecord,
      saveMakeupPlanRecord,
      saveMonthlyEvaluationRecord,
      saveProgressRecord,
      saveQuestionRecord,
      showToast,
      students,
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
