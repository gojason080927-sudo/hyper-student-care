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
      className="admission-strategy-nametag pm-card flex min-h-14 w-full items-start justify-between gap-3 whitespace-normal px-4 py-3.5 pr-4 text-left sm:items-center sm:px-5 sm:pr-5"
    >
      <span className="min-w-0 flex-1 overflow-visible pr-1">
        {material.isUnread && (
          <span className="mb-1 block text-xs font-semibold leading-snug text-[#E67A2E]">
            새로운 자료가 업로드되었습니다
          </span>
        )}
        <span className="admission-strategy-nametag-title block max-w-full whitespace-normal break-anywhere text-base font-semibold leading-snug text-[#163A70]">
          {material.title}
        </span>
        {updated && <span className="mt-1 block whitespace-normal text-xs text-[#6B7280]">{updated}</span>}
      </span>
      <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-[#163A70] sm:mt-0" aria-hidden />
    </button>
  )
}
