import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionTitleWithHint } from '../../components/ui/SectionTitleWithHint'
import { TeacherMobileHeader } from '../../components/teacherMobile/TeacherMobileHeader'
import { ClassAttendanceBulkPanel } from '../../components/todayReport/ClassAttendanceBulkPanel'
import { ClassCommonProgressPanel } from '../../components/todayReport/ClassCommonProgressPanel'
import { ClassCommonTodayAssignmentPanel } from '../../components/todayReport/ClassCommonTodayAssignmentPanel'
import { ClassDailyTestBulkPanel } from '../../components/todayReport/ClassDailyTestBulkPanel'
import { ClassHomeworkStatusBulkPanel } from '../../components/todayReport/ClassHomeworkStatusBulkPanel'
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
  | 'classTodayHomework'
  | 'progress'
  | 'dailyTest'
  | 'classNote'

const CLASS_SCOPED_SECTIONS: { id: ReportSection; label: string }[] = [
  { id: 'attendance', label: '출결' },
  { id: 'homework', label: '숙제 수행 결과' },
  { id: 'classTodayHomework', label: '반 공통 오늘 과제' },
  { id: 'progress', label: '반 공통 오늘의 진도' },
  { id: 'dailyTest', label: '일일테스트' },
]

function MobileSectionAccordion({
  label,
  open,
  onToggle,
  children,
}: {
  label: ReactNode
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
  const [searchParams] = useSearchParams()
  const initialClassFromUrl = searchParams.get('class')?.trim() ?? ''
  const initialStudentId = searchParams.get('student')?.trim() ?? ''
  const initialDateFromUrl = searchParams.get('date')?.trim() ?? ''

  const { students, isLoading } = useData()

  const [date, setDate] = useState(initialDateFromUrl || getTodayString())
  const [grade, setGrade] = useState('')
  const [className, setClassName] = useState('')
  const [openSections, setOpenSections] = useState<Set<ReportSection>>(
    () => new Set(['attendance']),
  )

  const activeStudents = useMemo(
    () => students.filter((student) => student.status === '재원'),
    [students],
  )

  /** Today Report 반/과정 — CLASS_OPTIONS_BY_GRADE만 사용 (DB·레거시 병합 없음) */
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
      if (student.className.trim()) {
        setClassName((c) =>
          c || (student.className.trim()),
        )
      }
    }
  }, [activeStudents, initialClassFromUrl, initialStudentId])

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
      <TeacherMobileHeader title="Today Report" subtitle={formatKoreanDate(date)} />

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
                <label
                  htmlFor="mtr-grade"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  학년
                </label>
                <select
                  id="mtr-grade"
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value)
                    setClassName('')
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
                <label
                  htmlFor="mtr-class"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  반/과정
                </label>
                <select
                  id="mtr-class"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
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
            {CLASS_SCOPED_SECTIONS.map((section) => (
              <MobileSectionAccordion
                key={section.id}
                label={section.label}
                open={openSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              >
                {section.id === 'attendance' ? (
                  <ClassAttendanceBulkPanel
                    key={`class-attendance-${date}-${className}`}
                    date={date}
                    grade={grade}
                    className={className}
                    students={classStudents}
                    compact
                  />
                ) : section.id === 'homework' ? (
                  <ClassHomeworkStatusBulkPanel
                    key={`class-homework-status-${date}-${className}`}
                    date={date}
                    grade={grade}
                    className={className}
                    students={classStudents}
                    compact
                  />
                ) : section.id === 'classTodayHomework' ? (
                  <ClassCommonTodayAssignmentPanel
                    key={`class-today-hw-${date}-${className}`}
                    date={date}
                    grade={grade}
                    className={className}
                    students={classStudents}
                    classSync={classSync}
                    compact
                  />
                ) : section.id === 'progress' ? (
                  <ClassCommonProgressPanel
                    key={`class-progress-${date}-${className}`}
                    date={date}
                    grade={grade}
                    className={className}
                    students={classStudents}
                    classSync={classSync}
                    compact
                  />
                ) : (
                  <ClassDailyTestBulkPanel
                    key={`class-daily-test-${date}-${className}`}
                    date={date}
                    grade={grade}
                    className={className}
                    students={classStudents}
                    compact
                  />
                )}
              </MobileSectionAccordion>
            ))}

            <MobileSectionAccordion
              label={
                <SectionTitleWithHint
                  title="강사 피드백"
                  hint="수업을 통해 확인한 학습 상태"
                  hintClassName="text-[11px]"
                />
              }
              open={openSections.has('classNote')}
              onToggle={() => toggleSection('classNote')}
            >
              <ClassNoteStudentList
                students={classStudents}
                date={date}
                classSync={classSync}
              />
            </MobileSectionAccordion>
          </>
        )}
      </div>
    </div>
  )
}

/** 학생 선택 UI 없이 반 학생별 특이사항을 이어서 입력 */
function ClassNoteStudentList({
  students,
  date,
  classSync,
}: {
  students: Student[]
  date: string
  classSync?: ClassTodayReportSyncContext
}) {
  return (
    <div className="divide-y divide-[rgba(22,58,112,0.06)]">
      {students.map((student) => (
        <div key={student.id} className="py-2 first:pt-0 last:pb-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-[#163A70]">{student.name}</p>
            <StudentKakaoShareAction student={student} compact />
          </div>
          <TodayReportView
            student={student}
            readOnly={false}
            initialDate={date}
            hideHeader
            compactTeacherInput
            classSync={classSync}
            mobileSection="classNote"
          />
        </div>
      ))}
    </div>
  )
}
