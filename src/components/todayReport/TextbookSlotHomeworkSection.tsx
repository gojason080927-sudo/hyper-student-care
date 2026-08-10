import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Save } from 'lucide-react'
import { HomeworkStatusPicker } from '../homework/HomeworkStatusPicker'
import { TeacherMobileHomeworkStatusPicker } from '../teacherMobile/TeacherMobileHomeworkStatusPicker'
import { KoreanTextInput } from '../ui/KoreanTextField'
import { EditableTextbookName } from './EditableTextbookName'
import type { useData } from '../../hooks/useData'
import type {
  HomeworkStatus,
  HomeworkTextbookEntry,
  StudentTextbookSlot,
  TextbookSlotNumber,
  TextbookSubject,
} from '../../types/records'
import { TEXTBOOK_SUBJECTS } from '../../types/records'
import { inputClass } from '../../utils/labels'
import { TODAY_ASSIGNMENT_MAX_LENGTH } from '../../utils/todayAssignment'
import {
  buildTextbookNameDrafts,
  buildHomeworkTextbookDisplaysForEdit,
  buildParentHomeworkTextbookDisplays,
  findTextbookSlot,
  groupHomeworkBySubject,
  type TextbookDisplayClassContext,
} from '../../utils/textbookSlots'
import { logParentHomeworkDebug } from '../../utils/parentHomeworkDebug'
import { filterParentVisibleSlotDisplays } from '../../utils/parentTextbookSlots'
import {
  filterVisibleSlotDisplays,
  getVisibleSlotNumbers,
  type SubjectVisibleSlots,
} from '../../utils/teacherMobileTextbookSlots'
import type { ClassTodayReportSyncContext } from '../../utils/classTodayReportCommon'
import { classTrackIncludesSubject } from '../../utils/classTodayReportCommon'
import {
  ParentHomeworkSlotCard,
  ParentSubjectSlotList,
} from './parentTextbookDisplay'

type SlotDraft = {
  previousAssignment: string
  todayAssignment: string
  status: HomeworkStatus | ''
}

function slotKey(subject: TextbookSubject, slotNumber: TextbookSlotNumber): string {
  return `${subject}-${slotNumber}`
}

function displaysToDrafts(
  displays: ReturnType<typeof buildHomeworkTextbookDisplaysForEdit>,
): Record<string, SlotDraft> {
  return Object.fromEntries(
    displays.map((item) => [
      slotKey(item.subject, item.slotNumber),
      {
        previousAssignment: item.previousAssignment,
        todayAssignment: item.todayAssignment,
        status: item.status,
      },
    ]),
  )
}

function serializeDisplaysSnapshot(
  displays: ReturnType<typeof buildHomeworkTextbookDisplaysForEdit>,
): string {
  return JSON.stringify(
    displays.map((item) => ({
      subject: item.subject,
      slotNumber: item.slotNumber,
      previousAssignment: item.previousAssignment,
      todayAssignment: item.todayAssignment,
      status: item.status,
      entryId: item.entryId,
    })),
  )
}

function compactInputClass() {
  return `${inputClass()} min-h-9 py-1.5 text-sm`
}

function SectionCard({ title, children, hideTitle = false }: { title: string; children: ReactNode; hideTitle?: boolean }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
      {!hideTitle && <h3 className="mb-1.5 text-sm font-bold text-navy-900">{title}</h3>}
      {children}
    </section>
  )
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-9 items-center rounded-lg bg-navy-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-900"
    >
      <Save className="mr-1 inline h-3.5 w-3.5" />
      과제 저장
    </button>
  )
}

export function TextbookSlotHomeworkSection({
  readOnly,
  studentId,
  date,
  slots,
  entries,
  classContext,
  classSync,
  onSaveEntry,
  onSaveEntryAsync,
  onSaveSubjectWithClassSync,
  onSaveSlot,
  onNotify,
  hideTitle = false,
  visibleSlots,
  useMobileStatusPicker = false,
}: {
  readOnly: boolean
  studentId: string
  date: string
  slots: StudentTextbookSlot[]
  entries: HomeworkTextbookEntry[]
  classContext?: TextbookDisplayClassContext
  classSync?: ClassTodayReportSyncContext
  onSaveEntry: ReturnType<typeof useData>['saveHomeworkTextbookEntry']
  onSaveEntryAsync?: ReturnType<typeof useData>['saveHomeworkTextbookEntryAsync']
  onSaveSubjectWithClassSync?: (
    subject: TextbookSubject,
    slots: Array<{
      slotNumber: TextbookSlotNumber
      previousAssignment: string
      todayAssignment: string
      status: HomeworkStatus | ''
      entryId?: string
    }>,
  ) => Promise<boolean>
  onSaveSlot: ReturnType<typeof useData>['saveStudentTextbookSlot']
  onNotify?: (message: string) => void
  hideTitle?: boolean
  /** 모바일 PWA 등: 과목별 표시·저장 슬롯 제한 (수학 1~2 등) */
  visibleSlots?: SubjectVisibleSlots
  /** 강사용 모바일 PWA: 숙제 상태 버튼 전용 UI */
  useMobileStatusPicker?: boolean
}) {
  const subjectsToRender = useMemo(
    () => {
      const selectedClassName = classSync?.className ?? classContext?.className ?? ''
      if (!selectedClassName.trim()) return [...TEXTBOOK_SUBJECTS]
      return TEXTBOOK_SUBJECTS.filter((subject) =>
        classTrackIncludesSubject(selectedClassName, subject),
      )
    },
    [classContext?.className, classSync?.className],
  )

  const initialDisplays = useMemo(
    () => buildHomeworkTextbookDisplaysForEdit(studentId, date, slots, entries, classContext),
    [classContext, date, entries, slots, studentId],
  )

  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() =>
    buildTextbookNameDrafts(studentId, slots),
  )
  const savedDraftsSnapshot = useMemo(
    () => serializeDisplaysSnapshot(initialDisplays),
    [initialDisplays],
  )

  const [drafts, setDrafts] = useState<Record<string, SlotDraft>>(() =>
    displaysToDrafts(initialDisplays),
  )
  const dirtyDraftKeysRef = useRef(new Set<string>())
  const composingDraftKeysRef = useRef(new Set<string>())
  const dirtyNameKeysRef = useRef(new Set<string>())

  useEffect(() => {
    setDrafts(displaysToDrafts(initialDisplays))
    setNameDrafts(buildTextbookNameDrafts(studentId, slots))
    dirtyDraftKeysRef.current.clear()
    composingDraftKeysRef.current.clear()
    dirtyNameKeysRef.current.clear()
  }, [studentId, date])

  // 반 공통·재조회로 snapshot만 바뀔 때, 편집 중인 필드는 유지 (한글 IME 조합 보호)
  useEffect(() => {
    if (composingDraftKeysRef.current.size > 0) return

    const fromServer = displaysToDrafts(initialDisplays)
    setDrafts((prev) => {
      const next = { ...fromServer }
      for (const key of dirtyDraftKeysRef.current) {
        if (prev[key]) next[key] = prev[key]
      }
      return next
    })
  }, [savedDraftsSnapshot, initialDisplays])

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
    const displays = buildParentHomeworkTextbookDisplays(
      studentId,
      date,
      slots,
      entries,
      classContext,
    )

    logParentHomeworkDebug(studentId, date, entries, slots, displays)

    if (displays.length === 0) {
      return (
        <SectionCard title="숙제 수행 결과" hideTitle={hideTitle}>
          <p className="text-sm text-slate-400">등록된 숙제 정보가 없습니다.</p>
        </SectionCard>
      )
    }

    const grouped = groupHomeworkBySubject(filterParentVisibleSlotDisplays(displays))
    return (
      <SectionCard title="숙제 수행 결과" hideTitle={hideTitle}>
        <div className="space-y-4">
          {subjectsToRender.map((subject) => {
            const items = grouped[subject]
            if (items.length === 0) return null
            return (
              <ParentSubjectSlotList key={subject} subject={subject}>
                {items.map((item) => (
                  <ParentHomeworkSlotCard
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

  const grouped = groupHomeworkBySubject(displaysForUi)

  const getDraft = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
  ): SlotDraft => {
    const key = slotKey(subject, slotNumber)
    return (
      drafts[key] ?? {
        previousAssignment: '',
        todayAssignment: '',
        status: '',
      }
    )
  }

  const updateDraft = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    patch: Partial<SlotDraft>,
  ) => {
    const key = slotKey(subject, slotNumber)
    dirtyDraftKeysRef.current.add(key)
    setDrafts((prev) => {
      const current = prev[key] ?? {
        previousAssignment: '',
        todayAssignment: '',
        status: '',
      }
      return {
        ...prev,
        [key]: { ...current, ...patch },
      }
    })
  }

  const saveSubject = async (subject: TextbookSubject) => {
    const slotNumbers = getVisibleSlotNumbers(subject, visibleSlots)
    const slotsToSave = slotNumbers.flatMap((slotNumber) => {
      const display = initialDisplays.find(
        (item) => item.subject === subject && item.slotNumber === slotNumber,
      )
      if (!display) return []

      const key = slotKey(subject, slotNumber)
      const draft = getDraft(subject, slotNumber)
      const textbookName = (nameDrafts[key] ?? '').trim()

      if (textbookName) {
        saveTextbookName(subject, slotNumber, textbookName)
      }

      const hasAssignmentContent =
        draft.previousAssignment.trim() ||
        draft.todayAssignment.trim() ||
        draft.status

      if (!hasAssignmentContent) return []

      return [
        {
          slotNumber,
          previousAssignment: draft.previousAssignment,
          todayAssignment: draft.todayAssignment,
          status: draft.status,
          entryId: display.entryId,
        },
      ]
    })

    if (slotsToSave.length === 0) {
      onNotify?.('저장할 과제 내용이 없습니다.')
      return
    }

    if (import.meta.env.DEV) {
      console.log('[HomeworkSave] saveSubject clicked', {
        functionName: 'saveSubject',
        selectedStudentId: studentId,
        reportDate: date,
        subject,
        slotsToSave,
      })
    }

    const saveEntry = onSaveEntryAsync ?? (async (data) => {
      onSaveEntry(data)
      return { success: true }
    })

    for (let index = 0; index < slotsToSave.length; index += 1) {
      const slot = slotsToSave[index]
      const result = await saveEntry(
        {
          id: slot.entryId,
          studentId,
          date,
          subject,
          slotNumber: slot.slotNumber,
          previousAssignment: slot.previousAssignment,
          todayAssignment: slot.todayAssignment,
          status: slot.status,
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
      await onSaveSubjectWithClassSync(subject, slotsToSave)
    }
  }

  return (
    <SectionCard title="숙제 수행 결과" hideTitle={hideTitle}>
      <div className="space-y-3">
        {subjectsToRender.map((subject) => (
          <div key={subject} lang="ko">
            <p className="mb-1.5 text-xs font-bold text-navy-800">{subject}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {grouped[subject].map((item) => {
                const key = slotKey(item.subject, item.slotNumber)
                const draft = getDraft(item.subject, item.slotNumber)
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-slate-200 bg-slate-50/50 p-2"
                  >
                    <p className="mb-1 text-[11px] font-semibold text-slate-500">
                      교재 {item.slotNumber}
                    </p>
                    <EditableTextbookName
                      compact
                      value={nameDrafts[key] ?? ''}
                      onSave={(name) => saveTextbookName(item.subject, item.slotNumber, name)}
                      onDraftChange={() => dirtyNameKeysRef.current.add(key)}
                    />
                    {useMobileStatusPicker ? (
                      <TeacherMobileHomeworkStatusPicker
                        compact
                        value={draft.status}
                        onChange={(status) =>
                          updateDraft(item.subject, item.slotNumber, { status })
                        }
                      />
                    ) : (
                      <HomeworkStatusPicker
                        compact
                        value={draft.status}
                        onChange={(status) =>
                          updateDraft(item.subject, item.slotNumber, { status })
                        }
                      />
                    )}
                    <div className="mt-1.5 space-y-1.5">
                      <div>
                        <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                          지난 과제
                        </label>
                        <KoreanTextInput
                          value={draft.previousAssignment}
                          onChange={(e) =>
                            updateDraft(item.subject, item.slotNumber, {
                              previousAssignment: e.target.value,
                            })
                          }
                          onCompositionStart={() =>
                            composingDraftKeysRef.current.add(key)
                          }
                          onCompositionEnd={() =>
                            composingDraftKeysRef.current.delete(key)
                          }
                          className={compactInputClass()}
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                          오늘 해야 할 과제
                        </label>
                        <KoreanTextInput
                          value={draft.todayAssignment}
                          onChange={(e) =>
                            updateDraft(item.subject, item.slotNumber, {
                              todayAssignment: e.target.value.slice(
                                0,
                                TODAY_ASSIGNMENT_MAX_LENGTH,
                              ),
                            })
                          }
                          onCompositionStart={() =>
                            composingDraftKeysRef.current.add(key)
                          }
                          onCompositionEnd={() =>
                            composingDraftKeysRef.current.delete(key)
                          }
                          className={compactInputClass()}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2 flex justify-end">
              <SaveButton onClick={() => saveSubject(subject)} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
