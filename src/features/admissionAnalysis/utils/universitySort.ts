import type { UniversityMatchCard } from '../types'

export type UniversitySortMode =
  | 'closest'
  | 'cutoff70-asc'
  | 'cutoff70-desc'
  | 'university-name'

export const UNIVERSITY_SORT_OPTIONS: Array<{
  value: UniversitySortMode
  label: string
}> = [
  { value: 'closest', label: '학생 성적과 가까운 순' },
  { value: 'cutoff70-asc', label: '70%컷 낮은 순(성적 우수)' },
  { value: 'cutoff70-desc', label: '70%컷 높은 순' },
  { value: 'university-name', label: '대학명순' },
]

export function sortUniversityMatchCards(
  cards: UniversityMatchCard[],
  mode: UniversitySortMode,
): UniversityMatchCard[] {
  const copy = [...cards]
  switch (mode) {
    case 'closest':
      return copy.sort((a, b) => {
        const da =
          a.difference === null ? Number.POSITIVE_INFINITY : Math.abs(a.difference)
        const db =
          b.difference === null ? Number.POSITIVE_INFINITY : Math.abs(b.difference)
        return da - db
      })
    case 'cutoff70-asc':
      return copy.sort(
        (a, b) => (a.cutoffUsed ?? 99) - (b.cutoffUsed ?? 99),
      )
    case 'cutoff70-desc':
      return copy.sort(
        (a, b) => (b.cutoffUsed ?? -1) - (a.cutoffUsed ?? -1),
      )
    case 'university-name':
      return copy.sort((a, b) => {
        const n = a.university.universityName.localeCompare(
          b.university.universityName,
          'ko',
        )
        if (n !== 0) return n
        return a.university.departmentName.localeCompare(
          b.university.departmentName,
          'ko',
        )
      })
    default:
      return copy
  }
}
