import { Printer } from 'lucide-react'
import { createPortal } from 'react-dom'
import { btnPrimary, btnSecondary } from '../../../utils/labels'
import { CHOICE_LABELS } from '../constants'
import type { EntranceExamQuestion } from '../types'
import { EntranceExamQuestionModal } from './EntranceExamQuestionModal'
import './entranceExamPrint.css'

type Props = {
  question: EntranceExamQuestion | null
  onClose: () => void
}

export function EntranceExamQuestionPreviewModal({ question, onClose }: Props) {
  if (!question) return null

  const handlePrint = () => {
    const root = document.documentElement
    root.classList.add('ee-printing-exam')
    const cleanup = () => {
      root.classList.remove('ee-printing-exam')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.setTimeout(cleanup, 2000)
    window.print()
  }

  return (
    <>
      <EntranceExamQuestionModal open title="문제 미리보기" onClose={onClose}>
        <div className="ee-no-print space-y-4 p-5">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-[#163A70] px-2 py-0.5 text-white">
              {question.subject}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              {question.targetGrade}
            </span>
            <span className="rounded-full bg-[rgba(40,199,183,0.14)] px-2 py-0.5 text-[#0F766E]">
              난이도 {question.difficulty}
            </span>
            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-slate-600">
              {question.unitName}
            </span>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">평가영역</p>
            <div className="flex flex-wrap gap-1.5">
              {question.evaluationAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">문제</p>
            <p className="whitespace-pre-wrap text-sm font-medium text-slate-900">{question.stem}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">보기</p>
            <ol className="space-y-1.5">
              {question.choices.map((choice, index) => (
                <li key={CHOICE_LABELS[index]} className="flex gap-2 text-sm text-slate-800">
                  <span className="w-6 shrink-0 font-semibold text-[#163A70]">
                    {CHOICE_LABELS[index]}
                  </span>
                  <span className="whitespace-pre-wrap">{choice}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold text-slate-500">정답</p>
            <p className="mt-0.5 text-sm font-semibold text-[#163A70]">
              {CHOICE_LABELS[question.correctChoice - 1] ?? question.correctChoice}
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">해설</p>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {question.explanation.trim() ? question.explanation : '해설 없음'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={btnSecondary}>
              닫기
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className={`${btnPrimary} inline-flex items-center gap-2`}
            >
              <Printer className="h-4 w-4" />
              출력
            </button>
          </div>
        </div>
      </EntranceExamQuestionModal>

      {createPortal(
        <div className="ee-print-sheet" aria-hidden="true">
          <header className="ee-print-header">
            <p className="ee-print-brand">HYPER STUDENT CARE · 신입생 평가</p>
            <p className="ee-print-meta">
              {question.subject} · {question.targetGrade}
              {question.unitName.trim() ? ` · ${question.unitName}` : ''}
            </p>
          </header>
          <section className="ee-print-stem">
            <p className="ee-print-label">문제</p>
            <p className="ee-print-stem-text">{question.stem}</p>
          </section>
          <section className="ee-print-choices">
            <p className="ee-print-label">보기</p>
            <ol>
              {question.choices.map((choice, index) => (
                <li key={CHOICE_LABELS[index]}>
                  <span className="ee-print-choice-label">{CHOICE_LABELS[index]}</span>
                  <span>{choice}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
