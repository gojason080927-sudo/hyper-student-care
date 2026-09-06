import type { BehaviorCode, MajorProfile, ProblemSolvingCode, RiasecCode, RiasecVector } from '../types'

/**
 * HYPER v1 전공군 heuristic profile seed.
 * 심리측정학적으로 검증된 국가 표준점수가 아니며, 이후 DB에서 수정할 수 있다.
 */
const RIASEC_BASE = 0.25
const RIASEC_PRIMARY = 1
const RIASEC_SECONDARY = 0.75
const RIASEC_TERTIARY = 0.55

function riasecTarget(ranked: RiasecCode[]): RiasecVector {
  const weights = [RIASEC_PRIMARY, RIASEC_SECONDARY, RIASEC_TERTIARY]
  const vector: RiasecVector = { R: RIASEC_BASE, I: RIASEC_BASE, A: RIASEC_BASE, S: RIASEC_BASE, E: RIASEC_BASE, C: RIASEC_BASE }
  ranked.forEach((code, index) => {
    vector[code] = weights[index] ?? RIASEC_BASE
  })
  return vector
}

const BEHAVIOR = new Set<BehaviorCode>([
  'PLANNING',
  'PERSISTENCE',
  'CAREFULNESS',
  'SOCIABILITY',
  'COOPERATION',
  'ADAPTABILITY',
  'INITIATIVE',
  'SELF_CONTROL',
  'DELIBERATION',
  'EXECUTION',
])

const PROBLEM = new Set<ProblemSolvingCode>([
  'ANALYSIS',
  'FLEXIBILITY',
  'CONNECTION',
  'REFLECTION',
  'EXPLORATION',
  'STRUCTURING',
  'COMPARISON',
  'ERROR_ANALYSIS',
])

type RawProfile = {
  id: string
  name: string
  riasec: RiasecCode[]
  strength: MajorProfile['strengthKeys']
  value: MajorProfile['valueKeys']
  trailing: string[]
}

function splitTrailing(codes: string[]): {
  behaviorKeys: BehaviorCode[]
  problemSolvingKeys: ProblemSolvingCode[]
} {
  const behaviorKeys: BehaviorCode[] = []
  const problemSolvingKeys: ProblemSolvingCode[] = []
  for (const code of codes) {
    if (BEHAVIOR.has(code as BehaviorCode)) behaviorKeys.push(code as BehaviorCode)
    else if (PROBLEM.has(code as ProblemSolvingCode)) {
      problemSolvingKeys.push(code as ProblemSolvingCode)
    }
  }
  return { behaviorKeys, problemSolvingKeys }
}

const RAW: RawProfile[] = [
  { id: 'MED', name: '의학', riasec: ['I', 'S'], strength: ['LOG', 'OBS', 'INT'], value: ['CONTRIBUTION', 'ACHIEVEMENT', 'EXPERTISE'], trailing: ['PERSISTENCE', 'DELIBERATION', 'ANALYSIS'] },
  { id: 'DEN', name: '치의학', riasec: ['I', 'R'], strength: ['OBS', 'SPA', 'PRA'], value: ['EXPERTISE', 'ACHIEVEMENT'], trailing: ['CAREFULNESS', 'DELIBERATION', 'ERROR_ANALYSIS'] },
  { id: 'KMD', name: '한의학', riasec: ['I', 'S'], strength: ['OBS', 'VER', 'INT'], value: ['CONTRIBUTION', 'EXPERTISE'], trailing: ['DELIBERATION', 'CONNECTION', 'ANALYSIS'] },
  { id: 'PHA', name: '약학', riasec: ['I', 'C'], strength: ['OBS', 'LOG', 'NUM'], value: ['EXPERTISE', 'STABILITY'], trailing: ['CAREFULNESS', 'ANALYSIS', 'ERROR_ANALYSIS'] },
  { id: 'VET', name: '수의학', riasec: ['I', 'S', 'R'], strength: ['OBS', 'LOG', 'PRA'], value: ['CONTRIBUTION', 'EXPERTISE'], trailing: ['PERSISTENCE', 'DELIBERATION', 'ADAPTABILITY'] },
  { id: 'NUR', name: '간호', riasec: ['S', 'I', 'C'], strength: ['INT', 'OBS', 'PRA'], value: ['CONTRIBUTION', 'STABILITY'], trailing: ['COOPERATION', 'SELF_CONTROL', 'EXECUTION'] },
  { id: 'HEALTH', name: '보건·재활', riasec: ['S', 'R', 'I'], strength: ['INT', 'OBS', 'PRA'], value: ['CONTRIBUTION', 'RELATIONSHIP'], trailing: ['PERSISTENCE', 'COOPERATION', 'ADAPTABILITY'] },
  { id: 'BIO', name: '생명·생명공학', riasec: ['I', 'R'], strength: ['OBS', 'LOG'], value: ['GROWTH', 'EXPERTISE'], trailing: ['EXPLORATION', 'ANALYSIS', 'PERSISTENCE'] },
  { id: 'CHEM', name: '화학·화공', riasec: ['I', 'R', 'C'], strength: ['NUM', 'LOG', 'OBS'], value: ['EXPERTISE', 'ACHIEVEMENT'], trailing: ['ANALYSIS', 'STRUCTURING', 'CAREFULNESS'] },
  { id: 'PHY', name: '물리·응용과학', riasec: ['I', 'R'], strength: ['NUM', 'LOG', 'SPA'], value: ['GROWTH', 'EXPERTISE'], trailing: ['ANALYSIS', 'EXPLORATION'] },
  { id: 'EARTH', name: '지구·해양', riasec: ['I', 'R'], strength: ['OBS', 'SPA', 'LOG'], value: ['GROWTH', 'CONTRIBUTION'], trailing: ['EXPLORATION', 'CONNECTION', 'ANALYSIS'] },
  { id: 'FOOD', name: '식품·농생명', riasec: ['I', 'R', 'S'], strength: ['OBS', 'PRA', 'LOG'], value: ['CONTRIBUTION', 'STABILITY'], trailing: ['ANALYSIS', 'EXECUTION'] },
  { id: 'MATH', name: '수학·통계', riasec: ['I', 'C'], strength: ['NUM', 'LOG'], value: ['EXPERTISE', 'ACHIEVEMENT'], trailing: ['STRUCTURING', 'COMPARISON', 'ANALYSIS'] },
  { id: 'CS', name: '컴퓨터·AI', riasec: ['I', 'R', 'C'], strength: ['LOG', 'NUM', 'CRE'], value: ['GROWTH', 'AUTONOMY', 'EXPERTISE'], trailing: ['STRUCTURING', 'ERROR_ANALYSIS', 'FLEXIBILITY'] },
  { id: 'EE', name: '전기·전자', riasec: ['I', 'R', 'C'], strength: ['NUM', 'LOG', 'SPA'], value: ['EXPERTISE', 'ACHIEVEMENT'], trailing: ['ANALYSIS', 'CAREFULNESS'] },
  { id: 'ME', name: '기계·로봇', riasec: ['R', 'I'], strength: ['SPA', 'PRA', 'LOG'], value: ['ACHIEVEMENT', 'EXPERTISE'], trailing: ['EXECUTION', 'ANALYSIS', 'ERROR_ANALYSIS'] },
  { id: 'MAT', name: '신소재·재료', riasec: ['I', 'R'], strength: ['OBS', 'LOG', 'NUM'], value: ['GROWTH', 'EXPERTISE'], trailing: ['EXPLORATION', 'ANALYSIS'] },
  { id: 'CIV', name: '토목·도시', riasec: ['R', 'I', 'C'], strength: ['SPA', 'NUM', 'PRA'], value: ['STABILITY', 'CONTRIBUTION'], trailing: ['PLANNING', 'STRUCTURING'] },
  { id: 'ARCH', name: '건축', riasec: ['A', 'R', 'I'], strength: ['SPA', 'CRE', 'PRA'], value: ['CREATIVITY', 'ACHIEVEMENT'], trailing: ['PERSISTENCE', 'EXECUTION', 'COMPARISON'] },
  { id: 'ENV', name: '환경·에너지', riasec: ['I', 'R', 'S'], strength: ['LOG', 'OBS'], value: ['CONTRIBUTION', 'GROWTH'], trailing: ['ANALYSIS', 'CONNECTION'] },
  { id: 'BUS', name: '경영', riasec: ['E', 'S', 'C'], strength: ['INT', 'VER', 'LOG'], value: ['ACHIEVEMENT', 'REWARD', 'INFLUENCE'], trailing: ['INITIATIVE', 'EXECUTION', 'FLEXIBILITY'] },
  { id: 'ECON', name: '경제·금융', riasec: ['I', 'E', 'C'], strength: ['NUM', 'LOG'], value: ['REWARD', 'ACHIEVEMENT', 'EXPERTISE'], trailing: ['ANALYSIS', 'COMPARISON'] },
  { id: 'ACC', name: '회계·세무', riasec: ['C', 'I', 'E'], strength: ['NUM', 'LOG', 'OBS'], value: ['STABILITY', 'EXPERTISE'], trailing: ['CAREFULNESS', 'DELIBERATION', 'ERROR_ANALYSIS'] },
  { id: 'LAW', name: '법·행정', riasec: ['E', 'S', 'I'], strength: ['VER', 'LOG'], value: ['INFLUENCE', 'CONTRIBUTION', 'EXPERTISE'], trailing: ['DELIBERATION', 'COMPARISON', 'STRUCTURING'] },
  { id: 'PSY', name: '심리', riasec: ['S', 'I'], strength: ['INT', 'VER', 'OBS'], value: ['CONTRIBUTION', 'GROWTH'], trailing: ['REFLECTION', 'DELIBERATION', 'ANALYSIS'] },
  { id: 'EDU', name: '교육', riasec: ['S', 'I'], strength: ['VER', 'INT'], value: ['CONTRIBUTION', 'GROWTH'], trailing: ['COOPERATION', 'PLANNING', 'REFLECTION'] },
  { id: 'SW', name: '사회복지', riasec: ['S', 'E'], strength: ['INT', 'VER'], value: ['CONTRIBUTION', 'RELATIONSHIP'], trailing: ['COOPERATION', 'ADAPTABILITY', 'EXECUTION'] },
  { id: 'SOC', name: '정치·사회', riasec: ['E', 'I', 'S'], strength: ['VER', 'LOG', 'INT'], value: ['INFLUENCE', 'CONTRIBUTION'], trailing: ['ANALYSIS', 'COMPARISON', 'EXPLORATION'] },
  { id: 'MEDIA', name: '미디어·광고', riasec: ['A', 'E', 'S'], strength: ['CRE', 'VER', 'INT'], value: ['CREATIVITY', 'INFLUENCE', 'ACHIEVEMENT'], trailing: ['FLEXIBILITY', 'EXECUTION'] },
  { id: 'LANG', name: '언어·문학', riasec: ['A', 'I', 'S'], strength: ['VER', 'CRE'], value: ['CREATIVITY', 'GROWTH'], trailing: ['REFLECTION', 'CONNECTION'] },
  { id: 'HIST', name: '역사·철학', riasec: ['I', 'A'], strength: ['VER', 'LOG'], value: ['GROWTH', 'EXPERTISE'], trailing: ['ANALYSIS', 'REFLECTION', 'CONNECTION'] },
  { id: 'DESIGN', name: '디자인', riasec: ['A', 'R'], strength: ['CRE', 'SPA', 'OBS'], value: ['CREATIVITY', 'AUTONOMY'], trailing: ['FLEXIBILITY', 'EXECUTION'] },
  { id: 'ART', name: '예술·콘텐츠', riasec: ['A', 'E'], strength: ['CRE', 'VER', 'OBS'], value: ['CREATIVITY', 'AUTONOMY', 'RECOGNITION'], trailing: ['EXECUTION', 'FLEXIBILITY'] },
  { id: 'SPORT', name: '스포츠', riasec: ['R', 'S', 'E'], strength: ['PRA', 'INT'], value: ['ACHIEVEMENT', 'RELATIONSHIP'], trailing: ['PERSISTENCE', 'EXECUTION', 'SELF_CONTROL'] },
  { id: 'TOUR', name: '관광·호텔', riasec: ['E', 'S', 'C'], strength: ['INT', 'VER'], value: ['RELATIONSHIP', 'ACHIEVEMENT'], trailing: ['SOCIABILITY', 'ADAPTABILITY', 'EXECUTION'] },
  { id: 'CHILD', name: '아동·가족', riasec: ['S', 'A'], strength: ['INT', 'VER', 'OBS'], value: ['CONTRIBUTION', 'RELATIONSHIP'], trailing: ['COOPERATION', 'REFLECTION', 'PERSISTENCE'] },
]

export const CAREER_MAJOR_PROFILES: MajorProfile[] = RAW.map((row) => {
  const trailing = splitTrailing(row.trailing)
  return {
    id: row.id,
    name: row.name,
    riasecTarget: riasecTarget(row.riasec),
    strengthKeys: row.strength,
    valueKeys: row.value,
    behaviorKeys: trailing.behaviorKeys,
    problemSolvingKeys: trailing.problemSolvingKeys,
  }
})

export const CAREER_MAJOR_PROFILE_BY_ID = new Map(
  CAREER_MAJOR_PROFILES.map((profile) => [profile.id, profile]),
)
