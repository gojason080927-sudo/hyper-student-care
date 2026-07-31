type StatusBadgeProps = {
  label: string
  colorClass: string
  compact?: boolean
}

export function StatusBadge({ label, colorClass, compact = false }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border font-semibold leading-none ${
        compact
          ? `h-7 px-2.5 py-1 text-sm ${colorClass}`
          : `px-3 py-1.5 text-xs ${colorClass}`
      }`}
    >
      {label}
    </span>
  )
}
