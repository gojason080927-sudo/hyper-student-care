/** 대입 내신 분석 — 타입 (Phase 1–3) */

export type HighSchoolGradeYear = '고1' | '고2' | '고3'

export type AdmissionSubjectSlot =
  | 'korean'
  | 'english'
  | 'math'
  | 'inquiry1'
  | 'inquiry2'
  | 'extra'

export type AdmissionSubjectInput = {
  id: string
  name: string
  slot?: AdmissionSubjectSlot
  isPreset?: boolean
  rank: number | null
  totalStudents: number | null
  creditUnits?: number | null
  weight?: number | null
}

export type AdmissionStudentProfile = {
  linkedStudentId?: string | null
  name: string
  school: string
  gradeYear: HighSchoolGradeYear | ''
}

export type SubjectAdmissionResult = {
  subjectId: string
  subjectName: string
  rank: number
  totalStudents: number
  percentile: number
  grade5: 1 | 2 | 3 | 4 | 5
  grade9: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  creditUnits?: number | null
  weight?: number | null
}

export type AdmissionSubjectValidationError = {
  subjectId: string
  field?: 'rank' | 'totalStudents' | 'name'
  message: string
}

export type UniversityGradeSystem = '9-grade' | '5-grade'
export type AdmissionCategory = '학생부교과' | '학생부종합' | '기타'
export type UniversityRegion = '서울' | '경기/인천' | '지방' | string
export type UniversityFieldTrack =
  | '인문'
  | '자연'
  | '공학'
  | '상경'
  | '교육'
  | '보건'
  | '기타'

/** 실제 입시결과 vs 전형계획(아직 입결 아님) */
export type AdmissionDataType = 'actual_admission_result' | 'admission_plan'

/** 컷 값의 단위 — 자동 판정은 grade만 사용 */
export type AdmissionScoreType = 'grade' | 'converted_score' | 'percentage'

/**
 * 대학 입결 레코드 — 대학 × 전형 × 모집단위 × 학년도.
 * 컴포넌트에 hard-coding하지 않음.
 */
export type UniversityAdmissionRecord = {
  id: string
  universityName: string
  departmentName: string
  /** 모집연도(학년도) — 화면에서는 "YYYY학년도 입시결과"로 표시 */
  admissionYear: number
  admissionType: string
  admissionCategory: AdmissionCategory
  gradeSystem: UniversityGradeSystem
  dataType?: AdmissionDataType
  scoreType?: AdmissionScoreType
  cutoff50?: number | null
  /** null = 70%컷 미공개 (추정·대체 금지) */
  cutoff70: number | null
  reflectedSubjects?: string[]
  calculationNote?: string
  region?: UniversityRegion
  fieldTrack?: UniversityFieldTrack
  csatMinimum?: string
  sourceName: string
  sourceUrl?: string
  sourceYear: number
  /** 출처 확인된 공식 자료만 true. Production 분석은 true만 사용 */
  officialData: boolean
  note?: string
}

/** @deprecated Phase 1 호환 */
export type UniversityAdmissionData = UniversityAdmissionRecord

export type AdmissionSupportBand = 'ambitious' | 'target' | 'safe'

/** 대학50 상담표 판정 (스프레드시트 라벨) */
export type CounselingJudgmentStatus =
  | 'reach'
  | 'ambitious'
  | 'target'
  | 'safe'

export type UniversityCounselingRow = {
  rank: number
  universityName: string
  region: string
  cutoff9: number
  convertedCutoff5: number
  safeMax: number
  targetMin: number
  targetMax: number
  ambitiousMax: number
  evidenceType: string
  counselingNote: string
  sourceUrl?: string
}

export type UniversityCounselingMatch = {
  row: UniversityCounselingRow
  studentGrade5: number
  status: CounselingJudgmentStatus
}

export type UniversityMatchCard = {
  university: UniversityAdmissionRecord
  studentComparableGrade: number
  cutoffUsed: number | null
  difference: number | null
  band: AdmissionSupportBand | null
  excludedFromAutoBand?: boolean
  exclusionReason?: string
}

/** 2024학년도 이전 입학생(2015 개정) 내신 입력용 영역명. 저장된 과목명을 바꾸지 않는다. */
export const DEFAULT_ADMISSION_SUBJECTS: ReadonlyArray<{ name: string }> = [
  { name: '국어' },
  { name: '수학' },
  { name: '영어' },
  { name: '사회' },
  { name: '과학' },
] as const

/** unique key: 대학 + 학과 + 전형 + 학년도 */
export function universityRecordUniqueKey(
  r: Pick<
    UniversityAdmissionRecord,
    'universityName' | 'departmentName' | 'admissionType' | 'admissionYear'
  >,
): string {
  return [r.universityName, r.departmentName, r.admissionType, r.admissionYear].join('|')
}
