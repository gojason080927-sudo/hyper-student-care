import { bandLabel } from './classifier'
import type { RegularEvaluation, SupportBand } from './types'

function fmt(n: number): string {
  const abs = Math.abs(n)
  const s = abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)
  return s.replace(/\.0$/, '')
}

function topicParticle(name: string): string {
  return name === '수학' ? '은' : '는'
}

function subjectClause(
  name: string,
  diff: number | null,
): string | null {
  if (diff == null || Math.abs(diff) < 0.05) return null
  const p = topicParticle(name)
  if (diff < 0) {
    return `${name}${p} 전년도 70% 기준보다 ${fmt(diff)}점 낮고`
  }
  return `${name}${p} 전년도 70% 기준보다 ${fmt(diff)}점 높고`
}

/**
 * 공식 데이터로 설명할 수 있는 내용만 생성한다.
 */
export function buildExplanation(
  evaluation: Omit<RegularEvaluation, 'explanation' | 'band'> & {
    band: SupportBand | null
  },
): string {
  if (evaluation.skipped || !evaluation.eligibilityOk) {
    return evaluation.eligibilityNote ?? evaluation.skipReason ?? ''
  }
  if (evaluation.band == null || evaluation.supportGap == null) {
    return ''
  }

  const d = evaluation.subjectDiffs
  const clauses = [
    subjectClause('국어', d.koreanDiff),
    subjectClause('수학', d.mathDiff),
    subjectClause('탐구', d.inquiryDiff),
  ].filter((c): c is string => c != null)

  const bandKo = bandLabel(evaluation.band)
  const row = evaluation.row
  const weights: string[] = []
  if ((row.mathWeight ?? 0) > (row.koreanWeight ?? 0) && (row.mathWeight ?? 0) > (row.inquiryWeight ?? 0)) {
    weights.push('이 모집단위는 수학 반영비중이 높아')
  } else if ((row.koreanWeight ?? 0) > (row.mathWeight ?? 0) && (row.koreanWeight ?? 0) > (row.inquiryWeight ?? 0)) {
    weights.push('이 모집단위는 국어 반영비중이 높아')
  } else if ((row.inquiryWeight ?? 0) > (row.koreanWeight ?? 0) && (row.inquiryWeight ?? 0) > (row.mathWeight ?? 0)) {
    weights.push('이 모집단위는 탐구 반영비중이 높아')
  }

  const basis = evaluation.comparisonBasis
  const gapText =
    evaluation.supportGap > 0.05
      ? `전년도 70% 기준보다 ${fmt(evaluation.supportGap)}점 우위`
      : evaluation.supportGap < -0.05
        ? `전년도 70% 기준보다 ${fmt(evaluation.supportGap)}점 부족`
        : '전년도 70% 기준과 비슷한 수준'

  if (clauses.length === 0) {
    return `${basis} 기준으로 ${gapText}이며 ${bandKo}권으로 판정했습니다.`
  }

  const head = clauses.join(' ')
  const weightBit = weights[0] ? ` ${weights[0]}` : ''
  return `${head}${weightBit} ${basis} 종합 결과 ${bandKo}권으로 판정했습니다.`
}
