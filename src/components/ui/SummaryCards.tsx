import type { LucideIcon } from 'lucide-react'

type SummaryCard = {
  label: string
  value: number | string
  icon?: LucideIcon
  accent?: string
}

type SummaryCardsProps = {
  cards: SummaryCard[]
  /** 출결관리 등 — 숫자 강조형 레이아웃 */
  variant?: 'default' | 'stat'
}

export function SummaryCards({ cards, variant = 'default' }: SummaryCardsProps) {
  const gridClass =
    cards.length === 5
      ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5'
      : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'

  const isStat = variant === 'stat'

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${
            isStat ? 'px-4 py-4 sm:px-5 sm:py-5' : 'p-4'
          }`}
        >
          {isStat ? (
            <>
              <p
                className={`text-[2rem] font-bold leading-none tracking-tight sm:text-[2.125rem] ${
                  card.accent ?? 'text-navy-900'
                }`}
              >
                {card.value}
              </p>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-medium text-slate-500">{card.label}</p>
              <p
                className={`mt-1 text-2xl font-bold tracking-tight ${
                  card.accent ?? 'text-navy-900'
                }`}
              >
                {card.value}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
