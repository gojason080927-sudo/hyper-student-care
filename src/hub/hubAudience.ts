import type { HubAudienceType, HubMaterial } from './types'

export type HubAudienceRecord = {
  audienceType: HubAudienceType
  targetGrade: string | null
  targetClassName: string | null
  targetStudentId: string | null
}

export type HubStudentIdentity = {
  id: string
  grade: string
  className: string
}

export type HubAudienceSelection = {
  audienceType: HubAudienceType
  targetGrade: string
  targetClassName: string
  targetStudentId: string
}

/** 강사 UI가 비어 있는 학년/반/학생을 저장하면 SQL 비교가 실패해 학생 목록에서 사라진다. */
export function hubAudienceSelectionError(audience: HubAudienceSelection): string | null {
  const type = audience.audienceType || 'all'
  if (type === 'all') return null
  if (type === 'grade') {
    return audience.targetGrade.trim() ? null : '학년을 선택해 주세요.'
  }
  if (type === 'class') {
    if (!audience.targetGrade.trim()) return '학년을 선택해 주세요.'
    if (!audience.targetClassName.trim()) return '반을 선택해 주세요.'
    return null
  }
  if (type === 'student') {
    return audience.targetStudentId.trim() ? null : '학생을 선택해 주세요.'
  }
  return null
}

export function isHubAudienceVisible(
  record: HubAudienceRecord,
  student: HubStudentIdentity,
): boolean {
  const audience = record.audienceType || 'all'
  if (audience === 'all') return true
  if (audience === 'grade') return Boolean(record.targetGrade) && record.targetGrade === student.grade
  if (audience === 'student') {
    return Boolean(record.targetStudentId) && record.targetStudentId === student.id
  }
  if (audience === 'class') {
    const targetClass = (record.targetClassName ?? '').trim()
    const studentClass = student.className.trim()
    return Boolean(record.targetGrade) && record.targetGrade === student.grade && targetClass === studentClass
  }
  return false
}

export function canStudentSignHubMaterialPath(params: {
  material: Pick<HubMaterial, 'status' | 'sourceFilePath' | 'pages'> & HubAudienceRecord
  student: HubStudentIdentity
  path: string
}): boolean {
  if (params.material.status !== 'PUBLISHED') return false
  const path = params.path.trim()
  if (!path) return false
  const isSource = params.material.sourceFilePath === path
  const isPage = params.material.pages.some((page) => page.assetPath === path)
  if (!isSource && !isPage) return false
  return isHubAudienceVisible(params.material, params.student)
}
