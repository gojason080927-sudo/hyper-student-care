import { SectionTitleWithHint } from '../ui/SectionTitleWithHint'

type WrongAnswerBankBlockProps = {
  memo?: string
  className?: string
}

/** 학부모 Today Report / 일일테스트 — 오답 BANK 표시 (daily_tests.memo) */
export function WrongAnswerBankBlock({
  memo,
  className = '',
}: WrongAnswerBankBlockProps) {
  const content = memo?.trim() ?? ''

  return (
    <div
      className={`border-t border-[rgba(22,58,112,0.08)] pt-2.5 ${className}`.trim()}
    >
      <h4 className="text-sm font-bold text-[#163A70]">
        <SectionTitleWithHint
          title="오답 BANK"
          hint="오답 저장 후 오답 보강 실시"
          hintClassName="text-[11px]"
        />
      </h4>
      {content ? (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {content}
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-slate-400">등록된 오답 내용이 없습니다.</p>
      )}
    </div>
  )
}
