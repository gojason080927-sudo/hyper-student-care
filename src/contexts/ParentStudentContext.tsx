import { createContext, useContext, type ReactNode } from 'react'
import type { Student } from '../types/student'

/**
 * TODO: 외부 정식 배포 전 서버 데이터베이스와 접근 권한 검증을 적용할 것.
 * TODO: 외부 정식 배포 전 Supabase Auth 및 RLS 기반 접근 권한 검증을 적용할 것.
 * anon key만으로는 완전한 개인정보 보호가 불가능하다.
 */
const ParentStudentContext = createContext<Student | null>(null)

type ParentStudentProviderProps = {
  student: Student
  children: ReactNode
}

export function ParentStudentProvider({ student, children }: ParentStudentProviderProps) {
  return (
    <ParentStudentContext.Provider value={student}>{children}</ParentStudentContext.Provider>
  )
}

export function useParentStudent(): Student {
  const student = useContext(ParentStudentContext)
  if (!student) {
    throw new Error('useParentStudent must be used within ParentStudentProvider')
  }
  return student
}

export function useParentStudentOptional(): Student | null {
  return useContext(ParentStudentContext)
}
