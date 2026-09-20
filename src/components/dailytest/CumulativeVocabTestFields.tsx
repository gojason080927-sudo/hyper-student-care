import { parseVocabWordCountDraft } from '../../utils/englishVocabTest'

type CumulativeVocabTestFieldsProps = {
  totalWords: string
  wrongWords: string
  onTotalWordsChange: (value: string) => void
  onWrongWordsChange: (value: string) => void
  error?: string
  compact?: boolean
  disabled?: boolean
}

function acceptWordCountDraft(raw: string): boolean {
  return raw === '' || parseVocabWordCountDraft(raw) != null
}

export function CumulativeVocabTestFields({
  totalWords,
  wrongWords,
  onTotalWordsChange,
  onWrongWordsChange,
  error,
  compact = false,
  disabled = false,
}: CumulativeVocabTestFieldsProps) {
  const inputClass = compact
    ? 'min-h-8 w-14 min-w-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[#163A70]/40'
    : 'min-h-9 w-16 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[#163A70]/40'

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      <p
        className={
          compact
            ? 'text-[11px] font-semibold text-[#163A70]'
            : 'text-xs font-semibold text-navy-900'
        }
      >
        누적 단어 TEST
      </p>
      <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-slate-700">
        <span className={compact ? 'text-[12px]' : undefined}>누적</span>
        <input
          type="text"
          inputMode="numeric"
          value={totalWords}
          disabled={disabled}
          onChange={(event) => {
            if (acceptWordCountDraft(event.target.value)) {
              onTotalWordsChange(event.target.value)
            }
          }}
          placeholder="300"
          aria-label="전체 시험 단어 수"
          className={inputClass}
        />
        <span className={compact ? 'text-[12px]' : undefined}>단어 중</span>
        <input
          type="text"
          inputMode="numeric"
          value={wrongWords}
          disabled={disabled}
          onChange={(event) => {
            if (acceptWordCountDraft(event.target.value)) {
              onWrongWordsChange(event.target.value)
            }
          }}
          placeholder="6"
          aria-label="틀린 단어 수"
          className={inputClass}
        />
        <span className={compact ? 'text-[12px]' : undefined}>개 틀림</span>
      </div>
      {error ? <p className="text-[11px] font-medium text-rose-500">{error}</p> : null}
    </div>
  )
}
