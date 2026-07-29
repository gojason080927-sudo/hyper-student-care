import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DailyTestSessionFormSection, validateDailyTestSessions, DailyTestPassRuleBadge } from '../dailytest/DailyTestSessionFormSection'
import { DailyTestSessionGrid } from '../dailytest/DailyTestSessionGrid'
import { HomeworkStatusPicker } from '../homework/HomeworkStatusPicker'
import { HeroProgressBar } from '../ui/HeroProgressBar'
import { StatusBadge } from '../ui/StatusBadge'
import { TodayReportErrorBoundary } from './TodayReportErrorBoundary'
import { useData } from '../../hooks/useData'
import type {
  AttendanceRecord,
  AttendanceStatus,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkStatus,
  ProgressRecord,
  TestSessionResult,
  TodayAssignmentRecord,
  ClassNoteRecord,
} from '../../types/records'
import type { Student } from '../../types/student'
import {
  addDays,
  compareDateStrings,
  formatKoreanDateLong,
  getTodayString,
  isToday,
} from '../../utils/date'
import {
  dailyTestFormToSavePayload,
  dailyTestRecordToForm,
  emptyDailyTestForm,
  hasDailyTestDisplayData,
  migrateSessionResults,
  type DailyTestFormData,
} from '../../utils/dailyTest'
import { calcProgressRate } from '../../utils/calc'
import { findTodayAssignment, TODAY_ASSIGNMENT_MAX_LENGTH } from '../../utils/todayAssignment'
import { CLASS_NOTE_MAX_LENGTH, findClassNote } from '../../utils/classNote'
import { getHomeworkContent, homeworkRecordToSavePayload } from '../../utils/homework'
import { findProgressBySubject } from '../../utils/progressRecord'
import {
  ATTENDANCE_STATUSES,
  btnPrimary,
  getAttendanceColor,
  getHomeworkColor,
  inputClass,
  SUBJECTS,
} from '../../utils/labels'

const PARENT_EMPTY_MESSAGES = {
  attendance: '오늘 등록된 출결 정보가 없습니다.',
  homework: '오늘 등록된 숙제 정보가 없습니다.',
  progress: '오늘 등록된 진도 정보가 없습니다.',
  dailyTest: '오늘 등록된 일일 테스트 결과가 없습니다.',
  classNote: '등록된 코멘트가 없습니다.',
} as const

function ParentReadOnlyBody({
  hasData,
  emptyMessage,
  children,
}: {
  hasData: boolean
  emptyMessage: string
  children: () => ReactNode
}) {
  if (!hasData) {
    return <EmptyHint message={emptyMessage} />
  }
  return <>{children()}</>
}

type TodayReportViewProps = {
  student: Student
  readOnly?: boolean
  initialDate?: string
  dateMode?: 'picker' | 'navigate'
  errorFallbackHomePath?: string
}

function SectionCard({
  title,
  titleExtra,
  children,
  compact = false,
  emphasis = false,
}: {
  title: string
  titleExtra?: React.ReactNode
  children: React.ReactNode
  compact?: boolean
  emphasis?: boolean
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
        emphasis ? 'px-4 py-4 sm:px-5 sm:py-5' : compact ? 'px-4 py-3' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`text-base font-bold text-navy-900 ${compact ? 'mb-0' : ''}`}>{title}</h2>
        {titleExtra}
      </div>
      <div className={compact ? 'mt-2' : 'mt-3'}>{children}</div>
    </section>
  )
}

function EmptyHint({ message }: { message: string }) {
  return <p className="text-sm text-slate-400">{message}</p>
}

function SaveButton({
  onClick,
  label,
  disabled = false,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  const { isSaving } = useData()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      className={`${btnPrimary} min-h-11`}
    >
      <Save className="mr-1.5 inline h-4 w-4" />
      {isSaving ? '저장 중...' : label}
    </button>
  )
}

export function StudentSummaryCard({
  student,
  compact = false,
}: {
  student: Student
  compact?: boolean
}) {
  if (compact) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm sm:rounded-2xl sm:px-4">
        <h1 className="text-lg font-bold text-navy-900">{student.name}</h1>
        <p className="mt-0.5 line-clamp-2 break-anywhere text-sm text-slate-600">
          {[student.school, student.grade, student.teacher].filter(Boolean).join(' · ')}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <p className="text-lg font-bold text-navy-900">{student.name} 학생</p>
      <p className="mt-1 text-sm text-slate-600">
        {student.school} · {student.grade}
      </p>
      {student.className && (
        <p className="mt-0.5 text-sm font-medium text-navy-800">{student.className}</p>
      )}
      <p className="mt-1.5 text-sm text-slate-500">
        담당 강사: <span className="font-medium text-slate-700">{student.teacher || '-'}</span>
      </p>
    </section>
  )
}

function getParentAttendanceHighlight(status: AttendanceStatus, active: boolean): string {
  if (!active) {
    return 'border-slate-100 bg-slate-50 text-slate-400'
  }
  switch (status) {
    case '출석':
      return 'border-emerald-300 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-200'
    case '지각':
      return 'border-amber-300 bg-amber-100 text-amber-800 ring-2 ring-amber-200'
    case '결석':
      return 'border-rose-300 bg-rose-100 text-rose-800 ring-2 ring-rose-200'
    case '조퇴':
      return 'border-blue-300 bg-blue-100 text-blue-800 ring-2 ring-blue-200'
    default:
      return 'border-slate-100 bg-slate-50 text-slate-400'
  }
}

export function TodayReportView({
  student,
  readOnly = false,
  initialDate,
  dateMode = readOnly ? 'navigate' : 'picker',
  errorFallbackHomePath,
}: TodayReportViewProps) {
  const today = getTodayString()
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today)
  const {
    attendance: attendanceRaw,
    progressRecords: progressRecordsRaw,
    homework: homeworkRaw,
    dailyTests: dailyTestsRaw,
    todayAssignments: todayAssignmentsRaw,
    classNotes: classNotesRaw,
    saveAttendanceRecord,
    saveProgressRecord,
    saveHomeworkRecord,
    saveDailyTestRecord,
    saveTodayAssignmentRecord,
    saveClassNoteRecord,
    refreshTodayReport,
  } = useData()

  const attendance = attendanceRaw ?? []
  const progressRecords = progressRecordsRaw ?? []
  const homework = homeworkRaw ?? []
  const dailyTests = dailyTestsRaw ?? []
  const todayAssignments = todayAssignmentsRaw ?? []
  const classNotes = classNotesRaw ?? []

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate)
  }, [initialDate])

  useEffect(() => {
    void refreshTodayReport(student.id, selectedDate)
  }, [refreshTodayReport, selectedDate, student.id])

  const dayAttendance = useMemo(
    () =>
      attendance.find(
        (record) => record.studentId === student.id && record.date === selectedDate,
      ),
    [attendance, selectedDate, student.id],
  )

  const dayProgressList = useMemo(
    () =>
      progressRecords.filter(
        (record) =>
          record.studentId === student.id && record.lastStudyDate === selectedDate,
      ),
    [progressRecords, selectedDate, student.id],
  )

  const dayHomework = useMemo(
    () =>
      homework.find(
        (record) => record.studentId === student.id && record.date === selectedDate,
      ),
    [homework, selectedDate, student.id],
  )

  const dayDailyTest = useMemo(
    () =>
      dailyTests.find(
        (record) => record.studentId === student.id && record.date === selectedDate,
      ),
    [dailyTests, selectedDate, student.id],
  )

  const dayAssignment = useMemo(
    () => findTodayAssignment(todayAssignments, student.id, selectedDate),
    [selectedDate, student.id, todayAssignments],
  )

  const dayClassNote = useMemo(
    () => findClassNote(classNotes, student.id, selectedDate),
    [classNotes, selectedDate, student.id],
  )

  const canGoNext = compareDateStrings(selectedDate, today) < 0
  const dateLabel = `${formatKoreanDateLong(selectedDate)}${isToday(selectedDate) ? ' · 오늘' : ''}`

  return (
    <div className="space-y-3">
      {readOnly ? (
        <>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <button
              type="button"
              aria-label="이전 날짜"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[8rem] text-center text-sm font-medium text-navy-900">
              {dateLabel}
            </span>
            <button
              type="button"
              aria-label="다음 날짜"
              disabled={!canGoNext}
              onClick={() => canGoNext && setSelectedDate((d) => addDays(d, 1))}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <StudentSummaryCard student={student} compact />
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-navy-50 px-4 py-3">
            <p className="text-center text-sm font-semibold text-navy-900 sm:text-base">
              {formatKoreanDateLong(selectedDate)}
              {isToday(selectedDate) ? ' 오늘의 학습 리포트' : ' 학습 리포트'}
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              {dateMode === 'navigate' ? (
                <>
                  <button
                    type="button"
                    aria-label="이전 날짜"
                    onClick={() => setSelectedDate((d) => addDays(d, -1))}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[7rem] text-center text-xs text-slate-500">
                    {isToday(selectedDate) ? '오늘' : selectedDate}
                  </span>
                  <button
                    type="button"
                    aria-label="다음 날짜"
                    disabled={!canGoNext}
                    onClick={() => canGoNext && setSelectedDate((d) => addDays(d, 1))}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`${inputClass()} max-w-[11rem] text-sm`}
                />
              )}
            </div>
          </div>
          <StudentSummaryCard student={student} />
        </>
      )}

      <TodayReportErrorBoundary
        homePath={errorFallbackHomePath ?? '/'}
        resetKey={selectedDate}
      >
        <div className="space-y-3">
          <AttendanceSection
            key={`attendance-${selectedDate}`}
            readOnly={readOnly}
            record={dayAttendance}
            studentId={student.id}
            date={selectedDate}
            onSave={saveAttendanceRecord}
          />

          <HomeworkAssignmentSection
            key={`homework-${selectedDate}`}
            readOnly={readOnly}
            homeworkRecord={dayHomework}
            assignmentRecord={dayAssignment}
            studentId={student.id}
            date={selectedDate}
            onSaveHomework={saveHomeworkRecord}
            onSaveTodayAssignment={saveTodayAssignmentRecord}
          />

          <ProgressSection
            key={`progress-${selectedDate}`}
            readOnly={readOnly}
            records={dayProgressList}
            studentId={student.id}
            date={selectedDate}
            onSave={saveProgressRecord}
          />

          <DailyTestSection
            key={`daily-test-${selectedDate}`}
            readOnly={readOnly}
            record={dayDailyTest}
            studentId={student.id}
            date={selectedDate}
            onSave={saveDailyTestRecord}
          />

          <ClassNoteSection
            key={`class-note-${selectedDate}`}
            readOnly={readOnly}
            record={dayClassNote}
            studentId={student.id}
            date={selectedDate}
            onSave={saveClassNoteRecord}
          />
        </div>
      </TodayReportErrorBoundary>
    </div>
  )
}

function AttendanceSection({
  readOnly,
  record,
  studentId,
  date,
  onSave,
}: {
  readOnly: boolean
  record?: AttendanceRecord
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveAttendanceRecord']
}) {
  const [status, setStatus] = useState<AttendanceStatus | ''>(record?.status ?? '')
  const [reason, setReason] = useState(record?.reason ?? '')

  useEffect(() => {
    setStatus(record?.status ?? '')
    setReason(record?.reason ?? '')
  }, [record])

  const handleSave = () => {
    if (!status) return
    onSave({
      id: record?.id,
      studentId,
      date,
      status,
      reason: reason.trim(),
      memo: record?.memo ?? '',
    })
  }

  return (
    <SectionCard title="오늘 출결">
      {readOnly ? (
        <ParentReadOnlyBody
          hasData={Boolean(record?.status)}
          emptyMessage={PARENT_EMPTY_MESSAGES.attendance}
        >
          {() => (
            <div className="space-y-2.5">
              <div className="grid grid-cols-4 gap-2">
                {ATTENDANCE_STATUSES.map((item) => (
                  <div
                    key={item}
                    className={`flex min-h-11 items-center justify-center rounded-lg border px-1 py-2 text-center text-sm font-semibold ${getParentAttendanceHighlight(item, record!.status === item)}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              {record!.reason && (
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700">사유:</span> {record!.reason}
                </p>
              )}
            </div>
          )}
        </ParentReadOnlyBody>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  status === item
                    ? getAttendanceColor(item)
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="사유 (선택)"
            className={inputClass()}
          />
          <SaveButton onClick={handleSave} disabled={!status} label="출결 저장" />
        </div>
      )}
    </SectionCard>
  )
}

function formatTodayProgressContent(record?: ProgressRecord): string {
  if (!record) return ''
  const progress = record.currentProgress?.trim() ?? ''
  const textbook = record.textbookName?.trim() ?? ''
  if (progress && textbook && !progress.includes(textbook)) {
    return `${textbook}\n${progress}`
  }
  return progress || textbook
}

function ProgressSubjectLabel({ icon, subject }: { icon: string; subject: string }) {
  return (
    <p className="text-sm font-bold text-navy-900">
      <span aria-hidden>{icon}</span> {subject}
    </p>
  )
}

function ProgressSubjectColumn({
  icon,
  subject,
  children,
}: {
  icon: string
  subject: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-3.5">
      <ProgressSubjectLabel icon={icon} subject={subject} />
      <div className="mt-2 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

const progressTextareaClass = `${inputClass()} min-h-[4.75rem] resize-none py-2.5 text-sm leading-snug sm:min-h-[5rem]`

function ProgressSection({
  readOnly,
  records,
  studentId,
  date,
  onSave,
}: {
  readOnly: boolean
  records: ProgressRecord[]
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveProgressRecord']
}) {
  const mathRecord = findProgressBySubject(records, '수학')
  const englishRecord = findProgressBySubject(records, '영어')

  const [mathProgress, setMathProgress] = useState(formatTodayProgressContent(mathRecord))
  const [englishProgress, setEnglishProgress] = useState(formatTodayProgressContent(englishRecord))
  const [teacherMemo, setTeacherMemo] = useState(
    mathRecord?.teacherMemo ?? englishRecord?.teacherMemo ?? '',
  )

  useEffect(() => {
    const math = findProgressBySubject(records, '수학')
    const english = findProgressBySubject(records, '영어')
    setMathProgress(formatTodayProgressContent(math))
    setEnglishProgress(formatTodayProgressContent(english))
    setTeacherMemo(math?.teacherMemo ?? english?.teacherMemo ?? '')
  }, [records])

  const saveSubjectProgress = (
    subject: '수학' | '영어',
    content: string,
    record?: ProgressRecord,
  ) => {
    onSave({
      id: record?.id,
      studentId,
      subject,
      textbookName: record?.textbookName?.trim() ?? '',
      currentProgress: content.trim(),
      currentPage: record?.currentPage ?? 0,
      totalPage: record?.totalPage ?? 100,
      lastStudyDate: date,
      teacherMemo: teacherMemo.trim(),
    })
  }

  const handleSave = () => {
    const hasMath = mathProgress.trim().length > 0
    const hasEnglish = englishProgress.trim().length > 0
    if (!hasMath && !hasEnglish) return

    if (hasMath) {
      saveSubjectProgress('수학', mathProgress, mathRecord)
    }
    if (hasEnglish) {
      saveSubjectProgress('영어', englishProgress, englishRecord)
    }
  }

  return (
    <SectionCard title="오늘의 진도">
      {readOnly ? (
        <ParentReadOnlyBody
          hasData={records.length > 0}
          emptyMessage={PARENT_EMPTY_MESSAGES.progress}
        >
          {() => (
            <div className="space-y-3">
              {records.map((record) => {
                const content = formatTodayProgressContent(record)
                const rate = calcProgressRate(record.currentPage, record.totalPage)
                return (
                  <div
                    key={record.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <p className="text-sm font-bold text-navy-900">{record.subject}</p>
                    {record.textbookName?.trim() && (
                      <p className="mt-1 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">교재:</span>{' '}
                        {record.textbookName}
                      </p>
                    )}
                    {content.trim() ? (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-snug text-slate-700">
                        <span className="font-medium text-slate-700">현재 진도:</span> {content}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-slate-400">등록된 진도가 없습니다.</p>
                    )}
                    {record.totalPage > 0 && (
                      <div className="mt-2.5">
                        <HeroProgressBar value={rate} size="default" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ParentReadOnlyBody>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4">
            <ProgressSubjectColumn icon="📘" subject="수학">
              <label
                htmlFor="today-progress-math"
                className="mb-1 block text-xs font-semibold text-navy-800"
              >
                진도 과정
              </label>
              <textarea
                id="today-progress-math"
                value={mathProgress}
                onChange={(e) => setMathProgress(e.target.value)}
                rows={2}
                placeholder="예) 쎈수학 중2-2 35~42쪽"
                className={`${progressTextareaClass} flex-1`}
              />
            </ProgressSubjectColumn>
            <ProgressSubjectColumn icon="📗" subject="영어">
              <label
                htmlFor="today-progress-english"
                className="mb-1 block text-xs font-semibold text-navy-800"
              >
                진도 과정
              </label>
              <textarea
                id="today-progress-english"
                value={englishProgress}
                onChange={(e) => setEnglishProgress(e.target.value)}
                rows={2}
                placeholder="예) 능률 영어 Lesson 5 본문"
                className={`${progressTextareaClass} flex-1`}
              />
            </ProgressSubjectColumn>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label
              htmlFor="today-progress-memo"
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              강사 메모 (선택)
            </label>
            <textarea
              id="today-progress-memo"
              value={teacherMemo}
              onChange={(e) => setTeacherMemo(e.target.value)}
              placeholder="강사 메모 (선택)"
              rows={2}
              className={inputClass()}
            />
          </div>
          <SaveButton
            onClick={handleSave}
            disabled={!mathProgress.trim() && !englishProgress.trim()}
            label="진도 저장"
          />
        </div>
      )}
    </SectionCard>
  )
}

function resolveHomeworkFields(
  homeworkRecord?: HomeworkRecord,
  assignmentRecord?: TodayAssignmentRecord,
): { previous: string; today: string } {
  const previous = homeworkRecord ? getHomeworkContent(homeworkRecord).trim() : ''

  if (!assignmentRecord) {
    return { previous, today: '' }
  }

  const assignment1 = (assignmentRecord.assignment1 ?? '').trim()
  const assignment2 = (assignmentRecord.assignment2 ?? '').trim()

  if (previous) {
    return { previous, today: assignment2 || assignment1 }
  }

  if (assignment1 && assignment2) {
    return { previous: '', today: `${assignment1}\n${assignment2}` }
  }

  return { previous: '', today: assignment1 || assignment2 }
}

function hasHomeworkDisplayData(
  homeworkRecord: HomeworkRecord | undefined,
  previousAssignment: string,
  todayAssignment: string,
): boolean {
  return Boolean(
    homeworkRecord?.status || previousAssignment.trim() || todayAssignment.trim(),
  )
}

function HomeworkAssignmentSection({
  readOnly,
  homeworkRecord,
  assignmentRecord,
  studentId,
  date,
  onSaveHomework,
  onSaveTodayAssignment,
}: {
  readOnly: boolean
  homeworkRecord?: HomeworkRecord
  assignmentRecord?: TodayAssignmentRecord
  studentId: string
  date: string
  onSaveHomework: ReturnType<typeof useData>['saveHomeworkRecord']
  onSaveTodayAssignment: ReturnType<typeof useData>['saveTodayAssignmentRecord']
}) {
  const [status, setStatus] = useState<HomeworkStatus | ''>(homeworkRecord?.status ?? '')
  const [previousAssignment, setPreviousAssignment] = useState('')
  const [todayAssignment, setTodayAssignment] = useState('')

  useEffect(() => {
    const fields = resolveHomeworkFields(homeworkRecord, assignmentRecord)
    setStatus(homeworkRecord?.status ?? '')
    setPreviousAssignment(fields.previous)
    setTodayAssignment(fields.today)
  }, [assignmentRecord, homeworkRecord])

  const readOnlyFields = useMemo(
    () => resolveHomeworkFields(homeworkRecord, assignmentRecord),
    [homeworkRecord, assignmentRecord],
  )
  const displayPrevious = readOnly ? readOnlyFields.previous : previousAssignment
  const displayToday = readOnly ? readOnlyFields.today : todayAssignment

  const handleSave = () => {
    if (!status) return
    onSaveHomework(
      homeworkRecordToSavePayload({
        id: homeworkRecord?.id,
        studentId,
        date,
        content: previousAssignment,
        status,
        teacherMemo: homeworkRecord?.teacherMemo ?? '',
      }),
    )
    onSaveTodayAssignment({
      id: assignmentRecord?.id,
      studentId,
      date,
      assignment1: '',
      assignment2: todayAssignment.trim(),
    })
  }

  const hasReadContent = hasHomeworkDisplayData(
    homeworkRecord,
    displayPrevious,
    displayToday,
  )

  return (
    <SectionCard title="숙제 수행 결과">
      {readOnly ? (
        <ParentReadOnlyBody
          hasData={hasReadContent}
          emptyMessage={PARENT_EMPTY_MESSAGES.homework}
        >
          {() => (
            <div className="space-y-3">
              {homeworkRecord?.status && (
                <StatusBadge
                  label={homeworkRecord.status}
                  colorClass={getHomeworkColor(homeworkRecord.status)}
                />
              )}
              {displayPrevious.trim() && (
                <div>
                  <p className="text-xs font-semibold text-navy-700">숙제 내용</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {displayPrevious}
                  </p>
                </div>
              )}
              {displayToday.trim() && (
                <div>
                  <p className="text-xs font-semibold text-navy-700">오늘 해야 할 과제</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {displayToday}
                  </p>
                </div>
              )}
            </div>
          )}
        </ParentReadOnlyBody>
      ) : (
        <div className="space-y-4">
          <HomeworkStatusPicker value={status} onChange={setStatus} />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-800">
              ① 지난 과제
            </label>
            <p className="mb-2 text-xs text-slate-500">
              이전에 내준 숙제 내용을 기록해 주세요.
            </p>
            <textarea
              value={previousAssignment}
              onChange={(e) => setPreviousAssignment(e.target.value)}
              rows={3}
              placeholder="예: 3단원 연습문제 1~10번"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-navy-800">
              ② 오늘 해야 할 과제
            </label>
            <p className="mb-2 text-xs text-slate-500">
              오늘 새롭게 내주는 숙제를 기록해 주세요.
            </p>
            <textarea
              value={todayAssignment}
              onChange={(e) =>
                setTodayAssignment(e.target.value.slice(0, TODAY_ASSIGNMENT_MAX_LENGTH))
              }
              rows={3}
              placeholder="예: 4단원 개념 정리 및 예제 풀이"
              className={inputClass()}
            />
          </div>
          <SaveButton onClick={handleSave} disabled={!status} label="과제 저장" />
        </div>
      )}
    </SectionCard>
  )
}

function ClassNoteSection({
  readOnly,
  record,
  studentId,
  date,
  onSave,
}: {
  readOnly: boolean
  record?: ClassNoteRecord
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveClassNoteRecord']
}) {
  const [hasClassNote, setHasClassNote] = useState(record?.hasClassNote ?? false)
  const [note, setNote] = useState(record?.note ?? '')
  const [noteError, setNoteError] = useState('')

  useEffect(() => {
    setHasClassNote(record?.hasClassNote ?? false)
    setNote(record?.note ?? '')
    setNoteError('')
  }, [record])

  const handleSave = () => {
    if (hasClassNote && !note.trim()) {
      setNoteError('특이사항 내용을 입력해 주세요.')
      return
    }
    setNoteError('')
    const preservedNote = hasClassNote ? note.trim() : (record?.note ?? note)
    onSave({
      id: record?.id,
      studentId,
      date,
      hasClassNote,
      note: preservedNote,
    })
  }

  const showParentNote = Boolean(record?.hasClassNote && record.note.trim())

  const sectionTitle = readOnly ? '선생님 코멘트' : '수업 중 특이사항'

  return (
    <SectionCard title={sectionTitle} emphasis={readOnly}>
      {readOnly ? (
        <ParentReadOnlyBody
          hasData={showParentNote}
          emptyMessage={PARENT_EMPTY_MESSAGES.classNote}
        >
          {() => (
            <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3.5 py-3.5 sm:px-4 sm:py-4">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                {record!.note}
              </p>
            </div>
          )}
        </ParentReadOnlyBody>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHasClassNote(false)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                !hasClassNote
                  ? 'border-navy-200 bg-navy-50 text-navy-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              특이사항 없음
            </button>
            <button
              type="button"
              onClick={() => setHasClassNote(true)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                hasClassNote
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              특이사항 있음
            </button>
          </div>
          {hasClassNote && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                특이사항 내용
              </label>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value.slice(0, CLASS_NOTE_MAX_LENGTH))
                  if (noteError) setNoteError('')
                }}
                rows={4}
                placeholder="수업 중 확인된 특이사항과 사유를 입력해 주세요."
                className={inputClass(noteError)}
              />
              <div className="mt-1 flex items-center justify-between gap-2">
                {noteError ? (
                  <p className="text-xs text-rose-500">{noteError}</p>
                ) : (
                  <span />
                )}
                <span className="text-xs text-slate-400">
                  {note.length}/{CLASS_NOTE_MAX_LENGTH}
                </span>
              </div>
            </div>
          )}
          <SaveButton onClick={handleSave} label="특이사항 저장" />
        </div>
      )}
    </SectionCard>
  )
}

function DailyTestParentSection({ record }: { record: DailyTestRecord }) {
  return (
    <div className="space-y-3">
      {record.testName && (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">{record.subject}</span> · {record.testName}
        </p>
      )}
      <DailyTestSessionGrid record={record} variant="parentReport" readOnly />
    </div>
  )
}

function DailyTestSection({
  readOnly,
  record,
  studentId,
  date,
  onSave,
}: {
  readOnly: boolean
  record?: DailyTestRecord
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveDailyTestRecord']
}) {
  const [form, setForm] = useState<DailyTestFormData>(() =>
    record ? dailyTestRecordToForm(record) : { ...emptyDailyTestForm(), studentId, date },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setForm(record ? dailyTestRecordToForm(record) : { ...emptyDailyTestForm(), studentId, date })
    setErrors({})
  }, [date, record, studentId])

  const handleSave = () => {
    const sessionErrors = validateDailyTestSessions(form.sessionResults)
    const nextErrors: Record<string, string> = { ...sessionErrors }
    if (!form.testName.trim()) nextErrors.testName = '시험명을 입력해 주세요.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onSave(
      dailyTestFormToSavePayload({
        ...form,
        id: record?.id,
        studentId,
        date,
      }),
    )
  }

  return (
    <SectionCard
      title="일일 테스트"
      titleExtra={readOnly ? undefined : <DailyTestPassRuleBadge />}
      compact={readOnly}
    >
      {readOnly ? (
        <ParentReadOnlyBody
          hasData={hasDailyTestDisplayData(record)}
          emptyMessage={PARENT_EMPTY_MESSAGES.dailyTest}
        >
          {() => <DailyTestParentSection record={record!} />}
        </ParentReadOnlyBody>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">과목</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass()}
              >
                {SUBJECTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">시험명 *</label>
              <input
                value={form.testName}
                onChange={(e) => setForm({ ...form, testName: e.target.value })}
                className={inputClass(errors.testName)}
              />
              {errors.testName && <p className="mt-1 text-xs text-rose-500">{errors.testName}</p>}
            </div>
          </div>
          <DailyTestSessionFormSection
            sessions={form.sessionResults}
            onChange={(sessionResults: TestSessionResult[]) =>
              setForm({ ...form, sessionResults })
            }
            errors={errors}
          />
          <textarea
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            placeholder="메모 (선택)"
            rows={2}
            className={inputClass()}
          />
          <SaveButton onClick={handleSave} label="일일테스트 저장" />
          {record && (
            <p className="text-xs text-slate-400">
              최종 결과: {migrateSessionResults(record).filter((s) => s.status === '합격').length}
              차시 통과
            </p>
          )}
        </div>
      )}
    </SectionCard>
  )
}
