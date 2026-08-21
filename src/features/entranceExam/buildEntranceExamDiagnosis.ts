/**
 * Phase 5 — 규칙 기반 신입생 종합 학습진단 엔진 (pure / deterministic).
 * 수학 진단은 기존 로직을 유지하고, 영어는 additive 분기만 추가한다.
 */
import { buildEnglishEntranceExamDiagnosis } from './buildEntranceExamEnglishDiagnosis'
import type { EntranceExamDiagnosticReport } from './buildEntranceExamReport'

export type EntranceExamDiagnosis = {
  academicDiagnosis: string
  learningDiagnosis: string
  integratedDiagnosis: string
  strengths: string[]
  improvementAreas: string[]
  managementRecommendations: string[]
  reliabilityNotes: string[]
}

type ScoredAcademicArea = {
  area: string
  score: number
  totalCount: number
  reliability: 'reference' | 'limited' | 'general'
}

type ScoredLearningArea = {
  id: string
  label: string
  score: number
  band: LearningBand
}

type LearningBand =
  | 'strength'
  | 'good'
  | 'average'
  | 'needs_support'
  | 'priority_support'

function learningBand(score: number): LearningBand {
  if (score >= 80) return 'strength'
  if (score >= 70) return 'good'
  if (score >= 60) return 'average'
  if (score >= 50) return 'needs_support'
  return 'priority_support'
}

function reliabilityOf(totalCount: number): ScoredAcademicArea['reliability'] {
  if (totalCount <= 1) return 'reference'
  if (totalCount === 2) return 'limited'
  return 'general'
}

function hasBatchim(word: string): boolean {
  const ch = word.trim().slice(-1)
  if (!ch) return false
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

function waGwa(word: string): string {
  return hasBatchim(word) ? '과' : '와'
}

function eunNeun(word: string): string {
  return hasBatchim(word) ? '은' : '는'
}

function joinKorean(labels: string[]): string {
  if (labels.length === 0) return ''
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]}${waGwa(labels[0])} ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, ${labels[labels.length - 1]}`
}

/** 영역명에서 짧은 수행 특성 표현 */
function areaProcessHint(area: string): string {
  if (area.includes('해석') || area.includes('독해')) {
    return '조건과 요구사항을 정확하게 파악하는 과정'
  }
  if (area.includes('계산')) return '계산을 수행하는 과정'
  if (area.includes('개념')) return '핵심 개념을 적용하는 과정'
  if (area.includes('응용')) return '학습한 내용을 응용하는 과정'
  if (area.includes('해결')) return '문제를 단계적으로 해결하는 과정'
  if (area.includes('실수')) return '실수 점검과 검산 과정'
  if (area.includes('어휘')) return '어휘를 이해하고 활용하는 과정'
  if (area.includes('문법')) return '문법 구조를 파악하는 과정'
  return `${area} 관련 수행 과정`
}

function pickAcademicAreas(report: EntranceExamDiagnosticReport): ScoredAcademicArea[] {
  return report.academicAreas
    .filter(
      (item) =>
        item.status === 'accuracy' &&
        item.score != null &&
        item.totalCount > 0,
    )
    .map((item) => ({
      area: item.area,
      score: item.score as number,
      totalCount: item.totalCount,
      reliability: reliabilityOf(item.totalCount),
    }))
}

function sortByScoreDesc<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score || 0)
}

function sortByScoreAsc<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.score - b.score || 0)
}

function isAcademicHigh(area: ScoredAcademicArea): boolean {
  return area.score >= 70
}

function isAcademicLow(area: ScoredAcademicArea): boolean {
  return area.score < 60
}

function hasSparseSample(areas: ScoredAcademicArea[]): boolean {
  return areas.some((item) => item.reliability !== 'general')
}

function buildAcademicDiagnosis(areas: ScoredAcademicArea[]): string {
  if (areas.length === 0) {
    return '현재 입학테스트에서 진단에 사용할 수 있는 평가영역 결과가 없어, 학업 수행 특성에 대한 설명을 보류합니다. 문항이 확보된 이후 다시 진단하는 것이 바람직합니다.'
  }

  const high = sortByScoreDesc(areas.filter(isAcademicHigh)).slice(0, 2)
  const low = sortByScoreAsc(areas.filter(isAcademicLow)).slice(0, 2)
  const mid = areas.filter((item) => !isAcademicHigh(item) && !isAcademicLow(item))
  const parts: string[] = []

  if (high.length > 0 && low.length > 0) {
    const highNames = joinKorean(high.map((item) => item.area))

    if (high.every((item) => item.reliability === 'reference')) {
      parts.push(
        `${highNames}에서는 현재 출제된 문항에서 안정적인 수행이 확인됩니다.`,
      )
    } else if (high.some((item) => item.reliability !== 'general')) {
      parts.push(
        `${highNames}에서는 현재 출제된 문항을 기준으로 비교적 안정적인 수행 경향이 관찰됩니다.`,
      )
    } else {
      parts.push(
        `${highNames}에서는 현재 출제된 문항에서 안정적인 수행을 보였습니다.`,
      )
    }

    if (low.length === 1) {
      const only = low[0]
      const hint = areaProcessHint(only.area)
      if (only.reliability === 'reference') {
        parts.push(
          `반면 ${only.area}에서는 ${hint}에서 보완이 필요한 모습이 확인되나, 평가 문항 수가 적어 확정적으로 판단하지 않습니다.`,
        )
      } else if (only.reliability === 'limited') {
        parts.push(
          `반면 ${only.area}에서는 ${hint}에서 보완이 필요한 경향이 관찰됩니다.`,
        )
      } else {
        parts.push(
          `반면 ${only.area}에서는 ${hint}에서 보완이 필요한 모습이 확인됩니다.`,
        )
      }
    } else {
      const lowParts = low.map((item) => {
        const tone =
          item.reliability === 'reference'
            ? '모습이 확인되나 문항 수가 적어 참고로 봅니다'
            : item.reliability === 'limited'
              ? '경향이 관찰됩니다'
              : '모습이 확인됩니다'
        return `${item.area}에서는 ${areaProcessHint(item.area)}에서 보완이 필요한 ${tone}`
      })
      parts.push(`반면 ${lowParts.join('. ')}.`)
    }
  } else if (high.length > 0) {
    const highNames = joinKorean(high.map((item) => item.area))
    parts.push(
      `${highNames}을(를) 중심으로 현재 출제된 문항에서 학업 수행이 비교적 안정적으로 나타나고 있습니다.`,
    )
    if (mid.length > 0) {
      parts.push(
        `${joinKorean(mid.slice(0, 2).map((item) => item.area))}은(는) 보통 구간에 있어, 기본기를 유지하며 유형별 훈련을 이어가면 성장 여지가 있습니다.`,
      )
    }
  } else if (low.length > 0) {
    const lowNames = joinKorean(low.map((item) => item.area))
    parts.push(
      `현재 입학테스트에서는 ${lowNames}을(를) 중심으로 ${areaProcessHint(low[0].area)}에서 우선 보완이 필요한 모습이 확인됩니다.`,
    )
    parts.push(
      '다만 이는 학생의 가능성을 제한하는 판단이 아니라, 초기 수업에서 지도 비중을 어디에 둘지 정하기 위한 진단입니다.',
    )
  } else {
    const ranked = sortByScoreDesc(areas)
    parts.push(
      `${joinKorean(ranked.slice(0, 2).map((item) => item.area))}을(를) 포함해 평가영역 결과가 대체로 보통~양호 구간에 고르게 분포하는 경향이 있습니다.`,
    )
    parts.push(
      '큰 편차 없이 기본 수행이 확인되므로, 유형별 약점을 선별적으로 보완하면 안정적인 성장을 기대할 수 있습니다.',
    )
  }

  if (hasSparseSample(areas)) {
    parts.push(
      '다만 일부 영역은 평가 문항 수가 적어 현재 결과는 초기 학습 진단을 위한 참고 지표로 활용합니다.',
    )
  }

  return parts.join(' ')
}

type LearningRelation = {
  score: number
  text: string
}

function buildLearningRelations(areas: ScoredLearningArea[]): LearningRelation[] {
  const byId = new Map(areas.map((item) => [item.id, item]))
  const relations: LearningRelation[] = []

  const confidence = byId.get('confidence')
  const selfDirected = byId.get('selfDirected')
  const persistence = byId.get('persistence')
  const concentration = byId.get('concentration')
  const motivation = byId.get('motivation')
  const planning = byId.get('planning')

  if (confidence && selfDirected && confidence.score >= 75 && selfDirected.score <= 55) {
    relations.push({
      score: confidence.score - selfDirected.score + 15,
      text: '학습 능력에 대한 자신감은 있는 편이나, 스스로 학습을 시작하고 관리하는 힘은 상대적으로 부족할 수 있습니다.',
    })
  }
  if (concentration && persistence && concentration.score >= 70 && persistence.score <= 55) {
    relations.push({
      score: concentration.score - persistence.score + 8,
      text: '학습을 시작했을 때 집중은 가능한 편이나, 장시간 또는 반복 학습을 이어가는 지속력 관리가 필요합니다.',
    })
  }
  if (motivation && planning && motivation.score >= 70 && planning.score <= 55) {
    relations.push({
      score: motivation.score - planning.score,
      text: '공부하려는 의지는 확인되나, 이를 구체적인 학습 계획과 실행 단위로 연결하는 훈련이 필요합니다.',
    })
  }
  if (
    confidence &&
    persistence &&
    confidence.score >= 75 &&
    persistence.score <= 55 &&
    !(concentration && concentration.score >= 70)
  ) {
    relations.push({
      score: confidence.score - persistence.score,
      text: '자신감에 비해 꾸준히 학습을 이어가는 힘이 상대적으로 낮아, 짧은 목표 단위의 수행 관리가 효과적일 수 있습니다.',
    })
  }
  if (motivation && selfDirected && motivation.score >= 70 && selfDirected.score <= 55) {
    relations.push({
      score: motivation.score - selfDirected.score,
      text: '학습 동기는 있으나 스스로 과제를 시작하고 점검하는 습관은 아직 형성 단계로 보입니다.',
    })
  }
  if (confidence && confidence.score <= 55) {
    const support = areas.filter(
      (item) => item.id !== 'confidence' && item.score >= 70,
    )
    if (support.length > 0) {
      relations.push({
        score: 70 - confidence.score,
        text: '실제 수행에서 확인되는 강점에 비해 스스로를 낮게 평가하는 경향이 있어, 성공 경험을 통해 자신감을 키우는 지도가 도움이 됩니다.',
      })
    }
  }
  if (planning && persistence && planning.score <= 55 && persistence.score <= 55) {
    relations.push({
      score: 110 - planning.score - persistence.score,
      text: '계획성과 학습 지속력이 함께 낮아, 학습량·순서를 구체적으로 제시하고 완료 여부를 짧게 확인하는 관리가 우선적으로 필요합니다.',
    })
  }

  return relations.sort((a, b) => b.score - a.score)
}

function buildLearningDiagnosis(areas: ScoredLearningArea[]): string {
  if (areas.length === 0) {
    return '학습성향 설문 결과가 없어 학습 태도·습관에 대한 진단을 생성하지 않았습니다.'
  }

  const high = sortByScoreDesc(
    areas.filter((item) => item.band === 'strength' || item.band === 'good'),
  ).slice(0, 2)
  const low = sortByScoreAsc(
    areas.filter(
      (item) => item.band === 'needs_support' || item.band === 'priority_support',
    ),
  ).slice(0, 2)

  const parts: string[] = []

  if (high.length > 0 && low.length > 0) {
    const highLabel = joinKorean(high.map((item) => item.label))
    const lowLabel = joinKorean(low.map((item) => item.label))
    parts.push(
      `${highLabel}${eunNeun(highLabel)} 비교적 양호한 편인 반면, ${lowLabel}${eunNeun(lowLabel)} 상대적으로 낮게 나타났습니다.`,
    )
  } else if (high.length > 0) {
    parts.push(
      `${joinKorean(high.map((item) => item.label))}을(를) 중심으로 학습 태도가 전반적으로 안정적인 편입니다.`,
    )
  } else if (low.length > 0) {
    parts.push(
      `${joinKorean(low.map((item) => item.label))}을(를) 중심으로 학습을 시작하고 이어가는 실행 관리가 우선 보완 영역으로 보입니다.`,
    )
  } else {
    parts.push(
      '학습성향 6개 영역이 대체로 보통 구간에 고르게 분포하여, 특정 영역의 급격한 편차는 크지 않은 편입니다.',
    )
  }

  const relations = buildLearningRelations(areas)
  if (relations.length > 0) {
    parts.push(relations[0].text)
    if (relations[1] && relations[1].score >= 20) {
      parts.push(relations[1].text)
    }
  } else {
    parts.push(
      '학습 태도의 강점을 유지하면서, 상대적으로 낮은 영역을 짧은 주기 관리로 보완하면 실제 성취로 연결될 가능성이 있습니다.',
    )
  }

  return parts.join(' ')
}

function examBand(totalScore: number): 'high' | 'mid' | 'low' {
  if (totalScore >= 75) return 'high'
  if (totalScore >= 55) return 'mid'
  return 'low'
}

function buildIntegratedDiagnosis(
  report: EntranceExamDiagnosticReport,
  academicAreas: ScoredAcademicArea[],
  learningAreas: ScoredLearningArea[],
): string {
  const total = report.academicResult.totalScore
  const exam = examBand(total)
  const parts: string[] = []

  if (!report.completeness.hasSurvey || learningAreas.length === 0) {
    parts.push(
      '현재는 입학테스트 결과를 기준으로 초기 학업 상태를 파악할 수 있습니다.',
    )
    parts.push(
      '학습성향 설문이 함께 확보되면, 성적이 나타난 이유와 수업 관리 방향을 더 정밀하게 설명할 수 있습니다.',
    )
    return parts.join(' ')
  }

  const byId = new Map(learningAreas.map((item) => [item.id, item]))
  const confidence = byId.get('confidence')
  const selfDirected = byId.get('selfDirected')
  const planning = byId.get('planning')
  const persistence = byId.get('persistence')
  const concentration = byId.get('concentration')

  const lowAcademic = sortByScoreAsc(academicAreas.filter(isAcademicLow))
  const interpretationLow = lowAcademic.find(
    (item) => item.area.includes('해석') || item.area.includes('독해'),
  )
  const conceptLow = lowAcademic.find((item) => item.area.includes('개념'))

  // 1) 현재 상태 + 원인 (점수 나열 최소화)
  if (exam === 'low' && confidence && confidence.score >= 75) {
    parts.push(
      '현재 학업 결과는 학생의 가능성 부족이라기보다, 문제를 이해하고 풀어가는 과정과 실제 학습 방법이 아직 안정되지 않은 영향이 큰 것으로 보입니다.',
    )
    parts.push(
      '학습에 대한 자신감은 있는 편이므로, 자신감을 실제 문제 해결 습관과 성취 경험으로 연결하는 지도가 중요합니다.',
    )
  } else if (exam === 'high' && confidence && confidence.score <= 55) {
    parts.push(
      '실제 학업 수행은 비교적 안정적인 반면, 스스로의 능력을 낮게 평가하는 경향이 함께 관찰됩니다.',
    )
    parts.push(
      '성공 경험을 구체적으로 피드백하며 자신감을 키우면, 현재의 수행력을 더 안정적으로 유지·확장할 수 있습니다.',
    )
  } else if (
    (exam === 'mid' || exam === 'low') &&
    selfDirected &&
    selfDirected.score <= 55 &&
    planning &&
    planning.score <= 55
  ) {
    parts.push(
      '현재 학업 결과의 핵심 변수는 단편적인 능력 부족보다, 학습 계획과 실행을 스스로 이어가는 관리 습관에 있을 가능성이 큽니다.',
    )
    parts.push(
      '수업에서 목표·순서를 명확히 제시하고 완료를 확인하는 과정이 성적 개선의 출발점이 됩니다.',
    )
  } else if (exam === 'low' && persistence && persistence.score <= 55) {
    parts.push(
      '학업 보완이 필요한 상태와 함께, 학습을 꾸준히 이어가는 지속력이 상대적으로 낮아 결과 누적이 어려웠을 가능성이 있습니다.',
    )
    parts.push(
      '짧은 목표 단위로 과제를 나누고 수행을 확인하면, 보완 학습이 실제 성취로 이어질 수 있습니다.',
    )
  } else if (exam === 'high') {
    parts.push(
      '현재 학업 수행은 비교적 안정적인 편이며, 학습성향에서 확인된 상대적 약점을 함께 관리하면 성취를 더 꾸준히 이어갈 수 있습니다.',
    )
  } else {
    parts.push(
      '현재는 학업 수행과 학습 습관이 함께 다듬어지면 성적 상승 여지가 있는 구간으로 보입니다.',
    )
    parts.push(
      '약한 문제 해결 과정을 보완하면서, 학습을 계획하고 지속하는 힘을 키우는 것이 효과적입니다.',
    )
  }

  // 2) 학업×성향 교차 원인
  if (interpretationLow && concentration && concentration.score <= 55) {
    parts.push(
      '특히 문제 조건을 놓치는 모습이 단순 개념 부족뿐 아니라 집중·문제 읽기 습관과도 연결될 수 있어, 조건 표시와 핵심 정보 정리 훈련이 필요합니다.',
    )
  } else if (interpretationLow) {
    const caution =
      interpretationLow.reliability !== 'general'
        ? '현재 문항에서 확인된 경향을 바탕으로, '
        : ''
    parts.push(
      `${caution}문제 해석 과정에서 보완이 필요해 보이므로, 풀이 전에 조건과 요구사항을 정리하는 습관을 수업에서 반복 지도하겠습니다.`,
    )
  } else if (conceptLow && conceptLow.reliability !== 'reference') {
    parts.push(
      '핵심 개념을 문제에 연결하는 과정에서 보완이 필요해, 진도보다 개념 재확인 후 기본 문제로 바로 점검하는 방식이 적합합니다.',
    )
  }

  // 3) 강점 → 지도 방향 연결
  if (
    confidence &&
    confidence.score >= 75 &&
    ((selfDirected && selfDirected.score <= 55) ||
      (persistence && persistence.score <= 55))
  ) {
    parts.push(
      '학생의 강점인 자신감을 살리려면, 초기에는 강사가 학습 목표와 순서를 구체적으로 제시하고 짧은 주기로 수행을 확인한 뒤, 점차 스스로 계획하는 비중을 높이는 관리가 필요합니다.',
    )
  } else if (concentration && concentration.score >= 70) {
    parts.push(
      '집중력이라는 강점을 문제 해석·풀이 루틴과 연결하면, 현재의 보완 영역을 실질적인 성장으로 이어갈 수 있습니다.',
    )
  } else {
    parts.push(
      '하이퍼에서는 확인된 강점은 유지하고, 우선 보완 영역은 수업 루틴으로 반복 지도하여 개선 가능성을 열어가겠습니다.',
    )
  }

  return parts.join(' ')
}

function strengthLabelForLearning(area: ScoredLearningArea): string {
  if (area.id === 'confidence') return '학습 자신감이 양호함'
  if (area.id === 'concentration') return '집중력이 비교적 안정적임'
  if (area.id === 'motivation') return '학습 동기가 비교적 양호함'
  if (area.id === 'planning') return '계획성이 비교적 양호함'
  if (area.id === 'selfDirected') return '자기주도성이 비교적 양호함'
  if (area.id === 'persistence') return '학습 지속력이 비교적 양호함'
  return `${area.label}이(가) 양호함`
}

function strengthLabelForAcademic(area: ScoredAcademicArea): string {
  if (area.reliability === 'reference') {
    return `현재 평가 문항에서 ${area.area}가 안정적으로 확인됨`
  }
  if (area.reliability === 'limited') {
    return `${area.area}에서 양호한 경향이 관찰됨`
  }
  if (area.score >= 90) return `${area.area}이(가) 상대적으로 안정적임`
  return `${area.area}이(가) 비교적 양호함`
}

function buildStrengths(
  academicAreas: ScoredAcademicArea[],
  learningAreas: ScoredLearningArea[],
): string[] {
  const items: Array<{ text: string; score: number; priority: number }> = []

  for (const area of sortByScoreDesc(academicAreas)) {
    if (area.score < 70) continue
    items.push({
      text: strengthLabelForAcademic(area),
      score: area.score,
      priority: area.reliability === 'general' ? 3 : area.reliability === 'limited' ? 2 : 1,
    })
  }

  for (const area of sortByScoreDesc(learningAreas)) {
    if (area.score < 70) continue
    items.push({
      text: strengthLabelForLearning(area),
      score: area.score,
      priority: 2,
    })
  }

  return items
    .sort((a, b) => b.priority - a.priority || b.score - a.score)
    .slice(0, 3)
    .map((item) => item.text)
}

function improvementLabelForAcademic(area: ScoredAcademicArea): string {
  if (area.area.includes('해석') || area.area.includes('독해')) {
    return area.reliability === 'reference'
      ? '문제의 조건과 요구사항을 정확히 파악하는 훈련 필요(현재 문항 기준 참고)'
      : '문제의 조건과 요구사항을 정확히 파악하는 훈련 필요'
  }
  if (area.area.includes('계산')) {
    return area.reliability === 'reference'
      ? '계산 과정 점검 및 검산 습관 추가 확인 필요'
      : '계산 과정을 생략하지 않고 검산하는 습관 형성 필요'
  }
  if (area.area.includes('개념')) {
    return '핵심 개념을 문제에 연결하는 재확인 학습 필요'
  }
  if (area.area.includes('응용') || area.area.includes('해결')) {
    return '기본 유형을 바탕으로 응용·해결 단계로 확장하는 훈련 필요'
  }
  if (area.area.includes('실수')) {
    return '실수 유형을 점검하고 검산하는 습관 형성 필요'
  }
  return area.reliability === 'reference'
    ? `${area.area}에 대한 추가 확인 및 보완 훈련 필요`
    : `${area.area} 보완을 위한 단계적 훈련 필요`
}

function improvementLabelForLearning(area: ScoredLearningArea): string {
  switch (area.id) {
    case 'selfDirected':
      return '자기주도적 학습 시작 및 관리 습관 형성 필요'
    case 'persistence':
      return '학습 지속력을 높이기 위한 반복 학습 관리 필요'
    case 'planning':
      return '구체적인 학습 계획 수립 및 실행 점검 습관 필요'
    case 'confidence':
      return '성공 경험을 통한 학습 자신감 강화 필요'
    case 'concentration':
      return '문제 읽기·집중 루틴을 통한 집중력 안정화 필요'
    case 'motivation':
      return '단기 목표 달성을 통한 학습 동기 유지 관리 필요'
    default:
      return `${area.label} 보완을 위한 수업 관리 필요`
  }
}

function buildImprovementAreas(
  academicAreas: ScoredAcademicArea[],
  learningAreas: ScoredLearningArea[],
): string[] {
  const items: Array<{ text: string; score: number; priority: number }> = []

  for (const area of sortByScoreAsc(academicAreas)) {
    if (area.score >= 70) continue
    items.push({
      text: improvementLabelForAcademic(area),
      score: area.score,
      priority:
        area.reliability === 'reference'
          ? area.score <= 40
            ? 3
            : 1
          : area.reliability === 'general'
            ? 3
            : 2,
    })
  }

  for (const area of sortByScoreAsc(learningAreas)) {
    if (area.score >= 60) continue
    items.push({
      text: improvementLabelForLearning(area),
      score: area.score,
      priority: 2,
    })
  }

  return items
    .sort((a, b) => b.priority - a.priority || a.score - b.score)
    .slice(0, 3)
    .map((item) => item.text)
}

function managementForAcademicArea(area: ScoredAcademicArea): string[] {
  const name = area.area
  if (name.includes('해석') || name.includes('독해')) {
    return [
      '문제를 풀기 전 조건과 요구사항을 표시하는 습관을 지도합니다.',
      '풀이 시작 전 핵심 정보를 정리하고 풀이 순서를 세우는 훈련을 진행합니다.',
      '문제 해석 → 풀이 계획 → 계산의 단계별 풀이 습관을 형성합니다.',
    ]
  }
  if (name.includes('계산')) {
    return [
      '풀이 과정에서 계산을 생략하지 않도록 단계별 기록을 지도합니다.',
      '계산 실수 유형을 기록하고, 풀이 후 짧은 검산 루틴을 적용합니다.',
    ]
  }
  if (name.includes('개념')) {
    return [
      '신규 진도보다 핵심 개념 재확인을 우선하고, 설명 직후 기본 문제로 이해 여부를 확인합니다.',
      '오답 발생 시 관련 개념으로 되돌아가 재설명한 뒤 유사 문제로 점검합니다.',
    ]
  }
  if (name.includes('응용') || name.includes('해결')) {
    return [
      '기본 유형을 충분히 확인한 뒤 응용 문제로 단계적으로 난이도를 올립니다.',
      '풀이 계획을 먼저 말하게 한 다음 계산을 진행하도록 지도합니다.',
    ]
  }
  if (name.includes('실수')) {
    return [
      '실수 유형(계산·조건 누락 등)을 분류해 체크리스트로 점검하도록 지도합니다.',
      '풀이 후 짧은 검산 시간을 확보하는 수업 루틴을 적용합니다.',
    ]
  }
  if (name.includes('어휘') || name.includes('문법')) {
    return [
      '오답 어휘·문법 항목을 짧은 주기로 재확인하고, 문장 구조 표시 훈련을 진행합니다.',
    ]
  }
  return [`${name} 관련 기본 문제부터 재확인한 뒤 유사 문제로 확장하는 지도를 진행합니다.`]
}

function managementForLearningId(id: string): string[] {
  switch (id) {
    case 'selfDirected':
      return [
        '초기에는 강사가 학습 목표와 수행 순서를 구체적으로 제시하고, 적응도에 따라 학생 스스로 계획하는 비율을 점진적으로 높입니다.',
        '과제 완료 여부를 짧은 주기로 확인하여 자기주도 습관 형성을 돕습니다.',
      ]
    case 'planning':
      return [
        '주간·일일 학습 목표를 작은 단위로 나누어 제시하고, 계획과 실행의 차이를 함께 점검합니다.',
      ]
    case 'persistence':
      return [
        '짧은 주기의 과제 및 학습 수행 확인을 통해 학습 지속력을 관리합니다.',
        '장시간 과제보다 완료 가능한 단위로 분할해 누적 성취를 확인시킵니다.',
      ]
    case 'confidence':
      return [
        '해결 가능한 난이도에서 성공 경험을 쌓게 한 뒤, 점진적으로 난이도를 올려 자신감을 키웁니다.',
      ]
    case 'concentration':
      return [
        '문제 읽기와 조건 표시를 포함한 짧은 집중 루틴을 수업마다 반복합니다.',
      ]
    case 'motivation':
      return [
        '단기 목표 달성을 구체적으로 피드백하여 학습 동기를 유지하도록 관리합니다.',
      ]
    default:
      return []
  }
}

function buildManagementRecommendations(
  academicAreas: ScoredAcademicArea[],
  learningAreas: ScoredLearningArea[],
): string[] {
  const recs: string[] = []
  const seen = new Set<string>()
  const push = (text: string) => {
    if (!text || seen.has(text)) return
    seen.add(text)
    recs.push(text)
  }

  const academicLows = sortByScoreAsc(academicAreas).filter(
    (area) =>
      area.score < 70 && !(area.reliability === 'reference' && area.score >= 50),
  )

  // 1) 가장 우선인 학업 보완 영역 — 강사 실행 루틴 중심 (최대 3)
  if (academicLows[0]) {
    for (const line of managementForAcademicArea(academicLows[0])) {
      push(line)
      if (recs.length >= 3) break
    }
  }

  // 2) 학습성향 관리 — 영역당 핵심 1문장 우선 (자기주도·지속·계획 순)
  const learningOrder = [
    'selfDirected',
    'persistence',
    'planning',
    'confidence',
    'concentration',
    'motivation',
  ] as const
  for (const id of learningOrder) {
    const area = learningAreas.find((item) => item.id === id && item.score < 60)
    if (!area) continue
    const first = managementForLearningId(id)[0]
    if (first) push(first)
    if (recs.length >= 5) break
  }

  // 3) 두 번째 학업 보완이 있으면 핵심 1문장만
  if (academicLows[1] && recs.length < 5) {
    const extra = managementForAcademicArea(academicLows[1])[0]
    if (extra) push(extra)
  }

  // 4) 강점 → 성취 연결 (학부모 안심 + HYPER 관리 메시지)
  const strengthLearning = sortByScoreDesc(
    learningAreas.filter((item) => item.score >= 70),
  ).slice(0, 2)
  if (strengthLearning.length > 0) {
    const labels = joinKorean(strengthLearning.map((item) => item.label))
    const particle = hasBatchim(labels) ? '을' : '를'
    push(
      `학생의 강점인 ${labels}${particle} 실제 성취 경험으로 연결할 수 있도록 단계별 성공 경험을 제공합니다.`,
    )
  }

  if (recs.length < 3) {
    push(
      '초기에는 강사가 학습 목표와 수행 순서를 구체적으로 제시하고, 완료 여부를 짧게 확인합니다.',
    )
    push('오답은 결과만 보지 않고 관련 개념·해석 과정으로 되돌아가 재확인합니다.')
    push('주간 목표를 작은 단위로 나누어 계획과 실행 차이를 함께 점검합니다.')
  }

  return recs.slice(0, 6)
}

function buildReliabilityNotes(academicAreas: ScoredAcademicArea[]): string[] {
  const notes: string[] = []
  const ref = academicAreas.filter((item) => item.reliability === 'reference')
  const limited = academicAreas.filter((item) => item.reliability === 'limited')

  if (ref.length > 0) {
    const label = joinKorean(ref.map((item) => item.area))
    notes.push(
      `${label}${eunNeun(label)} 평가 문항이 1문항으로, 현재 점수는 참고 지표로만 활용하며 확정적인 능력 판단에 사용하지 않습니다.`,
    )
  }
  if (limited.length > 0) {
    const label = joinKorean(limited.map((item) => item.area))
    notes.push(
      `${label}${eunNeun(label)} 문항 수가 2문항으로 제한적이라, ‘경향이 관찰됨’ 수준으로 신중하게 해석합니다.`,
    )
  }
  if (academicAreas.length === 0) {
    notes.push('진단에 사용할 평가영역 점수가 없어 학업 진단은 제한적으로 제공합니다.')
  }
  return notes
}

/**
 * 정규화된 REPORT 데이터 → 규칙 기반 진단 결과.
 * 동일 입력이면 항상 동일 출력(deterministic).
 * 영어는 전용 엔진으로 분기하여 수학 문구가 섞이지 않게 한다.
 */
export function buildEntranceExamDiagnosis(
  report: EntranceExamDiagnosticReport,
): EntranceExamDiagnosis {
  if (report.academicResult.subject === '영어') {
    return buildEnglishEntranceExamDiagnosis(report)
  }

  const academicAreas = pickAcademicAreas(report)
  const learningAreas: ScoredLearningArea[] = (report.learningSurvey?.areas ?? []).map(
    (item) => ({
      id: item.id,
      label: item.label,
      score: item.score,
      band: learningBand(item.score),
    }),
  )

  return {
    academicDiagnosis: buildAcademicDiagnosis(academicAreas),
    learningDiagnosis: buildLearningDiagnosis(learningAreas),
    integratedDiagnosis: buildIntegratedDiagnosis(
      report,
      academicAreas,
      learningAreas,
    ),
    strengths: buildStrengths(academicAreas, learningAreas),
    improvementAreas: buildImprovementAreas(academicAreas, learningAreas),
    managementRecommendations: buildManagementRecommendations(
      academicAreas,
      learningAreas,
    ),
    reliabilityNotes: buildReliabilityNotes(academicAreas),
  }
}
