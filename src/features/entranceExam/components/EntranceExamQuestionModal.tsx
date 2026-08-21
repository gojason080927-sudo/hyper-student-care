import { X } from 'lucide-react'
import type { ReactNode } from 'react'

type EntranceExamQuestionModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** 시험지 구성 등 넓은 레이아웃 */
  size?: 'default' | 'wide'
}

/**
 * 문제은행 전용 모달.
 * 공통 Modal의 전체화면 backdrop <button onClick={onClose}>는
 * 우클릭 → 붙여넣기 시 컨텍스트 메뉴 클릭이 backdrop으로 관통되어
 * 모달이 닫히는 문제가 있어, 여기서는 backdrop 클릭으로 닫지 않는다.
 * 닫기는 X / 취소 / 저장 성공 시에만 허용한다.
 */
export function EntranceExamQuestionModal({
  open,
  title,
  onClose,
  children,
  size = 'default',
}: EntranceExamQuestionModalProps) {
  if (!open) return null

  const widthClass = size === 'wide' ? 'max-w-4xl' : 'max-w-2xl'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* 시각용 오버레이만 — 클릭/키보드로 닫지 않음 */}
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" aria-hidden="true" />
      <div
        className={`relative max-h-[90vh] w-full ${widthClass} overflow-y-auto rounded-2xl bg-white shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entrance-exam-question-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2
            id="entrance-exam-question-modal-title"
            className="text-lg font-bold text-navy-900"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
