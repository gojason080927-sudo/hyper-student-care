import { formatCumulativeVocabResult } from '../../utils/englishVocabTest'

type CumulativeVocabTestResultProps = {
  totalWords: number
  wrongWords: number
  compact?: boolean
}

export function CumulativeVocabTestResult({
  totalWords,
  wrongWords,
  compact = false,
}: CumulativeVocabTestResultProps) {
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <p
        className={
          compact
            ? 'text-[11px] font-semibold text-[#163A70]'
            : 'text-sm font-bold text-[#163A70]'
        }
      >
        누적 단어 TEST
      </p>
      <p className={compact ? 'text-sm font-semibold text-slate-800' : 'text-sm font-semibold text-slate-800'}>
        {formatCumulativeVocabResult(totalWords, wrongWords)}
      </p>
    </div>
  )
}
