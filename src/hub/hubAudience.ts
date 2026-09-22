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

export const HUB_AUDIENCE_TYPE_LABELS: Record<HubAudienceType, string> = {
  all: '전체 학생',
  grade: '학년 전체',
  class: '특정 반',
  student: '개별 학생',
}

/** 선택한 유형에 쓰이지 않는 target_* 를 비워 SQL/미리보기와 저장값을 맞춘다. */
export function hubAudienceFieldsForSave(audience: HubAudienceSelection): HubAudienceRecord {
  const type = audience.audienceType || 'all'
  if (type === 'all') {
    return { audienceType: 'all', targetGrade: null, targetClassName: null, targetStudentId: null }
  }
  if (type === 'grade') {
    return {
      audienceType: 'grade',
      targetGrade: audience.targetGrade.trim() || null,
      targetClassName: null,
      targetStudentId: null,
    }
  }
  if (type === 'class') {
    return {
      audienceType: 'class',
      targetGrade: audience.targetGrade.trim() || null,
      targetClassName: audience.targetClassName.trim() || null,
      targetStudentId: null,
    }
  }
  return {
    audienceType: 'student',
    targetGrade: null,
    targetClassName: null,
    targetStudentId: audience.targetStudentId.trim() || null,
  }
}

export function hubAudienceSummary(
  record: Pick<HubAudienceRecord, 'audienceType' | 'targetGrade' | 'targetClassName'>,
  studentName?: string | null,
): string {
  if (record.audienceType === 'all') return HUB_AUDIENCE_TYPE_LABELS.all
  if (record.audienceType === 'grade') {
    return record.targetGrade
      ? `${HUB_AUDIENCE_TYPE_LABELS.grade} · ${record.targetGrade}`
      : HUB_AUDIENCE_TYPE_LABELS.grade
  }
  if (record.audienceType === 'class') {
    const parts = [record.targetGrade, record.targetClassName].filter(Boolean)
    return parts.length > 0
      ? `${HUB_AUDIENCE_TYPE_LABELS.class} · ${parts.join(' ')}`
      : HUB_AUDIENCE_TYPE_LABELS.class
  }
  return studentName?.trim() || HUB_AUDIENCE_TYPE_LABELS.student
}

export function nextHubAudienceOnTypeChange(
  current: HubAudienceSelection,
  nextType: HubAudienceType,
): HubAudienceSelection {
  if (nextType === 'all') {
    return { audienceType: 'all', targetGrade: '', targetClassName: '', targetStudentId: '' }
  }
  if (nextType === 'grade') {
    return {
      audienceType: 'grade',
      targetGrade: current.targetGrade,
      targetClassName: '',
      targetStudentId: '',
    }
  }
  if (nextType === 'class') {
    return {
      audienceType: 'class',
      targetGrade: current.targetGrade,
      targetClassName: current.targetClassName,
      targetStudentId: '',
    }
  }
  return {
    audienceType: 'student',
    targetGrade: '',
    targetClassName: '',
    targetStudentId: current.targetStudentId,
  }
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
