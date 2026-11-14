/** 정시 대학 분석 — canonical types. UI에서 계산하지 않는다. */

export const ResultType = {
  SUBJECT_PERCENTILE_70: 'SUBJECT_PERCENTILE_70',
  AVERAGE_PERCENTILE_70: 'AVERAGE_PERCENTILE_70',
  INQUIRY_AVERAGE_70: 'INQUIRY_AVERAGE_70',
  UNIVERSITY_CONVERTED_70: 'UNIVERSITY_CONVERTED_70',
  PARTIAL_SUBJECT_70: 'PARTIAL_SUBJECT_70',
  NO_NUMERIC_RESULT: 'NO_NUMERIC_RESULT',
} as const
export type ResultType = (typeof ResultType)[keyof typeof ResultType]

export const CalculationType = {
  SIMPLE_AVERAGE: 'SIMPLE_AVERAGE',
  WEIGHTED_PERCENTILE: 'WEIGHTED_PERCENTILE',
  SUBJECT_COMPARISON: 'SUBJECT_COMPARISON',
  BEST_2: 'BEST_2',
  BEST_3: 'BEST_3',
  BEST_2_PLUS_INQUIRY_1: 'BEST_2_PLUS_INQUIRY_1',
  BEST_3_PLUS_INQUIRY: 'BEST_3_PLUS_INQUIRY',
  INQUIRY_BEST_1: 'INQUIRY_BEST_1',
  INQUIRY_AVERAGE_2: 'INQUIRY_AVERAGE_2',
  STANDARD_SCORE_WEIGHTED: 'STANDARD_SCORE_WEIGHTED',
  UNIVERSITY_FORMULA: 'UNIVERSITY_FORMULA',
  SCIENCE_TECH_SPECIAL: 'SCIENCE_TECH_SPECIAL',
  UNSUPPORTED: 'UNSUPPORTED',
} as const
export type CalculationType = (typeof CalculationType)[keyof typeof CalculationType]

export const InquiryRule = {
  ONE: 'ONE',
  BEST_1: 'BEST_1',
  AVERAGE_2: 'AVERAGE_2',
  SUM_2: 'SUM_2',
} as const
export type InquiryRule = (typeof InquiryRule)[keyof typeof InquiryRule]

export const EnglishCalculationType = {
  NONE: 'NONE',
  CONVERSION_TABLE: 'CONVERSION_TABLE',
  DEDUCTION: 'DEDUCTION',
  BONUS: 'BONUS',
} as const
export type EnglishCalculationType =
  (typeof EnglishCalculationType)[keyof typeof EnglishCalculationType]

export const MathRequiredSelection = {
  NONE: 'NONE',
  CALCULUS_OR_GEOMETRY: 'CALCULUS_OR_GEOMETRY',
  CALCULUS: 'CALCULUS',
  GEOMETRY: 'GEOMETRY',
} as const
export type MathRequiredSelection =
  (typeof MathRequiredSelection)[keyof typeof MathRequiredSelection]

export const InquiryRequiredType = {
  ANY: 'ANY',
  SCIENCE: 'SCIENCE',
  SOCIAL: 'SOCIAL',
} as const
export type InquiryRequiredType =
  (typeof InquiryRequiredType)[keyof typeof InquiryRequiredType]

export const AveragePercentileRule = {
  KOREAN_MATH_INQUIRY: 'KOREAN_MATH_INQUIRY',
  KOREAN_MATH_INQUIRY_BEST1: 'KOREAN_MATH_INQUIRY_BEST1',
  FOUR_DOMAIN: 'FOUR_DOMAIN',
  BEST_2: 'BEST_2',
  BEST_3: 'BEST_3',
  UNSPECIFIED: 'UNSPECIFIED',
} as const
export type AveragePercentileRule =
  (typeof AveragePercentileRule)[keyof typeof AveragePercentileRule]

export type ConfidenceLevel = 'A' | 'B' | 'C' | 'D'
export type SupportBand = 'reach' | 'ambitious' | 'target'
export type MathSelection = '확률과통계' | '미적분' | '기하'
export type InquiryType = '사회탐구' | '과학탐구'
export type AdmissionGroup = '가' | '나' | '다' | '군외'
export type RegularRegion = '서울' | '경기/인천' | '지방' | '지방국립대'
export type RegularFieldTrack =
  | '인문'
  | '자연'
  | '공학'
  | '의약학'
  | '교육'
  | '예체능'
  | '신학'
  | '실기'
  | '기타'

export type DomainKey = 'korean' | 'math' | 'english' | 'inquiry'

export type EnglishConversionTable = {
  scores: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>>
} | null

export type MathBonusRule = {
  selections: MathSelection[]
  mode: 'multiply' | 'add'
  value: number
} | null

export type InquiryBonusRule = {
  requiredType?: InquiryType
  mode: 'multiply' | 'add'
  value: number
} | null

/**
 * 대학 + 모집단위 + 전형 1행.
 * 공식 자료에 없는 숫자 필드는 null로 두고 임의 생성하지 않는다.
 */
export type RegularAdmissionMasterRow = {
  id: string
  university: string
  campus: string
  department: string
  admissionGroup: AdmissionGroup
  admissionType: string
  region: RegularRegion
  year: number
  recruitmentCount: number | null
  competitionRate: number | null
  resultType: ResultType
  calculationType: CalculationType
  korean70: number | null
  math70: number | null
  inquiry1_70: number | null
  inquiry2_70: number | null
  inquiryAverage70: number | null
  english70Grade: number | null
  history70Grade: number | null
  averagePercentile70: number | null
  universityConverted70: number | null
  universityConvertedMax: number | null
  koreanWeight: number | null
  mathWeight: number | null
  englishWeight: number | null
  inquiryWeight: number | null
  inquiryCount: number | null
  inquiryRule: InquiryRule
  englishCalculationType: EnglishCalculationType
  englishConversionTable: EnglishConversionTable
  mathRequiredSelection: MathRequiredSelection
  mathBonusRule: MathBonusRule
  inquiryRequiredType: InquiryRequiredType
  inquiryBonusRule: InquiryBonusRule
  officialSource: string
  verificationStatus: string
  notes: string
  fieldTrack: RegularFieldTrack
  interviewApplied: boolean
  averagePercentileRule: AveragePercentileRule
  recognizedDomains: DomainKey[]
  excludeCategory: 'none' | 'junior_college' | 'theology' | 'arts' | 'practical'
  isScienceTech: boolean
  /** PRODUCTION JSON에 기록된 신뢰도. 있으면 계산 신뢰도보다 우선. */
  sourceConfidenceLevel?: ConfidenceLevel | null
  fillCount: number | null
  sourceUrl: string
}

export type DataQuality = 'HIGH' | 'MEDIUM' | 'LIMITED'

export type RegularAdmissionStudentInput = {
  name: string
  school: string
  gradeYear: string
  koreanStandardScore: number | null
  koreanPercentile: number | null
  mathSelection: MathSelection | ''
  mathStandardScore: number | null
  mathPercentile: number | null
  englishGrade: number | null
  inquiry1Type: InquiryType | ''
  inquiry1Name: string
  inquiry1StandardScore: number | null
  inquiry1Percentile: number | null
  inquiry2Type: InquiryType | ''
  inquiry2Name: string
  inquiry2StandardScore: number | null
  inquiry2Percentile: number | null
  historyGrade: number | null
}

export type StudentMetrics = {
  koreanPercentile: number | null
  koreanStandardScore: number | null
  mathPercentile: number | null
  mathStandardScore: number | null
  mathSelection: MathSelection | ''
  englishGrade: number | null
  inquiry1Percentile: number | null
  inquiry1StandardScore: number | null
  inquiry1Type: InquiryType | ''
  inquiry1Name: string
  inquiry2Percentile: number | null
  inquiry2StandardScore: number | null
  inquiry2Type: InquiryType | ''
  inquiry2Name: string
  historyGrade: number | null
  inquiryAveragePercentile: number | null
  inquiryBestPercentile: number | null
  inquiryAverageStandardScore: number | null
  inquiryBestStandardScore: number | null
  koreanMathInquiryAverage: number | null
  koreanMathInquiryBest1Average: number | null
  fourDomainPercentileAverage: number | null
  best2Percentile: number | null
  best3Percentile: number | null
  scienceInquiryCount: number
}

export type SubjectDiffs = {
  koreanDiff: number | null
  mathDiff: number | null
  inquiry1Diff: number | null
  inquiry2Diff: number | null
  inquiryDiff: number | null
  englishDiff: number | null
}

export type RegularEvaluation = {
  row: RegularAdmissionMasterRow
  skipped: boolean
  skipReason: string | null
  eligibilityOk: boolean
  eligibilityNote: string | null
  studentValue: number | null
  cutoffValue: number | null
  supportGap: number | null
  normalizedSupportScore: number | null
  subjectDiffs: SubjectDiffs
  comparisonBasis: string
  studentValueLabel: string
  cutoffValueLabel: string
  usedDomains: string[]
  englishUsed: boolean
  confidenceLevel: ConfidenceLevel
  dataQuality: DataQuality
  explanation: string
  band: SupportBand | null
  scienceTechReference: boolean
}

export type RegularRecommendationMatch = {
  evaluation: RegularEvaluation
  band: SupportBand
}

export type RegularAdmissionFilters = {
  region: RegularRegion | '전체'
  admissionGroup: AdmissionGroup | '전체'
  fieldTrack: RegularFieldTrack | '전체'
}

export type RegularRecommendationResult = {
  ready: boolean
  message: string
  metrics: StudentMetrics
  reach: RegularRecommendationMatch[]
  ambitious: RegularRecommendationMatch[]
  target: RegularRecommendationMatch[]
  scienceTechReference: RegularEvaluation[]
  excludedUnmet: number
  skippedCount: number
}

export const SOCIAL_INQUIRY_SUBJECTS = [
  '생활과윤리',
  '윤리와사상',
  '한국지리',
  '세계지리',
  '동아시아사',
  '세계사',
  '경제',
  '정치와법',
  '사회문화',
] as const

export const SCIENCE_INQUIRY_SUBJECTS = [
  '물리학Ⅰ',
  '화학Ⅰ',
  '생명과학Ⅰ',
  '지구과학Ⅰ',
  '물리학Ⅱ',
  '화학Ⅱ',
  '생명과학Ⅱ',
  '지구과학Ⅱ',
] as const
