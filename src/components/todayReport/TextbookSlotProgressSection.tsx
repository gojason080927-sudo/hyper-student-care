import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Save } from 'lucide-react'
import { EditableTextbookName } from './EditableTextbookName'
import { HeroProgressBar } from '../ui/HeroProgressBar'
import type { useData } from '../../hooks/useData'
import type {
  ProgressRecord,
  StudentTextbookSlot,
  TextbookSlotNumber,
  TextbookSubject,
} from '../../types/records'
import { TEXTBOOK_SLOT_NUMBERS, TEXTBOOK_SUBJECTS } from '../../types/records'
import { calcProgressRate } from '../../utils/calc'
import { inputClass } from '../../utils/labels'
import {
  buildProgressNameDrafts,
  buildProgressTextbookDisplays,
  buildProgressTextbookDisplaysForEdit,
  findTextbookSlot,
  groupProgressBySubject,
} from '../../utils/textbookSlots'

const PROGRESS_CATEGORY = 'progress' as const

type ProgressSlotDraft = {
  currentProgress: string
  currentPage: string
  totalPage: string
}

function compactInputClass() {
  return `${inputClass()} min-h-9 py-1.5 text-sm`
}

function compactTextareaClass() {
  return `${inputClass()} min-h-[4.5rem] resize-y py-1.5 text-sm leading-snug`
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
      <h3 className="mb-1.5 text-sm font-bold text-navy-900">{title}</h3>
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
  onSave,
  onSaveSlot,
}: {
  readOnly: boolean
  studentId: string
  date: string
  slots: StudentTextbookSlot[]
  progressRecords: ProgressRecord[]
  onSave: ReturnType<typeof useData>['saveProgressRecord']
  onSaveSlot: ReturnType<typeof useData>['saveStudentTextbookSlot']
}) {
  const initialDisplays = useMemo(
    () => buildProgressTextbookDisplaysForEdit(studentId, date, slots, progressRecords),
    [date, progressRecords, slots, studentId],
  )

  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>(() =>
    buildProgressNameDrafts(studentId, slots),
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

  useEffect(() => {
    setNameDrafts(buildProgressNameDrafts(studentId, slots))
  }, [slots, studentId])

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
    setTeacherMemos({
      수학: initialDisplays.find((item) => item.subject === '수학')?.teacherMemo ?? '',
      영어: initialDisplays.find((item) => item.subject === '영어')?.teacherMemo ?? '',
    })
  }, [initialDisplays])

  const saveTextbookName = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    name: string,
  ) => {
    const trimmed = name.trim()
    const key = `${subject}-${slotNumber}`
    setNameDrafts((prev) => ({ ...prev, [key]: trimmed }))
    if (!trimmed) return

    const existing = findTextbookSlot(
      slots,
      studentId,
      PROGRESS_CATEGORY,
      subject,
      slotNumber,
    )
    onSaveSlot({
      id: existing?.id,
      studentId,
      category: PROGRESS_CATEGORY,
      subject,
      slotNumber,
      textbookName: trimmed,
    })
  }

  if (readOnly) {
    const displays = buildProgressTextbookDisplays(studentId, date, slots, progressRecords)
    if (displays.length === 0) {
      return (
        <SectionCard title="오늘의 진도">
          <p className="text-sm text-slate-400">오늘 등록된 진도 정보가 없습니다.</p>
        </SectionCard>
      )
    }

    const grouped = groupProgressBySubject(displays)
    return (
      <SectionCard title="오늘의 진도">
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
                      className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2"
                    >
                      <p className="text-sm font-semibold text-navy-800">
                        {item.textbookName || `교재 ${item.slotNumber}`}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-700">
                        {item.currentProgress.trim() || '등록된 진도가 없습니다.'}
                        {item.totalPage > 0 ? `, ${Math.round(item.progressRate)}%` : ''}
                      </p>
                      {item.totalPage > 0 && (
                        <div className="mt-1.5">
                          <HeroProgressBar value={item.progressRate} size="default" />
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

  const grouped = groupProgressBySubject(initialDisplays)

  const updateDraft = (
    subject: TextbookSubject,
    slotNumber: TextbookSlotNumber,
    patch: Partial<ProgressSlotDraft>,
  ) => {
    const key = `${subject}-${slotNumber}`
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  const saveSubject = (subject: TextbookSubject) => {
    const memo = teacherMemos[subject].trim()
    for (const slotNumber of TEXTBOOK_SLOT_NUMBERS) {
      const display = initialDisplays.find(
        (item) => item.subject === subject && item.slotNumber === slotNumber,
      )
      if (!display) continue

      const key = `${subject}-${slotNumber}`
      const draft = drafts[key]
      const textbookName = (nameDrafts[key] ?? '').trim()
      const currentPage = Number(draft.currentPage) || 0
      const totalPage = Number(draft.totalPage) || 0

      if (textbookName) {
        saveTextbookName(subject, slotNumber, textbookName)
      }

      const hasContent =
        textbookName ||
        draft.currentProgress.trim() ||
        currentPage > 0 ||
        totalPage > 0 ||
        memo

      if (!hasContent) continue

      onSave({
        id: display.recordId,
        studentId,
        subject,
        slotNumber,
        textbookName,
        currentProgress: draft.currentProgress.trim(),
        currentPage,
        totalPage: totalPage || 1,
        lastStudyDate: date,
        teacherMemo: memo,
      })
    }
  }

  return (
    <SectionCard title="오늘의 진도">
      <div className="space-y-3">
        {TEXTBOOK_SUBJECTS.map((subject) => (
          <div key={subject}>
            <p className="mb-1.5 text-xs font-bold text-navy-800">{subject}</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {grouped[subject].map((item) => {
                const key = `${item.subject}-${item.slotNumber}`
                const draft = drafts[key]
                const currentPage = Number(draft.currentPage) || 0
                const totalPage = Number(draft.totalPage) || 0
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
                    />
                    <div className="space-y-1.5">
                      <div>
                        <label className="mb-0.5 block text-[11px] font-semibold text-navy-800">
                          현재 진도
                        </label>
                        <textarea
                          value={draft.currentProgress}
                          onChange={(e) =>
                            updateDraft(item.subject, item.slotNumber, {
                              currentProgress: e.target.value,
                            })
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
                            min={1}
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
              <textarea
                value={teacherMemos[subject]}
                onChange={(e) =>
                  setTeacherMemos((prev) => ({ ...prev, [subject]: e.target.value }))
                }
                rows={1}
                className={compactTextareaClass()}
              />
              <button
                type="button"
                onClick={() => saveSubject(subject)}
                className="inline-flex min-h-9 items-center rounded-lg bg-navy-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy-900"
              >
                <Save className="mr-1 inline h-3.5 w-3.5" />
                {subject} 진도 저장
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
