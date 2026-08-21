import type { TextbookSubject } from '../types/records'
import {
  classNamesForClassCommonLookup,
  getMathSharedGroupKey,
} from './mathSharedGroup'

export type CommonDataKeyParams = {
  grade: string
  className: string
  subject: TextbookSubject
  reportDate?: string
}

/** 공통 저장·조회에 사용할 class_name 목록 (A/B 수학 연동 포함) */
export function getCommonStorageClassNames(
  grade: string,
  className: string,
  subject: TextbookSubject,
): string[] {
  const names = classNamesForClassCommonLookup(grade, className, subject)
  return names.length > 0 ? names : [className.trim()]
}

/** 디버그·로그용 논리 키 (DB unique key 아님) */
export function getCommonDataKey(params: CommonDataKeyParams): string {
  const { grade, className, subject, reportDate } = params
  const mathKey = getMathSharedGroupKey(grade, className)
  if (subject === '수학' && mathKey) {
    return reportDate ? `${mathKey}:${subject}:${reportDate}` : `${mathKey}:${subject}`
  }
  const trimmed = className.trim()
  return reportDate
    ? `${grade}:${trimmed}:${subject}:${reportDate}`
    : `${grade}:${trimmed}:${subject}`
}

/** Today Report classContext용 grade/className (classSync 우선) */
export function resolveCommonClassContext(params: {
  grade?: string
  className?: string
  studentGrade: string
  studentClassName: string
}): { grade: string; className: string } {
  return {
    grade: (params.grade ?? params.studentGrade).trim(),
    className: (params.className ?? params.studentClassName).trim(),
  }
}
