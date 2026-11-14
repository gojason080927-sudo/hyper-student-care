import type { V124RegionGroup } from '../types/v124Recommendation'

/**
 * 지역 그룹은 MASTER 캠퍼스 표기를 우선한다.
 * 대학 서열표가 아니라 서울 → 인천/경기 → 지방 국립대 우선순위용 분류다.
 */
const NATIONAL_UNIVERSITY_NAME =
  /국립|(경북|부산|전남|전북|충남|충북|강원|제주)대학교$/u

export function classifyV124RegionGroup(
  campus: string,
  universityName: string,
): V124RegionGroup {
  const c = campus.trim()
  const u = universityName.trim()
  if (/서울/.test(c)) return 'seoul'
  if (/인천|경기|수원|성남|화성|양평/.test(c)) return 'incheon-gyeonggi'
  if (NATIONAL_UNIVERSITY_NAME.test(u)) return 'regional-national'
  return 'other'
}

export function v124RegionRank(group: V124RegionGroup): number {
  switch (group) {
    case 'seoul':
      return 0
    case 'incheon-gyeonggi':
      return 1
    case 'regional-national':
      return 2
    default:
      return 3
  }
}

export function v124RegionLabel(group: V124RegionGroup): string {
  switch (group) {
    case 'seoul':
      return '서울'
    case 'incheon-gyeonggi':
      return '인천·경기'
    case 'regional-national':
      return '지방 국립대'
    default:
      return '기타'
  }
}
