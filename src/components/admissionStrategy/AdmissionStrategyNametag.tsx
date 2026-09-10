import { ChevronRight } from 'lucide-react'
import type { ParentAdmissionStrategyMaterial } from '../../types/admissionStrategyMaterial'
import { formatKoreanDate } from '../../utils/date'

function dateLabel(value: string | null): string | null {
  if (!value) return null
  const day = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null
  return formatKoreanDate(day)
}

type AdmissionStrategyNametagProps = {
  material: ParentAdmissionStrategyMaterial
  onOpen: (id: string) => void
}

export function AdmissionStrategyNametag({ material, onOpen }: AdmissionStrategyNametagProps) {
  const updated = dateLabel(material.publishedAt)

  return (
    <button
      type="button"
      onClick={() => onOpen(material.id)}
      className="pm-card flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
    >
      <span className="min-w-0">
        <span className="block break-anywhere text-base font-semibold leading-snug text-[#163A70]">
          {material.title}
        </span>
        {updated && <span className="mt-1 block text-xs text-[#6B7280]">{updated}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#163A70]" aria-hidden />
    </button>
  )
}
