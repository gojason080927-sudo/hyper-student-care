import { useEffect, useMemo, useRef, useState } from 'react'
import { HomeworkStatusButtons } from '../homework/HomeworkStatusButtons'
import { useData } from '../../hooks/useData'
import type {
  HomeworkStatus,
  TextbookSlotNumber,
  TextbookSubject,
} from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import { getVisibleTextbookSubjects } from '../../utils/todayReportVisibleSubjects'
import {
  getTextbookSlotHeading,
  TEACHER_MOBILE_VISIBLE_SLOTS,
  getVisibleSlotNumbers,
} from '../../utils/teacherMobileTextbookSlots'
import { isHomeworkStatusSelected } from '../../utils/homework'
import { getTextbookName } from '../../utils/textbookSlots'
import { findHomeworkTextbookEntryForDisplay } from '../../utils/todayReportDisplayFallback'
import { isFollowOnInputRequired, isStudentAbsentOnDate } from '../../utils/todayReportAbsence'
import { applyHomeworkDrafts } from '../../utils/voiceInput/applyVoiceDraft'
import { AbsentFollowOnHint, StudentFollowOnRowHeader } from './AbsentFollowOnBadge'
import { SectionVoiceInput } from './SectionVoiceInput'
import { SubjectGroupCard, subjectGroupTitle } from './SubjectGroupCard'

type SlotDraft = {
  status: HomeworkStatus | ''
  entryId?: string
  todayAssignment: string
  previousAssignment: string
}

function draftKey(
  studentId: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
) {
  return `${studentId}:${subject}:${slotNumber}`
}

type ClassHomeworkStatusBulkPanelProps = {
  date: string
  grade: string
  className: string
  students: Student[]
  compact?: boolean
}

export function ClassHomeworkStatusBulkPanel({
  date,
  grade,
  className,
  students,
  compact = false,
}: ClassHomeworkStatusBulkPanelProps) {
  const {
    attendance,
    homeworkTextbookEntries,
    studentTextbookSlots,
    saveHomeworkTextbookEntryAsync,
    showToast,
  } = useData()
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, SlotDraft>>({})
  const anchorStudentId = students[0]?.id ?? ''

  const subjects = useMemo(
    () => getVisibleTextbookSubjects(className),
    [className],
  )

  const slotPlan = useMemo(() => {
    const plan: Array<{ subject: TextbookSubject; slotNumber: TextbookSlotNumber }> =
      []
    for (const subject of subjects) {
      for (const slotNumber of getVisibleSlotNumbers(
        subject,
        TEACHER_MOBILE_VISIBLE_SLOTS,
      )) {
        plan.push({ subject, slotNumber })
      }
    }
    return plan
  }, [subjects])

  const studentIdsKey = useMemo(
    () => students.map((s) => s.id).join('|'),
    [students],
  )
  const slotPlanKey = useMemo(
    () => slotPlan.map((s) => `${s.subject}-${s.slotNumber}`).join('|'),
    [slotPlan],
  )

  const slotTextbookLabels = useMemo(() => {
    const labels: Record<string, string> = {}
    for (const { subject, slotNumber } of slotPlan) {
      const heading =
        getTextbookSlotHeading(subject, slotNumber) ??
        `${subject} 교재 ${slotNumber}`
      const textbookName = anchorStudentId
          ? getTextbookName(
              studentTextbookSlots,
              anchorStudentId,
              subject,
              slotNumber,
            )
          : ''
      labels[`${subject}:${slotNumber}`] = textbookName.trim()
        ? `${heading} · ${textbookName.trim()}`
        : heading
    }
    return labels
  }, [
    anchorStudentId,
    className,
    date,
    grade,
    slotPlan,
    studentTextbookSlots,
  ])

  const dirtyStatusKeysRef = useRef(new Set<string>())

  useEffect(() => {
    dirtyStatusKeysRef.current.clear()
  }, [date, studentIdsKey, slotPlanKey])

  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, SlotDraft> = {}
      for (const student of students) {
        for (const { subject, slotNumber } of slotPlan) {
          const key = draftKey(student.id, subject, slotNumber)
          const { entry, isFallback } = findHomeworkTextbookEntryForDisplay(
            homeworkTextbookEntries,
            student.id,
            date,
            subject,
            slotNumber,
          )
          // Status/entryId only from actual same-date records (no event carry-forward).
          // Text fields may display the latest prior save for teacher convenience.
          const fromServer: SlotDraft = {
            status:
              !isFallback && isHomeworkStatusSelected(entry?.status)
                ? (entry!.status as HomeworkStatus)
                : '',
            entryId: isFallback ? undefined : entry?.id,
            todayAssignment: entry?.todayAssignment ?? '',
            previousAssignment: entry?.previousAssignment ?? '',
          }
          // Keep in-progress local selections when server data reloads
          if (dirtyStatusKeysRef.current.has(key) && prev[key]) {
            next[key] = {
              ...fromServer,
              status: prev[key].status,
            }
          } else {
            next[key] = fromServer
          }
        }
      }
      return next
    })
  }, [date, homeworkTextbookEntries, slotPlan, slotPlanKey, studentIdsKey, students])

  const setStatus = (
    studentId: string,
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    status: HomeworkStatus,
  ) => {
    const key = draftKey(studentId, subject, slotNumber)
    dirtyStatusKeysRef.current.add(key)
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {
          status: '',
          todayAssignment: '',
          previousAssignment: '',
        }),
        status,
      },
    }))
  }

  const markAllComplete = () => {
    setDrafts((prev) => {
      const next = { ...prev }
      for (const student of students) {
        if (!isFollowOnInputRequired(attendance, student.id, date)) continue
        for (const { subject, slotNumber } of slotPlan) {
          const key = draftKey(student.id, subject, slotNumber)
          dirtyStatusKeysRef.current.add(key)
          next[key] = {
            ...(next[key] ?? {
              status: '',
              todayAssignment: '',
              previousAssignment: '',
            }),
            status: '완료',
          }
        }
      }
      return next
    })
  }

  const handleSaveAll = async () => {
    if (saving || students.length === 0 || slotPlan.length === 0) return

    // 결석 학생은 저장하지 않음(가짜 완료 금지). 출석 학생의 명시 선택만 저장.
    const tasks = students.flatMap((student) => {
      if (!isFollowOnInputRequired(attendance, student.id, date)) return []
      return slotPlan.flatMap(({ subject, slotNumber }) => {
        const key = draftKey(student.id, subject, slotNumber)
        const draft = drafts[key]
        if (!isHomeworkStatusSelected(draft?.status) || !draft) return []
        return [{ student, subject, slotNumber, draft, key }]
      })
    })

    if (tasks.length === 0) {
      const required = students.filter((student) =>
        isFollowOnInputRequired(attendance, student.id, date),
      )
      if (required.length === 0) {
        showToast('결석 학생은 숙제 입력 대상이 아닙니다.')
        return
      }
      showToast('숙제 수행 결과를 선택해주세요.')
      return
    }

    setSaving(true)
    const failures: string[] = []

    try {
      const results = await Promise.all(
        tasks.map(async ({ student, subject, slotNumber, draft }) => {
          try {
            const result = await saveHomeworkTextbookEntryAsync(
              {
                id: draft.entryId,
                studentId: student.id,
                date,
                subject,
                slotNumber,
                previousAssignment: draft.previousAssignment,
                todayAssignment: draft.todayAssignment,
                status: draft.status as HomeworkStatus,
              },
              { silent: true },
            )
            if (!result.success) {
              console.error('[class-homework-status] save failed', {
                studentId: student.id,
                name: student.name,
                subject,
                slotNumber,
                date,
                status: draft.status,
                error: result.error,
              })
              return { student, subject, slotNumber, success: false as const }
            }
            return { student, subject, slotNumber, success: true as const, key: draftKey(student.id, subject, slotNumber) }
          } catch (error) {
            console.error('[class-homework-status] save threw', {
              studentId: student.id,
              name: student.name,
              subject,
              slotNumber,
              date,
              error,
            })
            return { student, subject, slotNumber, success: false as const }
          }
        }),
      )

      for (const result of results) {
        if (!result.success) {
          const heading =
            slotTextbookLabels[`${result.subject}:${result.slotNumber}`] ??
            getTextbookSlotHeading(result.subject, result.slotNumber) ??
            `교재${result.slotNumber}`
          failures.push(`${result.student.name}/${heading}`)
          continue
        }
        if ('key' in result && result.key) {
          dirtyStatusKeysRef.current.delete(result.key)
        }
      }

      if (failures.length > 0) {
        console.error('[class-homework-status] partial/full failure', {
          date,
          grade,
          className,
          failures,
        })
        showToast('숙제 수행 결과 저장에 실패했습니다.')
        return
      }

      showToast('숙제 수행 결과가 저장되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (students.length === 0) {
    return (
      <p className="px-1 py-3 text-center text-sm text-slate-500">
        표시할 학생이 없습니다.
      </p>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">
          {formatKoreanDate(date)} / {className || grade} · {students.length}명
        </p>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
          {slotPlan.map(({ subject, slotNumber }) => {
            const heading =
              getTextbookSlotHeading(subject, slotNumber) ?? `${subject} ${slotNumber}`
            return (
              <SectionVoiceInput
                key={`voice-hw-${subject}-${slotNumber}`}
                label={`${heading} 숙제 음성 입력`}
                chipLabel={heading}
                compact={compact}
                disabled={saving}
                onApply={(transcript) => {
                  const applied = applyHomeworkDrafts(
                    drafts,
                    transcript,
                    students,
                    attendance,
                    date,
                    subject,
                    slotNumber,
                  )
                  for (const key of applied.dirtyKeys) {
                    dirtyStatusKeysRef.current.add(key)
                  }
                  setDrafts(applied.drafts)
                  return applied.summary
                }}
              />
            )
          })}
          <button
            type="button"
            onClick={markAllComplete}
            disabled={saving}
            className={`${btnSecondary} min-h-9 px-3 py-1.5 text-xs`}
          >
            전체 완료
          </button>
        </div>
      </div>

      <div
        className={
          compact
            ? 'divide-y divide-[rgba(22,58,112,0.06)] rounded-xl border border-[rgba(22,58,112,0.08)] bg-white'
            : 'divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white'
        }
      >
        {students.map((student) => {
          const excluded = isStudentAbsentOnDate(attendance, student.id, date)
          return (
          <div
            key={student.id}
            className={compact ? 'px-2.5 py-2.5' : 'px-3 py-3'}
            data-absent-excluded={excluded ? 'true' : 'false'}
          >
            <StudentFollowOnRowHeader name={student.name} excluded={excluded} compact={compact} />
            {excluded ? (
              <AbsentFollowOnHint compact={compact} />
            ) : (
            <div className="space-y-3">
              {subjects.map((subject) => {
                const subjectSlots = slotPlan.filter((item) => item.subject === subject)
                if (subjectSlots.length === 0) return null
                return (
                  <SubjectGroupCard
                    key={`${student.id}-${subject}`}
                    subject={subject}
                    title={subjectGroupTitle(subject, 'plain')}
                  >
                    {subjectSlots.map(({ slotNumber }) => {
                      const key = draftKey(student.id, subject, slotNumber)
                      const draft = drafts[key] ?? {
                        status: '',
                        todayAssignment: '',
                        previousAssignment: '',
                      }
                      const heading =
                        slotTextbookLabels[`${subject}:${slotNumber}`] ??
                        getTextbookSlotHeading(subject, slotNumber) ??
                        `${subject} 교재 ${slotNumber}`
                      return (
                        <div key={key} className="min-w-0 py-2 first:pt-0 last:pb-0">
                          <HomeworkStatusButtons
                            value={draft.status}
                            onChange={(status) =>
                              setStatus(student.id, subject, slotNumber, status)
                            }
                            label={heading}
                            compact
                            disabled={saving}
                          />
                        </div>
                      )
                    })}
                  </SubjectGroupCard>
                )
              })}
            </div>
            )}
          </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleSaveAll()}
        disabled={saving || students.length === 0}
        className={compact ? 'tm-btn-primary w-full min-h-11' : `${btnPrimary} w-full`}
      >
        {saving ? '저장 중…' : '숙제 수행 결과 전체 저장'}
      </button>
    </div>
  )
}
