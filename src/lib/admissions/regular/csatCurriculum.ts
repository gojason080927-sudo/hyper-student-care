/**
 * 정시 성적 입력 UI용 수능 기준연도 과목 목록.
 * 2025 추천 엔진(MathSelection / InquiryType)과 입결 MASTER는 여기서 바꾸지 않는다.
 * 2028 목록은 입력 UI 준비용이며 추천 계산에 넣지 않는다.
 */

export const REGULAR_CSAT_YEARS = [2025, 2028] as const
export type RegularCsatYear = (typeof REGULAR_CSAT_YEARS)[number]

/** 2025 수능 — 기존 추천 로직이 사용하는 수학 선택값과 동일 */
export const CSAT_2025_MATH_SELECTIONS = ['확률과통계', '미적분', '기하'] as const

/** 2028 수능 대비 UI — 2022 개정 수학. 추천 엔진에 전달하지 않음 */
export const CSAT_2028_MATH_SELECTIONS = [
  '대수',
  '미적분Ⅰ',
  '확률과 통계',
  '기하',
  '미적분Ⅱ',
] as const

export type Csat2028MathSelection = (typeof CSAT_2028_MATH_SELECTIONS)[number]

export const CSAT_2028_INQUIRY_TRACKS = ['사회', '과학'] as const
export type Csat2028InquiryTrack = (typeof CSAT_2028_INQUIRY_TRACKS)[number]

export const CSAT_2028_SOCIAL_INQUIRY_SUBJECTS = [
  '세계시민과 지리',
  '세계사',
  '사회와 문화',
  '현대사회와 윤리',
  '한국지리 탐구',
  '도시의 미래 탐구',
  '동아시아 역사 기행',
  '정치',
  '법과 사회',
  '경제',
  '윤리와 사상',
  '인문학과 윤리',
  '국제 관계의 이해',
  '여행지리',
  '역사로 탐구하는 현대 세계',
  '사회문제 탐구',
  '금융과 경제생활',
  '윤리문제 탐구',
  '기후변화와 지속가능한 세계',
] as const

export const CSAT_2028_SCIENCE_INQUIRY_SUBJECTS = [
  '물리학',
  '화학',
  '생명과학',
  '지구과학',
  '역학과 에너지',
  '전자기와 양자',
  '물질과 에너지',
  '화학 반응의 세계',
  '세포와 물질대사',
  '생물의 유전',
  '지구시스템과학',
  '행성우주과학',
  '과학의 역사와 문화',
  '기후변화와 환경생태',
  '융합과학 탐구',
] as const

export function csat2028InquirySubjects(
  track: Csat2028InquiryTrack | '',
): readonly string[] {
  if (track === '사회') return CSAT_2028_SOCIAL_INQUIRY_SUBJECTS
  if (track === '과학') return CSAT_2028_SCIENCE_INQUIRY_SUBJECTS
  return []
}
