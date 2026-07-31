import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Save } from 'lucide-react'
import { EditableTextbookName } from './EditableTextbookName'
import { KoreanTextarea } from '../ui/KoreanTextField'
import { inputClass } from '../../utils/labels'
import {
  ParentProgressSlotCard,
  ParentSubjectSlotList,
} from './parentTextbookDisplay'
import type { useData } from '../../hooks/useData'
import type {
  ProgressRecord,
  StudentTextbookSlot,
  TextbookSlotNumber,
  TextbookSubject,
} from '../../types/records'
import { TEXTBOOK_SUBJECTS } from '../../types/records'
import { calcProgressRate } from '../../utils/calc'
import {
  buildTextbookNameDrafts,
  buildProgressTextbookDisplaysForEdit,
  buildParentProgressTextbookDisplays,
  findTextbookSlot,
  groupProgressBySubject,
  type TextbookDisplayClassContext,
} from '../../utils/textbookSlots'
import { logParentProgressDebug } from '../../utils/parentProgressDebug'
import { filterParentVisibleSlotDisplays } from '../../utils/parentTextbookSlots'
import {
  filterVisibleSlotDisplays,
  getVisibleSlotNumbers,
  type SubjectVisibleSlots,
} from '../../utils/teacherMobileTextbookSlots'
import type { ClassTodayReportSyncContext } from '../../utils/classTodayReportCommon'
import {
  classTrackIncludesSubject,
  parseProgressPageValue,
} from '../../utils/classTodayReportCommon'

type ProgressSlotDraft = {
  currentProgress: string
  currentPage: string
  totalPage: string
}

function emptyProgressDraft(): ProgressSlotDraft {
  return { currentProgress: '', currentPage: '', totalPage: '' }
}

function getProgressDraft(
  drafts: Record<string, ProgressSlotDraft>,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
): ProgressSlotDraft {
  return drafts[`${subject}-${slotNumber}`] ?? emptyProgressDraft()
}

function compactInputClass() {
  return `${inputClass()} min-h-9 py-1.5 text-sm`
}

function compactTextareaClass() {
  return `${inputClass()} min-h-[4.5rem] resize-y py-1.5 text-sm leading-snug`
}

function SectionCard({ title, children, hideTitle = false }: { title: string; children: ReactNode; hideTitle?: boolean }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
      {!hideTitle && <h3 className="mb-1.5 text-sm font-bold text-navy-900">{title}</h3>}
      {children}
    </section>
  )
}

export function TextbookSlotProgressSection({
  readOnly,
  studentId,
  date,
  slots,
  progressRecords,
  classContext,
  classSync,
  onSave,
  onSaveAsync,
  onSaveSubjectWithClassSync,
  onSaveSlot,
  onNotify,
  hideTitle = false,
  visibleSlots,
}: {
  readOnly: boolean
  studentId: string
  date: string
  slots: StudentTextbookSlot[]
  progressRecords: ProgressRecord[]
  classContext?: TextbookDisplayClassContext
  classSync?: ClassTodayReportSyncContext
  onSave: ReturnType<typeof useData>['saveProgressRecord']
  onSaveAsync?: ReturnType<typeof useData>['saveProgressRecordAsync']
  onSaveSubjectWithClassSync?: (
    subject: TextbookSubject,
    teacherMemo: string,
    slots: Array<{
      slotNumber: TextbookSlotNumber
      currentProgress: string
      currentPage: number
      totalPage: number
      recordId?: string
    }>,
  ) => Promise<boolean>
  onSaveSlot: ReturnType<typeof useData>['saveStudentTextbookSlot']
  onNotify?: (message: string) => void
  hideTitle?: boolean
  /** 모바일 PWA 등: 과목별 표시·저장 슬롯 제한 (수학 1~2 등) */
  visibleSlots?: SubjectVisibleSlots
}) {
  const initialDisplays = useMemo(
    () =>
      buildProgressTextbookDisplaysForEdit(
        studentId,
        date,
        slots,
        progressRecords,
        classContext,
      ),
    [classContext, date, progressRecords, slots, studentId],
  )

  const displaysSnapshot = useMemo(
    () =>
      JSON.stringify(
        initialDisplays.map((item) => ({
          subject: item.subject,
          slotNumber: item.slotNumber,
          currentProgress: item.currentProgress,
          currentPage: item.currentPage,
          totalPage: item.totalPage,
          teacherMemo: item.teacherMemo,
          recordId: item.recordId,
        })),
      ),
    [initialDisplays],
  )

  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() =>
    buildTextbookNameDrafts(studentId, slots),
  )
  const [drafts, setDrafts] = useState<Record<string, ProgressSlotDraft>>(() =>
    Object.fromEntries(
      initialDisplays.map((item) => [
        `${item.subject}-${item.slotNumber}`,
        {
          currentProgress: item.currentProgress,
          currentPage: item.currentPage ? String(item.currentPage) : '',
          totalPage: item.totalPage ? String(item.totalPage) : '',
        },
      ]),
    ),
  )
  const [teacherMemos, setTeacherMemos] = useState<Record<TextbookSubject, string>>(() => ({
    수학: initialDisplays.find((item) => item.subject === '수학')?.teacherMemo ?? '',
    영어: initialDisplays.find((item) => item.subject === '영어')?.teacherMemo ?? '',
  }))
  const dirtyDraftKeysRef = useRef(new Set<string>())
  const composingDraftKeysRef = useRef(new Set<string>())
  const dirtyNameKeysRef = useRef(new Set<string>())
  const dirtyMemoSubjectsRef = useRef(new Set<TextbookSubject>())

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        initialDisplays.map((item) => [
          `${item.subject}-${item.slotNumber}`,
          {
            currentProgress: item.currentProgress,
            currentPage: item.currentPage ? String(item.currentPage) : '',
            totalPage: item.totalPage ? String(item.totalPage) : '',
          },
        ]),
      ),
    )
    setNameDrafts(buildTextbookNameDrafts(studentId, slots))
    setTeacherMemos({
      수학: initialDisplays.find((item) => item.subject === '수학')?.teacherMemo ?? '',
      영어: initialDisplays.find((item) => item.subject === '영어')?.teacherMemo ?? '',
    })
    dirtyDraftKeysRef.current.clear()
    composingDraftKeysRef.current.clear()
    dirtyNameKeysRef.current.clear()
    dirtyMemoSubjectsRef.current.clear()
  }, [studentId, date])

  useEffect(() => {
    if (composingDraftKeysRef.current.size > 0) return

    setDrafts((prev) => {
      const next = Object.fromEntries(
        initialDisplays.map((item) => [
          `${item.subject}-${item.slotNumber}`,
          {
            currentProgress: item.currentProgress,
            currentPage: item.currentPage ? String(item.currentPage) : '',
            totalPage: item.totalPage ? String(item.totalPage) : '',
          },
        ]),
      )
      for (const key of dirtyDraftKeysRef.current) {
        if (prev[key]) next[key] = prev[key]
      }
      return next
    })
    setTeacherMemos((prev) => ({
      수학: dirtyMemoSubjectsRef.current.has('수학')
        ? prev.수학
        : initialDisplays.find((item) => item.subject === '수학')?.teacherMemo ?? '',
      영어: dirtyMemoSubjectsRef.current.has('영어')
        ? prev.영어
        : initialDisplays.find((item) => item.subject === '영어')?.teacherMemo ?? '',
    }))
  }, [displaysSnapshot, initialDisplays])

  useEffect(() => {
    const fromServer = buildTextbookNameDrafts(studentId, slots)
    setNameDrafts((prev) => {
      const next = { ...fromServer }
      for (const key of dirtyNameKeysRef.current) {
        if (key in prev) next[key] = prev[key]
      }
      return next
    })
  }, [slots, studentId])

  const saveTextbookName = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    name: string,
  ) => {
    const trimmed = name.trim()
    const key = `${subject}-${slotNumber}`
    dirtyNameKeysRef.current.add(key)
    setNameDrafts((prev) => ({ ...prev, [key]: trimmed }))
    if (!trimmed) return

    const existing = findTextbookSlot(slots, studentId, subject, slotNumber)
    onSaveSlot({
      id: existing?.id,
      studentId,
      subject,
      slotNumber,
      textbookName: trimmed,
    })
  }

  if (readOnly) {
    const displays = buildParentProgressTextbookDisplays(
      studentId,
      date,
      slots,
      progressRecords,
      classContext,
    )

    logParentProgressDebug(studentId, date, progressRecords, classContext, displays)

    if (displays.length === 0) {
      return (
        <SectionCard title="오늘의 진도" hideTitle={hideTitle}>
          <p className="text-sm text-slate-400">오늘 등록된 진도 정보가 없습니다.</p>
        </SectionCard>
      )
    }

    const grouped = groupProgressBySubject(filterParentVisibleSlotDisplays(displays))
    return (
      <SectionCard title="오늘의 진도" hideTitle={hideTitle}>
        <div className="space-y-4">
          {TEXTBOOK_SUBJECTS.map((subject) => {
            const items = grouped[subject]
            if (items.length === 0) return null
            return (
              <ParentSubjectSlotList key={subject} subject={subject}>
                {items.map((item) => (
                  <ParentProgressSlotCard
                    key={`${subject}-${item.slotNumber}`}
                    item={item}
                  />
                ))}
              </ParentSubjectSlotList>
            )
          })}
        </div>
      </SectionCard>
    )
  }

  const displaysForUi = useMemo(
    () =>
      visibleSlots
        ? filterVisibleSlotDisplays(initialDisplays, visibleSlots)
        : initialDisplays,
    [initialDisplays, visibleSlots],
  )

  const grouped = groupProgressBySubject(displaysForUi)

  const updateDraft = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    patch: Partial<ProgressSlotDraft>,
  ) => {
    const key = `${subject}-${slotNumber}`
    dirtyDraftKeysRef.current.add(key)
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...emptyProgressDraft(), ...prev[key], ...patch },
    }))
  }

  const saveSubject = async (subject: TextbookSubject) => {
    const memo = teacherMemos[subject].trim()
    const slotNumbers = getVisibleSlotNumbers(subject, visibleSlots)
    const slotsToSave = slotNumbers.flatMap((slotNumber) => {
      const display = initialDisplays.find(
        (item) => item.subject === subject && item.slotNumber === slotNumber,
      )
      if (!display) return []

      const draft = getProgressDraft(drafts, subject, slotNumber)
      const textbookName = (nameDrafts[`${subject}-${slotNumber}`] ?? '').trim()
      const currentPage = parseProgressPageValue(draft.currentPage)
      const totalPage = parseProgressPageValue(draft.totalPage)

      if (textbookName) {
        saveTextbookName(subject, slotNumber, textbookName)
      }

      const hasContent =
        textbookName ||
        draft.currentProgress.trim() ||
        currentPage > 0 ||
        totalPage > 0 ||
        memo

      if (!hasContent) return []

      return [
        {
          slotNumber,
          currentProgress: draft.currentProgress.trim(),
          currentPage,
          totalPage,
          recordId: display.recordId,
        },
      ]
    })

    if (import.meta.env.DEV) {
      console.log('[ProgressSave] saveSubject clicked', {
        selectedStudentId: studentId,
        classGrade: classSync?.grade,
        className: classSync?.className,
        subject,
        reportDate: date,
        slotsToSave,
        useClassSync: Boolean(
          classSync &&
            onSaveSubjectWithClassSync &&
            classTrackIncludesSubject(classSync.className, subject),
        ),
      })
    }

    if (slotsToSave.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[ProgressSave] nothing to save for subject', subject)
      }
      onNotify?.('저장할 진도 내용이 없습니다.')
      return
    }

    const saveRecord = onSaveAsync ?? (async (data) => {
      onSave(data)
      return { success: true }
    })

    for (let index = 0; index < slotsToSave.length; index += 1) {
      const slot = slotsToSave[index]
      const result = await saveRecord(
        {
          id: slot.recordId,
          studentId,
          subject,
          slotNumber: slot.slotNumber,
          textbookName: '',
          currentProgress: slot.currentProgress,
          currentPage: slot.currentPage,
          totalPage: slot.totalPage > 0 ? slot.totalPage : 1,
          lastStudyDate: date,
          teacherMemo: memo,
        },
        { silent: index < slotsToSave.length - 1 },
      )
      if (!result.success) {
        return
      }
    }

    if (
      classSync &&
      onSaveSubjectWithClassSync &&
      classTrackIncludesSubject(classSync.className, subject)
    ) {
      const success = await onSaveSubjectWithClassSync(subject, memo, slotsToSave)
      if (import.meta.env.DEV) {
        console.log('[ProgressSave] class sync result', { subject, success })
      }
    }
  }

  return (
    <SectionCard title="오늘의 진도" hideTitle={hideTitle}>
      <div className="space-y-3">
        {TEXTBOOK_SUBJECTS.map((subject) => (
          <div key={subject} lang="ko">
            <p className="mb-1.5 text-xs font-bold text-navy-800">{subject}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {grouped[subject].map((item) => {
                const key = `${item.subject}-${item.slotNumber}`
                const draft = getProgressDraft(drafts, item.subject, item.slotNumber)
                const currentPage = parseProgressPageValue(draft.currentPage)
                const totalPage = parseProgressPageValue(draft.totalPage)
                const rate = calcProgressRate(currentPage, totalPage || 1)
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-2"
                  >
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">
                      진도 교재 {item.slotNumber}
                    </p>
                    <EditableTextbookName
                      compact
                      value={nameDrafts[key] ?? ''}
                      onSave={(name) => saveTextbookName(item.subject, item.slotNumber, name)}
                      onDraftChange={() => dirtyNameKeysRef.current.add(key)}
                    />
                    <div className="space-y-1.5">
                      <div>
                        <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                          현재 진도
                        </label>
                        <KoreanTextarea
                          value={draft.currentProgress}
                          onChange={(e) =>
                            updateDraft(item.subject, item.slotNumber, {
                              currentProgress: e.target.value,
                            })
                          }
                          onCompositionStart={() =>
                            composingDraftKeysRef.current.add(key)
                          }
                          onCompositionEnd={() =>
                            composingDraftKeysRef.current.delete(key)
                          }
                          rows={2}
                          className={compactTextareaClass()}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                            현재
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={draft.currentPage}
                            onChange={(e) =>
                              updateDraft(item.subject, item.slotNumber, {
                                currentPage: e.target.value,
                              })
                            }
                            className={compactInputClass()}
                          />
                        </div>
                        <div>
                          <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                            전체
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={draft.totalPage}
                            onChange={(e) =>
                              updateDraft(item.subject, item.slotNumber, {
                                totalPage: e.target.value,
                              })
                            }
                            className={compactInputClass()}
                          />
                        </div>
                      </div>
                      {totalPage > 0 && (
                        <p className="text-[11px] font-medium text-slate-600">
                          진행률 {Math.round(rate)}%
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-600">
                강사 메모 (선택)
              </label>
              <KoreanTextarea
                value={teacherMemos[subject]}
                onChange={(e) => {
                  dirtyMemoSubjectsRef.current.add(subject)
                  setTeacherMemos((prev) => ({ ...prev, [subject]: e.target.value }))
                }}
                onCompositionStart={() =>
                  composingDraftKeysRef.current.add(`memo-${subject}`)
                }
                onCompositionEnd={() =>
                  composingDraftKeysRef.current.delete(`memo-${subject}`)
                }
                rows={1}
                className={compactTextareaClass()}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void saveSubject(subject)}
                  className="inline-flex min-h-9 items-center rounded-lg bg-navy-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-900"
                >
                  <Save className="mr-1 inline h-3.5 w-3.5" />
                  {subject} 진도 저장
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
