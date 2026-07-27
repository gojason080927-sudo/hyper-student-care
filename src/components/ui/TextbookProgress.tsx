type TextbookProgressProps = {
  value: number
  className?: string
}

export function TextbookProgress({ value, className = '' }: TextbookProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={`flex min-w-[120px] items-center gap-3 ${className}`}>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="shrink-0 text-sm font-semibold text-navy-900">{clamped}%</span>
    </div>
  )
}
