type SectionTitleWithHintProps = {
  title: string
  hint: string
  /** 보조 문구 크기 오버라이드 (기본 text-xs) */
  hintClassName?: string
}

/** 제목 + 작은 회색 보조 설명 (같은 줄, 좁으면 보조 문구만 줄바꿈) */
export function SectionTitleWithHint({
  title,
  hint,
  hintClassName = 'text-xs',
}: SectionTitleWithHintProps) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5">
      <span>{title}</span>
      <span className={`font-normal text-slate-400 ${hintClassName}`.trim()}>
        - {hint}
      </span>
    </span>
  )
}
