import type {
  EntranceExamDifficulty,
  EntranceExamGrade,
  EntranceExamSubject,
} from './types'

export const ENTRANCE_EXAM_SUBJECTS: EntranceExamSubject[] = ['수학', '영어']

export const ENTRANCE_EXAM_GRADES: EntranceExamGrade[] = ['중1', '중2', '중3', '고1']

/** 문제은행 폴더 탐색용 학년 (DB grade check는 ENTRANCE_EXAM_GRADES 기준) */
export const ENTRANCE_EXAM_FOLDER_GRADES = [
  '중1',
  '중2',
  '중3',
  '고1',
  '고2',
  '고3',
] as const

export type EntranceExamFolderGrade = (typeof ENTRANCE_EXAM_FOLDER_GRADES)[number]

export const ENTRANCE_EXAM_DIFFICULTIES: EntranceExamDifficulty[] = ['하', '중', '상']

export const MATH_EVALUATION_AREAS = [
  '개념 이해도',
  '계산 정확도',
  '문제 해석 능력',
  '응용 능력',
  '문제 해결력',
  '실수 관리 능력',
] as const

/**
 * 영어 문항 기반 평가영역 (정답률 산출).
 * 독해 속도는 별도 시간 지표 — 아래 목록에 포함하지 않음.
 */
export const ENGLISH_EVALUATION_AREAS = [
  '어휘력',
  '문법 이해력',
  '문장 해석 능력',
  '독해 이해력',
  '추론·문해력',
] as const

/** 기존 영어 문항/저장값과의 호환 (삭제하지 않음) */
export const ENGLISH_LEGACY_EVALUATION_AREAS = [
  '문법 이해도',
  '독해 이해도',
] as const

/** legacy label → 확정 영역명 */
export const ENGLISH_AREA_ALIASES: Record<string, string> = {
  '문법 이해도': '문법 이해력',
  '독해 이해도': '독해 이해력',
}

/** 정답률로 산출하지 않는 보조 지표 */
export const ENGLISH_TIME_BASED_AREAS = ['독해 속도'] as const

export const CHOICE_LABELS = ['①', '②', '③', '④', '⑤'] as const

/** 문제 등록 UI — 선택 가능한 평가영역 */
export function getEvaluationAreasForSubject(
  subject: EntranceExamSubject,
): readonly string[] {
  return subject === '수학' ? MATH_EVALUATION_AREAS : ENGLISH_EVALUATION_AREAS
}

/**
 * 채점/REPORT 영역 순서.
 * 영어: 5개 정답률 영역 + 독해 속도(needs_time 표시용)
 */
export function getKnownAreaOrderForSubject(
  subject: EntranceExamSubject,
): readonly string[] {
  if (subject === '수학') return MATH_EVALUATION_AREAS
  return [...ENGLISH_EVALUATION_AREAS, ...ENGLISH_TIME_BASED_AREAS]
}

/** 영어 legacy 영역명을 확정 명칭으로 정규화 (수학은 그대로) */
export function normalizeEntranceExamAreaLabel(
  area: string,
  subject: EntranceExamSubject,
): string {
  const trimmed = area.trim()
  if (!trimmed) return trimmed
  if (subject !== '영어') return trimmed
  return ENGLISH_AREA_ALIASES[trimmed] ?? trimmed
}

/** 필터용: 신규 + legacy 영어 라벨 (기존 문항 조회용) */
export function getFilterEvaluationAreasForSubject(
  subject: EntranceExamSubject,
): readonly string[] {
  if (subject === '수학') return MATH_EVALUATION_AREAS
  return [...ENGLISH_EVALUATION_AREAS, ...ENGLISH_LEGACY_EVALUATION_AREAS]
}
