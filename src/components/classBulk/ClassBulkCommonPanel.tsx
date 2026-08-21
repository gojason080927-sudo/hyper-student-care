import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ClassBulkCommonDraft } from '../../types/classBulk'
import { btnSecondary, inputClass } from '../../utils/labels'

type ClassBulkCommonPanelProps = {
  common: ClassBulkCommonDraft
  onChange: (common: ClassBulkCommonDraft) => void
  onApplyAll: (studentCount: number) => void
  studentCount: number
}

const compactTextarea = `${inputClass()} resize-none py-1.5 text-xs`

export function ClassBulkCommonPanel({
  common,
  onChange,
  onApplyAll,
  studentCount,
}: ClassBulkCommonPanelProps) {
  const [open, setOpen] = useState(false)

  const hasContent = Object.values(common).some((value) => value.trim())

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-slate-50"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-navy-900">
          {open ? '▼' : '▶'} 반 공통 입력
        </span>
        {!open && hasContent && (
          <span className="text-xs text-slate-400">입력됨</span>
        )}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        )}
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="common-math" className="mb-1 block text-xs font-semibold text-slate-700">
                수학 진도
              </label>
              <textarea
                id="common-math"
                rows={2}
                value={common.mathProgress}
                onChange={(e) => onChange({ ...common, mathProgress: e.target.value })}
                className={compactTextarea}
                placeholder="수학 진도"
              />
            </div>
            <div>
              <label
                htmlFor="common-english"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                영어 진도
              </label>
              <textarea
                id="common-english"
                rows={2}
                value={common.englishProgress}
                onChange={(e) => onChange({ ...common, englishProgress: e.target.value })}
                className={compactTextarea}
                placeholder="영어 진도"
              />
            </div>
            <div>
              <label
                htmlFor="common-today"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                오늘 과제
              </label>
              <textarea
                id="common-today"
                rows={2}
                value={common.todayAssignment}
                onChange={(e) => onChange({ ...common, todayAssignment: e.target.value })}
                className={compactTextarea}
                placeholder="오늘 과제"
              />
            </div>
            <div>
              <label
                htmlFor="common-memo"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                강사 메모
              </label>
              <textarea
                id="common-memo"
                rows={2}
                value={common.teacherMemo}
                onChange={(e) => onChange({ ...common, teacherMemo: e.target.value })}
                className={compactTextarea}
                placeholder="강사 메모"
              />
            </div>
          </div>
          <button
            type="button"
            className={`${btnSecondary} w-full min-h-9 text-xs sm:w-auto`}
            disabled={studentCount === 0 || !hasContent}
            onClick={() => onApplyAll(studentCount)}
          >
            반 전체 적용
          </button>
        </div>
      )}
    </section>
  )
}
