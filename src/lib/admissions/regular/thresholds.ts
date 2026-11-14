/**
 * 정시 판정 기준 — 컴포넌트에 숫자를 하드코딩하지 않는다.
 * gap = 학생 계산값 − 공식 70%컷
 *   < 0  학생이 컷보다 낮음
 *   ≈ 0  학생과 컷이 비슷
 *   > 0  학생이 컷보다 높음
 *
 * 기본 구간은 좁게 두고, 후보가 20개 미만일 때만 단계 확장한다.
 */
export const REGULAR_ADMISSION_THRESHOLDS = {
  maxPerBand: 30,
  minPerBand: 20,
  sameUniversityLimit: 3,
  sameUniversityLimitRelaxed: 4,
  medicalSpecialLimit: 5,
  minDistinctFields: 4,
  continuityMaxCutGap: 3,

  /** 상향 */
  reach: {
    primary: { min: -2, maxExclusive: -0.5 },
    expand: { min: -3, maxExclusive: -0.5 },
    max: { min: -4, maxExclusive: -0.3 },
  },
  /** 소신 */
  ambitious: {
    primary: { min: -0.5, max: 0.5 },
    expand: { min: -0.8, max: 0.8 },
    max: { min: -1.2, max: 1.2 },
  },
  /** 적정 */
  target: {
    primary: { minExclusive: 0.5, max: 2.5 },
    expand: { minExclusive: 0.5, max: 3.5 },
    max: { min: 0.3, max: 4 },
  },

  recommendConfidence: ['A', 'B', 'C'] as const,
  defaultExcludeConfidence: ['D'] as const,

  /** classifier / 기존 호출부 호환 — 기본(1차) 구간과 동일 */
  averagePercentile: {
    reachMin: -2,
    reachMax: -0.5,
    ambitiousMin: -0.5,
    ambitiousMax: 0.5,
    targetMin: 0.5,
    targetMax: 2.5,
  },
  subjectPercentile: {
    reachMin: -2,
    reachMax: -0.5,
    ambitiousMin: -0.5,
    ambitiousMax: 0.5,
    targetMin: 0.5,
    targetMax: 2.5,
  },
  universityConverted: {
    reachMin: -2,
    reachMax: -0.5,
    ambitiousMin: -0.5,
    ambitiousMax: 0.5,
    targetMin: 0.5,
    targetMax: 2.5,
  },
  bestDomain: {
    reachMin: -2,
    reachMax: -0.5,
    ambitiousMin: -0.5,
    ambitiousMax: 0.5,
    targetMin: 0.5,
    targetMax: 2.5,
  },
} as const

export type RegularAdmissionThresholds = typeof REGULAR_ADMISSION_THRESHOLDS
