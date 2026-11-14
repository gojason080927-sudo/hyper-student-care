/**
 * 내신 기준 지원 검토 분석 engine.
 * 학생 성적과 공식 70%컷이 가까운 모집단위만 상향/적정/안정으로 제시.
 */
import {
  SPECIAL_ADMISSION_TYPE_KEYWORDS,
  admissionRecommendationWindow,
  admissionThresholds,
} from '../config/admissionThresholds'
import type {
  AdmissionSupportBand,
  UniversityAdmissionRecord,
  UniversityGradeSystem,
  UniversityMatchCard,
} from '../types'

export type AnalyzeUniversityAdmissionsInput = {
  studentGrade: number | null
  universityRecords: UniversityAdmissionRecord[]
  thresholds?: typeof admissionThresholds
  recommendationWindow?: typeof admissionRecommendationWindow
  preferGradeSystem?: UniversityGradeSystem
  /** true면 특별전형도 포함 (기본 false) */
  includeSpecialAdmissions?: boolean
}

export type UniversityAnalysisResult = {
  ambitious: UniversityMatchCard[]
  target: UniversityMatchCard[]
  safe: UniversityMatchCard[]
  /** 추천범위 밖 — 기본 UI 숨김 */
  outOfWindow: UniversityMatchCard[]
  /** 대학당 초과 모집단위 (펼치기용) */
  overflowByUniversity: Record<string, UniversityMatchCard[]>
  excluded: UniversityMatchCard[]
  unavailableCutoff: UniversityMatchCard[]
  nonGradeReference: UniversityMatchCard[]
  ready: boolean
  message: string
  usedGradeSystem: UniversityGradeSystem
  /** 기본 표시에 쓰인 maxDistance */
  appliedMaxDistance: number
}

export function calcCutoffDifference(
  studentGrade: number,
  cutoff70: number,
): number {
  return Math.round((studentGrade - cutoff70) * 100) / 100
}

export function calcCutoffDistance(
  studentGrade: number,
  cutoff70: number,
): number {
  return Math.abs(calcCutoffDifference(studentGrade, cutoff70))
}

export function formatAdvantageLabel(difference: number): string {
  const abs = Math.abs(difference).toFixed(2)
  if (difference === 0) return '동일'
  if (difference < 0) return `+${abs} 우위`
  return `-${abs} 열위`
}

/** 표용 짧은 차이 표기: student - cutoff (음수면 학생 우위) */
export function formatSignedDifference(difference: number): string {
  if (difference === 0) return '0.00'
  const sign = difference > 0 ? '+' : ''
  return `${sign}${difference.toFixed(2)}`
}

export function classifySupportBand(
  difference: number,
  thresholds: typeof admissionThresholds = admissionThresholds,
): AdmissionSupportBand {
  if (difference > thresholds.ambitious) return 'ambitious'
  if (difference <= thresholds.safe) return 'safe'
  return 'target'
}

export function isSpecialAdmissionType(admissionType: string): boolean {
  const t = admissionType.toLowerCase()
  return SPECIAL_ADMISSION_TYPE_KEYWORDS.some((k) =>
    t.includes(k.toLowerCase()),
  )
}

export function selectRecordsForGradeSystem(
  records: UniversityAdmissionRecord[],
  prefer: UniversityGradeSystem,
): UniversityAdmissionRecord[] {
  const preferred = records.filter((r) => r.gradeSystem === prefer)
  if (preferred.length > 0) return preferred
  if (prefer === '5-grade') {
    return records.filter((r) => r.gradeSystem === '5-grade')
  }
  return records.filter((r) => r.gradeSystem === '9-grade')
}

function sourceReliability(card: UniversityMatchCard): number {
  let score = 0
  if (card.university.officialData) score += 2
  if (card.university.sourceUrl) score += 1
  if (card.university.sourceName) score += 1
  return score
}

function sortByClosest(a: UniversityMatchCard, b: UniversityMatchCard): number {
  const da =
    a.difference === null ? Number.POSITIVE_INFINITY : Math.abs(a.difference)
  const db =
    b.difference === null ? Number.POSITIVE_INFINITY : Math.abs(b.difference)
  if (da !== db) return da - db
  const ra = sourceReliability(a)
  const rb = sourceReliability(b)
  if (ra !== rb) return rb - ra
  return (a.cutoffUsed ?? 99) - (b.cutoffUsed ?? 99)
}

function sortByCutoffAsc(a: UniversityMatchCard, b: UniversityMatchCard): number {
  return (a.cutoffUsed ?? 99) - (b.cutoffUsed ?? 99)
}

/**
 * 대학당 모집단위 제한. 가까운 순 우선.
 * overflow는 대학명 키로 반환.
 */
export function limitDepartmentsPerUniversity(
  cards: UniversityMatchCard[],
  maxPerUniversity: number,
): {
  limited: UniversityMatchCard[]
  overflowByUniversity: Record<string, UniversityMatchCard[]>
} {
  const byUni = new Map<string, UniversityMatchCard[]>()
  for (const card of cards) {
    const name = card.university.universityName
    const list = byUni.get(name) ?? []
    list.push(card)
    byUni.set(name, list)
  }

  const limited: UniversityMatchCard[] = []
  const overflowByUniversity: Record<string, UniversityMatchCard[]> = {}

  for (const [name, list] of byUni) {
    const sorted = [...list].sort(sortByClosest)
    limited.push(...sorted.slice(0, maxPerUniversity))
    if (sorted.length > maxPerUniversity) {
      overflowByUniversity[name] = sorted.slice(maxPerUniversity)
    }
  }

  return { limited: limited.sort(sortByClosest), overflowByUniversity }
}

/** 같은 대학·모집단위는 성적에 가장 가까운 전형 1건만 남긴다. */
export function dedupeClosestDepartment(
  cards: UniversityMatchCard[],
): UniversityMatchCard[] {
  const byKey = new Map<string, UniversityMatchCard>()
  for (const card of [...cards].sort(sortByClosest)) {
    const key = `${card.university.universityName}|${card.university.departmentName}`
    if (!byKey.has(key)) byKey.set(key, card)
  }
  return [...byKey.values()].sort(sortByClosest)
}

export function listDisplayedAdmissionCards(
  analysis: UniversityAnalysisResult,
): UniversityMatchCard[] {
  return [...analysis.ambitious, ...analysis.target, ...analysis.safe]
}

export function formatAdmissionEligibility(
  record: UniversityAdmissionRecord,
): string {
  if (record.csatMinimum) {
    return `${record.admissionType} · 수능최저 ${record.csatMinimum}`
  }
  return record.admissionType
}

function takeBandTop(
  cards: UniversityMatchCard[],
  max: number,
): UniversityMatchCard[] {
  return cards.sort(sortByClosest).slice(0, max)
}

export function analyzeUniversityAdmissions(
  input: AnalyzeUniversityAdmissionsInput,
): UniversityAnalysisResult {
  const thresholds = input.thresholds ?? admissionThresholds
  const window = input.recommendationWindow ?? admissionRecommendationWindow
  const preferGradeSystem = input.preferGradeSystem ?? '9-grade'
  const includeSpecial = input.includeSpecialAdmissions ?? false

  if (input.studentGrade === null) {
    return emptyResult(
      '9등급 환산 평균이 계산된 뒤 대학 분석을 이용할 수 있습니다.',
      preferGradeSystem,
      window.maxDistance,
    )
  }

  const eligible = input.universityRecords.filter(
    (r) =>
      r.officialData === true &&
      Boolean(r.sourceName) &&
      Boolean(r.sourceUrl) &&
      (r.dataType ?? 'actual_admission_result') === 'actual_admission_result',
  )

  const gradeScoped = selectRecordsForGradeSystem(eligible, preferGradeSystem)

  if (gradeScoped.length === 0) {
    return emptyResult(
      '현재 등록된 공식 입결 데이터가 없습니다.',
      preferGradeSystem,
      window.maxDistance,
    )
  }

  const ambitiousRaw: UniversityMatchCard[] = []
  const targetRaw: UniversityMatchCard[] = []
  const safeRaw: UniversityMatchCard[] = []
  const outOfWindow: UniversityMatchCard[] = []
  const excluded: UniversityMatchCard[] = []
  const unavailableCutoff: UniversityMatchCard[] = []
  const nonGradeReference: UniversityMatchCard[] = []

  // 공식 70%컷 스펙트럼(낮은 등급→높은 등급) 순으로 순회
  const ordered = [
    ...gradeScoped
      .filter((r) => (r.scoreType ?? 'grade') === 'grade' && r.cutoff70 != null)
      .sort((a, b) => (a.cutoff70 ?? 99) - (b.cutoff70 ?? 99)),
    ...gradeScoped.filter(
      (r) => !((r.scoreType ?? 'grade') === 'grade' && r.cutoff70 != null),
    ),
  ]

  for (const university of ordered) {
    const scoreType = university.scoreType ?? 'grade'

    if (scoreType !== 'grade') {
      nonGradeReference.push({
        university,
        studentComparableGrade: input.studentGrade,
        cutoffUsed: university.cutoff70,
        difference: null,
        band: null,
        exclusionReason: '내신 단독 자동판정 불가 · 환산점수/비등급 자료',
      })
      continue
    }

    if (university.admissionCategory !== '학생부교과') {
      excluded.push({
        university,
        studentComparableGrade: input.studentGrade,
        cutoffUsed: university.cutoff70,
        difference:
          university.cutoff70 === null
            ? null
            : calcCutoffDifference(input.studentGrade, university.cutoff70),
        band: null,
        excludedFromAutoBand: true,
        exclusionReason: '내신 단독 자동판정 불가 · 학생부종합/기타',
      })
      continue
    }

    if (!includeSpecial && isSpecialAdmissionType(university.admissionType)) {
      excluded.push({
        university,
        studentComparableGrade: input.studentGrade,
        cutoffUsed: university.cutoff70,
        difference:
          university.cutoff70 === null
            ? null
            : calcCutoffDifference(input.studentGrade, university.cutoff70),
        band: null,
        excludedFromAutoBand: true,
        exclusionReason: '특별전형 · 기본 추천에서 제외',
      })
      continue
    }

    if (university.cutoff70 === null) {
      unavailableCutoff.push({
        university,
        studentComparableGrade: input.studentGrade,
        cutoffUsed: null,
        difference: null,
        band: null,
      })
      continue
    }

    const difference = calcCutoffDifference(
      input.studentGrade,
      university.cutoff70,
    )
    const distance = Math.abs(difference)
    const card: UniversityMatchCard = {
      university,
      studentComparableGrade: input.studentGrade,
      cutoffUsed: university.cutoff70,
      difference,
      band: null,
    }

    if (distance > window.maxDistance) {
      outOfWindow.push({
        ...card,
        exclusionReason: `추천범위 밖 (|차이| ${distance.toFixed(2)} > ${window.maxDistance})`,
      })
      continue
    }

    const band = classifySupportBand(difference, thresholds)
    card.band = band
    if (band === 'ambitious') ambitiousRaw.push(card)
    else if (band === 'safe') safeRaw.push(card)
    else targetRaw.push(card)
  }

  // 중복 모집단위 제거 → 대학당 모집단위 제한 → 밴드별 개수 제한
  const allInWindow = dedupeClosestDepartment([
    ...ambitiousRaw,
    ...targetRaw,
    ...safeRaw,
  ])
  const { limited, overflowByUniversity } = limitDepartmentsPerUniversity(
    allInWindow,
    window.maxDepartmentsPerUniversity,
  )

  const ambitious = takeBandTop(
    limited.filter((c) => c.band === 'ambitious'),
    window.maxPerBand.ambitious,
  )
  const target = takeBandTop(
    limited.filter((c) => c.band === 'target'),
    window.maxPerBand.target,
  )
  const safe = takeBandTop(
    limited.filter((c) => c.band === 'safe'),
    window.maxPerBand.safe,
  )

  // 표시용: 상향은 컷이 더 좋은(낮은) 순도 유용 — 기본은 가까운 순 유지
  void sortByCutoffAsc

  return {
    ambitious,
    target,
    safe,
    outOfWindow: outOfWindow.sort(sortByClosest),
    overflowByUniversity,
    excluded,
    unavailableCutoff,
    nonGradeReference,
    ready: true,
    message: '',
    usedGradeSystem: preferGradeSystem,
    appliedMaxDistance: window.maxDistance,
  }
}

function emptyResult(
  message: string,
  usedGradeSystem: UniversityGradeSystem,
  appliedMaxDistance: number,
): UniversityAnalysisResult {
  return {
    ambitious: [],
    target: [],
    safe: [],
    outOfWindow: [],
    overflowByUniversity: {},
    excluded: [],
    unavailableCutoff: [],
    nonGradeReference: [],
    ready: false,
    message,
    usedGradeSystem,
    appliedMaxDistance,
  }
}

export function analyzeUniversityAdmissionFit(input: {
  studentGrade9Average: number | null
  universities: UniversityAdmissionRecord[]
}): UniversityAnalysisResult {
  return analyzeUniversityAdmissions({
    studentGrade: input.studentGrade9Average,
    universityRecords: input.universities,
    preferGradeSystem: '9-grade',
  })
}

export function supportBandLabel(band: AdmissionSupportBand): string {
  switch (band) {
    case 'ambitious':
      return '상향'
    case 'target':
      return '적정'
    case 'safe':
      return '안정'
  }
}

export function formatAdmissionYearLabel(
  year: number,
  dataType: UniversityAdmissionRecord['dataType'] = 'actual_admission_result',
): string {
  if (dataType === 'admission_plan') {
    return `${year}학년도 대학입학전형 시행계획`
  }
  return `${year}학년도 최종등록자 입시결과`
}

/** REPORT/표용 자동 선택 ID — 기본 화면에 오른 항목을 모두 포함 */
export function pickAutoSelectIds(
  analysis: UniversityAnalysisResult,
  counts = admissionRecommendationWindow.maxPerBand,
): string[] {
  const ids: string[] = []
  for (const card of analysis.ambitious.slice(0, counts.ambitious)) {
    ids.push(card.university.id)
  }
  for (const card of analysis.target.slice(0, counts.target)) {
    ids.push(card.university.id)
  }
  for (const card of analysis.safe.slice(0, counts.safe)) {
    ids.push(card.university.id)
  }
  return ids
}
