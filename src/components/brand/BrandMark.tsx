type BrandMarkProps = {
  variant?: 'sidebar' | 'compact' | 'header'
}

export function BrandMark({ variant = 'sidebar' }: BrandMarkProps) {
  if (variant === 'compact') {
    return (
      <div>
        <p className="text-base font-bold leading-tight tracking-tight text-navy-900">
          Hyper Student Care
        </p>
      </div>
    )
  }

  if (variant === 'header') {
    return (
      <div>
        <p className="text-lg font-bold leading-tight tracking-tight text-navy-900 sm:text-xl">
          Hyper Student Care
        </p>
        <p className="hidden text-sm text-slate-500 sm:block">
          하이퍼 학생 관리 시스템
        </p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <p className="text-[21px] font-bold leading-[1.2] tracking-tight text-[#1E3A8A] [text-shadow:0_1px_1px_rgba(255,255,255,0.6),0_2px_6px_rgba(15,23,42,0.08)]">
        Hyper
      </p>
      <p className="text-[21px] font-bold leading-[1.2] tracking-tight text-[#1E3A8A] [text-shadow:0_1px_1px_rgba(255,255,255,0.6),0_2px_6px_rgba(15,23,42,0.08)]">
        Student Care
      </p>
      <p className="mt-2.5 whitespace-nowrap text-[16px] font-semibold text-[#334155] [text-shadow:0_1px_1px_rgba(255,255,255,0.5),0_1px_4px_rgba(15,23,42,0.06)]">
        하이퍼 학생 관리 시스템
      </p>
    </div>
  )
}
