import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TeacherMobileHeader } from '../../components/teacherMobile/TeacherMobileHeader'
import { TodayReportView } from '../../components/todayReport/TodayReportView'
import { StudentKakaoShareAction } from '../../components/students/StudentKakaoShareAction'
import { useData } from '../../hooks/useData'
import { formatKoreanDate, getTodayString } from '../../utils/date'
import { GRADES, inputClass } from '../../utils/labels'
import {
  CLASS_OPTIONS_BY_GRADE,
  isActiveGrade,
  parseGradeFromClassName,
} from '../../utils/studentGradeClass'
import type { ClassTodayReportSyncContext } from '../../utils/classTodayReportCommon'
import type { Student } from '../../types/student'

type ReportSection =
  | 'attendance'
  | 'homework'
  | 'progress'
  | 'dailyTest'
  | 'classNote'

const SECTIONS: { id: ReportSection; label: string }[] = [
  { id: 'attendance', label: '출결' },
  { id: 'homework', label: '숙제 수행 결과' },
  { id: 'progress', label: '오늘의 진도' },
  { id: 'dailyTest', label: '일일테스트' },
  { id: 'classNote', label: '수업 중 특이사항' },
]

function MobileSectionAccordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="tm-card-section">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tm-accordion-btn"
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-[18px] w-[18px] text-[#6B7280] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open && <div className="border-t border-[rgba(22,58,112,0.06)] px-3 pb-3 pt-2">{children}</div>}
    </section>
  )
}

export function TeacherMobileTodayReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialClassFromUrl = searchParams.get('class')?.trim() ?? ''
  const initialStudentId = searchParams.get('student')?.trim() ?? ''
  const initialDateFromUrl = searchParams.get('date')?.trim() ?? ''

  const { students, isLoading } = useData()

  const [date, setDate] = useState(initialDateFromUrl || getTodayString())
  const [grade, setGrade] = useState('')
  const [className, setClassName] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [openSections, setOpenSections] = useState<Set<ReportSection>>(
    () => new Set(['attendance']),
  )

  const activeStudents = useMemo(
    () => students.filter((student) => student.status === '재원'),
    [students],
  )

  /** Today Report 반/과정 — CLASS_OPTIONS_BY_GRADE만 사용 (PC bulk와 동일) */
  const classOptions = useMemo(() => {
    if (!grade || !isActiveGrade(grade)) return []
    return [...CLASS_OPTIONS_BY_GRADE[grade]]
  }, [grade])

  const classStudents = useMemo(() => {
    if (!grade || !className) return []
    return activeStudents
      .filter(
        (student) => student.grade === grade && student.className === className,
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [activeStudents, className, grade])

  const selectedStudent = useMemo(
    () => classStudents.find((s) => s.id === selectedStudentId),
    [classStudents, selectedStudentId],
  )

  const selectedIndex = useMemo(
    () => classStudents.findIndex((s) => s.id === selectedStudentId),
    [classStudents, selectedStudentId],
  )

  const classSync = useMemo((): ClassTodayReportSyncContext | undefined => {
    if (!grade || !className || classStudents.length === 0) return undefined
    return {
      grade,
      className,
      peerStudentIds: classStudents.map((student) => student.id),
    }
  }, [className, classStudents, grade])

  useEffect(() => {
    if (!initialClassFromUrl && !initialStudentId) return
    if (initialClassFromUrl) {
      const parsedGrade = parseGradeFromClassName(initialClassFromUrl)
      if (parsedGrade) {
        setGrade((c) => c || parsedGrade)
        setClassName((c) => c || initialClassFromUrl)
      }
    }
    const student = activeStudents.find((s) => s.id === initialStudentId)
    if (student) {
      if (isActiveGrade(student.grade)) setGrade((c) => c || student.grade)
      if (student.className.trim()) setClassName((c) => c || student.className.trim())
    }
  }, [activeStudents, initialClassFromUrl, initialStudentId])

  useEffect(() => {
    if (classStudents.length === 0) {
      setSelectedStudentId('')
      return
    }
    if (selectedStudentId && classStudents.some((s) => s.id === selectedStudentId)) return
    const preferred = initialStudentId && classStudents.some((s) => s.id === initialStudentId)
      ? initialStudentId
      : classStudents[0].id
    setSelectedStudentId(preferred)
  }, [classStudents, initialStudentId, selectedStudentId])

  const syncUrl = useCallback(
    (studentId: string) => {
      const params = new URLSearchParams()
      if (date) params.set('date', date)
      if (className) params.set('class', className)
      if (studentId) params.set('student', studentId)
      setSearchParams(params, { replace: true })
    },
    [className, date, setSearchParams],
  )

  const selectStudent = (studentId: string) => {
    if (studentId === selectedStudentId) return
    const hasOpen = openSections.size > 0
    if (
      hasOpen &&
      selectedStudentId &&
      !window.confirm(
        '다른 학생으로 이동하면 저장하지 않은 입력이 사라질 수 있습니다. 계속하시겠습니까?',
      )
    ) {
      return
    }
    setSelectedStudentId(studentId)
    setOpenSections(new Set(['attendance']))
    syncUrl(studentId)
  }

  const goStudent = (delta: number) => {
    if (selectedIndex < 0 || classStudents.length === 0) return
    const next = classStudents[selectedIndex + delta]
    if (next) selectStudent(next.id)
  }

  const toggleSection = (id: ReportSection) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <>
        <TeacherMobileHeader title="Today Report" />
        <p className="px-4 py-8 text-center text-sm text-slate-500">불러오는 중…</p>
      </>
    )
  }

  return (
    <div className="tm-animate-in">
      <TeacherMobileHeader
        title="Today Report"
        subtitle={formatKoreanDate(date)}
      />

      <div className="tm-page-content space-y-3">
        <section className="tm-card p-3">
          <div className="space-y-2">
            <div>
              <label htmlFor="mtr-date" className="mb-1 block text-xs font-semibold text-slate-700">
                날짜
              </label>
              <input
                id="mtr-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${inputClass()} min-h-11 py-2 text-base`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="mtr-grade" className="mb-1 block text-xs font-semibold text-slate-700">
                  학년
                </label>
                <select
                  id="mtr-grade"
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value)
                    setClassName('')
                    setSelectedStudentId('')
                  }}
                  className={`${inputClass()} min-h-11 py-2 text-base`}
                >
                  <option value="">선택</option>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mtr-class" className="mb-1 block text-xs font-semibold text-slate-700">
                  반/과정
                </label>
                <select
                  id="mtr-class"
                  value={className}
                  onChange={(e) => {
                    setClassName(e.target.value)
                    setSelectedStudentId('')
                  }}
                  disabled={!grade}
                  className={`${inputClass()} min-h-11 py-2 text-base disabled:bg-slate-50`}
                >
                  <option value="">{grade ? '선택' : '학년 먼저'}</option>
                  {classOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {!grade || !className ? (
          <p className="tm-card border-dashed px-4 py-6 text-center text-sm text-[#6B7280]">
            학년과 반을 선택해 주세요.
          </p>
        ) : classStudents.length === 0 ? (
          <p className="tm-card border-dashed px-4 py-6 text-center text-sm text-[#6B7280]">
            재원 학생이 없습니다.
          </p>
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex min-w-min gap-2">
                {classStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => selectStudent(student.id)}
                    className={`tm-student-chip ${
                      student.id === selectedStudentId
                        ? 'tm-student-chip--active'
                        : 'tm-student-chip--idle'
                    }`}
                  >
                    {student.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedStudent && (
              <div className="tm-card flex items-center justify-between gap-2 px-3 py-2">
                <button
                  type="button"
                  disabled={selectedIndex <= 0}
                  onClick={() => goStudent(-1)}
                  className="tm-icon-btn disabled:opacity-40"
                  aria-label="이전 학생"
                >
                  <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="mx-auto mb-1 flex justify-center">
                    <span className="tm-student-avatar">
                      {selectedStudent.name.slice(0, 1)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-bold text-[#163A70]">{selectedStudent.name}</p>
                  <p className="truncate text-xs text-[#6B7280]">
                    {selectedStudent.school} · {selectedStudent.teacher || '-'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={selectedIndex >= classStudents.length - 1}
                  onClick={() => goStudent(1)}
                  className="tm-icon-btn disabled:opacity-40"
                  aria-label="다음 학생"
                >
                  <ChevronRight className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
            )}

            {selectedStudent && (
              <MobileTodayReportSections
                key={`${selectedStudent.id}-${date}`}
                student={selectedStudent}
                date={date}
                classSync={classSync}
                openSections={openSections}
                onToggleSection={toggleSection}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MobileTodayReportSections({
  student,
  date,
  classSync,
  openSections,
  onToggleSection,
}: {
  student: Student
  date: string
  classSync?: ClassTodayReportSyncContext
  openSections: Set<ReportSection>
  onToggleSection: (id: ReportSection) => void
}) {
  return (
    <div className="space-y-2">
      {SECTIONS.map(({ id, label }) => (
        <MobileSectionAccordion
          key={id}
          label={label}
          open={openSections.has(id)}
          onToggle={() => onToggleSection(id)}
        >
          <TodayReportView
            student={student}
            readOnly={false}
            initialDate={date}
            hideHeader
            compactTeacherInput
            classSync={classSync}
            classNoteExtraActions={
              id === 'classNote' ? (
                <StudentKakaoShareAction student={student} compact />
              ) : undefined
            }
            mobileSection={id}
          />
        </MobileSectionAccordion>
      ))}
    </div>
  )
}
