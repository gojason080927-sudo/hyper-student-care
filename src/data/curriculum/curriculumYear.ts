type HighSchoolGradeYear = '고1' | '고2' | '고3'

/**
 * 2025학년도 입학생부터 고등학교 2022 개정 교육과정 적용.
 * 학년도: 3월 ~ 다음 해 2월.
 */
export const CURRICULUM_2022_FIRST_ENTRANCE_YEAR = 2025

export function getCurrentSchoolYear(now: Date = new Date()): number {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 3 ? year : year - 1
}

export function inferHighSchoolEntranceYear(
  gradeYear: HighSchoolGradeYear | '',
  now: Date = new Date(),
): number | null {
  const schoolYear = getCurrentSchoolYear(now)
  if (gradeYear === '고1') return schoolYear
  if (gradeYear === '고2') return schoolYear - 1
  if (gradeYear === '고3') return schoolYear - 2
  return null
}

/**
 * 학년을 아직 고르지 않은 신규 입력은 2022 개정 과목 목록을 쓴다.
 * 기존 재학생(2024학년도 이전 입학)은 2015 과목명을 유지할 수 있다.
 */
export function uses2022RevisedCurriculum(
  gradeYear: HighSchoolGradeYear | '',
  now: Date = new Date(),
): boolean {
  const entranceYear = inferHighSchoolEntranceYear(gradeYear, now)
  if (entranceYear == null) return true
  return entranceYear >= CURRICULUM_2022_FIRST_ENTRANCE_YEAR
}
