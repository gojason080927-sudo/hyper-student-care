/**
 * 내신 기준 지원 검토 — 추천 범위·개수 제한 (중앙 설정).
 *
 * 공식 입결 분포(174건, min≈1.13 max≈7.77) 기준,
 * 학생 1.60 주변 |student−cutoff70| ≤ 0.55 에 약 15건이 모여
 * 기본 표시 상한(상향5+적정7+안정5)과 맞추기 위한 초기값.
 * experimental — 원장/상담 결과에 따라 조정.
 */
export const admissionRecommendationWindow = {
  experimental: true as const,
  /**
   * |studentGrade - cutoff70| 가 이 값을 초과하면
   * 상향/적정/안정 어느 그룹에도 넣지 않고 기본 화면에서 숨김.
   */
  maxDistance: 0.55,
  /** 기본 표시 개수 상한 */
  maxPerBand: {
    ambitious: 5,
    target: 7,
    safe: 5,
  },
  /** 기본 화면에서 대학당 모집단위 수 */
  maxDepartmentsPerUniversity: 2,
  /** REPORT 자동 선택 기본값 */
  autoSelectPerBand: {
    ambitious: 3,
    target: 5,
    safe: 3,
  },
} as const

/**
 * 밴드 판정 (추천 범위 안에서의 상대 위치).
 * difference = studentGrade - cutoff70
 *   양수 → 학생 열위 → 상향
 *   음수 → 학생 우위 → 안정
 */
export const admissionThresholds = {
  experimental: true as const,
  /** difference > ambitious → 상향 */
  ambitious: 0.12,
  target: {
    minExclusive: -0.12,
    maxInclusive: 0.12,
  },
  /** difference <= safe → 안정 */
  safe: -0.12,
} as const

export type AdmissionThresholds = typeof admissionThresholds

export const ADMISSION_THRESHOLDS_NOTE =
  '학생 성적과 공식 70%컷이 가까운 모집단위만 표시 · 경험적 추천범위(experimental)'

/** 기본 추천에서 제외하는 특별전형 키워드 */
export const SPECIAL_ADMISSION_TYPE_KEYWORDS = [
  '특수교육',
  '농어촌',
  '기초생활',
  '차상위',
  '특성화고',
  '국가보훈',
  '보훈',
  '지역인재',
  '지역학생',
  '기회균형',
  '취업자',
  '평생학습',
  '성인학습',
  '만학도',
  '재직자',
] as const

/**
 * 교과 70%컷 직접 비교가 어려운 주요 대학 — 임의 컷 부여 금지.
 * 화면 상단 「별도 검토 대학」으로만 안내.
 */
export const MANUAL_REVIEW_UNIVERSITIES = [
  {
    universityName: '서울대학교',
    note: '학생부종합 중심 · 내신 단독 자동판정 불가',
  },
  {
    universityName: '연세대학교',
    note: '전형별 구조 확인 필요 · 내신 단독 자동판정 불가(공식 교과 70%컷 미연계)',
  },
  {
    universityName: '고려대학교',
    note: '전형별 구조 확인 필요 · 내신 단독 자동판정 불가(공식 교과 70%컷 미연계)',
  },
] as const
