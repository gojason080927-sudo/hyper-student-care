import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ClassBulkCommonPanel } from '../components/classBulk/ClassBulkCommonPanel'
import {
  ClassBulkStudentCard,
  draftToSnapshot,
  resolveSyncStatus,
} from '../components/classBulk/ClassBulkStudentCard'
import { PageHeader } from '../components/ui/PageHeader'
import { useData } from '../hooks/useData'
import type { ClassBulkCommonDraft, ClassBulkStudentDraft } from '../types/classBulk'
import type { Student } from '../types/student'
import {
  draftHasSaveableData,
  saveClassBulkStudentDraft,
} from '../utils/classBulkSave'
import { formatKoreanDate, getTodayString } from '../utils/date'
import { GRADES, inputClass } from '../utils/labels'
import {
  getClassPickerOptions,
  isActiveGrade,
  parseGradeFromClassName,
  resolveClassNameOnGradeChange,
} from '../utils/studentGradeClass'
import {
  buildClassBulkStudentDraft,
  findStudentDayRecords,
  type TodayReportLookupContext,
} from '../utils/todayReportLookup'

const EMPTY_COMMON: ClassBulkCommonDraft = {
  mathProgress: '',
  englishProgress: '',
  todayAssignment: '',
  teacherMemo: '',
}

type SaveError = { studentId: string; message: string }

function buildInitialSnapshots(list: Student[], drafts: Record<string, ClassBulkStudentDraft>) {
  const snapshots: Record<string, string> = {}
  for (const student of list) {
    const draft = drafts[student.id]
    if (draft && draftHasSaveableData(draft)) {
      snapshots[student.id] = draftToSnapshot(draft)
    }
  }
  return snapshots
}

export function TeacherClassBulkInputPage() {
  const [searchParams] = useSearchParams()
  const initialClassFromUrl = searchParams.get('class')?.trim() ?? ''
  const focusStudentId = searchParams.get('student')?.trim() ?? ''

  const {
    students,
    attendance,
    homework,
    todayAssignments,
    classNotes,
    dailyTests,
    progressRecords,
    isLoading,
    reloadData,
    refreshTodayReport,
    showToast,
  } = useData()

  const [date, setDate] = useState(getTodayString())
  const [grade, setGrade] = useState('')
  const [className, setClassName] = useState('')
  const [common, setCommon] = useState<ClassBulkCommonDraft>(EMPTY_COMMON)
  const [drafts, setDrafts] = useState<Record<string, ClassBulkStudentDraft>>({})
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null)
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [saveSummary, setSaveSummary] = useState<string | null>(null)
  const [pendingDraftRefreshId, setPendingDraftRefreshId] = useState<string | null>(null)
  const [bulkDraftReloadKey, setBulkDraftReloadKey] = useState(0)

  const activeStudents = useMemo(
    () => students.filter((student) => student.status === '재원'),
    [students],
  )

  const classOptions = useMemo(() => {
    if (!grade) return []
    return getClassPickerOptions(grade)
  }, [grade])

  const classStudents = useMemo(() => {
    if (!grade || !className) return []
    return activeStudents
      .filter(
        (student) => student.grade === grade && student.className === className,
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [activeStudents, className, grade])

  const lookupContext = useMemo<TodayReportLookupContext>(
    () => ({
      attendance,
      homework,
      todayAssignments,
      classNotes,
      dailyTests,
      progressRecords,
    }),
    [attendance, classNotes, dailyTests, homework, progressRecords, todayAssignments],
  )

  const loadDraftsForStudents = useCallback(
    (list: Student[], resetSnapshots: boolean) => {
      const next: Record<string, ClassBulkStudentDraft> = {}
      for (const student of list) {
        const records = findStudentDayRecords(student.id, date, lookupContext)
        next[student.id] = buildClassBulkStudentDraft(student.id, records)
      }
      setDrafts(next)
      if (resetSnapshots) {
        setSavedSnapshots(buildInitialSnapshots(list, next))
        setSaveErrors({})
        setSaveSummary(null)
      }
    },
    [date, lookupContext],
  )

  useEffect(() => {
    if (classStudents.length === 0) {
      setDrafts({})
      setSavedSnapshots({})
      return
    }
    loadDraftsForStudents(classStudents, true)
  }, [classStudents, date, loadDraftsForStudents])

  useEffect(() => {
    if (bulkDraftReloadKey === 0 || classStudents.length === 0) return
    loadDraftsForStudents(classStudents, true)
  }, [bulkDraftReloadKey, classStudents, loadDraftsForStudents])

  useEffect(() => {
    if (!pendingDraftRefreshId) return
    const records = findStudentDayRecords(pendingDraftRefreshId, date, lookupContext)
    const refreshed = buildClassBulkStudentDraft(pendingDraftRefreshId, records)
    setDrafts((prev) => ({ ...prev, [pendingDraftRefreshId]: refreshed }))
    setSavedSnapshots((prev) => ({
      ...prev,
      [pendingDraftRefreshId]: draftToSnapshot(refreshed),
    }))
    setSaveErrors((prev) => {
      const copy = { ...prev }
      delete copy[pendingDraftRefreshId]
      return copy
    })
    setPendingDraftRefreshId(null)
  }, [pendingDraftRefreshId, date, lookupContext])

  useEffect(() => {
    if (!initialClassFromUrl && !focusStudentId) return

    if (initialClassFromUrl) {
      const parsedGrade = parseGradeFromClassName(initialClassFromUrl)
      if (parsedGrade) {
        setGrade((current) => current || parsedGrade)
        setClassName((current) =>
          current || resolveClassNameOnGradeChange(parsedGrade, initialClassFromUrl),
        )
        return
      }
    }

    const student = activeStudents.find((item) => item.id === focusStudentId)
    if (!student) return

    if (isActiveGrade(student.grade)) {
      setGrade((current) => current || student.grade)
    }
    if (student.className.trim()) {
      setClassName((current) =>
        current || resolveClassNameOnGradeChange(student.grade, student.className.trim()),
      )
    }
  }, [activeStudents, focusStudentId, initialClassFromUrl])

  useEffect(() => {
    if (!focusStudentId || classStudents.length === 0) return
    if (!classStudents.some((student) => student.id === focusStudentId)) return
    const timer = window.setTimeout(() => {
      document
        .getElementById(`bulk-student-${focusStudentId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [classStudents, focusStudentId, drafts])

  const failedIds = useMemo(() => new Set(Object.keys(saveErrors)), [saveErrors])

  const handleApplyAllCommon = (studentCount: number) => {
    if (studentCount === 0) return

    setDrafts((prev) => {
      const next = { ...prev }
      for (const student of classStudents) {
        const current = next[student.id]
        if (!current) continue
        next[student.id] = {
          ...current,
          ...(common.mathProgress.trim() ? { mathProgress: common.mathProgress } : {}),
          ...(common.englishProgress.trim() ? { englishProgress: common.englishProgress } : {}),
          ...(common.todayAssignment.trim() ? { todayAssignment: common.todayAssignment } : {}),
          ...(common.teacherMemo.trim() ? { progressTeacherMemo: common.teacherMemo } : {}),
        }
      }
      return next
    })

    showToast(`${studentCount}명의 학생에게 적용했습니다.`)
  }

  const updateDraft = (studentId: string, draft: ClassBulkStudentDraft) => {
    setDrafts((prev) => ({ ...prev, [studentId]: draft }))
    setSaveErrors((prev) => {
      if (!prev[studentId]) return prev
      const copy = { ...prev }
      delete copy[studentId]
      return copy
    })
  }

  const markSaved = (studentId: string, draft: ClassBulkStudentDraft) => {
    setSavedSnapshots((prev) => ({ ...prev, [studentId]: draftToSnapshot(draft) }))
    setSaveErrors((prev) => {
      const copy = { ...prev }
      delete copy[studentId]
      return copy
    })
  }

  const saveOneStudent = useCallback(
    async (student: Student): Promise<SaveError | null> => {
      const draft = drafts[student.id]
      if (!draft) {
        return { studentId: student.id, message: '입력 데이터 없음' }
      }

      if (!draftHasSaveableData(draft)) {
        return { studentId: student.id, message: '저장할 내용이 없습니다.' }
      }

      const existing = findStudentDayRecords(student.id, date, lookupContext)
      try {
        await saveClassBulkStudentDraft(draft, date, existing)
        markSaved(student.id, draft)
        return null
      } catch (error) {
        const message = error instanceof Error ? error.message : '저장 실패'
        setSaveErrors((prev) => ({ ...prev, [student.id]: message }))
        return { studentId: student.id, message }
      }
    },
    [date, drafts, lookupContext],
  )

  const handleSaveStudent = async (student: Student) => {
    if (savingStudentId || isSavingAll) return

    setSavingStudentId(student.id)
    const error = await saveOneStudent(student)

    if (!error) {
      showToast(`${student.name} 학생 저장 완료`)
      await refreshTodayReport(student.id, date)
      setPendingDraftRefreshId(student.id)
    } else if (error.message !== '저장할 내용이 없습니다.') {
      showToast(`${student.name} 학생 저장 실패: ${error.message}`)
    } else {
      showToast(error.message)
    }

    setSavingStudentId(null)
  }

  const handleSaveAll = async () => {
    if (classStudents.length === 0 || isSavingAll || savingStudentId) return

    setIsSavingAll(true)
    setSaveSummary('저장 중입니다.')

    let successCount = 0
    let failCount = 0
    let skipCount = 0
    const errors: SaveError[] = []

    for (const student of classStudents) {
      const draft = drafts[student.id]
      if (!draft || !draftHasSaveableData(draft)) {
        skipCount += 1
        continue
      }

      const error = await saveOneStudent(student)
      if (error) {
        failCount += 1
        errors.push(error)
      } else {
        successCount += 1
      }
    }

    if (failCount === 0 && successCount > 0) {
      setSaveSummary('반 전체 기록이 저장되었습니다.')
      showToast('반 전체 기록이 저장되었습니다.')
      await reloadData()
      setBulkDraftReloadKey((key) => key + 1)
    } else if (failCount > 0) {
      const failedNames = classStudents
        .filter((s) => errors.some((e) => e.studentId === s.id))
        .map((s) => s.name)
        .join(', ')
      setSaveSummary(`${successCount}명 저장 완료 / ${failCount}명 저장 실패`)
      showToast(`${successCount}명 저장 완료 / ${failCount}명 저장 실패 (${failedNames})`)
      if (successCount > 0) {
        await reloadData()
        setBulkDraftReloadKey((key) => key + 1)
      }
    } else if (skipCount === classStudents.length) {
      setSaveSummary('저장할 내용이 있는 학생이 없습니다.')
      showToast('저장할 내용이 있는 학생이 없습니다.')
    } else {
      setSaveSummary(null)
    }

    setIsSavingAll(false)
  }

  const isBusy = isSavingAll || savingStudentId !== null

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        학생 데이터를 불러오는 중…
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        title="반별 통합 입력"
        description="반당 최대 8명 — 수업 후 5분 안에 입력·저장"
        badge={
          <span className="inline-block rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {formatKoreanDate(date)}
          </span>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="bulk-date" className="mb-1 block text-xs font-semibold text-slate-700">
              날짜
            </label>
            <input
              id="bulk-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass()} py-2 text-sm`}
            />
          </div>
          <div>
            <label htmlFor="bulk-grade" className="mb-1 block text-xs font-semibold text-slate-700">
              학년
            </label>
            <select
              id="bulk-grade"
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value)
                setClassName('')
              }}
              className={`${inputClass()} py-2 text-sm`}
            >
              <option value="">학년 선택</option>
              {GRADES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="bulk-class" className="mb-1 block text-xs font-semibold text-slate-700">
              반/과정
            </label>
            <select
              id="bulk-class"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              disabled={!grade}
              className={`${inputClass()} py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400`}
            >
              <option value="">{grade ? '반/과정 선택' : '학년을 먼저 선택'}</option>
              {classOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!grade || !className ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {!grade ? '먼저 학년을 선택해주세요.' : '반/과정을 선택해주세요.'}
        </p>
      ) : classStudents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          현재 이 반에 등록된 학생이 없습니다.
        </p>
      ) : (
        <>
          <ClassBulkCommonPanel
            common={common}
            onChange={setCommon}
            onApplyAll={handleApplyAllCommon}
            studentCount={classStudents.length}
          />

          <p className="text-xs font-medium text-slate-500">
            재원 {classStudents.length}명 · 2열 입력
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {classStudents.map((student) => {
              const draft = drafts[student.id]
              if (!draft) return null
              const syncStatus = resolveSyncStatus(
                student.id,
                draft,
                savedSnapshots,
                failedIds,
              )
              return (
                <div key={student.id} id={`bulk-student-${student.id}`}>
                  <ClassBulkStudentCard
                    student={student}
                    draft={draft}
                    syncStatus={syncStatus}
                    onChange={(next) => updateDraft(student.id, next)}
                    onSave={() => void handleSaveStudent(student)}
                    isSaving={savingStudentId === student.id}
                    saveError={saveErrors[student.id]}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}

      {saveSummary && (
        <p
          className={`text-center text-sm font-medium ${
            saveSummary.includes('실패') ? 'text-rose-600' : 'text-emerald-700'
          }`}
          role="status"
        >
          {saveSummary}
        </p>
      )}

      {grade && className && classStudents.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <button
            type="button"
            className="w-full rounded-xl bg-blue-600 py-4 text-base font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 md:max-w-md"
            disabled={isBusy}
            onClick={() => void handleSaveAll()}
          >
            {isSavingAll ? '저장 중입니다…' : '반 전체 저장'}
          </button>
        </div>
      )}
    </div>
  )
}
