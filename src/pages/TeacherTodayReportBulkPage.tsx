import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { ClassAttendanceBulkPanel } from '../components/todayReport/ClassAttendanceBulkPanel'
import { ClassCommonProgressPanel } from '../components/todayReport/ClassCommonProgressPanel'
import { ClassCommonTodayAssignmentPanel } from '../components/todayReport/ClassCommonTodayAssignmentPanel'
import { ClassDailyTestBulkPanel } from '../components/todayReport/ClassDailyTestBulkPanel'
import { ClassHomeworkStatusBulkPanel } from '../components/todayReport/ClassHomeworkStatusBulkPanel'
import { TodayReportStudentAccordion } from '../components/todayReport/TodayReportStudentAccordion'
import { useData } from '../hooks/useData'
import { formatKoreanDate, getTodayString } from '../utils/date'
import { GRADES, inputClass } from '../utils/labels'
import {
  getClassPickerOptions,
  isActiveGrade,
  parseGradeFromClassName,
  resolveClassNameOnGradeChange,
} from '../utils/studentGradeClass'
import type { ClassTodayReportSyncContext } from '../utils/classTodayReportCommon'
import type { TodayReportLookupContext } from '../utils/todayReportLookup'

export function TeacherTodayReportBulkPage() {
  const [searchParams] = useSearchParams()
  const initialClassFromUrl = searchParams.get('class')?.trim() ?? ''
  const focusStudentId = searchParams.get('student')?.trim() ?? ''
  const initialDateFromUrl = searchParams.get('date')?.trim() ?? ''

  const {
    students,
    attendance,
    homework,
    homeworkTextbookEntries,
    todayAssignments,
    studentTextbookSlots,
    classNotes,
    dailyTests,
    progressRecords,
    isLoading,
  } = useData()

  const [date, setDate] = useState(initialDateFromUrl || getTodayString())
  const [grade, setGrade] = useState('')
  const [className, setClassName] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

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

  const classSync = useMemo((): ClassTodayReportSyncContext | undefined => {
    if (!grade || !className || classStudents.length === 0) return undefined
    return {
      grade,
      className,
      peerStudentIds: classStudents.map((student) => student.id),
    }
  }, [className, classStudents, grade])

  const lookupContext = useMemo<TodayReportLookupContext>(
    () => ({
      attendance,
      homework,
      homeworkTextbookEntries,
      todayAssignments,
      studentTextbookSlots,
      classNotes,
      dailyTests,
      progressRecords,
    }),
    [attendance, classNotes, dailyTests, homework, homeworkTextbookEntries, progressRecords, studentTextbookSlots, todayAssignments],
  )

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

    setExpandedIds((prev) => new Set(prev).add(focusStudentId))

    const timer = window.setTimeout(() => {
      document
        .getElementById(`today-report-student-${focusStudentId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 200)

    return () => window.clearTimeout(timer)
  }, [classStudents, focusStudentId])

  const toggleExpanded = (studentId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        학생 데이터를 불러오는 중…
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Today Report 반별 통합입력"
        description="학년·반을 선택하고 학생별 Today Report를 한 화면에서 입력·저장합니다."
        badge={
          <span className="inline-block rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {formatKoreanDate(date)}
          </span>
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="trb-date" className="mb-1 block text-xs font-semibold text-slate-700">
              날짜
            </label>
            <input
              id="trb-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass()} py-2 text-sm`}
            />
          </div>
          <div>
            <label htmlFor="trb-grade" className="mb-1 block text-xs font-semibold text-slate-700">
              학년
            </label>
            <select
              id="trb-grade"
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value)
                setClassName('')
                setExpandedIds(new Set())
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
            <label htmlFor="trb-class" className="mb-1 block text-xs font-semibold text-slate-700">
              반/과정
            </label>
            <select
              id="trb-class"
              value={className}
              onChange={(e) => {
                setClassName(e.target.value)
                setExpandedIds(new Set())
              }}
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
          학년과 반을 선택해 주세요.
        </p>
      ) : classStudents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          현재 이 반에 등록된 재원 학생이 없습니다.
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-navy-900">반 전체 출결</h3>
            <ClassAttendanceBulkPanel
              key={`pc-class-attendance-${date}-${className}`}
              date={date}
              grade={grade}
              className={className}
              students={classStudents}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-navy-900">숙제 수행 결과</h3>
            <ClassHomeworkStatusBulkPanel
              key={`pc-class-homework-status-${date}-${className}`}
              date={date}
              grade={grade}
              className={className}
              students={classStudents}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-navy-900">반 공통 오늘 과제</h3>
            <ClassCommonTodayAssignmentPanel
              key={`pc-class-today-hw-${date}-${className}`}
              date={date}
              grade={grade}
              className={className}
              students={classStudents}
              classSync={classSync}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-navy-900">반 공통 오늘의 진도</h3>
            <ClassCommonProgressPanel
              key={`pc-class-progress-${date}-${className}`}
              date={date}
              grade={grade}
              className={className}
              students={classStudents}
              classSync={classSync}
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-navy-900">일일테스트</h3>
            <ClassDailyTestBulkPanel
              key={`pc-class-daily-test-${date}-${className}`}
              date={date}
              grade={grade}
              className={className}
              students={classStudents}
            />
          </section>

          <p className="text-xs font-medium text-slate-500">
            재원 {classStudents.length}명 · 학생 이름을 클릭하면 특이사항을 입력합니다.
          </p>
          <div className="space-y-2">
            {classStudents.map((student) => (
              <TodayReportStudentAccordion
                key={student.id}
                student={student}
                date={date}
                expanded={expandedIds.has(student.id)}
                onToggle={() => toggleExpanded(student.id)}
                lookupContext={lookupContext}
                classSync={classSync}
                omitAttendance
                omitHomeworkAndProgress
                omitDailyTest
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
