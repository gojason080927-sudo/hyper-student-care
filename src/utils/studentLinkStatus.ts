import type { Student } from '../types/student'
import { hasStudentAccessKey } from './studentStorage'

export type StudentLinkStatus = 'active' | 'inactive' | 'none'

export function getStudentLinkStatus(student: Student): StudentLinkStatus {
  if (!hasStudentAccessKey(student.studentAccessKey)) return 'none'
  if (student.accessKeyActive === false) return 'inactive'
  return 'active'
}

export function getStudentLinkStatusLabel(student: Student): { text: string; className: string } {
  const status = getStudentLinkStatus(student)
  if (status === 'none') {
    return { text: '링크 없음', className: 'text-slate-500' }
  }
  if (status === 'inactive') {
    return { text: '비활성', className: 'text-rose-700' }
  }
  return { text: '활성', className: 'text-emerald-700' }
}
