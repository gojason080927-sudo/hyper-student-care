export const EXCLUDED_UNIVERSITIES = [
  '서경대학교',
  '서경대',
  '협성대학교',
  '협성대',
  '대진대학교',
  '대진대',
  '강남대학교',
  '강남대',
  '성결대학교',
  '성결대',
  '용인대학교',
  '용인대',
  '한신대학교',
  '한신대',
] as const

const THEOLOGY_KEYWORDS = [
  '신학',
  '신학과',
  '목회',
  '성서',
  '기독교',
  '신학대',
]
const ARTS_KEYWORDS = [
  '음악',
  '미술',
  '체육',
  '무용',
  '연극',
  '영화',
  '디자인',
  '예체능',
  '스포츠',
  '조형',
  '회화',
  '성악',
]
const PRACTICAL_KEYWORDS = ['실기', '실기계열']
const JUNIOR_KEYWORDS = ['전문대', '전문대학']

function normalizeUniversityName(name: string): string {
  return name.replace(/\s+/g, '').replace(/대학교$/, '대')
}

export function isExcludedUniversity(university: string): boolean {
  const n = normalizeUniversityName(university)
  return EXCLUDED_UNIVERSITIES.some((u) => normalizeUniversityName(u) === n)
}

export function recommendationUniqueKey(input: {
  university: string
  department: string
  admissionType: string
  admissionGroup: string
}): string {
  return [
    input.university.trim(),
    input.department.trim(),
    input.admissionType.trim(),
    input.admissionGroup.trim(),
  ].join('|')
}

export function isExcludedFromProductionRecommendation(input: {
  university: string
  department: string
  excludeCategory: 'none' | 'junior_college' | 'theology' | 'arts' | 'practical'
  fieldTrack?: string
}): boolean {
  if (isExcludedUniversity(input.university)) return true
  if (input.excludeCategory !== 'none') return true
  const blob = `${input.university} ${input.department} ${input.fieldTrack ?? ''}`
  if (JUNIOR_KEYWORDS.some((k) => blob.includes(k))) return true
  if (THEOLOGY_KEYWORDS.some((k) => blob.includes(k))) return true
  if (ARTS_KEYWORDS.some((k) => blob.includes(k))) return true
  if (PRACTICAL_KEYWORDS.some((k) => blob.includes(k))) return true
  if (
    input.fieldTrack === '예체능' ||
    input.fieldTrack === '신학' ||
    input.fieldTrack === '실기'
  ) {
    return true
  }
  return false
}

/** 서울 → 인천/경기 → 지방 국립대 및 교대 → 기타 */
export function regionSortRank(region: string, university: string, _campus: string): number {
  if (region === '서울') return 0
  if (region === '경기/인천') return 1
  if (region === '지방국립대' || /교육대|교원대/.test(university)) return 2
  return 3
}
