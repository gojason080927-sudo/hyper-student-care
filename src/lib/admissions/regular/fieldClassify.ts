import type { RegularAdmissionMasterRow } from './types'

export type RecommendationFieldGroup =
  | 'medical'
  | 'engineering'
  | 'computer'
  | 'natural'
  | 'humanities'
  | 'social'
  | 'business'
  | 'education'
  | 'nursing'
  | 'other'

const MEDICAL_SPECIAL_PATTERN =
  /의예|의학과|의학부|의대|치의예|치의학|한의예|한의학|약학|약학과|약학부|약학대학|수의예|수의학|수의과/

export function isMedicalSpecialGroup(row: {
  department: string
  fieldTrack?: string
}): boolean {
  const blob = `${row.department} ${row.fieldTrack ?? ''}`
  if (MEDICAL_SPECIAL_PATTERN.test(blob)) return true
  if (row.fieldTrack === '의약학' && /의예|의학|치의|한의|약학|수의/.test(row.department)) {
    return true
  }
  return false
}

export function classifyRecommendationField(
  row: Pick<RegularAdmissionMasterRow, 'department' | 'fieldTrack' | 'university'>,
): RecommendationFieldGroup {
  const dept = row.department
  if (isMedicalSpecialGroup(row)) return 'medical'
  if (/간호/.test(dept)) return 'nursing'
  if (/컴퓨터|소프트웨어|인공지능|정보통신|데이터|사이버|정보보호/.test(dept)) {
    return 'computer'
  }
  if (
    /공학|기계|전자|전기|산업|화학공|건축공|항공|에너지|신소재|재료공|화공/.test(dept) ||
    row.fieldTrack === '공학'
  ) {
    return 'engineering'
  }
  if (/교육대|교원대|교육과|교육학|초등교육|유아교육/.test(`${row.university} ${dept}`)) {
    return 'education'
  }
  if (/경영|경제|무역|회계|금융/.test(dept)) return 'business'
  if (/행정|정치|언론|심리|사회|복지|언론|미디어/.test(dept)) return 'social'
  if (/국어|영문|사학|철학|중문|일문|문헌|사학|인문/.test(dept) || row.fieldTrack === '인문') {
    return 'humanities'
  }
  if (
    /수학|물리|화학|생명|통계|지구|자연/.test(dept) ||
    row.fieldTrack === '자연'
  ) {
    return 'natural'
  }
  if (row.fieldTrack === '교육') return 'education'
  if (row.fieldTrack === '의약학') return 'nursing'
  return 'other'
}
