/**
 * 통합 종합진단 엔진 (additive / pure).
 * 기존 수학·영어 개별 진단 엔진을 재사용하고, 교차 해석만 추가로 생성한다.
 */
import { buildEntranceExamDiagnosis } from './buildEntranceExamDiagnosis'
import type { EntranceExamDiagnosticReport } from './buildEntranceExamReport'
import type { EntranceExamIntegratedReport } from './buildEntranceExamIntegratedReport'

export type EntranceExamIntegratedDiagnosis = {
  mathDiagnosis: string | null
  englishDiagnosis: string | null
  learningDiagnosis: string | null
  integratedDiagnosis: string
  strengths: string[]
  improvementAreas: string[]
  managementRecommendations: string[]
  reliabilityNotes: string[]
}

type ScoredArea = {
  subject: '수학' | '영어' | '성향'
  area: string
  score: number
  totalCount: number
}

function pickAcademic(report: EntranceExamDiagnosticReport | null, subject: '수학' | '영어'): ScoredArea[] {
  if (!report) return []
  return report.academicAreas
    .filter(
      (item) =>
        item.status === 'accuracy' && item.score != null && item.totalCount > 0,
    )
    .map((item) => ({
      subject,
      area: item.area,
      score: item.score as number,
      totalCount: item.totalCount,
    }))
}

function pickLearning(
  survey: EntranceExamIntegratedReport['learningSurvey'],
): ScoredArea[] {
  if (!survey) return []
  return survey.areas.map((item) => ({
    subject: '성향' as const,
    area: item.label,
    score: item.score,
    totalCount: 4,
  }))
}

function isHigh(score: number): boolean {
  return score >= 70
}

function isLow(score: number): boolean {
  return score < 60
}

function findArea(areas: ScoredArea[], includes: string): ScoredArea | undefined {
  return areas.find((item) => item.area.includes(includes))
}

function avgScore(areas: ScoredArea[]): number | null {
  if (areas.length === 0) return null
  return areas.reduce((sum, item) => sum + item.score, 0) / areas.length
}

function buildCrossSubjectNotes(math: ScoredArea[], english: ScoredArea[]): string[] {
  if (math.length === 0 || english.length === 0) return []
  const notes: string[] = []

  const mathInterp = findArea(math, '해석')
  const engReading = findArea(english, '독해') ?? findArea(english, '문장 해석')
  if (mathInterp && engReading && isLow(mathInterp.score) && isLow(engReading.score)) {
    notes.push(
      '두 과목 모두 문제와 지문의 핵심 정보를 정확하게 파악하는 과정에서 보완이 필요한 경향이 확인됩니다.',
    )
  }

  const mathConcept = findArea(math, '개념')
  const engGrammar = findArea(english, '문법')
  if (mathConcept && engGrammar && isHigh(mathConcept.score) && isHigh(engGrammar.score)) {
    notes.push('기본 개념과 규칙을 이해하는 능력은 비교적 안정적인 편입니다.')
  }

  const mathCalc = findArea(math, '계산')
  const engVocab = findArea(english, '어휘')
  if (mathCalc && engVocab && isHigh(mathCalc.score) && isHigh(engVocab.score)) {
    notes.push('기초 도구(계산·어휘) 활용은 비교적 안정적으로 확인됩니다.')
  }

  const mathApp = findArea(math, '응용') ?? findArea(math, '해결')
  const engInfer = findArea(english, '추론')
  if (mathApp && engInfer && isLow(mathApp.score) && isLow(engInfer.score)) {
    notes.push(
      '학습한 내용을 새로운 상황에 적용·추론하는 단계에서 두 과목 모두 보완 여지가 관찰됩니다.',
    )
  }

  return notes
}

function buildSurveyCrossNotes(
  academic: ScoredArea[],
  learning: ScoredArea[],
): string[] {
  if (academic.length === 0 || learning.length === 0) return []
  const notes: string[] = []
  const academicAvg = avgScore(academic)
  const confidence = learning.find((item) => item.area.includes('자신감'))
  const selfDirected = learning.find((item) => item.area.includes('자기주도'))
  const concentration = learning.find((item) => item.area.includes('집중'))

  if (academicAvg != null && academicAvg < 60 && confidence && isHigh(confidence.score)) {
    notes.push(
      '현재 학습 자신감과 실제 학업 수행 결과 사이에 차이가 있어, 성공 경험과 과제 난이도 조정을 함께 점검하는 것이 바람직합니다.',
    )
  }

  if (academicAvg != null && academicAvg >= 70 && selfDirected && isLow(selfDirected.score)) {
    notes.push(
      '학업 수행 능력보다는 학습 관리와 실행 구조가 향후 성적을 좌우할 가능성이 있어, 단기 계획과 점검 루틴을 강화하는 것이 필요합니다.',
    )
  }

  const readingLike = academic.filter(
    (item) =>
      item.area.includes('해석') ||
      item.area.includes('독해') ||
      item.area.includes('추론'),
  )
  if (
    concentration &&
    isLow(concentration.score) &&
    readingLike.some((item) => isLow(item.score))
  ) {
    notes.push(
      '문제·지문 읽기와 집중 루틴을 함께 관리하면 수행 안정성을 높이는 데 도움이 될 수 있습니다.',
    )
  }

  return notes
}

function buildIntegratedNarrative(
  report: EntranceExamIntegratedReport,
  mathDiag: string | null,
  englishDiag: string | null,
  learningDiag: string | null,
  crossNotes: string[],
): string {
  const parts: string[] = []
  const { hasMath, hasEnglish, hasSurvey } = report.completeness

  if (hasMath && hasEnglish && hasSurvey) {
    parts.push(
      '수학·영어 입학테스트와 학습성향 결과를 함께 보면, 학업 수행 특성과 학습 관리 습관을 균형 있게 파악할 수 있습니다.',
    )
  } else if (hasMath && hasEnglish) {
    parts.push(
      '수학·영어 입학테스트 결과를 교차해 보면, 과목별 강점과 공통 보완 지점을 확인할 수 있습니다.',
    )
  } else if ((hasMath || hasEnglish) && hasSurvey) {
    parts.push(
      '현재 확보된 입학테스트 결과와 학습성향을 함께 보면, 학업 수행과 학습 습관의 연결 지점을 확인할 수 있습니다.',
    )
  } else if (hasMath || hasEnglish) {
    parts.push(
      '현재는 일부 과목 결과만 확보되어, 해당 과목 중심의 학업 진단으로 우선 해석합니다.',
    )
  } else if (hasSurvey) {
    parts.push(
      '현재는 학습성향 설문 결과만 확보되어, 학습 습관 중심으로 관리 방향을 제시합니다.',
    )
  } else {
    return '연결된 평가 결과가 없어 통합 진단을 보류합니다.'
  }

  if (crossNotes.length > 0) {
    parts.push(...crossNotes)
  } else {
    if (mathDiag) parts.push('수학은 과목별 진단 결과를 우선 참고합니다.')
    if (englishDiag) parts.push('영어는 과목별 진단 결과를 우선 참고합니다.')
    if (learningDiag) parts.push('학습성향은 설문 영역별 경향을 기준으로 해석합니다.')
  }

  parts.push(
    '본 통합 진단은 심리 평가가 아니며, 현재 평가 자료를 바탕으로 한 HYPER 학습관리 참고용입니다.',
  )
  return parts.join(' ')
}

function buildStrengths(
  math: ScoredArea[],
  english: ScoredArea[],
  learning: ScoredArea[],
): string[] {
  const pool = [...math, ...english, ...learning]
    .filter((item) => item.score >= 70)
    .filter((item) => !(item.subject !== '성향' && item.totalCount <= 1))
    .sort((a, b) => b.score - a.score)

  const out: string[] = []
  for (const item of pool) {
    if (out.length >= 4) break
    const prefix =
      item.subject === '수학'
        ? '수학'
        : item.subject === '영어'
          ? '영어'
          : '학습성향'
    if (item.subject !== '성향' && item.totalCount === 2) {
      out.push(`${prefix} ${item.area}에서 현재 출제 문항 기준 안정적인 경향이 관찰됩니다.`)
    } else if (item.score >= 80) {
      out.push(`${prefix} ${item.area}이(가) 상대적으로 강점으로 확인됩니다.`)
    } else {
      out.push(`${prefix} ${item.area}에서 비교적 안정적인 수행/경향이 확인됩니다.`)
    }
  }
  if (out.length === 0) {
    out.push('현재 자료만으로는 확정적인 강점 목록을 제시하기보다, 영역별 경향을 지속적으로 관찰하는 것이 바람직합니다.')
  }
  return out
}

function normalizeImprovementKey(area: string): string {
  if (area.includes('해석') || area.includes('독해') || area.includes('추론')) {
    return '핵심정보파악'
  }
  if (area.includes('개념') || area.includes('문법')) return '기초이해'
  if (area.includes('계산') || area.includes('어휘')) return '기초도구'
  if (area.includes('자기주도') || area.includes('계획')) return '학습관리'
  if (area.includes('집중') || area.includes('지속')) return '실행지속'
  if (area.includes('자신감') || area.includes('동기')) return '동기자신감'
  return area
}

function buildImprovements(
  math: ScoredArea[],
  english: ScoredArea[],
  learning: ScoredArea[],
): string[] {
  const pool = [...math, ...english, ...learning]
    .filter((item) => item.score < 60)
    .sort((a, b) => a.score - b.score)

  const seen = new Set<string>()
  const out: string[] = []
  for (const item of pool) {
    const key = normalizeImprovementKey(item.area)
    if (seen.has(key)) continue
    seen.add(key)
    const prefix =
      item.subject === '수학'
        ? '수학'
        : item.subject === '영어'
          ? '영어'
          : '학습성향'
    out.push(`${prefix} ${item.area}을(를) 우선 보완 영역으로 관리합니다.`)
    if (out.length >= 4) break
  }
  if (out.length === 0) {
    out.push('현재 우선 보완으로 확정할 취약 영역이 두드러지지 않아, 유지·점검 중심으로 관리합니다.')
  }
  return out
}

function buildManagement(
  math: ScoredArea[],
  english: ScoredArea[],
  learning: ScoredArea[],
): string[] {
  const recs: string[] = []
  const push = (text: string) => {
    if (!recs.includes(text)) recs.push(text)
  }

  const mathInterp = findArea(math, '해석')
  const engReading = findArea(english, '독해') ?? findArea(english, '문장 해석')
  if (
    (mathInterp && isLow(mathInterp.score)) ||
    (engReading && isLow(engReading.score))
  ) {
    push('문제/지문 핵심 조건 표시 훈련을 수업·과제에 반복 배치합니다.')
    push('풀이·독해 전 핵심 정보를 짧게 정리한 뒤 풀이하도록 지도합니다.')
  }

  const mathConcept = findArea(math, '개념')
  if (mathConcept && isLow(mathConcept.score)) {
    push('개념 확인 후 단계별 적용 문제로 연결하는 지도 루틴을 적용합니다.')
  }

  const engVocab = findArea(english, '어휘')
  const engGrammar = findArea(english, '문법')
  if ((engVocab && isLow(engVocab.score)) || (engGrammar && isLow(engGrammar.score))) {
    push('영어 어휘·문법 취약영역을 짧은 주기로 반복 복습합니다.')
  }

  const planning = learning.find((item) => item.area.includes('계획'))
  const selfDirected = learning.find((item) => item.area.includes('자기주도'))
  const persistence = learning.find((item) => item.area.includes('지속'))
  if (
    (planning && isLow(planning.score)) ||
    (selfDirected && isLow(selfDirected.score)) ||
    (persistence && isLow(persistence.score))
  ) {
    push('짧은 주기의 과제 수행 확인으로 실행력을 점검합니다.')
    push('학생의 자기주도 수준에 따라 학습 계획 제공 강도를 조절합니다.')
  }

  push('반복 오답 관리 노트로 동일 유형 실수를 추적합니다.')

  const confidence = learning.find((item) => item.area.includes('자신감'))
  if (confidence && isLow(confidence.score)) {
    push('성공 경험을 통한 학습 자신감 강화 과제를 우선 배치합니다.')
  } else {
    push('적절한 난이도의 성공 경험을 유지해 학습 자신감을 안정화합니다.')
  }

  if (recs.length < 5) {
    push('주간 단위로 수학·영어 취약영역과 학습성향 점검을 함께 리뷰합니다.')
  }

  return recs.slice(0, 7)
}

function buildReliability(
  math: ScoredArea[],
  english: ScoredArea[],
  hasSurvey: boolean,
): string[] {
  const notes: string[] = [
    '본 REPORT는 입학테스트·학습성향 설문 결과를 바탕으로 한 학습관리 참고 자료입니다.',
    '단정적 심리 진단이나 고정된 능력 평가로 해석하지 않습니다.',
  ]
  const sparse = [...math, ...english].filter((item) => item.totalCount <= 2)
  if (sparse.length > 0) {
    notes.push(
      '일부 평가영역은 문항 수가 제한적이라 경향 관찰 수준으로 신중히 해석합니다.',
    )
  }
  if (!hasSurvey) {
    notes.push('학습성향 설문이 없어 성향 관련 해석은 제한적으로 제공합니다.')
  }
  if (math.length === 0) notes.push('수학 입학테스트 결과가 연결되어 있지 않습니다.')
  if (english.length === 0) notes.push('영어 입학테스트 결과가 연결되어 있지 않습니다.')
  return notes
}

/**
 * 통합 REPORT → 통합 진단.
 * 수학/영어 academicDiagnosis는 기존 엔진 결과를 그대로 사용한다.
 */
export function buildEntranceExamIntegratedDiagnosis(
  report: EntranceExamIntegratedReport,
): EntranceExamIntegratedDiagnosis {
  const mathDiag = report.math ? buildEntranceExamDiagnosis(report.math) : null
  const englishDiag = report.english ? buildEntranceExamDiagnosis(report.english) : null

  let learningDiagnosis: string | null = null
  if (report.learningSurvey) {
    const base = report.math ?? report.english
    if (base) {
      const withSurvey: EntranceExamDiagnosticReport = {
        ...base,
        learningSurvey: report.learningSurvey,
        completeness: { ...base.completeness, hasSurvey: true },
      }
      learningDiagnosis = buildEntranceExamDiagnosis(withSurvey).learningDiagnosis
    } else {
      learningDiagnosis =
        '학습성향 설문 결과만 확보된 상태입니다. 영역별 점수를 기준으로 학습 습관 관리 방향을 우선 제시합니다.'
    }
  }

  const mathAreas = pickAcademic(report.math, '수학')
  const englishAreas = pickAcademic(report.english, '영어')
  const learningAreas = pickLearning(report.learningSurvey)

  const crossNotes = [
    ...buildCrossSubjectNotes(mathAreas, englishAreas),
    ...buildSurveyCrossNotes([...mathAreas, ...englishAreas], learningAreas),
  ]

  return {
    mathDiagnosis: mathDiag?.academicDiagnosis ?? null,
    englishDiagnosis: englishDiag?.academicDiagnosis ?? null,
    learningDiagnosis,
    integratedDiagnosis: buildIntegratedNarrative(
      report,
      mathDiag?.academicDiagnosis ?? null,
      englishDiag?.academicDiagnosis ?? null,
      learningDiagnosis,
      crossNotes,
    ),
    strengths: buildStrengths(mathAreas, englishAreas, learningAreas),
    improvementAreas: buildImprovements(mathAreas, englishAreas, learningAreas),
    managementRecommendations: buildManagement(mathAreas, englishAreas, learningAreas),
    reliabilityNotes: buildReliability(
      mathAreas,
      englishAreas,
      report.completeness.hasSurvey,
    ),
  }
}
