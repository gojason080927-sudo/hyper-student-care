import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Save } from 'lucide-react'
import { HomeworkStatusPicker } from '../homework/HomeworkStatusPicker'
import { EditableTextbookName } from './EditableTextbookName'
import type { useData } from '../../hooks/useData'
import type {
  HomeworkRecord,
  HomeworkStatus,
  HomeworkTextbookEntry,
  StudentTextbookSlot,
  TextbookSlotNumber,
  TextbookSubject,
  TodayAssignmentRecord,
} from '../../types/records'
import { TEXTBOOK_SLOT_NUMBERS, TEXTBOOK_SUBJECTS } from '../../types/records'
import { getHomeworkColor, inputClass } from '../../utils/labels'
import { TODAY_ASSIGNMENT_MAX_LENGTH } from '../../utils/todayAssignment'
import {
  buildHomeworkTextbookDisplays,
  buildHomeworkTextbookDisplaysForEdit,
  groupHomeworkBySubject,
} from '../../utils/textbookSlots'
import { StatusBadge } from '../ui/StatusBadge'

type SlotDraft = {
  previousAssignment: string
  todayAssignment: string
  status: HomeworkStatus | ''
}

function compactInputClass() {
  return `${inputClass()} min-h-9 py-1.5 text-sm`
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
      <h3 className="mb-1.5 text-sm font-bold text-navy-900">{title}</h3>
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
  legacyHomework,
  legacyAssignment,
  onSaveEntry,
  onSaveSlot,
}: {
  readOnly: boolean
  studentId: string
  date: string
  slots: StudentTextbookSlot[]
  entries: HomeworkTextbookEntry[]
  legacyHomework?: HomeworkRecord
  legacyAssignment?: TodayAssignmentRecord
  onSaveEntry: ReturnType<typeof useData>['saveHomeworkTextbookEntry']
  onSaveSlot: ReturnType<typeof useData>['saveStudentTextbookSlot']
}) {
  const initialDisplays = useMemo(
    () => buildHomeworkTextbookDisplaysForEdit(studentId, date, slots, entries),
    [date, entries, slots, studentId],
  )

  const [drafts, setDrafts] = useState<Record<string, SlotDraft>>(() =>
    Object.fromEntries(
      initialDisplays.map((item) => [
        `${item.subject}-${item.slotNumber}`,
        {
          previousAssignment: item.previousAssignment,
          todayAssignment: item.todayAssignment,
          status: item.status,
        },
      ]),
    ),
  )

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        initialDisplays.map((item) => [
          `${item.subject}-${item.slotNumber}`,
          {
            previousAssignment: item.previousAssignment,
            todayAssignment: item.todayAssignment,
            status: item.status,
          },
        ]),
      ),
    )
  }, [initialDisplays])

  if (readOnly) {
    const displays = buildHomeworkTextbookDisplays(
      studentId,
      date,
      slots,
      entries,
      legacyHomework,
      legacyAssignment,
    )

    if (displays.length === 0) {
      return (
        <SectionCard title="숙제 수행 결과">
          <p className="text-sm text-slate-400">등록된 숙제 정보가 없습니다.</p>
        </SectionCard>
      )
    }

    const grouped = groupHomeworkBySubject(displays)
    return (
      <SectionCard title="숙제 수행 결과">
        <div className="space-y-3">
          {TEXTBOOK_SUBJECTS.map((subject) => {
            const items = grouped[subject]
            if (items.length === 0) return null
            return (
              <div key={subject}>
                <p className="text-sm font-bold text-navy-900">{subject}</p>
                <ul className="mt-1.5 space-y-2">
                  {items.map((item) => (
                    <li
                      key={`${subject}-${item.slotNumber}`}
                      className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-sm text-slate-700"
                    >
                      <p className="font-semibold text-navy-800">
                        {item.textbookName || `교재 ${item.slotNumber}`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        지난 과제 {item.previousAssignment.trim() || '-'} / 오늘 과제{' '}
                        {item.todayAssignment.trim() || '-'}
                        {item.status ? ` / ${item.status}` : ''}
                      </p>
                      {item.status && (
                        <div className="mt-1">
                          <StatusBadge
                            label={item.status}
                            colorClass={getHomeworkColor(item.status)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </SectionCard>
    )
  }

  const grouped = groupHomeworkBySubject(initialDisplays)

  const updateDraft = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    patch: Partial<SlotDraft>,
  ) => {
    const key = `${subject}-${slotNumber}`
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  const saveSubject = (subject: TextbookSubject) => {
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const display = initialDisplays.find(
        (item) => item.subject === subject && item.slotNumber === slotNumber,
      )
      if (!display) continue
      const key = `${subject}-${slotNumber}`
      const draft = drafts[key]
      const hasContent =
        display.textbookName.trim() ||
        draft.previousAssignment.trim() ||
        draft.todayAssignment.trim() ||
        draft.status
      if (!hasContent || !draft.status) continue

      onSaveEntry({
        id: display.entryId,
        studentId,
        date,
        subject,
        slotNumber,
        previousAssignment: draft.previousAssignment,
        todayAssignment: draft.todayAssignment,
        status: draft.status,
      })
    }
  }

  const saveTextbookName = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    name: string,
  ) => {
    const existing = slots.find(
      (slot) =>
        slot.studentId === studentId &&
        slot.subject === subject &&
        slot.slotNumber === slotNumber,
    )
    onSaveSlot({
      id: existing?.id,
      studentId,
      subject,
      slotNumber,
      textbookName: name,
    })
  }

  return (
    <SectionCard title="숙제 수행 결과">
      <div className="space-y-3">
        {TEXTBOOK_SUBJECTS.map((subject) => (
          <div key={subject}>
            <p className="mb-1.5 text-xs font-bold text-navy-800">{subject}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {grouped[subject].map((item) => {
                const key = `${item.subject}-${item.slotNumber}`
                const draft = drafts[key]
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
                      value={item.textbookName}
                      onSave={(name) => saveTextbookName(item.subject, item.slotNumber, name)}
                    />
                    <HomeworkStatusPicker
                      compact
                      value={draft.status}
                      onChange={(status) =>
                        updateDraft(item.subject, item.slotNumber, { status })
                      }
                    />
                    <div className="mt-1.5 space-y-1.5">
                      <div>
                        <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                          지난 과제
                        </label>
                        <input
                          value={draft.previousAssignment}
                          onChange={(e) =>
                            updateDraft(item.subject, item.slotNumber, {
                              previousAssignment: e.target.value,
                            })
                          }
                          className={compactInputClass()}
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                          오늘 해야 할 과제
                        </label>
                        <input
                          value={draft.todayAssignment}
                          onChange={(e) =>
                            updateDraft(item.subject, item.slotNumber, {
                              todayAssignment: e.target.value.slice(
                                0,
                                TODAY_ASSIGNMENT_MAX_LENGTH,
                              ),
                            })
                          }
                          className={compactInputClass()}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-2">
              <SaveButton onClick={() => saveSubject(subject)} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
