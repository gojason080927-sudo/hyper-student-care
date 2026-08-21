import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import type {
  HomeworkStatus,
  TextbookSlotNumber,
  TextbookSubject,
} from '../../types/records'
import type { Student } from '../../types/student'
import { type ClassTodayReportSyncContext } from '../../utils/classTodayReportCommon'
import { findClassTodayReportCommonForDisplay } from '../../utils/todayReportDisplayFallback'
import { formatKoreanDate } from '../../utils/date'
import { btnPrimary, inputClass } from '../../utils/labels'
import { getVisibleTextbookSubjects } from '../../utils/todayReportVisibleSubjects'
import {
  getTextbookSlotHeading,
  TEACHER_MOBILE_VISIBLE_SLOTS,
  getVisibleSlotNumbers,
} from '../../utils/teacherMobileTextbookSlots'
import { getTextbookName } from '../../utils/textbookSlots'
import { EditableTextbookName } from './EditableTextbookName'
import { SubjectGroupCard, subjectGroupTitle } from './SubjectGroupCard'

type SlotDraft = {
  todayAssignment: string
  textbookName: string
}

function slotKey(subject: TextbookSubject, slotNumber: TextbookSlotNumber) {
  return `${subject}:${slotNumber}`
}

type ClassCommonTodayAssignmentPanelProps = {
  date: string
  grade: string
  className: string
  students: Student[]
  classSync?: ClassTodayReportSyncContext
  compact?: boolean
}

export function ClassCommonTodayAssignmentPanel({
  date,
  grade,
  className,
  students,
  classSync,
  compact = false,
}: ClassCommonTodayAssignmentPanelProps) {
  const {
    classTodayReportCommon,
    studentTextbookSlots,
    saveHomeworkSubjectWithClassSync,
    saveStudentTextbookSlot,
    showToast,
  } = useData()
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, SlotDraft>>({})
  const saveClassTextbookNameForPeers = async (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    textbookName: string,
    options?: { silent?: boolean },
  ): Promise<boolean> => {
    const trimmed = textbookName.trim()
    if (!trimmed) return true
    if (!classSync) {
      if (!options?.silent) showToast('반 정보를 찾지 못했습니다.')
      return false
    }
    try {
      for (const studentId of classSync.peerStudentIds) {
        saveStudentTextbookSlot({
          studentId,
          subject,
          slotNumber,
          textbookName: trimmed,
        })
      }
      if (!options?.silent) showToast('교재명이 반 공통으로 저장되었습니다.')
      return true
    } catch (error) {
      const detail = error instanceof Error ? error.message : '알 수 없는 오류'
      if (!options?.silent) showToast(`교재명 반 공통 저장 실패: ${detail}`)
      return false
    }
  }


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

  const anchorStudentId = students[0]?.id ?? ''
  const slotPlanKey = useMemo(
    () => slotPlan.map((s) => `${s.subject}-${s.slotNumber}`).join('|'),
    [slotPlan],
  )

  useEffect(() => {
    const next: Record<string, SlotDraft> = {}
    for (const { subject, slotNumber } of slotPlan) {
      // Display fallback only — save still writes the selected `date`.
      const { record: found } = findClassTodayReportCommonForDisplay(
        classTodayReportCommon,
        grade,
        className,
        date,
        subject,
        slotNumber,
      )
      const textbookName = anchorStudentId
          ? getTextbookName(
              studentTextbookSlots,
              anchorStudentId,
              subject,
              slotNumber,
            )
          : ''
      next[slotKey(subject, slotNumber)] = {
        todayAssignment: found?.todayAssignment ?? '',
        textbookName,
      }
    }
    setDrafts(next)
  }, [
    anchorStudentId,
    className,
    classTodayReportCommon,
    date,
    grade,
    slotPlan,
    slotPlanKey,
    studentTextbookSlots,
  ])

  const updateDraft = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    patch: Partial<SlotDraft>,
  ) => {
    const key = slotKey(subject, slotNumber)
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { todayAssignment: '', textbookName: '' }),
        ...patch,
      },
    }))
  }

  const handleSaveTextbookName = async (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    name: string,
  ) => {
    const trimmed = name.trim()
    updateDraft(subject, slotNumber, { textbookName: trimmed })
    if (!trimmed || !classSync) {
      if (!classSync) showToast('반 정보를 찾지 못했습니다.')
      return
    }
    const ok = await saveClassTextbookNameForPeers(subject, slotNumber, trimmed)
    if (!ok) {
      showToast('교재명 저장에 실패했습니다.')
    }
  }

  const handleSave = async () => {
    if (saving || !classSync || !anchorStudentId) {
      if (!classSync || !anchorStudentId) {
        showToast('반 정보를 찾지 못했습니다.')
      }
      return
    }

    const hasAny = slotPlan.some(({ subject, slotNumber }) => {
      const draft = drafts[slotKey(subject, slotNumber)]
      return Boolean(draft?.todayAssignment.trim() || draft?.textbookName.trim())
    })
    if (!hasAny) {
      showToast('저장할 오늘 과제가 없습니다.')
      return
    }

    setSaving(true)
    try {
      let ok = true

      for (const { subject, slotNumber } of slotPlan) {
        const name = drafts[slotKey(subject, slotNumber)]?.textbookName.trim() ?? ''
        if (!name) continue
        const nameOk = await saveClassTextbookNameForPeers(subject, slotNumber, name, { silent: true })
        if (!nameOk) {
          ok = false
          console.error('[class-common-today-assignment] textbook name save failed', {
            subject,
            slotNumber,
            grade,
            className,
            date,
          })
        }
      }

      for (const subject of subjects) {
        const slots = slotPlan
          .filter((item) => item.subject === subject)
          .map(({ slotNumber }) => {
            const draft = drafts[slotKey(subject, slotNumber)]
            return {
              slotNumber,
              previousAssignment: '',
              todayAssignment: draft?.todayAssignment ?? '',
              status: '' as HomeworkStatus | '',
            }
          })
        const success = await saveHomeworkSubjectWithClassSync(
          anchorStudentId,
          classSync,
          date,
          subject,
          slots,
        )
        if (!success) {
          ok = false
          console.error('[class-common-today-assignment] save failed', {
            subject,
            grade,
            className,
            date,
          })
        }
      }

      if (!ok) {
        showToast('오늘 과제 저장에 실패했습니다.')
        return
      }
      showToast('오늘 과제가 저장되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!classSync) {
    return (
      <p className="px-1 py-3 text-center text-sm text-slate-500">
        반을 선택해 주세요.
      </p>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <p className="text-xs font-medium text-slate-500">
        {formatKoreanDate(date)} / {className} · 반 공통
      </p>

      <div className="space-y-3">
        {subjects.map((subject) => {
          const subjectSlots = slotPlan.filter((item) => item.subject === subject)
          if (subjectSlots.length === 0) return null
          return (
            <SubjectGroupCard
              key={subject}
              subject={subject}
              title={subjectGroupTitle(subject, 'assignment')}
            >
              {subjectSlots.map(({ slotNumber }) => {
                const key = slotKey(subject, slotNumber)
                const draft = drafts[key] ?? { todayAssignment: '', textbookName: '' }
                const heading =
                  getTextbookSlotHeading(subject, slotNumber) ??
                  `${subject} 교재 ${slotNumber}`
                return (
                  <div key={key} className="min-w-0 space-y-1 py-2.5 first:pt-0 last:pb-0">
                    <p
                      className={
                        compact
                          ? 'text-xs font-bold text-[#163A70]'
                          : 'text-sm font-bold text-navy-900'
                      }
                    >
                      {heading}
                    </p>
                    <EditableTextbookName
                      compact
                      value={draft.textbookName}
                      onSave={(name) => {
                        void handleSaveTextbookName(subject, slotNumber, name)
                      }}
                      onDraftChange={(name) =>
                        updateDraft(subject, slotNumber, { textbookName: name })
                      }
                    />
                    <textarea
                      value={draft.todayAssignment}
                      onChange={(e) =>
                        updateDraft(subject, slotNumber, {
                          todayAssignment: e.target.value,
                        })
                      }
                      disabled={saving}
                      placeholder="오늘 과제 입력"
                      rows={compact ? 2 : 3}
                      className={`${inputClass()} min-h-[2.75rem] w-full max-w-full resize-y text-sm`}
                    />
                  </div>
                )
              })}
            </SubjectGroupCard>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || !anchorStudentId}
        className={compact ? 'tm-btn-primary w-full min-h-11' : `${btnPrimary} w-full`}
      >
        {saving ? '저장 중…' : '오늘 과제 반 전체 저장'}
      </button>
    </div>
  )
}
