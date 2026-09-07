import {
  CAREER_MAJOR_DETAIL_MAP,
  UNKNOWN_MAJOR_DETAIL,
  type CareerMajorDetailSeed,
} from '../data/careerMajorDetails'
import { MAJOR_CAREER_PATHS } from '../data/careerMajorCareerPaths'
import { CREDIT_SUBJECT_CLUSTERS } from '../data/careerReportDescriptions'
import {
  BEHAVIOR_LABELS,
  BEHAVIOR_ORDER,
  PROBLEM_SOLVING_LABELS,
  RIASEC_LABELS,
  RIASEC_ORDER,
  STRENGTH_LABELS,
  STRENGTH_ORDER,
  VALUE_LABELS,
  VALUE_ORDER,
} from '../data/labels'
import { CAREER_MAJOR_PROFILE_BY_ID } from '../data/majorProfiles'
import { topEntries } from '../engine/scoring'
import type {
  BehaviorCode,
  CareerAssessmentScores,
  RankedItem,
  RiasecCode,
  StrengthCode,
} from '../types'
import { collectDetailedMajorsForGroup } from './careerReportContent'

const DEEP_MAJOR_LIMIT = 6
const DEEP_CAREER_LIMIT = 12
const SUBJECT_LIMIT = 6
const TOPIC_LIMIT = 5
const BANNED_REASON_TEMPLATE = /계열의 학습 특성과 잘 맞습니다/

export type CareerMajorDetail = {
  relatedMajors: string[]
  exploratorySubjects: string[]
  explorationTopics: string[]
  careers: string[]
  learningFocus: string
}

export type Top3DeepCard = {
  rank: number
  group: RankedItem
  fitLabel: string
  whyFit: string
  relatedMajors: string[]
  exploratorySubjects: string[]
  explorationTopics: string[]
  careers: string[]
}

export type SelectionPoint = {
  id: string
  title: string
  body: string
}

function uniqueNonEmpty(values: Array<string | null | undefined>, limit?: number): string[] {
  const out: string[] = []
  for (const value of values) {
    const text = typeof value === 'string' ? value.trim() : ''
    if (!text || text === 'undefined' || text === 'null') continue
    if (!out.includes(text)) out.push(text)
    if (limit != null && out.length >= limit) break
  }
  return out
}

export function getMajorDetailSeed(groupId: string): CareerMajorDetailSeed {
  return CAREER_MAJOR_DETAIL_MAP[groupId] ?? UNKNOWN_MAJOR_DETAIL
}

export function clusterSubjectsForGroup(groupId: string): string[] {
  const cluster = CREDIT_SUBJECT_CLUSTERS.find((item) => item.groupIds.includes(groupId))
  return cluster ? [...cluster.examples] : []
}

export function resolveMajorDetail(
  groupId: string,
  detailedScores: RankedItem[],
): CareerMajorDetail {
  const seed = getMajorDetailSeed(groupId)
  const relatedMajors = uniqueNonEmpty(
    collectDetailedMajorsForGroup(groupId, detailedScores, undefined, undefined, DEEP_MAJOR_LIMIT),
    DEEP_MAJOR_LIMIT,
  )
  const exploratorySubjects = uniqueNonEmpty(
    [...seed.exploratorySubjects, ...clusterSubjectsForGroup(groupId)],
    SUBJECT_LIMIT,
  )
  const explorationTopics = uniqueNonEmpty([...seed.explorationTopics], TOPIC_LIMIT)
  const careers = uniqueNonEmpty(
    [...(MAJOR_CAREER_PATHS[groupId] ?? []), ...seed.extraCareers],
    DEEP_CAREER_LIMIT,
  )

  return {
    relatedMajors: relatedMajors.length > 0 ? relatedMajors : [`${groupId} 관련 학과 정보를 추가로 확인해 보세요`],
    exploratorySubjects:
      exploratorySubjects.length >= 3
        ? exploratorySubjects
        : uniqueNonEmpty([...exploratorySubjects, ...UNKNOWN_MAJOR_DETAIL.exploratorySubjects], SUBJECT_LIMIT),
    explorationTopics:
      explorationTopics.length >= 3
        ? explorationTopics
        : uniqueNonEmpty([...explorationTopics, ...UNKNOWN_MAJOR_DETAIL.explorationTopics], TOPIC_LIMIT),
    careers: careers.length > 0 ? careers : ['관련 전공 진출 직무를 추가로 탐색해 보세요'],
    learningFocus: seed.learningFocus.trim() || UNKNOWN_MAJOR_DETAIL.learningFocus,
  }
}

function hasBatchim(word: string): boolean {
  const last = word.at(-1)
  if (!last) return false
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

function topicParticle(word: string): string {
  return hasBatchim(word) ? '은' : '는'
}

function subjectParticle(word: string): string {
  return hasBatchim(word) ? '이' : '가'
}

function objectParticle(word: string): string {
  return hasBatchim(word) ? '을' : '를'
}

function andParticle(word: string): string {
  return hasBatchim(word) ? '과' : '와'
}

function patternIndex(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 5
}

function joinTraitLead(phrases: string[]): string {
  if (phrases.length <= 1) return `높은 ${phrases[0] ?? '관련 특성'}`
  if (phrases.length === 2) return `높은 ${phrases[0]}와 ${phrases[1]}`
  return `${phrases[0]}와 ${phrases[1]}, ${phrases[2]}`
}

function composeReason(lead: string, focus: string, index: number): string {
  const topic = topicParticle(lead)
  const subject = subjectParticle(lead)
  const object = objectParticle(lead)
  const withFocus = andParticle(focus)
  switch (index) {
    case 1:
      return `${lead}${subject} 높아 ${focus}에 강점을 보일 가능성이 있습니다.`
    case 2:
      return `${lead}${topic} ${focus}${withFocus} 맞닿아 있는 면이 있습니다.`
    case 3:
      return `${lead}${object} ${focus}에 활용할 여지가 있습니다.`
    case 4:
      return `${lead}${topic} ${focus}${objectParticle(focus)} 이어 가는 데 도움이 됩니다.`
    default:
      return `${lead}${topic} ${focus}${withFocus} 잘 연결됩니다.`
  }
}

function pickReasonTraits(group: RankedItem, scores: CareerAssessmentScores): string[] {
  const profile = CAREER_MAJOR_PROFILE_BY_ID.get(group.id)
  const phrases: string[] = []
  const used = new Set<string>()

  const push = (key: string, phrase: string) => {
    if (used.has(key) || used.has(phrase) || phrases.length >= 3) return
    used.add(key)
    used.add(phrase)
    phrases.push(phrase)
  }

  const riasecRanked = profile
    ? ([...RIASEC_ORDER]
        .filter((code) => profile.riasecTarget[code] >= 0.55)
        .sort(
          (a, b) =>
            scores.riasecScores[b] - scores.riasecScores[a] ||
            profile.riasecTarget[b] - profile.riasecTarget[a],
        ))
    : ([...RIASEC_ORDER].sort((a, b) => scores.riasecScores[b] - scores.riasecScores[a]))
  const topInterest = riasecRanked[0] ?? scores.riasecTop2[0]
  push(`riasec-${topInterest}`, `${RIASEC_LABELS[topInterest]} 흥미`)

  const strengthKeys = profile?.strengthKeys ?? (Object.keys(scores.strengthScores) as StrengthCode[])
  const strengthHits = [...strengthKeys]
    .sort((a, b) => scores.strengthScores[b] - scores.strengthScores[a])
    .slice(0, 2)
  if (strengthHits.length >= 2) {
    push(
      `strength-${strengthHits[0]}-${strengthHits[1]}`,
      `${STRENGTH_LABELS[strengthHits[0]]}·${STRENGTH_LABELS[strengthHits[1]]} 강점`,
    )
  } else if (strengthHits[0]) {
    push(`strength-${strengthHits[0]}`, `${STRENGTH_LABELS[strengthHits[0]]} 강점`)
  }

  const rotate = patternIndex(group.id)
  if (profile && phrases.length < 3) {
    const extras: Array<{ key: string; phrase: string; score: number }> = []
    for (const code of profile.valueKeys) {
      extras.push({
        key: `value-${code}`,
        phrase: `${VALUE_LABELS[code]} 가치`,
        score: scores.valueScores[code],
      })
    }
    for (const code of profile.behaviorKeys) {
      extras.push({
        key: `behavior-${code}`,
        phrase: `${BEHAVIOR_LABELS[code]} 성향`,
        score: scores.behaviorScores[code],
      })
    }
    for (const code of profile.problemSolvingKeys) {
      extras.push({
        key: `problem-${code}`,
        phrase: `${PROBLEM_SOLVING_LABELS[code]} 역량`,
        score: scores.problemSolvingScores[code],
      })
    }
    extras.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    const start = extras.length > 0 ? rotate % extras.length : 0
    const rotated = extras.length > 0 ? extras.slice(start).concat(extras.slice(0, start)) : []
    for (const extra of rotated) {
      if (extra.score < 62) continue
      push(extra.key, extra.phrase)
      break
    }
  }

  if (phrases.length < 2) {
    const second = riasecRanked[1] ?? scores.riasecTop2[1]
    if (second) push(`riasec-${second}`, `${RIASEC_LABELS[second]} 흥미`)
  }

  return phrases.slice(0, 3)
}

export function distinctiveFocusTokens(focus: string): string[] {
  const stop = new Set([
    '학습',
    '하는',
    '다루는',
    '확인하는',
    '찾고',
    '비교하는',
    '이해하는',
    '설명하는',
    '구성하는',
    '운영하는',
    '지도하는',
    '지원하는',
  ])
  return focus
    .split(/[\s·,]+/)
    .map((token) => token.replace(/[이가을를은는과의]$/, ''))
    .filter((token) => token.length >= 2 && !stop.has(token))
}

export function buildDistinctMajorReason(group: RankedItem, scores: CareerAssessmentScores): string {
  const focus = getMajorDetailSeed(group.id).learningFocus.trim() || UNKNOWN_MAJOR_DETAIL.learningFocus
  const profile = CAREER_MAJOR_PROFILE_BY_ID.get(group.id)
  if (!profile) {
    const fallback = group.reasons.find((row) => row && row !== 'undefined') ?? ''
    return fallback || `${group.name} 계열은 ${focus}${andParticle(focus)} 연결해 살펴볼 수 있습니다.`
  }

  const lead = joinTraitLead(pickReasonTraits(group, scores))
  return composeReason(lead, focus, patternIndex(group.id))
}

export function analyzeTop10ReasonUniqueness(
  reasons: string[],
  groups: Array<{ id: string; name: string }>,
): {
  ok: boolean
  exactUnique: number
  strippedUnique: number
  bannedCount: number
  missingFocus: string[]
} {
  const names = groups.map((row) => row.name)
  const stripped = reasons.map((reason) => {
    let text = reason
    for (const name of names) text = text.split(name).join('')
    return text.replace(/\s+/g, ' ').trim()
  })
  const bannedCount = reasons.filter((reason) => BANNED_REASON_TEMPLATE.test(reason)).length
  const missingFocus = groups.flatMap((group, index) => {
    const reason = reasons[index] ?? ''
    const tokens = distinctiveFocusTokens(getMajorDetailSeed(group.id).learningFocus)
    const hit = tokens.some((token) => reason.includes(token))
    return hit ? [] : [group.id]
  })
  const exactUnique = new Set(reasons).size
  const strippedUnique = new Set(stripped).size
  const ok =
    reasons.length === groups.length &&
    exactUnique === reasons.length &&
    strippedUnique === reasons.length &&
    bannedCount === 0 &&
    missingFocus.length === 0
  return { ok, exactUnique, strippedUnique, bannedCount, missingFocus }
}

export function buildDeepFitExplanation(group: RankedItem, scores: CareerAssessmentScores): string {
  return buildDistinctMajorReason(group, scores)
}

export function buildTop3DeepCards(scores: CareerAssessmentScores): Top3DeepCard[] {
  return scores.majorGroupScores.slice(0, 3).map((group, index) => {
    const detail = resolveMajorDetail(group.id, scores.detailedMajorScores)
    return {
      rank: index + 1,
      group,
      fitLabel: group.label,
      whyFit: buildDeepFitExplanation(group, scores),
      relatedMajors: detail.relatedMajors,
      exploratorySubjects: detail.exploratorySubjects,
      explorationTopics: detail.explorationTopics,
      careers: detail.careers,
    }
  })
}

function point(
  id: string,
  title: string,
  body: string,
  score: number,
): SelectionPoint & { score: number } {
  return { id, title, body, score }
}

export function buildSelectionPoints(scores: CareerAssessmentScores, limit = 4): SelectionPoint[] {
  const strengthTop = topEntries(scores.strengthScores, 3, STRENGTH_ORDER)
  const valueTop = topEntries(scores.valueScores, 2, VALUE_ORDER)
  const behaviorTop = [...BEHAVIOR_ORDER]
    .map((code) => ({ code, score: scores.behaviorScores[code] }))
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))

  const riasecPoints: Record<RiasecCode, Omit<SelectionPoint, 'id'> & { score: number }> = {
    R: {
      title: '현장·실습',
      body: '손으로 다루고 결과를 직접 확인하는 활동이 있는 전공을 우선 탐색해 보세요.',
      score: scores.riasecScores.R,
    },
    I: {
      title: '탐구 중심',
      body: '원인과 원리를 깊게 파고드는 전공을 우선 탐색해 보세요.',
      score: scores.riasecScores.I,
    },
    A: {
      title: '창의 표현',
      body: '아이디어를 자신만의 방식으로 표현할 기회가 있는 전공을 함께 비교해 보세요.',
      score: scores.riasecScores.A,
    },
    S: {
      title: '사람과의 상호작용',
      body: '사람을 돕거나 협업하는 활동이 포함된 전공도 함께 비교해 보세요.',
      score: scores.riasecScores.S,
    },
    E: {
      title: '목표 주도',
      body: '의견을 내고 방향을 이끌어 성과를 만드는 전공을 함께 살펴보세요.',
      score: scores.riasecScores.E,
    },
    C: {
      title: '체계·정확',
      body: '자료와 절차를 정확하게 다루는 활동이 있는 전공을 확인해 보세요.',
      score: scores.riasecScores.C,
    },
  }

  const candidates: Array<SelectionPoint & { score: number }> = [
    point(`riasec-${scores.riasecTop2[0]}`, riasecPoints[scores.riasecTop2[0]].title, riasecPoints[scores.riasecTop2[0]].body, riasecPoints[scores.riasecTop2[0]].score + 8),
    point(`riasec-${scores.riasecTop2[1]}`, riasecPoints[scores.riasecTop2[1]].title, riasecPoints[scores.riasecTop2[1]].body, riasecPoints[scores.riasecTop2[1]].score),
  ]

  for (const item of strengthTop) {
    if (item.code === 'LOG' || item.code === 'OBS') {
      candidates.push(
        point(
          'strength-analysis',
          '논리·관찰 활용',
          '분석과 관찰 능력을 실제로 활용하는 학습환경을 확인해 보세요.',
          item.score,
        ),
      )
    } else if (item.code === 'PRA') {
      candidates.push(
        point('strength-practice', '실제 문제 해결', '배운 지식을 현실 문제에 적용할 기회가 많은 전공을 확인해 보세요.', item.score),
      )
    } else if (item.code === 'INT' || item.code === 'VER') {
      candidates.push(
        point('strength-people', '소통과 협력', '사람과의 이해와 설명이 중요한 전공을 함께 비교해 보세요.', item.score),
      )
    } else if (item.code === 'CRE' || item.code === 'SPA') {
      candidates.push(
        point('strength-create', '구성과 창안', '새로운 형태나 아이디어를 만들어 보는 전공', item.score),
      )
    } else if (item.code === 'NUM') {
      candidates.push(
        point('strength-number', '수리 활용', '수량과 자료를 다루며 구조를 파악하는 전공', item.score),
      )
    }
  }

  const topValue = valueTop[0]
  if (topValue) {
    const valueBodies: Partial<Record<string, string>> = {
      CONTRIBUTION: '다른 사람이나 사회에 도움이 되는 방향의 전공',
      GROWTH: '계속 배우고 전문성을 쌓을 수 있는 전공',
      EXPERTISE: '한 분야의 깊은 지식과 기술을 키울 수 있는 전공',
      ACHIEVEMENT: '목표를 정하고 결과를 만들어 가는 전공',
      AUTONOMY: '스스로 판단하고 방식을 정할 여지가 있는 전공',
      RELATIONSHIP: '신뢰와 협력을 바탕으로 일하는 전공',
    }
    const body = valueBodies[topValue.code]
    if (body) {
      candidates.push(point(`value-${topValue.code}`, `${VALUE_LABELS[topValue.code]} 중시`, body, topValue.score))
    }
  }

  const topBehavior = behaviorTop[0]
  if (topBehavior && topBehavior.score >= 70) {
    const behaviorBodies: Partial<Record<BehaviorCode, { title: string; body: string }>> = {
      PERSISTENCE: { title: '장기 몰입', body: '어려워도 끝까지 이어가는 태도가 필요한 전공' },
      DELIBERATION: { title: '신중한 판단', body: '여러 가능성을 충분히 따져 보는 전공' },
      CAREFULNESS: { title: '정확성 중시', body: '실수와 위험을 줄이며 확인하는 활동이 있는 전공' },
      EXECUTION: { title: '실행 중심', body: '계획을 실제 행동으로 옮기는 기회가 많은 전공' },
      PLANNING: { title: '계획적 접근', body: '순서를 정해 차근히 진행하는 전공' },
    }
    const mapped = behaviorBodies[topBehavior.code]
    if (mapped) {
      candidates.push(point(`behavior-${topBehavior.code}`, mapped.title, mapped.body, topBehavior.score))
    }
  }

  if (scores.careerReadiness < 65) {
    candidates.push(
      point(
        'experience-needed',
        '직접 경험 필요',
        '체험·탐구·동아리 등을 통해 관심과 실제 적합성을 비교해 보세요.',
        90 - scores.careerReadiness,
      ),
    )
  }

  const picked: SelectionPoint[] = []
  const seen = new Set<string>()
  for (const item of candidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))) {
    if (seen.has(item.id) || seen.has(item.title)) continue
    seen.add(item.id)
    seen.add(item.title)
    picked.push({ id: item.id, title: item.title, body: item.body })
    if (picked.length >= limit) break
  }

  while (picked.length < 3) {
    const fallback = point(
      `fallback-${picked.length}`,
      '탐색 지속',
      '관심 전공의 학과·과목·직업을 비교하며 적합성을 확인해 가는 과정이 필요합니다.',
      0,
    )
    if (picked.some((row) => row.title === fallback.title)) break
    picked.push({ id: fallback.id, title: fallback.title, body: fallback.body })
  }

  return picked.slice(0, limit)
}

export function reportHasPlaceholderLeak(text: string): boolean {
  return /undefined|null|NaN/.test(text)
}
