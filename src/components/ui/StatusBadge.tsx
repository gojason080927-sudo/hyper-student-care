type StatusBadgeProps = {
  label: string
  colorClass: string
}

export function StatusBadge({ label, colorClass }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${colorClass}`}
    >
      {label}
    </span>
  )
}
