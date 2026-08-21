import { useEffect, useMemo, useState } from 'react'
import { useData } from '../../hooks/useData'
import type { TextbookSlotNumber, TextbookSubject } from '../../types/records'
import type { Student } from '../../types/student'
import { calcProgressRate } from '../../utils/calc'
import {
  parseProgressPageValue,
  type ClassTodayReportSyncContext,
} from '../../utils/classTodayReportCommon'
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
  currentProgress: string
  currentPage: string
  totalPage: string
  textbookName: string
}

function slotKey(subject: TextbookSubject, slotNumber: TextbookSlotNumber) {
  return `${subject}:${slotNumber}`
}

type ClassCommonProgressPanelProps = {
  date: string
  grade: string
  className: string
  students: Student[]
  classSync?: ClassTodayReportSyncContext
  compact?: boolean
}

export function ClassCommonProgressPanel({
  date,
  grade,
  className,
  students,
  classSync,
  compact = false,
}: ClassCommonProgressPanelProps) {
  const {
    classTodayReportCommon,
    studentTextbookSlots,
    saveProgressSubjectWithClassSync,
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
      // Display fallback only — save still writes the selected `date` as a new/actual record.
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
        currentProgress: found?.currentProgress ?? '',
        currentPage: found?.currentPage ? String(found.currentPage) : '',
        totalPage: found?.totalPage ? String(found.totalPage) : '',
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
        ...(prev[key] ?? {
          currentProgress: '',
          currentPage: '',
          totalPage: '',
          textbookName: '',
        }),
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
      if (!draft) return false
      return (
        draft.textbookName.trim() ||
        draft.currentProgress.trim() ||
        parseProgressPageValue(draft.currentPage) > 0 ||
        parseProgressPageValue(draft.totalPage) > 0
      )
    })
    if (!hasAny) {
      showToast('저장할 진도 내용이 없습니다.')
      return
    }

    setSaving(true)
    try {
      let ok = true

      // Persist textbook names first (class-common, linked-class aware)
      for (const { subject, slotNumber } of slotPlan) {
        const name = drafts[slotKey(subject, slotNumber)]?.textbookName.trim() ?? ''
        if (!name) continue
        const nameOk = await saveClassTextbookNameForPeers(subject, slotNumber, name, { silent: true })
        if (!nameOk) {
          ok = false
          console.error('[class-common-progress] textbook name save failed', {
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
              currentProgress: draft?.currentProgress ?? '',
              currentPage: parseProgressPageValue(draft?.currentPage),
              totalPage: parseProgressPageValue(draft?.totalPage),
            }
          })
        const success = await saveProgressSubjectWithClassSync(
          anchorStudentId,
          classSync,
          date,
          subject,
          '',
          slots,
        )
        if (!success) {
          ok = false
          console.error('[class-common-progress] save failed', {
            subject,
            grade,
            className,
            date,
          })
        }
      }

      if (!ok) {
        showToast('오늘의 진도 저장에 실패했습니다.')
        return
      }
      showToast('오늘의 진도가 저장되었습니다.')
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
              title={subjectGroupTitle(subject, 'progress')}
            >
              {subjectSlots.map(({ slotNumber }) => {
                const key = slotKey(subject, slotNumber)
                const draft = drafts[key] ?? {
                  currentProgress: '',
                  currentPage: '',
                  totalPage: '',
                  textbookName: '',
                }
                const heading =
                  getTextbookSlotHeading(subject, slotNumber) ??
                  `${subject} 교재 ${slotNumber}`
                const currentPage = parseProgressPageValue(draft.currentPage)
                const totalPage = parseProgressPageValue(draft.totalPage)
                const rate = calcProgressRate(currentPage, totalPage || 1)
                return (
                  <div
                    key={key}
                    className="min-w-0 space-y-1.5 py-2.5 first:pt-0 last:pb-0"
                  >
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
                    <div>
                      <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                        현재 진도
                      </label>
                      <textarea
                        value={draft.currentProgress}
                        onChange={(e) =>
                          updateDraft(subject, slotNumber, {
                            currentProgress: e.target.value,
                          })
                        }
                        disabled={saving}
                        placeholder="현재 진도 입력"
                        rows={2}
                        className={`${inputClass()} min-h-[2.5rem] w-full max-w-full resize-y text-sm`}
                      />
                    </div>
                    <div className="grid min-w-0 grid-cols-2 gap-1.5">
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                          현재 페이지
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={draft.currentPage}
                          onChange={(e) =>
                            updateDraft(subject, slotNumber, {
                              currentPage: e.target.value,
                            })
                          }
                          disabled={saving}
                          className={`${inputClass()} min-h-9 w-full max-w-full py-1.5 text-sm`}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">
                          전체 페이지
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={draft.totalPage}
                          onChange={(e) =>
                            updateDraft(subject, slotNumber, {
                              totalPage: e.target.value,
                            })
                          }
                          disabled={saving}
                          className={`${inputClass()} min-h-9 w-full max-w-full py-1.5 text-sm`}
                        />
                      </div>
                    </div>
                    {totalPage > 0 && (
                      <p className="text-[11px] font-medium text-slate-600">
                        진행률 {Math.round(rate)}%
                      </p>
                    )}
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
        {saving ? '저장 중…' : '오늘의 진도 반 전체 저장'}
      </button>
    </div>
  )
}
