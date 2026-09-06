import {
  BEHAVIOR_LABELS,
  PROBLEM_SOLVING_LABELS,
  RIASEC_LABELS,
  RIASEC_ORDER,
  STRENGTH_LABELS,
  VALUE_LABELS,
} from './labels.ts'
import type {
  BehaviorCode,
  MajorProfile,
  ProblemSolvingCode,
  RiasecCode,
  ScoreMap,
  StrengthCode,
  ValueCode,
} from './types.ts'

const RIASEC_PHRASES: Record<RiasecCode, string> = {
  R: '손으로 만들고 실행하며 눈에 보이는 결과를 만드는 흥미',
  I: '새로운 기술이나 원리를 탐구하는 흥미',
  A: '생각과 느낌을 자신만의 방식으로 표현하려는 흥미',
  S: '다른 사람을 돕고 함께 성장하는 활동에 대한 흥미',
  E: '의견을 제시하고 사람들을 이끌어 결과를 만드는 흥미',
  C: '자료를 정확하게 정리하고 체계적으로 다루는 흥미',
}

const STRENGTH_PHRASES: Record<StrengthCode, string> = {
  VER: '언어로 핵심을 파악하고 설명하는 힘',
  NUM: '수와 양의 관계를 다루는 힘',
  LOG: '논리적 문제해결 성향',
  SPA: '공간·시각 정보를 이해하는 힘',
  CRE: '새로운 가능성을 떠올리는 창의성',
  INT: '다른 사람의 감정과 의견을 읽는 힘',
  OBS: '세부 차이를 관찰하는 힘',
  PRA: '배운 내용을 실제로 적용하는 힘',
}

function highCodes<T extends string>(scores: ScoreMap<T>, minScore = 65): T[] {
  return (Object.entries(scores) as Array<[T, number]>)
    .filter(([, score]) => score >= minScore)
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code)
}

function joinKorean(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0] ?? ''
  if (parts.length === 2) return `${parts[0]}와 ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}와 ${parts[parts.length - 1]}`
}

export function buildDnaExplanation(
  top2: [RiasecCode, RiasecCode],
  riasecScores: ScoreMap<RiasecCode>,
): string {
  const first = RIASEC_PHRASES[top2[0]]
  const second = RIASEC_PHRASES[top2[1]]
  const firstScore = Math.round(riasecScores[top2[0]])
  const secondScore = Math.round(riasecScores[top2[1]])
  return `${RIASEC_LABELS[top2[0]]}(${top2[0]}, ${firstScore})과 ${RIASEC_LABELS[top2[1]]}(${top2[1]}, ${secondScore}) 성향이 함께 나타납니다. ${first}가 두드러지고, ${second}도 함께 높습니다.`
}

export function buildOverallExplanation(input: {
  riasecScores: ScoreMap<RiasecCode>
  strengthScores: ScoreMap<StrengthCode>
  valueScores: ScoreMap<ValueCode>
  problemSolvingScores: ScoreMap<ProblemSolvingCode>
}): string {
  const highRiasec = highCodes(input.riasecScores).slice(0, 2)
  const highStrength = highCodes(input.strengthScores).slice(0, 2)
  const highPs = highCodes(input.problemSolvingScores).slice(0, 2)
  const phrases: string[] = []

  if (highStrength.includes('LOG') || highPs.includes('ANALYSIS')) {
    phrases.push('분석적 사고와 논리적 문제해결 성향이 높고')
  } else if (highStrength.length > 0) {
    phrases.push(`${joinKorean(highStrength.map((code) => STRENGTH_PHRASES[code]))}이 두드러지고`)
  }

  if (highRiasec.includes('I')) {
    phrases.push('새로운 기술이나 원리를 탐구하는 흥미가 강합니다')
  } else if (highRiasec.length > 0) {
    const last = RIASEC_PHRASES[highRiasec[0] ?? 'I']
    phrases.push(`${last}가 강합니다`)
  }

  if (phrases.length === 0) {
    const topRiasec = [...RIASEC_ORDER].sort(
      (a, b) => input.riasecScores[b] - input.riasecScores[a],
    )[0]
    return `${RIASEC_PHRASES[topRiasec ?? 'I']}가 현재 결과에서 비교적 분명하게 나타납니다.`
  }

  const text = phrases.join(' ')
  return text.endsWith('습니다') ? text + '.' : `${text}.`
}

export function buildMajorReasons(input: {
  profile: MajorProfile
  riasecScores: ScoreMap<RiasecCode>
  strengthScores: ScoreMap<StrengthCode>
  valueScores: ScoreMap<ValueCode>
  behaviorScores: ScoreMap<BehaviorCode>
  problemSolvingScores: ScoreMap<ProblemSolvingCode>
}): string[] {
  const reasons: string[] = []
  const riasecHits = RIASEC_ORDER.filter((code) => {
    const student = input.riasecScores[code]
    const target = input.profile.riasecTarget[code]
    return student >= 60 && target >= 0.7
  }).slice(0, 2)
  for (const code of riasecHits) {
    reasons.push(`${RIASEC_LABELS[code]} 흥미(${code})가 이 전공군과 잘 맞습니다.`)
  }

  const strengthHits = input.profile.strengthKeys
    .filter((code) => input.strengthScores[code] >= 60)
    .slice(0, 2)
  for (const code of strengthHits) {
    reasons.push(`${STRENGTH_LABELS[code]} 강점이 해당 분야의 핵심 역량과 연결됩니다.`)
  }

  const valueHits = input.profile.valueKeys
    .filter((code) => input.valueScores[code] >= 60)
    .slice(0, 1)
  for (const code of valueHits) {
    reasons.push(`${VALUE_LABELS[code]} 가치가 이 전공을 탐색하는 동기와 맞닿아 있습니다.`)
  }

  return reasons.slice(0, 3)
}

export function buildWatchItems(input: {
  profile: MajorProfile
  strengthScores: ScoreMap<StrengthCode>
  valueScores: ScoreMap<ValueCode>
  behaviorScores: ScoreMap<BehaviorCode>
  problemSolvingScores: ScoreMap<ProblemSolvingCode>
}): string[] {
  const candidates: Array<{ label: string; score: number }> = []

  for (const code of input.profile.strengthKeys) {
    candidates.push({ label: STRENGTH_LABELS[code], score: input.strengthScores[code] })
  }
  for (const code of input.profile.valueKeys) {
    candidates.push({ label: VALUE_LABELS[code], score: input.valueScores[code] })
  }
  for (const code of input.profile.behaviorKeys) {
    candidates.push({ label: BEHAVIOR_LABELS[code], score: input.behaviorScores[code] })
  }
  for (const code of input.profile.problemSolvingKeys) {
    candidates.push({
      label: PROBLEM_SOLVING_LABELS[code],
      score: input.problemSolvingScores[code],
    })
  }

  return candidates
    .filter((item) => item.score < 60)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map(
      (item) =>
        `이 분야를 실제로 탐색할 때 ${item.label} 관련 경험을 통해 적합성을 추가로 확인해 보는 것이 좋습니다.`,
    )
}
