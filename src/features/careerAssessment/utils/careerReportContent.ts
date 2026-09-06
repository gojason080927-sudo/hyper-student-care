import {
  CAREER_MAJOR_REPORT_SEED,
  CREDIT_SUBJECT_CLUSTERS,
  EFFICACY_DESCRIPTION,
  RIASEC_DNA_PRIMARY,
  RIASEC_DNA_SECONDARY,
  READINESS_DESCRIPTION,
  type CreditSubjectCluster,
} from '../data/careerReportDescriptions'
import { CAREER_MAJOR_DICTIONARY } from '../data/majorDictionary'
import { CAREER_MAJOR_PROFILE_BY_ID } from '../data/majorProfiles'
import { RIASEC_LABELS, RIASEC_ORDER, STRENGTH_LABELS } from '../data/labels'
import type {
  DetailedMajorDef,
  MajorProfile,
  RankedItem,
  RiasecCode,
  ScoreMap,
  StrengthCode,
} from '../types'

const DETAILED_PER_GROUP = 3

export function buildReportDnaExplanation(top2: [RiasecCode, RiasecCode]): string {
  const [first, second] = top2
  return [
    `${RIASEC_LABELS[first]}(${first})과 ${RIASEC_LABELS[second]}(${second})의 성향이 함께 나타납니다.`,
    RIASEC_DNA_PRIMARY[first],
    RIASEC_DNA_SECONDARY[second],
  ].join(' ')
}

export function commentForEfficacy(score: number): string {
  if (score >= 80) return '스스로 진로를 탐색하고 실행할 수 있다는 자신감이 높은 편입니다.'
  if (score >= 60) return '어느 정도 스스로 시도할 수 있다고 느끼지만, 구체적인 경험과 정보가 쌓이면 자신감이 더 커질 수 있습니다.'
  return '아직은 혼자 결정하기보다 상담과 경험을 통해 방향을 구체화하는 단계로 보입니다.'
}

export function commentForReadiness(score: number): string {
  if (score >= 80) return '진로 목표와 필요한 정보를 비교적 구체적으로 살펴보며 선택을 준비하고 있습니다.'
  if (score >= 60) return '관심 방향은 있으나, 전공·학과 정보를 더 체계적으로 모으면 선택이 분명해질 수 있습니다.'
  return '아직 탐색 초기이므로 관심 분야의 학과 소개와 과목 정보를 차근히 쌓아 가는 것이 좋습니다.'
}

export function scaleCaption(kind: 'efficacy' | 'readiness'): string {
  return kind === 'efficacy' ? EFFICACY_DESCRIPTION : READINESS_DESCRIPTION
}

function rankedRiasecForProfile(
  profile: MajorProfile,
  riasecScores: ScoreMap<RiasecCode>,
): RiasecCode[] {
  return [...RIASEC_ORDER]
    .filter((code) => profile.riasecTarget[code] >= 0.55)
    .sort(
      (a, b) =>
        riasecScores[b] - riasecScores[a] ||
        profile.riasecTarget[b] - profile.riasecTarget[a],
    )
}

export function buildCombinedMajorReason(
  profile: MajorProfile,
  riasecScores: ScoreMap<RiasecCode>,
  strengthScores: ScoreMap<StrengthCode>,
): string {
  const riasecHits = rankedRiasecForProfile(profile, riasecScores)
  const topRiasec =
    riasecHits[0] ??
    [...RIASEC_ORDER].sort(
      (a, b) =>
        profile.riasecTarget[b] - profile.riasecTarget[a] ||
        riasecScores[b] - riasecScores[a],
    )[0] ??
    'I'

  const strengthHits = [...profile.strengthKeys]
    .sort((a, b) => strengthScores[b] - strengthScores[a])
    .slice(0, 2)

  const interest = `${RIASEC_LABELS[topRiasec]} 흥미`
  if (strengthHits.length >= 2) {
    return `${interest}와 ${STRENGTH_LABELS[strengthHits[0]]}·${STRENGTH_LABELS[strengthHits[1]]} 강점이 ${profile.name} 계열의 학습 특성과 잘 맞습니다.`
  }
  if (strengthHits.length === 1) {
    return `${interest}와 ${STRENGTH_LABELS[strengthHits[0]]} 강점이 ${profile.name} 계열의 학습 특성과 잘 맞습니다.`
  }
  const second = riasecHits[1]
  if (second) {
    return `${interest}와 ${RIASEC_LABELS[second]} 흥미가 ${profile.name} 계열과 잘 맞습니다.`
  }
  return `${interest}가 ${profile.name} 계열의 학습 특성과 잘 맞습니다.`
}

export function reasonForMajorGroup(
  group: RankedItem,
  riasecScores: ScoreMap<RiasecCode>,
  strengthScores: ScoreMap<StrengthCode>,
): string {
  const profile = CAREER_MAJOR_PROFILE_BY_ID.get(group.id)
  if (!profile) return group.reasons[0] ?? ''
  return buildCombinedMajorReason(profile, riasecScores, strengthScores)
}

function dictionaryById(dictionary: DetailedMajorDef[]): Map<string, DetailedMajorDef> {
  return new Map(dictionary.map((row) => [row.id, row]))
}

export function collectDetailedMajorsForGroup(
  groupId: string,
  detailedScores: RankedItem[],
  dictionary: DetailedMajorDef[] = CAREER_MAJOR_DICTIONARY,
  seed: ReadonlyArray<{ groupId: string; name: string }> = CAREER_MAJOR_REPORT_SEED,
): string[] {
  const byId = dictionaryById(dictionary)
  const scored = detailedScores
    .filter((row) => byId.get(row.id)?.majorGroupPrimary === groupId)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'ko'))
    .map((row) => row.name)

  const fromDict = dictionary
    .filter((row) => row.isActive && row.majorGroupPrimary === groupId)
    .map((row) => row.majorName)

  const fromSeed = seed.filter((row) => row.groupId === groupId).map((row) => row.name)

  const unique: string[] = []
  for (const name of [...scored, ...fromDict, ...fromSeed]) {
    if (!unique.includes(name)) unique.push(name)
    if (unique.length >= DETAILED_PER_GROUP) break
  }
  return unique
}

export function detailedMajorsByTopGroups(
  majorsTop10: RankedItem[],
  detailedScores: RankedItem[],
): Array<{ group: RankedItem; majors: string[] }> {
  return majorsTop10.map((group) => ({
    group,
    majors: collectDetailedMajorsForGroup(group.id, detailedScores),
  }))
}

export function creditClustersForMajors(majors: RankedItem[], limit = 2): CreditSubjectCluster[] {
  const seen = new Set<string>()
  const clusters: CreditSubjectCluster[] = []
  for (const major of majors) {
    const cluster = CREDIT_SUBJECT_CLUSTERS.find((item) => item.groupIds.includes(major.id))
    if (!cluster || seen.has(cluster.id)) continue
    seen.add(cluster.id)
    clusters.push(cluster)
    if (clusters.length >= limit) break
  }
  if (clusters.length === 0) {
    const fallback = CREDIT_SUBJECT_CLUSTERS[3]
    if (fallback) clusters.push(fallback)
  }
  return clusters
}

export function containsBrokenSuriParticle(text: string): boolean {
  return /수리을/.test(text)
}
