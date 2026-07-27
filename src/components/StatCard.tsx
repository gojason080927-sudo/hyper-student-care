import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  accent: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'cyan'
}

const accentStyles = {
  blue: {
    icon: 'bg-blue-50 text-blue-600 ring-blue-100',
    bar: 'from-blue-500 to-blue-600',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    bar: 'from-emerald-500 to-emerald-600',
  },
  violet: {
    icon: 'bg-violet-50 text-violet-600 ring-violet-100',
    bar: 'from-violet-500 to-violet-600',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    bar: 'from-amber-500 to-amber-600',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-600 ring-rose-100',
    bar: 'from-rose-500 to-rose-600',
  },
  cyan: {
    icon: 'bg-cyan-50 text-cyan-600 ring-cyan-100',
    bar: 'from-cyan-500 to-cyan-600',
  },
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp,
  accent,
}: StatCardProps) {
  const styles = accentStyles[accent]

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${styles.bar} opacity-80`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-navy-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${styles.icon}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
          <span
            className={`text-xs font-semibold ${
              trendUp ? 'text-emerald-600' : 'text-rose-500'
            }`}
          >
            {trend}
          </span>
          <span className="text-xs text-slate-400">vs last week</span>
        </div>
      )}
    </article>
  )
}
