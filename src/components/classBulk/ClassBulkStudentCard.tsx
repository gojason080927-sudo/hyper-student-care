import type { ReactNode } from 'react'
import { DailyTestPassRuleBadge } from '../dailytest/DailyTestSessionFormSection'
import { StudentParentLinkToolbar } from '../students/StudentParentLinkToolbar'
import { ClassBulkDailyTestCompact } from './ClassBulkDailyTestCompact'
import { normalizeSessionResultsForForm } from '../../utils/dailyTest'
import type { ClassBulkStudentDraft } from '../../types/classBulk'
import type { Student } from '../../types/student'
import type { AttendanceStatus, HomeworkStatus } from '../../types/records'
import {
  ATTENDANCE_STATUSES,
  HOMEWORK_STATUSES,
  btnPrimary,
  getAttendanceButtonSelectedClass,
  inputClass,
} from '../../utils/labels'
import { homeworkStatusStyles } from '../homework/HomeworkStatusButtons'
import { HomeworkResultEditor } from '../homework/HomeworkResultFields'
import { TODAY_REPORT_CONTENT_INPUT_EMPHASIS_CLASS } from '../../utils/homeworkCardTypography'

export type ClassBulkCardSyncStatus = 'unsaved' | 'saved' | 'modified' | 'failed'

type ClassBulkStudentCardProps = {
  student: Student
  draft: ClassBulkStudentDraft
  syncStatus: ClassBulkCardSyncStatus
  onChange: (draft: ClassBulkStudentDraft) => void
  onSave: () => void
  isSaving?: boolean
  saveError?: string
}

const compactInput = `${inputClass()} py-1.5 text-xs`
const compactTextarea = `${compactInput} resize-none leading-snug`

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{children}</p>
  )
}

function Divider() {
  return <hr className="my-2 border-slate-100" />
}

function SyncBadge({ status }: { status: ClassBulkCardSyncStatus }) {
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <span aria-hidden>🟢</span> 저장 완료
      </span>
    )
  }
  if (status === 'modified') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
        <span aria-hidden>🔴</span> 수정됨
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
        <span aria-hidden>🔴</span> 저장 실패
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
      <span aria-hidden>🔴</span> 미저장
    </span>
  )
}

function CompactAttendanceButton({
  status,
  selected,
  onClick,
}: {
  status: AttendanceStatus
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-8 rounded-lg border px-1 py-1 text-[11px] font-semibold transition ${
        selected
          ? getAttendanceButtonSelectedClass(status)
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
      }`}
    >
      {status}
    </button>
  )
}

function CompactHomeworkButton({
  status,
  selected,
  onClick,
}: {
  status: HomeworkStatus
  selected: boolean
  onClick: () => void
}) {
  const styles = homeworkStatusStyles[status]
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-8 flex-1 rounded-lg border px-1 py-1 text-[11px] font-semibold transition ${
        selected ? styles.selected : styles.unselected
      }`}
    >
      {status}
    </button>
  )
}

export function ClassBulkStudentCard({
  student,
  draft,
  syncStatus,
  onChange,
  onSave,
  isSaving = false,
  saveError,
}: ClassBulkStudentCardProps) {
  const patch = (partial: Partial<ClassBulkStudentDraft>) => onChange({ ...draft, ...partial })

  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-md shadow-slate-200/50">
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="min-w-0">
          <h4 className="truncate text-base font-bold text-navy-900">{student.name}</h4>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {student.school} {student.grade}
          </p>
          <p className="text-[11px] font-medium text-slate-400">{student.className}</p>
        </div>
        <SyncBadge status={syncStatus} />
      </div>

      <StudentParentLinkToolbar student={student} />

      <div className="flex flex-1 flex-col gap-0 text-xs">
        <section>
          <SectionLabel>출결</SectionLabel>
          <div className="grid grid-cols-4 gap-1">
            {ATTENDANCE_STATUSES.map((status) => (
              <CompactAttendanceButton
                key={status}
                status={status}
                selected={draft.attendanceStatus === status}
                onClick={() => patch({ attendanceStatus: status })}
              />
            ))}
          </div>
          <input
            type="text"
            value={draft.attendanceReason}
            onChange={(e) => patch({ attendanceReason: e.target.value })}
            placeholder="사유"
            className={`${compactInput} mt-1.5`}
          />
        </section>

        <Divider />

        <section>
          <SectionLabel>오늘의 진도</SectionLabel>
          <div className="space-y-1.5">
            <div>
              <p className="mb-0.5 text-[11px] text-slate-600">수학</p>
              <textarea
                rows={2}
                value={draft.mathProgress}
                onChange={(e) => patch({ mathProgress: e.target.value })}
                className={compactTextarea}
                placeholder="수학"
              />
            </div>
            <div>
              <p className="mb-0.5 text-[11px] text-slate-600">영어</p>
              <textarea
                rows={2}
                value={draft.englishProgress}
                onChange={(e) => patch({ englishProgress: e.target.value })}
                className={compactTextarea}
                placeholder="영어"
              />
            </div>
          </div>
        </section>

        <Divider />

        <section>
          <HomeworkResultEditor
            pastControls={
              <div className="flex flex-wrap gap-1">
                {HOMEWORK_STATUSES.map((status) => (
                  <CompactHomeworkButton
                    key={status}
                    status={status}
                    selected={draft.homeworkStatus === status}
                    onClick={() => patch({ homeworkStatus: status })}
                  />
                ))}
              </div>
            }
            todayControls={
              <textarea
                rows={2}
                value={draft.todayAssignment}
                onChange={(e) => patch({ todayAssignment: e.target.value })}
                className={`${compactTextarea} ${TODAY_REPORT_CONTENT_INPUT_EMPHASIS_CLASS}`}
                placeholder="오늘 과제"
              />
            }
          />
        </section>

        <Divider />

        <section>
          <SectionLabel>특이사항</SectionLabel>
          <textarea
            rows={2}
            value={draft.classNote}
            onChange={(e) => patch({ classNote: e.target.value })}
            className={compactTextarea}
            placeholder="특이사항"
          />
        </section>

        <Divider />

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-1">
            <SectionLabel>일일테스트</SectionLabel>
            <DailyTestPassRuleBadge />
          </div>
          <ClassBulkDailyTestCompact
            key={`${draft.studentId}-${draft.recordIds.dailyTest ?? 'new'}`}
            sessions={draft.sessionResults}
            onChange={(sessionResults) =>
              patch({ sessionResults: normalizeSessionResultsForForm(sessionResults) })
            }
          />
        </section>
      </div>

      {saveError && <p className="mt-1 text-[11px] text-rose-500">{saveError}</p>}

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={`${btnPrimary} mt-3 w-full min-h-9 text-xs`}
      >
        {isSaving ? '저장 중…' : '학생 저장'}
      </button>
    </article>
  )
}

export function draftToSnapshot(draft: ClassBulkStudentDraft): string {
  return JSON.stringify({
    attendanceStatus: draft.attendanceStatus,
    attendanceReason: draft.attendanceReason,
    mathProgress: draft.mathProgress,
    englishProgress: draft.englishProgress,
    progressTeacherMemo: draft.progressTeacherMemo,
    homeworkStatus: draft.homeworkStatus,
    previousAssignment: draft.previousAssignment,
    todayAssignment: draft.todayAssignment,
    classNote: draft.classNote,
    sessionResults: draft.sessionResults,
    dailyTestName: draft.dailyTestName,
    dailyTestSubject: draft.dailyTestSubject,
    dailyTestMemo: draft.dailyTestMemo,
  })
}

export function resolveSyncStatus(
  studentId: string,
  draft: ClassBulkStudentDraft,
  snapshots: Record<string, string>,
  failedIds: Set<string>,
): ClassBulkCardSyncStatus {
  if (failedIds.has(studentId)) return 'failed'
  const snapshot = snapshots[studentId]
  if (!snapshot) return 'unsaved'
  return draftToSnapshot(draft) === snapshot ? 'saved' : 'modified'
}
