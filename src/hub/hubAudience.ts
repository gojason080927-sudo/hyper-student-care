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
