import type { LucideIcon } from 'lucide-react'

type SummaryCard = {
  label: string
  value: number | string
  icon?: LucideIcon
  accent?: string
}

type SummaryCardsProps = {
  cards: SummaryCard[]
}

export function SummaryCards({ cards }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-slate-500">{card.label}</p>
          <p
            className={`mt-1 text-2xl font-bold tracking-tight ${
              card.accent ?? 'text-navy-900'
            }`}
          >
            {card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
