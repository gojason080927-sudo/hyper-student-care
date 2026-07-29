type StatusBadgeProps = {
  label: string
  colorClass: string
}

export function StatusBadge({ label, colorClass }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold leading-none ${colorClass}`}
    >
      {label}
    </span>
  )
}
