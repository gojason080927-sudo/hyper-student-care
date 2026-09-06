import {
  HIGH_SCHOOL_2022_KOREAN,
  HIGH_SCHOOL_2022_MATH,
  HIGH_SCHOOL_2022_SCIENCE,
  HIGH_SCHOOL_2022_SOCIAL,
} from '../../../data/curriculum/highSchool2022Subjects'
import type {
  BehaviorCode,
  ProblemSolvingCode,
  RiasecCode,
  StrengthCode,
  ValueCode,
} from '../types'

/** 페이지 2 RIASEC 한 줄 특성 */
export const RIASEC_TRAIT_DESCRIPTIONS: Record<RiasecCode, string> = {
  R: '도구·기계·재료를 직접 다루고 실제 결과를 만들어내는 활동을 선호합니다.',
  I: '원리와 원인을 분석하고 새로운 지식을 탐구하는 활동을 선호합니다.',
  A: '새로운 아이디어와 표현, 창의적인 활동을 선호합니다.',
  S: '사람을 돕고 가르치며 협력하는 활동을 선호합니다.',
  E: '리더십, 설득, 기획, 목표 달성을 위한 활동을 선호합니다.',
  C: '체계적인 정리와 정확성, 자료 관리와 절차를 선호합니다.',
}

/** 페이지 1 진로 DNA — 첫 성향 절 (이어서 연결) */
export const RIASEC_DNA_PRIMARY: Record<RiasecCode, string> = {
  R: '손으로 다루고 눈에 보이는 결과를 만드는 흥미가 높고,',
  I: '새로운 지식이나 원리를 탐구하는 흥미가 높고,',
  A: '아이디어를 자신만의 방식으로 표현하는 흥미가 높고,',
  S: '사람을 돕거나 함께 성장하는 활동에 관심이 높고,',
  E: '의견을 내고 사람들을 이끌어 목표를 달성하는 흥미가 높고,',
  C: '자료를 정확하게 정리하고 체계적으로 다루는 흥미가 높고,',
}

/** 페이지 1 진로 DNA — 둘째 성향 절 */
export const RIASEC_DNA_SECONDARY: Record<RiasecCode, string> = {
  R: '도구와 현장을 직접 경험하는 활동에도 관심이 높은 유형입니다.',
  I: '원리와 원인을 분석하며 지식을 탐구하는 활동에도 관심이 높은 유형입니다.',
  A: '새로운 표현과 창의적인 활동에도 관심이 높은 유형입니다.',
  S: '사람을 돕거나 함께 성장하는 활동에도 관심이 높은 유형입니다.',
  E: '설득·기획·리더십을 발휘하는 활동에도 관심이 높은 유형입니다.',
  C: '정확성과 절차를 다루는 활동에도 관심이 높은 유형입니다.',
}

export const STRENGTH_DESCRIPTIONS: Record<StrengthCode, string> = {
  VER: '생각을 글과 말로 명확하게 표현하고 다른 사람의 의미를 이해하는 능력입니다.',
  NUM: '숫자와 수량의 관계를 이해하고 수리 문제를 구조적으로 해결하는 능력입니다.',
  LOG: '복잡한 문제를 단계적으로 분석하고 원인과 결과를 논리적으로 연결하는 능력이 강합니다.',
  SPA: '도형·공간·시각 정보를 머릿속에 그려 구조를 파악하는 능력이 강합니다.',
  CRE: '기존의 틀을 넘어 새로운 가능성과 해결 방법을 떠올리는 능력이 강합니다.',
  INT: '사람들과 원활하게 소통하고 공감하며 협력하는 능력이 강합니다.',
  OBS: '세부적인 변화와 차이를 잘 알아차리고, 상황을 정확히 파악하는 능력이 강합니다.',
  PRA: '배운 내용을 실제 상황에 적용하고 현실적인 방법으로 문제를 해결하는 능력이 강합니다.',
}

export const VALUE_DESCRIPTIONS: Record<ValueCode, string> = {
  STABILITY: '직업과 생활의 안정성, 예측 가능한 환경을 중요하게 생각하는 가치입니다.',
  REWARD: '노력에 대한 경제적 보상과 성과가 분명히 돌아오는 일을 중요하게 생각합니다.',
  ACHIEVEMENT: '목표를 설정하고 성과와 결과를 만들어내는 것을 중요하게 생각합니다.',
  CONTRIBUTION: '다른 사람이나 사회에 도움이 되는 일을 의미 있게 느끼는 가치입니다.',
  AUTONOMY: '스스로 판단하고 자신의 방식으로 일할 수 있는 환경을 중요하게 생각합니다.',
  GROWTH: '계속 배우고 발전하며 전문성을 높일 수 있는 일을 중요하게 생각합니다.',
  RECOGNITION: '자신의 역할과 성과가 다른 사람에게 인정받는 것을 중요하게 생각합니다.',
  BALANCE: '일과 삶의 균형을 지키며 무리하지 않는 환경을 중요하게 생각합니다.',
  CREATIVITY: '새로운 아이디어를 내고 자신만의 방식을 표현할 수 있는 일을 중요하게 생각합니다.',
  RELATIONSHIP: '사람들과의 신뢰와 협력, 따뜻한 관계를 중요하게 생각합니다.',
  INFLUENCE: '의견을 내고 다른 사람이나 조직의 방향에 영향을 미치는 일을 중요하게 생각합니다.',
  EXPERTISE: '특정 분야의 깊은 지식과 기술을 갖추고 전문가로 인정받는 것을 중요하게 생각합니다.',
}

export const BEHAVIOR_DESCRIPTIONS: Record<BehaviorCode, string> = {
  PLANNING: '할 일을 미리 정리하고 순서를 정해 진행하는 특성입니다.',
  PERSISTENCE: '어려움이 있어도 포기하지 않고 끝까지 이어가는 특성입니다.',
  CAREFULNESS: '실수나 위험을 줄이기 위해 확인하고 신중하게 판단하는 특성입니다.',
  SOCIABILITY: '새로운 사람과도 비교적 쉽게 관계를 여는 특성입니다.',
  COOPERATION: '혼자보다 함께 역할을 나누며 목표를 이루는 특성입니다.',
  ADAPTABILITY: '상황이 바뀌어도 비교적 빠르게 맞춰 가는 특성입니다.',
  INITIATIVE: '누가 시키기 전에 먼저 시작하고 이끌어 가는 특성입니다.',
  SELF_CONTROL: '감정이나 충동을 조절하며 해야 할 일을 지키는 특성입니다.',
  DELIBERATION: '바로 결정하기보다 여러 가능성을 충분히 생각해 보는 특성입니다.',
  EXECUTION: '계획을 실제 행동으로 옮기고 결과를 만들어 내는 특성입니다.',
}

export const PROBLEM_SOLVING_DESCRIPTIONS: Record<ProblemSolvingCode, string> = {
  ANALYSIS: '문제를 쪼개어 원인과 구조를 파악하는 방식입니다.',
  FLEXIBILITY: '한 가지 방법에 머무르지 않고 다른 길을 찾는 방식입니다.',
  CONNECTION: '서로 다른 정보나 경험을 연결해 답을 찾는 방식입니다.',
  REFLECTION: '결과를 돌아보고 다음 판단에 반영하는 방식입니다.',
  EXPLORATION: '모르는 부분을 적극적으로 찾아보고 확인하는 방식입니다.',
  STRUCTURING: '복잡한 내용을 단계와 틀로 정리하는 방식입니다.',
  COMPARISON: '여러 선택지를 견주어 더 나은 쪽을 고르는 방식입니다.',
  ERROR_ANALYSIS: '틀린 지점을 찾아 같은 실수를 줄이는 방식입니다.',
}

export const EFFICACY_DESCRIPTION =
  '현재 진로 탐색·준비 상황에서 스스로 시도하고 해결할 수 있다고 느끼는 정도입니다.'

export const READINESS_DESCRIPTION =
  '진로 목표를 생각하고, 필요한 정보를 탐색하며 선택을 준비하고 있는 정도입니다.'

export const CREDIT_SYSTEM_INTRO =
  '자신의 진로와 적성에 맞는 과목을 선택하고, 이수 기준을 충족한 과목의 학점을 쌓아 졸업하는 제도입니다.'

export const CREDIT_SUBJECT_DISCLAIMER =
  '학교마다 개설 과목이 다르므로 확정 과목이 아니라, 학교 교육과정 편제표에서 확인할 추천 과목 예시입니다. 특정 과목의 개설을 보장하지 않습니다.'

export const EXPLORATION_GUIDE_STEPS = [
  {
    title: '탐색하기',
    body: '관심 전공의 실제 사례, 관련 학과 소개, 관련 직업 정보를 찾아봅니다.',
  },
  {
    title: '경험하기',
    body: '교내 활동, 동아리, 프로젝트, 캠프, 체험 프로그램 등을 통해 관심 분야를 직접 경험합니다.',
  },
  {
    title: '준비하기',
    body: '선택과목, 독서, 탐구활동, 기초 학업 역량을 계획적으로 준비합니다.',
  },
] as const

export const IN_SCHOOL_PREP_CHECKLIST = [
  '관심 전공과 연결되는 선택과목 확인',
  '과목별 세특과 연결할 수 있는 탐구 주제 설정',
  '관련 동아리/프로젝트/탐구활동 참여',
  '진로 상담 및 과목 선택 상담 활용',
  '독서/보고서/발표 등 학업 활동을 전공 관심과 연결',
] as const

export const OUT_OF_SCHOOL_OPTIONS = [
  '학교 간 공동교육과정',
  '온라인학교',
  '학교 밖 교육',
  '대학/공공기관/진로체험 프로그램',
  '관련 온라인 강의',
  '관련 학과 설명회',
  '공개강좌',
  '연구·탐구 활동',
] as const

export const OUT_OF_SCHOOL_NOTE =
  '참여 가능 여부는 학교/교육청 운영 여부를 확인해야 합니다. 모든 프로그램에 반드시 참여할 수 있는 것은 아닙니다.'

export const CREDIT_WATCH_ITEMS = [
  '추천 전공의 대학별 교과과정과 졸업 후 진로 확인',
  '관심 전공과 관련된 고교 선택과목 확인',
  '현재 학교에서 해당 과목 개설 여부 확인',
  '개설되지 않을 경우 공동교육과정/온라인학교 등 확인',
  '전공별 필수 기초학업 역량 확인',
  '대학별 전공 관련 권장과목/전형자료 확인',
] as const

export type CreditSubjectCluster = {
  id: string
  title: string
  groupIds: readonly string[]
  examples: readonly string[]
}

const S = HIGH_SCHOOL_2022_SCIENCE
const M = HIGH_SCHOOL_2022_MATH
const SO = HIGH_SCHOOL_2022_SOCIAL
const K = HIGH_SCHOOL_2022_KOREAN

/** 전공군 → 2022 개정 교육과정 공식 과목/영역 예시 */
export const CREDIT_SUBJECT_CLUSTERS: readonly CreditSubjectCluster[] = [
  {
    id: 'life-med',
    title: '의학·생명 계열',
    groupIds: ['MED', 'DEN', 'KMD', 'PHA', 'VET', 'NUR', 'HEALTH', 'BIO', 'FOOD'],
    examples: [
      S.일반선택[2],
      S.일반선택[1],
      S.진로선택[4],
      S.진로선택[5],
      S.공통과목[2],
      M.일반선택[0],
      '보건 관련 과목(학교 편제표 확인)',
    ],
  },
  {
    id: 'eng-cs',
    title: '공학·컴퓨터 계열',
    groupIds: ['CS', 'EE', 'ME', 'MAT', 'CIV', 'ARCH', 'PHY', 'CHEM'],
    examples: [
      M.일반선택[0],
      M.일반선택[1],
      M.진로선택[0],
      S.일반선택[0],
      M.진로선택[3],
      S.융합선택[2],
      '정보·인공지능 관련 과목(학교 편제표 확인)',
    ],
  },
  {
    id: 'env-earth',
    title: '환경·지구 계열',
    groupIds: ['ENV', 'EARTH'],
    examples: [
      S.일반선택[3],
      S.일반선택[1],
      S.일반선택[0],
      S.융합선택[1],
      SO.융합선택[5],
      M.일반선택[0],
    ],
  },
  {
    id: 'social-biz',
    title: '사회·경영 계열',
    groupIds: ['BUS', 'ECON', 'ACC', 'LAW', 'SOC', 'SW', 'TOUR'],
    examples: [
      SO.일반선택[2],
      SO.진로선택[5],
      SO.진로선택[3],
      SO.진로선택[4],
      SO.융합선택[2],
      M.일반선택[2],
      M.진로선택[2],
    ],
  },
  {
    id: 'human',
    title: '인문·언어·교육 계열',
    groupIds: ['LANG', 'HIST', 'PSY', 'EDU', 'CHILD'],
    examples: [
      K.일반선택[2],
      K.일반선택[1],
      K.일반선택[0],
      SO.일반선택[1],
      SO.일반선택[2],
      SO.진로선택[7],
    ],
  },
  {
    id: 'arts',
    title: '예술·디자인·미디어 계열',
    groupIds: ['DESIGN', 'ART', 'MEDIA'],
    examples: [
      K.진로선택[1],
      K.융합선택[1],
      K.일반선택[0],
      '미술·디자인 관련 과목(학교 편제표 확인)',
      '영상·콘텐츠 관련 과목(학교 편제표 확인)',
    ],
  },
  {
    id: 'sport',
    title: '스포츠 계열',
    groupIds: ['SPORT'],
    examples: [
      S.일반선택[2],
      S.공통과목[0],
      '체육 관련 과목(학교 편제표 확인)',
    ],
  },
]

/**
 * 채점 dictionary에 학과가 부족한 전공군만 보완.
 * 실제 국내 대학 학부 학과명만 사용한다.
 */
export const CAREER_MAJOR_REPORT_SEED: ReadonlyArray<{ groupId: string; name: string }> = [
  { groupId: 'MED', name: '의과학과' },
  { groupId: 'BIO', name: '바이오의공학과' },
  { groupId: 'DEN', name: '치위생학과' },
  { groupId: 'KMD', name: '한의예과' },
  { groupId: 'KMD', name: '한의생명과학과' },
  { groupId: 'PHA', name: '제약학과' },
  { groupId: 'VET', name: '수의예과' },
  { groupId: 'VET', name: '동물보건복지학과' },
  { groupId: 'NUR', name: '보건간호학과' },
  { groupId: 'CHEM', name: '응용화학과' },
  { groupId: 'PHY', name: '천문우주과학과' },
  { groupId: 'ENV', name: '기후환경학과' },
  { groupId: 'MAT', name: '고분자공학과' },
  { groupId: 'CIV', name: '건설환경공학과' },
  { groupId: 'ARCH', name: '실내건축학과' },
  { groupId: 'ACC', name: '회계세무학과' },
  { groupId: 'PSY', name: '상담학과' },
  { groupId: 'SW', name: '청소년상담복지학과' },
  { groupId: 'HIST', name: '고고학과' },
  { groupId: 'SPORT', name: '생활체육학과' },
  { groupId: 'TOUR', name: '관광경영학과' },
  { groupId: 'CHILD', name: '아동복지학과' },
]
