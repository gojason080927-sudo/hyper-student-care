/**
 * 고등학교 2022 개정 교육과정 공식 과목명
 * 기준: 교육부 고시 제2022-33호, 교육청 고교학점제 과목표
 * 임의 과목명을 추가하지 않는다.
 *
 * 정시 2025 수능 선택과목(확률과통계/미적분/기하, 탐구 Ⅰ·Ⅱ)과는 별도다.
 */

export type Curriculum2022Area = '국어' | '수학' | '영어' | '사회' | '과학'
export type Curriculum2022Category = '공통과목' | '일반선택' | '진로선택' | '융합선택'

export type Curriculum2022SubjectGroup = {
  area: Curriculum2022Area
  category: Curriculum2022Category
  subjects: readonly string[]
}

/** 국어 — 교육부 고시 제2022-33호 */
export const HIGH_SCHOOL_2022_KOREAN = {
  공통과목: ['공통국어1', '공통국어2'],
  일반선택: ['화법과 언어', '독서와 작문', '문학'],
  진로선택: ['주제 탐구 독서', '문학과 영상', '직무 의사소통'],
  융합선택: ['독서 토론과 글쓰기', '매체 의사소통', '언어생활 탐구'],
} as const

/** 수학 — 교육부 고시 제2022-33호 */
export const HIGH_SCHOOL_2022_MATH = {
  공통과목: ['공통수학1', '공통수학2', '기본수학1', '기본수학2'],
  일반선택: ['대수', '미적분Ⅰ', '확률과 통계'],
  진로선택: ['기하', '미적분Ⅱ', '경제 수학', '인공지능 수학', '직무 수학'],
  융합선택: ['수학과 문화', '실용 통계', '수학과제 탐구'],
} as const

/** 영어 — 교육부 고시 제2022-33호 */
export const HIGH_SCHOOL_2022_ENGLISH = {
  공통과목: ['공통영어1', '공통영어2', '기본영어1', '기본영어2'],
  일반선택: ['영어Ⅰ', '영어Ⅱ', '영어 독해와 작문'],
  진로선택: [
    '영미 문학 읽기',
    '영어 발표와 토론',
    '심화 영어',
    '심화 영어 독해와 작문',
    '직무 영어',
  ],
  융합선택: ['실생활 영어 회화', '미디어 영어', '세계 문화와 영어'],
} as const

/** 사회(역사·도덕 포함) — 교육부 고시 제2022-33호 */
export const HIGH_SCHOOL_2022_SOCIAL = {
  공통과목: ['한국사1', '한국사2', '통합사회1', '통합사회2'],
  일반선택: ['세계시민과 지리', '세계사', '사회와 문화', '현대사회와 윤리'],
  진로선택: [
    '한국지리 탐구',
    '도시의 미래 탐구',
    '동아시아 역사 기행',
    '정치',
    '법과 사회',
    '경제',
    '윤리와 사상',
    '인문학과 윤리',
    '국제 관계의 이해',
  ],
  융합선택: [
    '여행지리',
    '역사로 탐구하는 현대 세계',
    '사회문제 탐구',
    '금융과 경제생활',
    '윤리문제 탐구',
    '기후변화와 지속가능한 세계',
  ],
} as const

/** 과학 — 교육부 고시 제2022-33호 */
export const HIGH_SCHOOL_2022_SCIENCE = {
  공통과목: ['통합과학1', '통합과학2', '과학탐구실험1', '과학탐구실험2'],
  일반선택: ['물리학', '화학', '생명과학', '지구과학'],
  진로선택: [
    '역학과 에너지',
    '전자기와 양자',
    '물질과 에너지',
    '화학 반응의 세계',
    '세포와 물질대사',
    '생물의 유전',
    '지구시스템과학',
    '행성우주과학',
  ],
  융합선택: ['과학의 역사와 문화', '기후변화와 환경생태', '융합과학 탐구'],
} as const

const CATEGORY_ORDER: readonly Curriculum2022Category[] = [
  '공통과목',
  '일반선택',
  '진로선택',
  '융합선택',
]

function groupsFromArea(
  area: Curriculum2022Area,
  table: Record<Curriculum2022Category, readonly string[]>,
): Curriculum2022SubjectGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    area,
    category,
    subjects: table[category],
  }))
}

/** 내신 화면 국어 드롭다운이 직접 참조하는 그룹 */
export const HIGH_SCHOOL_2022_KOREAN_GROUPS: readonly Curriculum2022SubjectGroup[] =
  groupsFromArea('국어', HIGH_SCHOOL_2022_KOREAN)

/** 내신 화면 수학 드롭다운이 직접 참조하는 그룹 */
export const HIGH_SCHOOL_2022_MATH_GROUPS: readonly Curriculum2022SubjectGroup[] =
  groupsFromArea('수학', HIGH_SCHOOL_2022_MATH)

/** 내신 화면 영어 드롭다운이 직접 참조하는 그룹 */
export const HIGH_SCHOOL_2022_ENGLISH_GROUPS: readonly Curriculum2022SubjectGroup[] =
  groupsFromArea('영어', HIGH_SCHOOL_2022_ENGLISH)

/** 내신 화면 사회(탐구) 드롭다운이 직접 참조하는 그룹 */
export const HIGH_SCHOOL_2022_SOCIAL_GROUPS: readonly Curriculum2022SubjectGroup[] =
  groupsFromArea('사회', HIGH_SCHOOL_2022_SOCIAL)

/** 내신 화면 과학(탐구) 드롭다운이 직접 참조하는 그룹 */
export const HIGH_SCHOOL_2022_SCIENCE_GROUPS: readonly Curriculum2022SubjectGroup[] =
  groupsFromArea('과학', HIGH_SCHOOL_2022_SCIENCE)

export const HIGH_SCHOOL_2022_INQUIRY_TRACKS = ['사회', '과학'] as const
export type HighSchool2022InquiryTrack = (typeof HIGH_SCHOOL_2022_INQUIRY_TRACKS)[number]

/** 내신 입력 드롭다운용 — 국어 → 수학 → 영어 → 사회 → 과학 */
export const HIGH_SCHOOL_2022_SUBJECT_GROUPS: readonly Curriculum2022SubjectGroup[] = [
  ...HIGH_SCHOOL_2022_KOREAN_GROUPS,
  ...HIGH_SCHOOL_2022_MATH_GROUPS,
  ...HIGH_SCHOOL_2022_ENGLISH_GROUPS,
  ...HIGH_SCHOOL_2022_SOCIAL_GROUPS,
  ...HIGH_SCHOOL_2022_SCIENCE_GROUPS,
]

export const HIGH_SCHOOL_2022_OFFICIAL_SUBJECTS: readonly string[] =
  HIGH_SCHOOL_2022_SUBJECT_GROUPS.flatMap((group) => [...group.subjects])

const OFFICIAL_2022_SUBJECT_SET = new Set<string>(HIGH_SCHOOL_2022_OFFICIAL_SUBJECTS)

export function isOfficial2022HighSchoolSubject(name: string): boolean {
  return OFFICIAL_2022_SUBJECT_SET.has(name.trim())
}

export function isAdmissionInputSelectableSubject(name: string): boolean {
  return OFFICIAL_2022_SUBJECT_SET.has(name.trim())
}

/** 정시 입력 UI — 공식 국어 공통+일반선택 */
export const REGULAR_ADMISSION_KOREAN_SUBJECTS: readonly string[] = [
  ...HIGH_SCHOOL_2022_KOREAN.공통과목,
  ...HIGH_SCHOOL_2022_KOREAN.일반선택,
]

/** 정시 입력 UI — 공식 수학 공통1·2 + 일반선택 + 기하·미적분Ⅱ */
export const REGULAR_ADMISSION_MATH_SUBJECTS: readonly string[] = [
  HIGH_SCHOOL_2022_MATH.공통과목[0],
  HIGH_SCHOOL_2022_MATH.공통과목[1],
  ...HIGH_SCHOOL_2022_MATH.일반선택,
  HIGH_SCHOOL_2022_MATH.진로선택[0],
  HIGH_SCHOOL_2022_MATH.진로선택[1],
]

/** 정시 입력 UI — 공식 영어 공통1·2 + 일반선택 */
export const REGULAR_ADMISSION_ENGLISH_SUBJECTS: readonly string[] = [
  HIGH_SCHOOL_2022_ENGLISH.공통과목[0],
  HIGH_SCHOOL_2022_ENGLISH.공통과목[1],
  ...HIGH_SCHOOL_2022_ENGLISH.일반선택,
]

export function formatCurriculum2022GroupLabel(
  group: Curriculum2022SubjectGroup,
): string {
  return `${group.area} · ${group.category}`
}

export function inquiryGroupsForTrack(
  track: HighSchool2022InquiryTrack | '',
): readonly Curriculum2022SubjectGroup[] {
  if (track === '사회') return HIGH_SCHOOL_2022_SOCIAL_GROUPS
  if (track === '과학') return HIGH_SCHOOL_2022_SCIENCE_GROUPS
  return []
}

export function inferInquiryTrackFromSubject(
  name: string,
): HighSchool2022InquiryTrack | '' {
  const trimmed = name.trim()
  if (HIGH_SCHOOL_2022_SOCIAL_GROUPS.some((group) => group.subjects.some((s) => s === trimmed))) {
    return '사회'
  }
  if (HIGH_SCHOOL_2022_SCIENCE_GROUPS.some((group) => group.subjects.some((s) => s === trimmed))) {
    return '과학'
  }
  return ''
}
