import type { UniversityMatchCard } from '../types'
import {
  formatAdmissionYearLabel,
  formatAdvantageLabel,
  supportBandLabel,
} from '../utils/universityAdmissionAnalyzer'

type Props = {
  card: UniversityMatchCard
  selected?: boolean
  onToggleSelect?: (selected: boolean) => void
  showSelect?: boolean
}

export function UniversityAdmissionResultCard({
  card,
  selected = false,
  onToggleSelect,
  showSelect = false,
}: Props) {
  const u = card.university
  const dataType = u.dataType ?? 'actual_admission_result'
  const isOlder =
    typeof u.sourceYear === 'number' &&
    typeof u.admissionYear === 'number' &&
    u.admissionYear < new Date().getFullYear() - 1

  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        selected
          ? 'border-[#28C7B7] ring-1 ring-[#28C7B7]/40'
          : 'border-[rgba(22,58,112,0.12)]'
      }`}
      data-university-id={u.id}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {showSelect && onToggleSelect ? (
            <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm font-medium text-[#163A70] no-print">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={selected}
                onChange={(e) => onToggleSelect(e.target.checked)}
              />
              상담보고서에 포함
            </label>
          ) : null}
          <h5 className="text-base font-bold text-[#163A70] break-words">
            {u.universityName}
          </h5>
          <p className="mt-0.5 text-sm text-slate-700 break-words">{u.departmentName}</p>
          <p className="mt-0.5 text-sm text-slate-500 break-words">{u.admissionType}</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatAdmissionYearLabel(u.admissionYear, dataType)}
            {isOlder ? (
              <span className="ml-2 text-amber-700">· 과거 자료</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {card.band ? (
            <span className="rounded-lg bg-[rgba(40,199,183,0.12)] px-2.5 py-1 text-xs font-semibold text-[#0F766E]">
              {supportBandLabel(card.band)}
            </span>
          ) : null}
          {u.officialData ? (
            <span className="rounded-lg bg-[#163A70]/10 px-2 py-0.5 text-[11px] font-medium text-[#163A70]">
              공식자료
            </span>
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">전년도 최종등록자 70%컷</dt>
          <dd className="mt-0.5 font-semibold text-[#163A70]">
            {card.cutoffUsed === null
              ? '70%컷 미공개'
              : card.cutoffUsed.toFixed(2)}
          </dd>
        </div>
        {u.cutoff50 != null ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">참고 50%컷</dt>
            <dd className="mt-0.5 font-medium text-slate-700">
              {u.cutoff50.toFixed(2)}
            </dd>
          </div>
        ) : null}
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">학생 환산 참고값</dt>
          <dd className="mt-0.5 font-semibold text-[#163A70]">
            {card.studentComparableGrade.toFixed(2)}
          </dd>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <dt className="text-xs text-slate-500">학생과 70%컷 차이</dt>
          <dd className="mt-0.5 font-semibold text-[#163A70]">
            {card.difference === null
              ? '-'
              : formatAdvantageLabel(card.difference)}
          </dd>
        </div>
      </dl>

      {u.reflectedSubjects && u.reflectedSubjects.length > 0 ? (
        <p className="mt-3 text-xs text-slate-600 break-words">
          <span className="font-medium text-slate-700">반영교과 </span>
          {u.reflectedSubjects.join(' / ')}
        </p>
      ) : null}

      {u.calculationNote ? (
        <p className="mt-1 text-xs text-slate-500 break-words">{u.calculationNote}</p>
      ) : null}

      {u.csatMinimum ? (
        <p className="mt-2 text-xs font-medium text-[#163A70]">
          수능최저 있음 · {u.csatMinimum}
        </p>
      ) : null}

      {card.exclusionReason ? (
        <p className="mt-2 text-xs text-amber-800">{card.exclusionReason}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {u.sourceUrl ? (
          <a
            href={u.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center rounded-lg border border-[rgba(22,58,112,0.2)] px-3 text-xs font-medium text-[#163A70] hover:bg-slate-50 no-print"
          >
            공식자료 확인
          </a>
        ) : (
          <span className="text-xs text-slate-400">출처 URL 없음</span>
        )}
        <p className="text-[11px] leading-relaxed text-slate-500 break-words">
          {formatAdmissionYearLabel(u.admissionYear, dataType)} · 출처 {u.sourceName}
          {u.sourceYear ? ` (sourceYear ${u.sourceYear})` : ''}
        </p>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">70%컷 기준 참고 판정</p>
    </article>
  )
}
