/**
 * 영어 입학테스트 전용 규칙 기반 진단 (additive).
 * 수학 진단 로직을 수정하지 않고 subject==='영어'일 때만 사용한다.
 */
import type { EntranceExamDiagnosticReport } from './buildEntranceExamReport'
import type { EntranceExamDiagnosis } from './buildEntranceExamDiagnosis'

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

function sortByScoreDesc<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score || 0)
}

function sortByScoreAsc<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.score - b.score || 0)
}

function englishProcessHint(area: string): string {
  if (area.includes('어휘')) return '단어·숙어의 의미와 문맥상 쓰임을 파악하는 과정'
  if (area.includes('문법')) return '문법 원리와 문장 구조를 판단하는 과정'
  if (area.includes('문장 해석')) return '문장 구조와 구문을 파악해 의미를 해석하는 과정'
  if (area.includes('독해 이해')) return '글의 주제·요지·세부 내용과 흐름을 파악하는 과정'
  if (area.includes('추론') || area.includes('문해')) {
    return '문맥과 근거를 바탕으로 의도와 논리 관계를 추론하는 과정'
  }
  return `${area} 관련 수행 과정`
}

function pickScoredAreas(report: EntranceExamDiagnosticReport): ScoredAcademicArea[] {
  return report.academicAreas
    .filter(
      (item) =>
        item.status === 'accuracy' &&
        item.score != null &&
        item.totalCount > 0 &&
        !item.area.includes('속도'),
    )
    .map((item) => ({
      area: item.area,
      score: item.score as number,
      totalCount: item.totalCount,
      reliability: reliabilityOf(item.totalCount),
    }))
}

function buildEnglishAcademicDiagnosis(areas: ScoredAcademicArea[]): string {
  if (areas.length === 0) {
    return '현재 영어 입학테스트에서 진단에 사용할 수 있는 평가영역 결과가 없어, 영어 학업 수행 특성에 대한 설명을 보류합니다. 문항이 확보된 이후 다시 진단하는 것이 바람직합니다.'
  }

  const high = sortByScoreDesc(areas.filter((item) => item.score >= 70)).slice(0, 2)
  const low = sortByScoreAsc(areas.filter((item) => item.score < 60)).slice(0, 2)
  const parts: string[] = []
  const sparse = areas.some((item) => item.reliability !== 'general')

  if (high.length > 0 && low.length > 0) {
    const highNames = joinKorean(high.map((item) => item.area))
    if (high.every((item) => item.reliability === 'reference')) {
      parts.push(
        `${highNames}에서는 현재 출제된 문항에서 안정적인 수행이 확인됩니다.`,
      )
    } else {
      parts.push(
        `${highNames}에서는 현재 출제된 문항을 기준으로 비교적 안정적인 수행 경향이 관찰됩니다.`,
      )
    }

    if (low.length === 1) {
      const only = low[0]
      const hint = englishProcessHint(only.area)
      if (only.reliability === 'reference') {
        parts.push(
          `반면 ${only.area}에서는 ${hint}에서 보완이 필요한 모습이 확인되나, 평가 문항 수가 적어 확정적으로 판단하지 않습니다.`,
        )
      } else {
        parts.push(
          `반면 현재 평가에서는 ${only.area} 영역의 추가 보완이 필요한 경향이 확인됩니다. (${hint})`,
        )
      }
    } else {
      const lowParts = low.map((item) => {
        const tone =
          item.reliability === 'reference'
            ? '모습이 확인되나 문항 수가 적어 참고로 봅니다'
            : '경향이 관찰됩니다'
        return `${item.area}에서는 ${englishProcessHint(item.area)}에서 보완이 필요한 ${tone}`
      })
      parts.push(`반면 ${lowParts.join('. ')}.`)
    }
  } else if (high.length > 0) {
    parts.push(
      `${joinKorean(high.map((item) => item.area))}을(를) 중심으로 현재 출제된 영어 문항에서 학업 수행이 비교적 안정적으로 나타나고 있습니다.`,
    )
  } else if (low.length > 0) {
    parts.push(
      `현재 영어 입학테스트에서는 ${joinKorean(low.map((item) => item.area))}을(를) 중심으로 추가 보완이 필요한 경향이 확인됩니다.`,
    )
    parts.push(
      '다만 이는 학생의 가능성을 제한하는 판단이 아니라, 초기 영어 수업에서 지도 비중을 어디에 둘지 정하기 위한 진단입니다.',
    )
  } else {
    parts.push(
      '영어 평가영역 결과가 대체로 보통~양호 구간에 고르게 분포하는 경향이 있습니다.',
    )
  }

  if (sparse) {
    parts.push(
      '다만 일부 영역은 평가 문항 수가 제한적이므로 현재 결과는 초기 학습 진단을 위한 참고 지표로 활용합니다.',
    )
  }

  return parts.join(' ')
}

function buildEnglishLearningDiagnosis(areas: ScoredLearningArea[]): string {
  if (areas.length === 0) {
    return '학습성향 설문 결과가 없어 학습 태도·습관에 대한 진단을 생성하지 않았습니다.'
  }

  const high = sortByScoreDesc(areas.filter((item) => item.score >= 70)).slice(0, 2)
  const low = sortByScoreAsc(areas.filter((item) => item.score < 60)).slice(0, 2)
  const parts: string[] = []
  const byId = new Map(areas.map((item) => [item.id, item]))

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
      `${joinKorean(low.map((item) => item.label))}을(를) 중심으로 영어 학습을 시작하고 이어가는 실행 관리가 우선 보완 영역으로 보입니다.`,
    )
  } else {
    parts.push('학습성향 6개 영역이 대체로 보통 구간에 고르게 분포하는 편입니다.')
  }

  const confidence = byId.get('confidence')
  const selfDirected = byId.get('selfDirected')
  const persistence = byId.get('persistence')
  const concentration = byId.get('concentration')
  const planning = byId.get('planning')

  if (confidence && selfDirected && confidence.score >= 75 && selfDirected.score <= 55) {
    parts.push(
      '학습 능력에 대한 자신감은 있는 편이나, 스스로 영어 학습을 시작하고 관리하는 힘은 상대적으로 부족할 수 있습니다.',
    )
  } else if (
    concentration &&
    persistence &&
    concentration.score >= 70 &&
    persistence.score <= 55
  ) {
    parts.push(
      '학습을 시작했을 때 집중은 가능한 편이나, 어휘·독해 복습을 꾸준히 이어가는 지속력 관리가 필요합니다.',
    )
  } else if (planning && planning.score <= 55) {
    parts.push(
      '영어 학습량을 구체적인 계획과 짧은 목표 단위로 나누는 훈련이 실제 성취 연결에 도움이 될 수 있습니다.',
    )
  }

  return parts.join(' ')
}

function buildEnglishIntegratedDiagnosis(
  report: EntranceExamDiagnosticReport,
  academicAreas: ScoredAcademicArea[],
  learningAreas: ScoredLearningArea[],
): string {
  const total = report.academicResult.totalScore
  const parts: string[] = []
  const byId = new Map(learningAreas.map((item) => [item.id, item]))
  const confidence = byId.get('confidence')
  const selfDirected = byId.get('selfDirected')
  const persistence = byId.get('persistence')
  const lowAcademic = sortByScoreAsc(academicAreas.filter((item) => item.score < 60))

  if (!report.completeness.hasSurvey || learningAreas.length === 0) {
    parts.push(
      '현재는 영어 입학테스트 결과를 기준으로 초기 학업 상태를 파악할 수 있습니다.',
    )
    parts.push(
      '학습성향 설문이 함께 확보되면, 성적이 나타난 이유와 수업 관리 방향을 더 정밀하게 설명할 수 있습니다.',
    )
    return parts.join(' ')
  }

  if (total < 55 && confidence && confidence.score >= 75) {
    parts.push(
      '현재 영어 학업 결과는 학생의 가능성 부족이라기보다, 어휘·문법·해석·독해 과정과 실제 학습 방법이 아직 안정되지 않은 영향이 큰 것으로 보입니다.',
    )
    parts.push(
      '학습에 대한 자신감은 있는 편이므로, 자신감을 정확한 문장 해석과 독해 습관으로 연결하는 지도가 중요합니다.',
    )
  } else if (total >= 75 && confidence && confidence.score <= 55) {
    parts.push(
      '실제 영어 수행은 비교적 안정적인 반면, 스스로의 능력을 낮게 평가하는 경향이 함께 관찰됩니다.',
    )
    parts.push(
      '성공 경험을 구체적으로 피드백하며 자신감을 키우면, 현재의 수행력을 더 안정적으로 유지·확장할 수 있습니다.',
    )
  } else if (
    selfDirected &&
    selfDirected.score <= 55 &&
    (persistence?.score ?? 100) <= 55
  ) {
    parts.push(
      '현재 영어 결과의 핵심 변수는 단편적인 능력 부족보다, 어휘·독해 학습을 스스로 계획하고 꾸준히 이어가는 관리 습관에 있을 가능성이 큽니다.',
    )
  } else {
    parts.push(
      '현재는 영어 학업 수행과 학습 습관이 함께 다듬어지면 성적 상승 여지가 있는 구간으로 보입니다.',
    )
  }

  const vocabLow = lowAcademic.find((item) => item.area.includes('어휘'))
  const grammarLow = lowAcademic.find((item) => item.area.includes('문법'))
  const sentenceLow = lowAcademic.find((item) => item.area.includes('문장 해석'))
  const readingLow = lowAcademic.find((item) => item.area.includes('독해 이해'))
  const inferenceLow = lowAcademic.find(
    (item) => item.area.includes('추론') || item.area.includes('문해'),
  )

  if (sentenceLow || readingLow) {
    const caution =
      (sentenceLow ?? readingLow)!.reliability !== 'general'
        ? '현재 문항에서 확인된 경향을 바탕으로, '
        : ''
    parts.push(
      `${caution}문장·지문을 정확히 읽고 핵심을 파악하는 과정에서 보완이 필요해 보이므로, 구조 표시와 근거 문장 확인 습관을 수업에서 반복 지도하겠습니다.`,
    )
  } else if (vocabLow || grammarLow) {
    parts.push(
      '어휘·문법의 기본기를 문장에 연결하는 과정에서 보완이 필요해, 오답 유형을 짧은 주기로 재확인하는 방식이 적합합니다.',
    )
  } else if (inferenceLow) {
    parts.push(
      '직접 제시되지 않은 의미와 논리 관계를 근거로 판단하는 추론 훈련이 우선 보완 포인트로 보입니다.',
    )
  }

  if (
    confidence &&
    confidence.score >= 75 &&
    ((selfDirected && selfDirected.score <= 55) ||
      (persistence && persistence.score <= 55))
  ) {
    parts.push(
      '학생의 강점인 자신감을 살리려면, 초기에는 강사가 영어 학습 목표와 순서를 구체적으로 제시하고 짧은 주기로 수행을 확인한 뒤, 점차 스스로 계획하는 비중을 높이는 관리가 필요합니다.',
    )
  } else {
    parts.push(
      '하이퍼에서는 확인된 강점은 유지하고, 우선 보완 영역은 수업 루틴으로 반복 지도하여 개선 가능성을 열어가겠습니다.',
    )
  }

  return parts.join(' ')
}

function improvementForEnglishArea(area: ScoredAcademicArea): string {
  const note =
    area.reliability === 'reference' ? '(현재 문항 기준 참고)' : ''
  if (area.area.includes('어휘')) {
    return `기본 어휘량 및 문맥상 의미 파악 훈련 필요${note}`
  }
  if (area.area.includes('문법')) {
    return `핵심 문법 개념을 문장에 적용하는 훈련 필요${note}`
  }
  if (area.area.includes('문장 해석')) {
    return `문장 구조 파악 후 의미 단위로 해석하는 습관 형성 필요${note}`
  }
  if (area.area.includes('독해 이해')) {
    return `주제·요지·세부정보 구분 및 근거 문장 확인 독해 습관 필요${note}`
  }
  if (area.area.includes('추론') || area.area.includes('문해')) {
    return `문맥 추론 및 필자 의도·논리 관계 파악 훈련 필요${note}`
  }
  return `${area.area} 보완을 위한 단계적 훈련 필요${note}`
}

function managementForEnglishArea(area: string): string[] {
  if (area.includes('어휘')) {
    return [
      '오답 어휘·숙어를 짧은 주기로 재확인하고, 문맥상 의미를 함께 점검하도록 지도합니다.',
      '유의어·반의어·파생어 확장을 과제 단위로 제시하고 완료 여부를 확인합니다.',
    ]
  }
  if (area.includes('문법')) {
    return [
      '핵심 문법 개념을 설명한 뒤 바로 문장 적용 문제로 이해 여부를 확인합니다.',
      '오답 문법 유형을 분류해 반복 확인하고, 유사 문장으로 재점검을 진행합니다.',
    ]
  }
  if (area.includes('문장 해석')) {
    return [
      '문장 성분과 절 구조를 표시한 뒤 의미 단위로 끊어 읽도록 지도합니다.',
      '긴 문장은 구문 분석 → 해석 순서를 습관화하도록 수업에서 반복합니다.',
    ]
  }
  if (area.includes('독해 이해')) {
    return [
      '지문의 주제·요지와 세부정보를 구분하게 하고, 근거 문장을 표시하는 독해 루틴을 적용합니다.',
      '문단 간 흐름을 요약하게 한 뒤 문제 풀이로 연결하도록 지도합니다.',
    ]
  }
  if (area.includes('추론') || area.includes('문해')) {
    return [
      '직접 제시되지 않은 정보는 근거 문장을 찾아 추론하도록 질문형 지도를 진행합니다.',
      '필자의 의도와 문장·문단 연결관계를 말로 설명하게 하는 훈련을 포함합니다.',
    ]
  }
  return [`${area} 관련 기본 문항부터 재확인한 뒤 유사 문항으로 확장하는 지도를 진행합니다.`]
}

function managementForLearningId(id: string): string[] {
  switch (id) {
    case 'selfDirected':
      return [
        '초기에는 강사가 영어 학습 목표와 수행 순서를 구체적으로 제시하고, 적응도에 따라 학생 스스로 계획하는 비율을 점진적으로 높입니다.',
      ]
    case 'persistence':
      return [
        '짧은 주기의 어휘·독해 과제 확인을 통해 학습 지속력을 관리합니다.',
      ]
    case 'planning':
      return [
        '주간 영어 학습 목표를 작은 단위로 나누어 제시하고, 계획과 실행의 차이를 함께 점검합니다.',
      ]
    case 'confidence':
      return [
        '해결 가능한 난이도에서 성공 경험을 쌓게 한 뒤, 점진적으로 난이도를 올려 자신감을 키웁니다.',
      ]
    default:
      return []
  }
}

export function buildEnglishEntranceExamDiagnosis(
  report: EntranceExamDiagnosticReport,
): EntranceExamDiagnosis {
  const academicAreas = pickScoredAreas(report)
  const learningAreas: ScoredLearningArea[] = (report.learningSurvey?.areas ?? []).map(
    (item) => ({
      id: item.id,
      label: item.label,
      score: item.score,
    }),
  )

  const strengths: Array<{ text: string; score: number; priority: number }> = []
  for (const area of sortByScoreDesc(academicAreas)) {
    if (area.score < 70) continue
    strengths.push({
      text:
        area.reliability === 'reference'
          ? `현재 평가 문항에서 ${area.area}가 안정적으로 확인됨`
          : area.reliability === 'limited'
            ? `${area.area}에서 양호한 경향이 관찰됨`
            : `${area.area}이(가) 비교적 양호함`,
      score: area.score,
      priority: area.reliability === 'general' ? 3 : 2,
    })
  }
  for (const area of sortByScoreDesc(learningAreas)) {
    if (area.score < 70) continue
    strengths.push({
      text:
        area.id === 'confidence'
          ? '학습 자신감이 양호함'
          : area.id === 'concentration'
            ? '집중력이 비교적 안정적임'
            : `${area.label}이(가) 양호함`,
      score: area.score,
      priority: 2,
    })
  }

  const improvements: Array<{ text: string; score: number; priority: number }> = []
  for (const area of sortByScoreAsc(academicAreas)) {
    if (area.score >= 70) continue
    improvements.push({
      text: improvementForEnglishArea(area),
      score: area.score,
      priority: area.reliability === 'reference' ? (area.score <= 40 ? 3 : 1) : 3,
    })
  }
  for (const area of sortByScoreAsc(learningAreas)) {
    if (area.score >= 60) continue
    const text =
      area.id === 'selfDirected'
        ? '자기주도적 학습 시작 및 관리 습관 형성 필요'
        : area.id === 'persistence'
          ? '학습 지속력을 높이기 위한 반복 학습 관리 필요'
          : area.id === 'planning'
            ? '구체적인 학습 계획 수립 및 실행 점검 습관 필요'
            : `${area.label} 보완을 위한 수업 관리 필요`
    improvements.push({ text, score: area.score, priority: 2 })
  }

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
  if (academicLows[0]) {
    for (const line of managementForEnglishArea(academicLows[0].area)) {
      push(line)
      if (recs.length >= 3) break
    }
  }
  for (const id of ['selfDirected', 'persistence', 'planning', 'confidence'] as const) {
    const area = learningAreas.find((item) => item.id === id && item.score < 60)
    if (!area) continue
    const first = managementForLearningId(id)[0]
    if (first) push(first)
    if (recs.length >= 5) break
  }
  if (academicLows[1] && recs.length < 5) {
    const extra = managementForEnglishArea(academicLows[1].area)[0]
    if (extra) push(extra)
  }
  const strengthLearning = sortByScoreDesc(
    learningAreas.filter((item) => item.score >= 70),
  ).slice(0, 2)
  if (strengthLearning.length > 0) {
    const labels = joinKorean(strengthLearning.map((item) => item.label))
    const particle = hasBatchim(labels) ? '을' : '를'
    push(
      `학생의 강점인 ${labels}${particle} 실제 영어 성취 경험으로 연결할 수 있도록 단계별 성공 경험을 제공합니다.`,
    )
  }
  if (recs.length < 3) {
    push(
      '초기에는 강사가 영어 학습 목표와 수행 순서를 구체적으로 제시하고, 완료 여부를 짧게 확인합니다.',
    )
    push('오답은 결과만 보지 않고 관련 어휘·문법·해석 과정으로 되돌아가 재확인합니다.')
    push('주간 목표를 작은 단위로 나누어 계획과 실행 차이를 함께 점검합니다.')
  }

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
    notes.push('진단에 사용할 영어 평가영역 점수가 없어 학업 진단은 제한적으로 제공합니다.')
  }

  return {
    academicDiagnosis: buildEnglishAcademicDiagnosis(academicAreas),
    learningDiagnosis: buildEnglishLearningDiagnosis(learningAreas),
    integratedDiagnosis: buildEnglishIntegratedDiagnosis(
      report,
      academicAreas,
      learningAreas,
    ),
    strengths: strengths
      .sort((a, b) => b.priority - a.priority || b.score - a.score)
      .slice(0, 3)
      .map((item) => item.text),
    improvementAreas: improvements
      .sort((a, b) => b.priority - a.priority || a.score - b.score)
      .slice(0, 3)
      .map((item) => item.text),
    managementRecommendations: recs.slice(0, 6),
    reliabilityNotes: notes,
  }
}
