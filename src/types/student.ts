export type Grade =
  | '초5'
  | '초6'
  | '중1'
  | '중2'
  | '중3'
  | '고1'
  | '고2'
  | '고3'

/** DB에 남아 있을 수 있는 이전 학년 값 (입력 옵션에서는 제외) */
export type LegacyGrade = '초1' | '초2' | '초3' | '초4'

export type StoredGrade = Grade | LegacyGrade

export type SubjectOption = '영어' | '수학' | '영어·수학'

export type StudentStatus = '재원' | '휴원' | '퇴원'

export type Student = {
  id: string
  name: string
  studentAccessKey: string
  /** false이면 /care 링크 접근 차단 (기본 true) */
  accessKeyActive: boolean
  school: string
  grade: StoredGrade
  studentPhone: string
  parentPhone: string
  className: string
  subjects: string[]
  teacher: string
  enrollmentDate: string
  status: StudentStatus
  memo: string
  /** 수학 정규 수업요일. null이면 미설정. 기존 학생 기본값. */
  mathClassDays?: string[] | null
  /** 영어 정규 수업요일. null이면 미설정. 기존 학생 기본값. */
  englishClassDays?: string[] | null
  createdAt: string
  updatedAt: string
}

export type StudentFormData = {
  name: string
  school: string
  grade: StoredGrade
  studentPhone: string
  parentPhone: string
  subject: SubjectOption
  className: string
  teacher: string
  enrollmentDate: string
  status: StudentStatus
  memo: string
  mathClassDays?: string[] | null
  englishClassDays?: string[] | null
}

export type StudentListFilters = {
  search: string
  school: string
  grade: string
  className: string
  status: string
  subject: string
}
