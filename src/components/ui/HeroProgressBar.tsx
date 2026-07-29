type HeroProgressBarProps = {
  value: number
  className?: string
  size?: 'default' | 'large' | 'hero'
}

export function HeroProgressBar({
  value,
  className = '',
  size = 'default',
}: HeroProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)))
  const labelOnFill = clamped >= 42
  const heightClass =
    size === 'hero' ? 'h-14 sm:h-16' : size === 'large' ? 'h-12 sm:h-14' : 'h-11 sm:h-12'
  const textClass =
    size === 'hero'
      ? 'text-xl sm:text-2xl'
      : size === 'large'
        ? 'text-lg sm:text-xl'
        : 'text-base sm:text-lg'

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-navy-100/60 shadow-inner ${heightClass} ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`교재 진행률 ${clamped}%`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-2xl bg-gradient-to-r from-navy-800 via-navy-700 to-navy-600 transition-all duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center font-bold tracking-tight ${textClass} ${
          labelOnFill ? 'text-white drop-shadow-sm' : 'text-navy-800'
        }`}
      >
        {clamped}%
      </span>
    </div>
  )
}
