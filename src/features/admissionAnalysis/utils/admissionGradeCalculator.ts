/**
 * 석차백분율 · 5등급제 예상 · 9등급제 환산 계산
 * (상담용 참고값 — 생기부/대학 공식 산출과 다를 수 있음)
 */

export function calcPercentile(rank: number, totalStudents: number): number {
  if (!Number.isFinite(rank) || !Number.isFinite(totalStudents)) {
    throw new Error('석차와 수강자수는 숫자여야 합니다.')
  }
  if (rank < 1 || totalStudents < 1) {
    throw new Error('석차와 수강자수는 1 이상이어야 합니다.')
  }
  if (rank > totalStudents) {
    throw new Error('석차는 전체 학생 수보다 클 수 없습니다.')
  }
  return (rank / totalStudents) * 100
}

/** 표시용: 소수 둘째 자리 */
export function formatPercentile(percentile: number): string {
  return (Math.round(percentile * 100) / 100).toFixed(2)
}

/**
 * 5등급제 예상 등급 (석차백분율 누적 기준)
 * 1: ≤10%, 2: ≤34%, 3: ≤66%, 4: ≤90%, 5: 나머지
 */
export function calcGrade5FromPercentile(percentile: number): 1 | 2 | 3 | 4 | 5 {
  if (percentile <= 10) return 1
  if (percentile <= 34) return 2
  if (percentile <= 66) return 3
  if (percentile <= 90) return 4
  return 5
}

/**
 * 9등급제 환산 참고값 — 반드시 석차백분율 기준으로 재배정
 * (5등급 숫자를 단순 매핑하지 않음)
 */
export function calcGrade9FromPercentile(
  percentile: number,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  if (percentile <= 4) return 1
  if (percentile <= 11) return 2
  if (percentile <= 23) return 3
  if (percentile <= 40) return 4
  if (percentile <= 60) return 5
  if (percentile <= 77) return 6
  if (percentile <= 89) return 7
  if (percentile <= 96) return 8
  return 9
}

export function calcSubjectAdmission(
  rank: number,
  totalStudents: number,
): {
  percentile: number
  grade5: 1 | 2 | 3 | 4 | 5
  grade9: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
} {
  const percentile = calcPercentile(rank, totalStudents)
  return {
    percentile,
    grade5: calcGrade5FromPercentile(percentile),
    grade9: calcGrade9FromPercentile(percentile),
  }
}

/** 단순 산술 평균 (Phase 1). 향후 이수단위 가중평균으로 확장 */
export function averageGrade(grades: number[]): number | null {
  if (grades.length === 0) return null
  const sum = grades.reduce((a, b) => a + b, 0)
  return Math.round((sum / grades.length) * 100) / 100
}

export function formatGradeAverage(avg: number | null): string {
  if (avg === null) return '-'
  return avg.toFixed(2)
}

export type RankInputValidation =
  | { ok: true }
  | { ok: false; message: string }

export function validateRankInput(
  rank: number | null,
  totalStudents: number | null,
): RankInputValidation {
  if (rank === null || totalStudents === null) {
    return { ok: false, message: '석차와 수강자수를 모두 입력해 주세요.' }
  }
  if (!Number.isInteger(rank) || !Number.isInteger(totalStudents)) {
    return { ok: false, message: '석차와 수강자수는 정수로 입력해 주세요.' }
  }
  if (rank < 1 || totalStudents < 1) {
    return { ok: false, message: '석차와 수강자수는 1 이상이어야 합니다.' }
  }
  if (rank > totalStudents) {
    return { ok: false, message: '석차는 전체 학생 수보다 클 수 없습니다.' }
  }
  return { ok: true }
}
