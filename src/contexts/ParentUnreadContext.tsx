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
import { useParentStudent } from './ParentStudentContext'
import { useData } from '../hooks/useData'
import {
  rpcGetParentCategoryReads,
  rpcMarkParentCategoryRead,
} from '../lib/db/parentAccessRpc'
import {
  applyParentCategoryRead,
  computeParentUnreadState,
  hasAnyParentUnread,
  mergeParentCategoryReads,
  parentCategoryContentUpdatedAt,
  parentCategoryReadFloor,
  readStoredParentCategoryReads,
  shouldAcceptParentCategoryReadsFetch,
  writeStoredParentCategoryRead,
  type ParentCategoryReads,
  type ParentUnreadCategory,
  type ParentUnreadState,
} from '../utils/parentUnread'

type ParentUnreadContextValue = {
  unread: ParentUnreadState
  hasAnyUnread: boolean
  isCategoryUnread: (category: ParentUnreadCategory) => boolean
  markCategoryRead: (
    category: ParentUnreadCategory,
    seenThrough?: string | null,
  ) => Promise<void>
  refreshCategoryReads: () => Promise<void>
}

const ParentUnreadContext = createContext<ParentUnreadContextValue | null>(null)

type ParentUnreadProviderProps = {
  children: ReactNode
}

export function ParentUnreadProvider({ children }: ParentUnreadProviderProps) {
  const student = useParentStudent()
  const {
    attendance,
    homework,
    homeworkTextbookEntries,
    dailyTests,
    classNotes,
    todayAssignments,
    classTodayReportCommon,
    progressRecords,
    monthlyEvaluations,
    makeupPlans,
    contentPosts,
    classScheduleGrids,
    questions,
  } = useData()

  const [categoryReads, setCategoryReads] = useState<ParentCategoryReads>({})
  const loadIdRef = useRef(0)

  const refreshCategoryReads = useCallback(async () => {
    const loadId = ++loadIdRef.current
    try {
      const reads = await rpcGetParentCategoryReads(student.studentAccessKey)
      if (!shouldAcceptParentCategoryReadsFetch(loadId, loadIdRef.current)) return
      const stored = readStoredParentCategoryReads(student.studentAccessKey)
      setCategoryReads((prev) =>
        mergeParentCategoryReads(prev, mergeParentCategoryReads(stored, reads as ParentCategoryReads)),
      )
    } catch (error) {
      console.error('[ParentUnread] failed to load category reads', error)
    }
  }, [student.studentAccessKey])

  useEffect(() => {
    void refreshCategoryReads()
  }, [refreshCategoryReads])

  const unread = useMemo(
    () =>
      computeParentUnreadState({
        student,
        categoryReads,
        attendance,
        homework,
        homeworkTextbookEntries,
        dailyTests,
        classNotes,
        todayAssignments,
        classTodayReportCommon,
        progressRecords,
        monthlyEvaluations,
        makeupPlans,
        contentPosts,
        classScheduleGrids,
        questions,
      }),
    [
      attendance,
      categoryReads,
      classNotes,
      classScheduleGrids,
      classTodayReportCommon,
      contentPosts,
      dailyTests,
      homework,
      homeworkTextbookEntries,
      makeupPlans,
      monthlyEvaluations,
      progressRecords,
      questions,
      student,
      todayAssignments,
    ],
  )

  const markCategoryRead = useCallback(
    async (category: ParentUnreadCategory, seenThrough?: string | null) => {
      const nowIso = new Date().toISOString()
      const contentAt = seenThrough
        ? null
        : parentCategoryContentUpdatedAt(
            {
              student,
              categoryReads,
              attendance,
              homework,
              homeworkTextbookEntries,
              dailyTests,
              classNotes,
              todayAssignments,
              classTodayReportCommon,
              progressRecords,
              monthlyEvaluations,
              makeupPlans,
              contentPosts,
              classScheduleGrids,
              questions,
            },
            category,
          )
      const floor = seenThrough ?? parentCategoryReadFloor(nowIso, contentAt)
      loadIdRef.current += 1
      writeStoredParentCategoryRead(student.studentAccessKey, category, floor)
      setCategoryReads((prev) => applyParentCategoryRead(prev, category, null, floor))
      try {
        const lastReadAt = await rpcMarkParentCategoryRead(student.studentAccessKey, category)
        const stamp = seenThrough ?? parentCategoryReadFloor(lastReadAt ?? floor, contentAt)
        writeStoredParentCategoryRead(student.studentAccessKey, category, stamp)
        setCategoryReads((prev) => applyParentCategoryRead(prev, category, stamp, floor))
      } catch (error) {
        console.error('[ParentUnread] failed to mark category read', category, error)
      }
    },
    [
      attendance,
      categoryReads,
      classNotes,
      classScheduleGrids,
      classTodayReportCommon,
      contentPosts,
      dailyTests,
      homework,
      homeworkTextbookEntries,
      makeupPlans,
      monthlyEvaluations,
      progressRecords,
      questions,
      student,
      todayAssignments,
    ],
  )

  const value = useMemo<ParentUnreadContextValue>(
    () => ({
      unread,
      hasAnyUnread: hasAnyParentUnread(unread),
      isCategoryUnread: (category) => unread[category],
      markCategoryRead,
      refreshCategoryReads,
    }),
    [markCategoryRead, refreshCategoryReads, unread],
  )

  return (
    <ParentUnreadContext.Provider value={value}>{children}</ParentUnreadContext.Provider>
  )
}

export function useParentUnread(): ParentUnreadContextValue {
  const context = useContext(ParentUnreadContext)
  if (!context) {
    throw new Error('useParentUnread must be used within ParentUnreadProvider')
  }
  return context
}

export function useParentUnreadOptional(): ParentUnreadContextValue | null {
  return useContext(ParentUnreadContext)
}
