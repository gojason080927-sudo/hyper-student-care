import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DailyTestSessionFormSection,
  validateDailyTestSessions,
  DailyTestPassRuleBadge,
} from '../dailytest/DailyTestSessionFormSection'
import {
  TeacherMobileDailyTestSessionForm,
  type TeacherMobileDailyTestSessionFormRef,
} from '../teacherMobile/TeacherMobileDailyTestSessionForm'
import { DailyTestSessionGrid } from '../dailytest/DailyTestSessionGrid'
import { DailyLearningDiagnosisFields } from '../diagnosis/DailyLearningDiagnosisFields'
import { HomeworkStatusPicker } from '../homework/HomeworkStatusPicker'
import { KoreanTextInput, KoreanTextarea } from '../ui/KoreanTextField'
import { HeroProgressBar } from '../ui/HeroProgressBar'
import { StatusBadge } from '../ui/StatusBadge'
import { TextbookSlotHomeworkSection } from './TextbookSlotHomeworkSection'
import { TextbookSlotProgressSection } from './TextbookSlotProgressSection'
import { TodayReportErrorBoundary } from './TodayReportErrorBoundary'
import { useData } from '../../hooks/useData'
import { useParentTodayReportAutoRefresh } from '../../hooks/useParentTodayReportAutoRefresh'
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
import type { ClassTodayReportSyncContext } from '../../utils/classTodayReportCommon'
import type { TextbookDisplayClassContext } from '../../utils/textbookSlots'
import { TEACHER_MOBILE_VISIBLE_SLOTS } from '../../utils/teacherMobileTextbookSlots'
import {
  addDays,
  compareDateStrings,
  formatKoreanDateLong,
  getTodayString,
  isToday,
} from '../../utils/date'
import { addDaysInSeoul, getSeoulDateString, isTodaySeoul } from '../../utils/seoulDate'
import {
  dailyTestFormToSavePayload,
  dailyTestRecordToForm,
  emptyDailyTestForm,
  hasDailyTestDisplayData,
  normalizeSessionResultsForForm,
  type DailyTestFormData,
} from '../../utils/dailyTest'
import {
  mobileDailyTestFormToSavePayload,
  sessionsToMobileDailyTestRounds,
} from '../../utils/teacherMobileDailyTest'
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

type MobileReportSection = 'attendance' | 'homework' | 'progress' | 'dailyTest' | 'classNote'

type TodayReportViewProps = {
  student: Student
  readOnly?: boolean
  initialDate?: string
  dateMode?: 'picker' | 'navigate'
  errorFallbackHomePath?: string
  hideHeader?: boolean
  classNoteExtraActions?: ReactNode
  /** 강사용 Today Report 반별 통합입력 화면에서만 true */
  compactTeacherInput?: boolean
  /** 반별 공통 진도·과제 연동 (반별 통합입력) */
  classSync?: ClassTodayReportSyncContext
  /** 강사용 모바일 PWA: 단일 섹션만 렌더 (아코디언 내부) */
  mobileSection?: MobileReportSection
}

function compactInputClass(error?: string) {
  return `${inputClass(error)} min-h-9 py-1.5 text-sm`
}

function compactTextareaClass(error?: string) {
  return `${inputClass(error)} min-h-[2.75rem] resize-y py-1.5 text-sm leading-snug`
}

function SectionCard({
  title,
  titleExtra,
  children,
  compact = false,
  emphasis = false,
  teacherCompact = false,
  hideTitle = false,
}: {
  title: string
  titleExtra?: React.ReactNode
  children: React.ReactNode
  compact?: boolean
  emphasis?: boolean
  teacherCompact?: boolean
  hideTitle?: boolean
}) {
  const padding = teacherCompact
    ? 'px-3 py-2'
    : emphasis
      ? 'px-4 py-4 sm:px-5 sm:py-5'
      : compact
        ? 'px-4 py-3'
        : 'p-4 sm:p-5'

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${padding} ${
        teacherCompact ? 'rounded-xl' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        {!hideTitle && (
          <h2
            className={`font-bold text-navy-900 ${
              teacherCompact ? 'text-sm' : compact ? 'text-base mb-0' : 'text-base'
            }`}
          >
            {title}
          </h2>
        )}
        {titleExtra}
      </div>
      <div className={hideTitle ? '' : teacherCompact ? 'mt-1.5' : compact ? 'mt-2' : 'mt-3'}>
        {children}
      </div>
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
  compact = false,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
  compact?: boolean
}) {
  const { isSaving } = useData()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      className={
        compact
          ? `${btnPrimary} min-h-9 px-3 py-1.5 text-sm`
          : `${btnPrimary} min-h-11`
      }
    >
      <Save className={`mr-1 inline shrink-0 ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
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
  hideHeader = false,
  classNoteExtraActions,
  compactTeacherInput = false,
  classSync,
  mobileSection,
}: TodayReportViewProps) {
  const today = readOnly ? getSeoulDateString() : getTodayString()
  const [selectedDate, setSelectedDate] = useState(initialDate ?? today)
  const {
    attendance: attendanceRaw,
    progressRecords: progressRecordsRaw,
    homework: homeworkRaw,
    dailyTests: dailyTestsRaw,
    todayAssignments: todayAssignmentsRaw,
    classNotes: classNotesRaw,
    homeworkTextbookEntries: homeworkTextbookEntriesRaw,
    studentTextbookSlots: studentTextbookSlotsRaw,
    classTodayReportCommon,
    saveAttendanceRecord,
    saveProgressRecord,
    saveProgressRecordAsync,
    saveProgressSubjectWithClassSync,
    saveHomeworkRecord,
    saveHomeworkTextbookEntry,
    saveHomeworkTextbookEntryAsync,
    saveHomeworkSubjectWithClassSync,
    saveStudentTextbookSlot,
    saveDailyTestRecord,
    saveTodayAssignmentRecord,
    saveClassNoteRecord,
    refreshTodayReport,
    showToast,
  } = useData()

  const attendance = attendanceRaw ?? []
  const progressRecords = progressRecordsRaw ?? []
  const homework = homeworkRaw ?? []
  const dailyTests = dailyTestsRaw ?? []
  const todayAssignments = todayAssignmentsRaw ?? []
  const classNotes = classNotesRaw ?? []
  const homeworkTextbookEntries = homeworkTextbookEntriesRaw ?? []
  const studentTextbookSlots = studentTextbookSlotsRaw ?? []

  useEffect(() => {
    if (initialDate) setSelectedDate(initialDate)
  }, [initialDate])

  useEffect(() => {
    void refreshTodayReport(student.id, selectedDate)
  }, [refreshTodayReport, selectedDate, student.id])

  useParentTodayReportAutoRefresh({
    enabled: readOnly,
    studentId: student.id,
    selectedDate,
    onRefresh: refreshTodayReport,
  })

  const shiftSelectedDate = (delta: number) => {
    setSelectedDate((current) =>
      readOnly ? addDaysInSeoul(current, delta) : addDays(current, delta),
    )
  }

  const selectedDateIsToday = readOnly ? isTodaySeoul(selectedDate) : isToday(selectedDate)

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

  const studentSlots = useMemo(
    () => studentTextbookSlots.filter((slot) => slot.studentId === student.id),
    [student.id, studentTextbookSlots],
  )

  const studentHomeworkEntries = useMemo(
    () => homeworkTextbookEntries.filter((entry) => entry.studentId === student.id),
    [homeworkTextbookEntries, student.id],
  )

  const textbookClassContext = useMemo((): TextbookDisplayClassContext | undefined => {
    if (!student.grade.trim() || !student.className.trim()) return undefined
    return {
      grade: student.grade,
      className: student.className,
      commonRecords: classTodayReportCommon,
    }
  }, [classTodayReportCommon, student.className, student.grade])

  const canGoNext = compareDateStrings(selectedDate, today) < 0
  const dateLabel = `${formatKoreanDateLong(selectedDate)}${selectedDateIsToday ? ' · 오늘' : ''}`
  const tc = compactTeacherInput && !readOnly
  const useTextbookSlotHomework = tc || readOnly
  const useTextbookSlotProgress = tc || readOnly
  const embeddedMobile = Boolean(mobileSection)
  const visibleSlots = embeddedMobile ? TEACHER_MOBILE_VISIBLE_SLOTS : undefined
  const showSection = (section: MobileReportSection) =>
    !mobileSection || mobileSection === section
  const sectionHideTitle = embeddedMobile

  return (
    <div className={embeddedMobile ? '' : tc ? 'space-y-1.5' : 'space-y-3'}>
      {!hideHeader && !embeddedMobile &&
        (readOnly ? (
        <>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <button
              type="button"
              aria-label="이전 날짜"
              onClick={() => shiftSelectedDate(-1)}
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
              onClick={() => canGoNext && shiftSelectedDate(1)}
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
                    onClick={() => shiftSelectedDate(-1)}
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
                    onClick={() => canGoNext && shiftSelectedDate(1)}
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
      ))}

      <TodayReportErrorBoundary
        homePath={errorFallbackHomePath ?? '/'}
        resetKey={selectedDate}
      >
        <div className={tc ? 'space-y-1.5' : 'space-y-3'}>
          {showSection('attendance') && (
          <AttendanceSection
            key={`attendance-${selectedDate}`}
            readOnly={readOnly}
            record={dayAttendance}
            studentId={student.id}
            date={selectedDate}
            onSave={saveAttendanceRecord}
            teacherCompact={tc}
            hideTitle={sectionHideTitle}
          />
          )}

          {showSection('homework') && (useTextbookSlotHomework ? (
            <TextbookSlotHomeworkSection
              key={`homework-slots-${selectedDate}`}
              readOnly={readOnly}
              studentId={student.id}
              date={selectedDate}
              slots={studentSlots}
              entries={studentHomeworkEntries}
              classContext={textbookClassContext}
              classSync={classSync}
              onSaveEntry={saveHomeworkTextbookEntry}
              onSaveEntryAsync={saveHomeworkTextbookEntryAsync}
              onSaveSubjectWithClassSync={
                classSync
                  ? (subject, slots) =>
                      saveHomeworkSubjectWithClassSync(
                        student.id,
                        classSync,
                        selectedDate,
                        subject,
                        slots,
                      )
                  : undefined
              }
              onSaveSlot={saveStudentTextbookSlot}
              onNotify={showToast}
              hideTitle={sectionHideTitle}
              visibleSlots={visibleSlots}
              useMobileStatusPicker={embeddedMobile}
            />
          ) : (
            <HomeworkAssignmentSection
              key={`homework-${selectedDate}`}
              readOnly={readOnly}
              homeworkRecord={dayHomework}
              assignmentRecord={dayAssignment}
              studentId={student.id}
              date={selectedDate}
              onSaveHomework={saveHomeworkRecord}
              onSaveTodayAssignment={saveTodayAssignmentRecord}
              teacherCompact={tc}
            />
          ))}

          {showSection('progress') && (useTextbookSlotProgress ? (
            <TextbookSlotProgressSection
              key={`progress-slots-${selectedDate}`}
              readOnly={readOnly}
              studentId={student.id}
              date={selectedDate}
              slots={studentSlots}
              progressRecords={dayProgressList}
              classContext={textbookClassContext}
              classSync={classSync}
              onSave={saveProgressRecord}
              onSaveAsync={saveProgressRecordAsync}
              onSaveSubjectWithClassSync={
                classSync
                  ? (subject, teacherMemo, slots) =>
                      saveProgressSubjectWithClassSync(
                        student.id,
                        classSync,
                        selectedDate,
                        subject,
                        teacherMemo,
                        slots,
                      )
                  : undefined
              }
              onSaveSlot={saveStudentTextbookSlot}
              onNotify={showToast}
              hideTitle={sectionHideTitle}
              visibleSlots={visibleSlots}
            />
          ) : (
            <ProgressSection
              key={`progress-${selectedDate}`}
              readOnly={readOnly}
              records={dayProgressList}
              studentId={student.id}
              date={selectedDate}
              onSave={saveProgressRecord}
              teacherCompact={tc}
            />
          ))}

          {showSection('dailyTest') && (
          <DailyTestSection
            key={`daily-test-${selectedDate}`}
            readOnly={readOnly}
            record={dayDailyTest}
            studentId={student.id}
            date={selectedDate}
            onSave={saveDailyTestRecord}
            teacherCompact={tc}
            hideTitle={sectionHideTitle}
            useMobileDailyTestInput={mobileSection === 'dailyTest'}
          />
          )}

          {showSection('classNote') && (
          <ClassNoteSection
            key={`class-note-${selectedDate}`}
            readOnly={readOnly}
            record={dayClassNote}
            studentId={student.id}
            date={selectedDate}
            onSave={saveClassNoteRecord}
            extraActions={classNoteExtraActions}
            teacherCompact={tc}
            hideTitle={sectionHideTitle}
          />
          )}
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
  teacherCompact = false,
  hideTitle = false,
}: {
  readOnly: boolean
  record?: AttendanceRecord
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveAttendanceRecord']
  teacherCompact?: boolean
  hideTitle?: boolean
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
    <SectionCard title="오늘 출결" teacherCompact={teacherCompact} hideTitle={hideTitle}>
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
      ) : teacherCompact ? (
        <div className="space-y-2">
          <div className="flex flex-nowrap gap-1.5">
            {ATTENDANCE_STATUSES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setStatus(item)}
                className={`min-h-9 flex-1 rounded-lg border px-2 py-1 text-sm font-medium ${
                  status === item
                    ? getAttendanceColor(item)
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="사유 (선택)"
              className={`${compactInputClass()} min-w-0 flex-1`}
            />
            <div className="flex w-full justify-end sm:w-auto">
              <SaveButton onClick={handleSave} disabled={!status} label="출결 저장" compact />
            </div>
          </div>
        </div>
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
          <div className="flex justify-end">
            <SaveButton onClick={handleSave} disabled={!status} label="출결 저장" />
          </div>
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
  teacherCompact = false,
}: {
  icon: string
  subject: string
  children: React.ReactNode
  teacherCompact?: boolean
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-slate-50/60 ${
        teacherCompact ? 'p-2' : 'p-3 sm:p-3.5'
      }`}
    >
      <ProgressSubjectLabel icon={icon} subject={subject} />
      <div className={`flex min-h-0 flex-1 flex-col ${teacherCompact ? 'mt-1' : 'mt-2'}`}>
        {children}
      </div>
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
  teacherCompact = false,
}: {
  readOnly: boolean
  records: ProgressRecord[]
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveProgressRecord']
  teacherCompact?: boolean
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
      slotNumber: record?.slotNumber ?? 1,
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
    <SectionCard title="오늘의 진도" teacherCompact={teacherCompact}>
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
        <div className={teacherCompact ? 'space-y-2' : 'space-y-3'}>
          <div
            className={`grid grid-cols-1 items-stretch sm:grid-cols-2 ${
              teacherCompact ? 'gap-2' : 'gap-3 sm:gap-4'
            }`}
          >
            <ProgressSubjectColumn icon="📘" subject="수학" teacherCompact={teacherCompact}>
              <label
                htmlFor="today-progress-math"
                className={`block font-semibold text-navy-800 ${
                  teacherCompact ? 'mb-0.5 text-[11px]' : 'mb-1 text-xs'
                }`}
              >
                진도 과정
              </label>
              <textarea
                id="today-progress-math"
                value={mathProgress}
                onChange={(e) => setMathProgress(e.target.value)}
                rows={teacherCompact ? 2 : 2}
                placeholder="예) 쎈수학 중2-2 35~42쪽"
                lang="ko"
                className={
                  teacherCompact
                    ? `${compactTextareaClass()} flex-1`
                    : `${progressTextareaClass} flex-1`
                }
              />
            </ProgressSubjectColumn>
            <ProgressSubjectColumn icon="📗" subject="영어" teacherCompact={teacherCompact}>
              <label
                htmlFor="today-progress-subject-en"
                className={`block font-semibold text-navy-800 ${
                  teacherCompact ? 'mb-0.5 text-[11px]' : 'mb-1 text-xs'
                }`}
              >
                진도 과정
              </label>
              <KoreanTextarea
                id="today-progress-subject-en"
                value={englishProgress}
                onChange={(e) => setEnglishProgress(e.target.value)}
                rows={teacherCompact ? 2 : 2}
                placeholder="예) 워드마스터 하이스트 3강"
                className={
                  teacherCompact
                    ? `${compactTextareaClass()} flex-1`
                    : `${progressTextareaClass} flex-1`
                }
              />
            </ProgressSubjectColumn>
          </div>

          <div className={teacherCompact ? 'pt-1' : 'border-t border-slate-100 pt-3'}>
            <label
              htmlFor="today-progress-memo"
              className={`block font-semibold text-slate-600 ${
                teacherCompact ? 'mb-0.5 text-[11px]' : 'mb-1 text-xs'
              }`}
            >
              강사 메모 (선택)
            </label>
            <textarea
              id="today-progress-memo"
              value={teacherMemo}
              onChange={(e) => setTeacherMemo(e.target.value)}
              placeholder="강사 메모 (선택)"
              rows={teacherCompact ? 1 : 2}
              lang="ko"
              className={teacherCompact ? compactTextareaClass() : inputClass()}
            />
          </div>
          <div className="flex justify-end">
            <SaveButton
              onClick={handleSave}
              disabled={!mathProgress.trim() && !englishProgress.trim()}
              label="진도 저장"
              compact={teacherCompact}
            />
          </div>
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
  teacherCompact = false,
}: {
  readOnly: boolean
  homeworkRecord?: HomeworkRecord
  assignmentRecord?: TodayAssignmentRecord
  studentId: string
  date: string
  onSaveHomework: ReturnType<typeof useData>['saveHomeworkRecord']
  onSaveTodayAssignment: ReturnType<typeof useData>['saveTodayAssignmentRecord']
  teacherCompact?: boolean
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
    <SectionCard title="숙제 수행 결과" teacherCompact={teacherCompact}>
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
      ) : teacherCompact ? (
        <div className="space-y-2">
          <HomeworkStatusPicker value={status} onChange={setStatus} compact />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-xs font-semibold text-navy-800">① 지난 과제</label>
              <input
                value={previousAssignment}
                onChange={(e) => setPreviousAssignment(e.target.value)}
                placeholder="예: 3단원 연습문제 1~10번"
                className={compactInputClass()}
              />
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-semibold text-navy-800">
                ② 오늘 해야 할 과제
              </label>
              <input
                value={todayAssignment}
                onChange={(e) =>
                  setTodayAssignment(e.target.value.slice(0, TODAY_ASSIGNMENT_MAX_LENGTH))
                }
                placeholder="예: 4단원 개념 정리"
                className={compactInputClass()}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <SaveButton onClick={handleSave} disabled={!status} label="과제 저장" compact />
          </div>
        </div>
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
          <div className="flex justify-end">
            <SaveButton onClick={handleSave} disabled={!status} label="과제 저장" />
          </div>
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
  extraActions,
  teacherCompact = false,
  hideTitle = false,
}: {
  readOnly: boolean
  record?: ClassNoteRecord
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveClassNoteRecord']
  extraActions?: ReactNode
  teacherCompact?: boolean
  hideTitle?: boolean
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
  const showNoSpecialNote = Boolean(record && !record.hasClassNote)

  const sectionTitle = '수업 중 특이사항'

  return (
    <div className="min-w-0 max-w-full">
      <SectionCard title={sectionTitle} emphasis={readOnly} teacherCompact={teacherCompact} hideTitle={hideTitle}>
      {readOnly ? (
        <ParentReadOnlyBody
          hasData={showParentNote || showNoSpecialNote}
          emptyMessage={PARENT_EMPTY_MESSAGES.classNote}
        >
          {() =>
            showNoSpecialNote ? (
              <p className="text-sm font-medium text-slate-600">특이사항 없음</p>
            ) : (
              <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-amber-100 bg-amber-50/40 px-3.5 py-3.5 sm:px-4 sm:py-4">
                <p className="max-w-full whitespace-pre-wrap break-anywhere text-[15px] leading-relaxed text-slate-800">
                  {record!.note}
                </p>
              </div>
            )
          }
        </ParentReadOnlyBody>
      ) : (
        <div className={teacherCompact ? 'space-y-2' : 'space-y-3'}>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setHasClassNote(false)}
              className={`rounded-lg border font-medium ${
                teacherCompact ? 'min-h-9 px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm'
              } ${
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
              className={`rounded-lg border font-medium ${
                teacherCompact ? 'min-h-9 px-2.5 py-1 text-sm' : 'px-3 py-1.5 text-sm'
              } ${
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
              <label className="mb-0.5 block text-xs font-semibold text-slate-600">
                특이사항 내용
              </label>
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value.slice(0, CLASS_NOTE_MAX_LENGTH))
                  if (noteError) setNoteError('')
                }}
                rows={teacherCompact ? 2 : 4}
                placeholder="수업 중 확인된 특이사항과 사유를 입력해 주세요."
                className={teacherCompact ? compactTextareaClass(noteError) : inputClass(noteError)}
              />
              <div className="mt-0.5 flex items-center justify-between gap-2">
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
          <div className="flex flex-wrap items-start justify-end gap-2">
            <SaveButton onClick={handleSave} label="특이사항 저장" compact={teacherCompact} />
            {extraActions}
          </div>
        </div>
      )}
      </SectionCard>
    </div>
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
  teacherCompact = false,
  hideTitle = false,
  useMobileDailyTestInput = false,
}: {
  readOnly: boolean
  record?: DailyTestRecord
  studentId: string
  date: string
  onSave: ReturnType<typeof useData>['saveDailyTestRecord']
  teacherCompact?: boolean
  hideTitle?: boolean
  useMobileDailyTestInput?: boolean
}) {
  const [form, setForm] = useState<DailyTestFormData>(() => {
    if (record) {
      const loaded = dailyTestRecordToForm(record)
      return { ...loaded, sessionResults: normalizeSessionResultsForForm(loaded.sessionResults) }
    }
    return { ...emptyDailyTestForm(), studentId, date }
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const mobileDailyTestRef = useRef<TeacherMobileDailyTestSessionFormRef>(null)

  useEffect(() => {
    if (record) {
      const loaded = dailyTestRecordToForm(record)
      setForm({
        ...loaded,
        studentId,
        date,
        sessionResults: normalizeSessionResultsForForm(loaded.sessionResults),
      })
    } else {
      setForm({ ...emptyDailyTestForm(), studentId, date })
    }
    setErrors({})
  }, [date, record, studentId])

  const handleSave = () => {
    const committedSessions = useMobileDailyTestInput
      ? (mobileDailyTestRef.current?.commitToSessionResults() ?? form.sessionResults)
      : form.sessionResults
    const sessionErrors = validateDailyTestSessions(committedSessions)
    const nextErrors: Record<string, string> = { ...sessionErrors }
    if (!form.testName.trim()) nextErrors.testName = '시험명을 입력해 주세요.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload = useMobileDailyTestInput
      ? mobileDailyTestFormToSavePayload(
          {
            ...form,
            id: record?.id,
            studentId,
            date,
          },
          mobileDailyTestRef.current?.getRounds() ??
            sessionsToMobileDailyTestRounds(form.sessionResults),
        )
      : dailyTestFormToSavePayload({
          ...form,
          id: record?.id,
          studentId,
          date,
          sessionResults: committedSessions,
        })

    onSave(payload)
    setForm((prev) => ({
      ...prev,
      sessionResults: useMobileDailyTestInput
        ? payload.sessionResults
        : normalizeSessionResultsForForm(payload.sessionResults),
    }))
  }

  return (
    <SectionCard
      title="일일 테스트"
      titleExtra={readOnly ? undefined : <DailyTestPassRuleBadge />}
      compact={readOnly}
      teacherCompact={teacherCompact}
      hideTitle={hideTitle}
    >
      {readOnly ? (
        <ParentReadOnlyBody
          hasData={hasDailyTestDisplayData(record)}
          emptyMessage={PARENT_EMPTY_MESSAGES.dailyTest}
        >
          {() => <DailyTestParentSection record={record!} />}
        </ParentReadOnlyBody>
      ) : (
        <div className={teacherCompact ? 'space-y-1.5' : 'space-y-2'}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-600">과목</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={teacherCompact ? compactInputClass() : inputClass()}
              >
                {SUBJECTS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-xs font-medium text-slate-600">시험명 *</label>
              <KoreanTextInput
                value={form.testName}
                onChange={(e) => setForm({ ...form, testName: e.target.value })}
                className={teacherCompact ? compactInputClass(errors.testName) : inputClass(errors.testName)}
              />
              {errors.testName && <p className="mt-0.5 text-xs text-rose-500">{errors.testName}</p>}
            </div>
          </div>
          {useMobileDailyTestInput ? (
            <TeacherMobileDailyTestSessionForm
              ref={mobileDailyTestRef}
              sessions={form.sessionResults}
              errors={errors}
            />
          ) : (
            <DailyTestSessionFormSection
              sessions={form.sessionResults}
              onChange={(sessionResults: TestSessionResult[]) =>
                setForm((prev) => ({
                  ...prev,
                  sessionResults: normalizeSessionResultsForForm(sessionResults),
                }))
              }
              errors={errors}
              compact={teacherCompact}
              showHeader={!teacherCompact}
            />
          )}
          <textarea
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            placeholder="메모 (선택)"
            rows={teacherCompact ? 1 : 2}
            className={teacherCompact ? compactTextareaClass() : inputClass()}
          />
          <DailyLearningDiagnosisFields
            subject={form.subject}
            value={form.learningDiagnosis}
            onChange={(learningDiagnosis) => setForm({ ...form, learningDiagnosis })}
            compact={teacherCompact}
          />
          <div className="flex justify-end">
            <SaveButton onClick={handleSave} label="일일테스트 저장" compact={teacherCompact} />
          </div>
        </div>
      )}
    </SectionCard>
  )
}
