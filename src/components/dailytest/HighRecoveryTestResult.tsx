import { formatHighRecoveryResult, type HighRecoveryParsed } from '../../utils/mathHighRecovery'

type HighRecoveryTestResultProps = {
  parsed: HighRecoveryParsed
  compact?: boolean
}

export function HighRecoveryTestResult({ parsed, compact = false }: HighRecoveryTestResultProps) {
  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
      <p
        className={
          compact ? 'text-[11px] font-semibold text-[#163A70]' : 'text-sm font-bold text-[#163A70]'
        }
      >
        고등 오답 추적
      </p>
      <p className="text-sm font-semibold text-slate-800">{formatHighRecoveryResult(parsed)}</p>
    </div>
  )
}
