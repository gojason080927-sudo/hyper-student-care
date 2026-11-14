import {
  AveragePercentileRule,
  CalculationType,
  EnglishCalculationType,
  InquiryRequiredType,
  InquiryRule,
  MathRequiredSelection,
  ResultType,
  type AdmissionGroup,
  type CalculationType as CalculationTypeName,
  type ConfidenceLevel,
  type DomainKey,
  type RegularAdmissionMasterRow,
  type RegularFieldTrack,
  type RegularRegion,
  type ResultType as ResultTypeName,
} from '../../lib/admissions/regular/types'
import { recommendationUniqueKey } from '../../lib/admissions/regular/exclusions'

/** HYPER_정시_APP_PRODUCTION_v1.json 한 행 (한글 키). */
export type RegularAdmissionProductionRecord = {
  대학: string
  캠퍼스: string | null
  지역: string | null
  모집군: string | null
  전형: string | null
  모집단위: string
  계열: string | null
  모집인원: number | null
  경쟁률: number | null
  충원?: number | null
  기준연도: number | null
  국어70: number | null
  수학70: number | null
  탐구1_70: number | null
  탐구2_70: number | null
  탐구평균70: number | null
  영어등급70: number | null
  한국사등급70: number | null
  평균백분위70: number | null
  대학환산70: number | null
  환산총점: number | null
  국어반영비율: number | string | null
  수학반영비율: number | string | null
  영어반영비율: number | string | null
  탐구반영비율: number | string | null
  면접반영: string | null
  영어반영방식: string | null
  수학선택조건_가산점: string | null
  탐구선택조건_가산점: string | null
  검증상태: string | null
  공식지표: string | null
  출처: string | null
  비고: string | null
  sourceSheet?: string | null
  dataStatus?: string | null
  resultType: string
  calculationType: string
  confidenceLevel: string
  productionEligible: string | boolean | null
  record_id: string
}

export const PRODUCTION_REGULAR_ADMISSION_COUNT = 876

const SEOUL_UNIVERSITIES = new Set([
  '건국대',
  '홍익대',
  '숙명여대',
  '국민대',
  '숭실대',
  '서울과기대',
  '세종대',
  '서울여대',
  '동덕여대',
  '상명대',
  '명지대',
  '덕성여대',
])

const GYEONGGI_INCHEON_UNIVERSITIES = new Set([
  '아주대',
  '인하대',
  '단국대(죽전)',
  '가천대',
  '경기대',
  '인천대',
  '한국항공대',
  '한양대 ERICA',
  '수원대',
  '한국공학대',
  '가톨릭대',
])

const REGIONAL_NATIONAL_UNIVERSITIES = new Set([
  '한경국립대',
  '국립한국교통대',
  '경인교육대',
  '공주교육대',
  '광주교육대',
  '대구교육대',
  '부산교육대',
  '진주교육대',
  '청주교육대',
  '춘천교육대',
  '한국교원대',
])

function asNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const n = Number(value.replace(/%/g, '').trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}

function asText(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

function parseResultType(raw: string): ResultTypeName {
  if (raw === ResultType.AVERAGE_PERCENTILE_70) return ResultType.AVERAGE_PERCENTILE_70
  if (raw === ResultType.UNIVERSITY_CONVERTED_70) return ResultType.UNIVERSITY_CONVERTED_70
  if (raw === ResultType.PARTIAL_SUBJECT_70) return ResultType.PARTIAL_SUBJECT_70
  if (raw === ResultType.INQUIRY_AVERAGE_70) return ResultType.INQUIRY_AVERAGE_70
  if (raw === ResultType.NO_NUMERIC_RESULT) return ResultType.NO_NUMERIC_RESULT
  return ResultType.SUBJECT_PERCENTILE_70
}

function parseCalculationType(raw: string): CalculationTypeName {
  if (raw === CalculationType.SIMPLE_AVERAGE) return CalculationType.SIMPLE_AVERAGE
  if (raw === CalculationType.WEIGHTED_PERCENTILE) return CalculationType.WEIGHTED_PERCENTILE
  if (raw === CalculationType.BEST_3) return CalculationType.BEST_3
  if (raw === CalculationType.BEST_2) return CalculationType.BEST_2
  if (raw === CalculationType.UNIVERSITY_FORMULA) return CalculationType.UNIVERSITY_FORMULA
  if (raw === CalculationType.STANDARD_SCORE_WEIGHTED) {
    return CalculationType.STANDARD_SCORE_WEIGHTED
  }
  if (raw === CalculationType.SCIENCE_TECH_SPECIAL) {
    return CalculationType.SCIENCE_TECH_SPECIAL
  }
  if (raw === CalculationType.UNSUPPORTED) return CalculationType.UNSUPPORTED
  return CalculationType.SUBJECT_COMPARISON
}

function parseConfidence(raw: string): ConfidenceLevel | null {
  if (raw === 'A' || raw === 'B' || raw === 'C' || raw === 'D') return raw
  return null
}

function parseGroup(raw: string | null): AdmissionGroup {
  if (raw === '가' || raw === '나' || raw === '다' || raw === '군외') return raw
  return '군외'
}

function inferRegion(university: string, campus: string | null, region: string | null): RegularRegion {
  if (region === '서울' || region === '경기/인천' || region === '지방' || region === '지방국립대') {
    return region
  }
  const c = campus ?? ''
  if (/서울/.test(c)) return '서울'
  if (/인천|경기|수원|성남|고양|안산|화성|용인|죽전/.test(c)) return '경기/인천'
  if (SEOUL_UNIVERSITIES.has(university)) return '서울'
  if (GYEONGGI_INCHEON_UNIVERSITIES.has(university)) return '경기/인천'
  if (REGIONAL_NATIONAL_UNIVERSITIES.has(university)) return '지방국립대'
  return '지방'
}

function inferFieldTrack(
  university: string,
  department: string,
  track: string | null,
): RegularFieldTrack {
  if (
    track === '인문' ||
    track === '자연' ||
    track === '공학' ||
    track === '의약학' ||
    track === '교육' ||
    track === '예체능' ||
    track === '신학' ||
    track === '실기'
  ) {
    return track
  }
  const blob = `${university} ${department}`
  if (/음악|미술|체육|무용|연극|스포츠/.test(blob)) return '예체능'
  if (/교육대|교원대|초등교육|교육과|교육학과|유아교육/.test(blob)) return '교육'
  if (/약학|간호|의예|의학|한의/.test(department)) return '의약학'
  if (
    /공학|전자|기계|컴퓨터|소프트웨어|전기|산업|화학공|건축공|항공|정보통신|에너지/.test(
      department,
    )
  ) {
    return '공학'
  }
  if (/수학|물리|화학|생명|통계|지구과학|자연과학/.test(department)) return '자연'
  return '인문'
}

function inferExcludeCategory(
  university: string,
  department: string,
  fieldTrack: RegularFieldTrack,
): RegularAdmissionMasterRow['excludeCategory'] {
  const blob = `${university} ${department}`
  if (fieldTrack === '예체능' || /음악|미술|체육/.test(department)) return 'arts'
  if (fieldTrack === '신학' || /신학/.test(blob)) return 'theology'
  if (fieldTrack === '실기' || /실기/.test(department)) return 'practical'
  if (/전문대/.test(blob)) return 'junior_college'
  return 'none'
}

function parseInquiryRule(raw: string | null): RegularAdmissionMasterRow['inquiryRule'] {
  const t = raw ?? ''
  if (/상위\s*1|1과목/.test(t)) return InquiryRule.BEST_1
  if (/합/.test(t) && !/평균/.test(t)) return InquiryRule.SUM_2
  return InquiryRule.AVERAGE_2
}

function parseMathBonus(raw: string | null): RegularAdmissionMasterRow['mathBonusRule'] {
  const t = raw ?? ''
  if (/10%\s*가산/.test(t)) {
    return { selections: ['미적분', '기하'], mode: 'multiply', value: 1.1 }
  }
  if (/3%\s*가산/.test(t)) {
    return { selections: ['미적분', '기하'], mode: 'multiply', value: 1.03 }
  }
  if (/2%\s*가산/.test(t)) {
    return { selections: ['미적분', '기하'], mode: 'multiply', value: 1.02 }
  }
  return null
}

function parseInquiryBonus(raw: string | null): RegularAdmissionMasterRow['inquiryBonusRule'] {
  const t = raw ?? ''
  if (/과탐 선택 시 과목별 3%/.test(t)) {
    return { requiredType: '과학탐구', mode: 'multiply', value: 1.03 }
  }
  if (/사탐 선택 시 과목별 3%/.test(t)) {
    return { requiredType: '사회탐구', mode: 'multiply', value: 1.03 }
  }
  return null
}

function recognizedDomainsFor(
  calc: CalculationTypeName,
): DomainKey[] {
  if (calc === CalculationType.BEST_3 || calc === CalculationType.BEST_2) {
    return ['korean', 'math', 'inquiry']
  }
  return ['korean', 'math', 'inquiry']
}

export function mapProductionRecordToMasterRow(
  rec: RegularAdmissionProductionRecord,
): RegularAdmissionMasterRow {
  const university = asText(rec.대학)
  const department = asText(rec.모집단위)
  const campus = asText(rec.캠퍼스)
  const fieldTrack = inferFieldTrack(university, department, rec.계열)
  const calc = parseCalculationType(rec.calculationType)
  const interviewText = asText(rec.면접반영)
  const interviewApplied =
    /면접/.test(interviewText) ||
    /교육대|교원대/.test(university)

  return {
    id: asText(rec.record_id) || `${university}|${department}|${asText(rec.전형)}`,
    university,
    campus,
    department,
    admissionGroup: parseGroup(rec.모집군),
    admissionType: asText(rec.전형) || '수능위주',
    region: inferRegion(university, rec.캠퍼스, rec.지역),
    year: asNumber(rec.기준연도) ?? 2025,
    recruitmentCount: asNumber(rec.모집인원),
    competitionRate: asNumber(rec.경쟁률),
    resultType: parseResultType(rec.resultType),
    calculationType: calc,
    korean70: asNumber(rec.국어70),
    math70: asNumber(rec.수학70),
    inquiry1_70: asNumber(rec.탐구1_70),
    inquiry2_70: asNumber(rec.탐구2_70),
    inquiryAverage70: asNumber(rec.탐구평균70),
    english70Grade: asNumber(rec.영어등급70),
    history70Grade: asNumber(rec.한국사등급70),
    averagePercentile70: asNumber(rec.평균백분위70),
    universityConverted70: asNumber(rec.대학환산70),
    universityConvertedMax: asNumber(rec.환산총점),
    koreanWeight: asNumber(rec.국어반영비율),
    mathWeight: asNumber(rec.수학반영비율),
    englishWeight: asNumber(rec.영어반영비율),
    inquiryWeight: asNumber(rec.탐구반영비율),
    inquiryCount: 2,
    inquiryRule: parseInquiryRule(rec.탐구선택조건_가산점),
    englishCalculationType: EnglishCalculationType.NONE,
    englishConversionTable: null,
    mathRequiredSelection: MathRequiredSelection.NONE,
    mathBonusRule: parseMathBonus(rec.수학선택조건_가산점),
    inquiryRequiredType: InquiryRequiredType.ANY,
    inquiryBonusRule: parseInquiryBonus(rec.탐구선택조건_가산점),
    officialSource: asText(rec.출처) || asText(rec.공식지표),
    verificationStatus: asText(rec.검증상태),
    notes: asText(rec.비고),
    fieldTrack,
    interviewApplied,
    averagePercentileRule:
      calc === CalculationType.SIMPLE_AVERAGE
        ? AveragePercentileRule.KOREAN_MATH_INQUIRY
        : AveragePercentileRule.UNSPECIFIED,
    recognizedDomains: recognizedDomainsFor(calc),
    excludeCategory: inferExcludeCategory(university, department, fieldTrack),
    isScienceTech: false,
    sourceConfidenceLevel: parseConfidence(rec.confidenceLevel),
    fillCount: asNumber(rec.충원),
    sourceUrl: asText(rec.출처),
  }
}

export function dedupeRegularAdmissionRows(
  rows: RegularAdmissionMasterRow[],
): RegularAdmissionMasterRow[] {
  const seen = new Set<string>()
  const out: RegularAdmissionMasterRow[] = []
  for (const row of rows) {
    const key = recommendationUniqueKey(row)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}
