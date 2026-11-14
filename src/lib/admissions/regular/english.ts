import type { EnglishCalculationType, RegularAdmissionMasterRow } from './types'

/**
 * 대학 공식 영어 환산표가 있을 때만 환산한다.
 * 공식 정보가 없으면 임의 백분위/점수를 만들지 않고 null을 반환한다.
 */
export function convertEnglishGrade(
  row: RegularAdmissionMasterRow,
  grade: number | null,
): number | null {
  if (grade == null || !Number.isFinite(grade)) return null
  const g = Math.trunc(grade) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  if (g < 1 || g > 9) return null

  const type: EnglishCalculationType = row.englishCalculationType
  if (type === 'NONE') return null

  const table = row.englishConversionTable
  if (table == null || table.scores == null) return null

  const converted = table.scores[g]
  if (converted == null || !Number.isFinite(converted)) return null
  return converted
}

export function canConvertEnglish(row: RegularAdmissionMasterRow): boolean {
  if (row.englishCalculationType === 'NONE') return false
  return row.englishConversionTable != null
}
