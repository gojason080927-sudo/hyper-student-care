// 문제은행(hyper-question-bank DB) → 강사앱 문제지 만들기: 출제 대상 판정·자동 출제·바꾸기 (화면·API 공용, 순수 함수)

export const LEVELS = ['하', '중하', '중', '중상', '상', '최상'] as const
export const FORMATS = ['객관식', '단답형', '서술형'] as const
export type Format = (typeof FORMATS)[number]

export type BankType = { id: string; code: string; name: string; sub: string }
export type BankProblem = { id: string; code: string; typeId: string; level: number; format: Format; text: string; image?: string }
export type BankData = { types: BankType[]; problems: BankProblem[]; excluded: Record<string, number> }

/** 공통수학2 대단원·소단원 이름 (DB curriculum_nodes에 소단원 28개가 없어 분류나무 확정안 v3에서 옮김) */
export const CM2_UNITS: { no: string; name: string; subs: [string, string][] }[] = [
  { no: '05', name: '집합의 뜻과 집합 사이의 포함 관계', subs: [['05-1', '집합의 뜻과 표현'], ['05-2', '집합의 원소의 개수'], ['05-3', '부분집합'], ['05-4', '서로 같은 집합'], ['05-5', '부분집합의 개수']] },
  { no: '06', name: '집합의 연산', subs: [['06-1', '합집합과 교집합'], ['06-2', '여집합과 차집합'], ['06-3', '집합의 연산의 성질'], ['06-4', '집합의 연산 법칙'], ['06-5', '드모르간 법칙'], ['06-6', '유한집합의 원소의 개수']] },
  { no: '07', name: '명제', subs: [['07-1', '명제와 조건'], ['07-2', '명제 p → q의 참, 거짓'], ['07-3', '‘모든’이나 ‘어떤’을 포함한 명제'], ['07-4', '명제의 역과 대우'], ['07-5', '충분조건과 필요조건'], ['07-6', '명제의 증명'], ['07-7', '절대부등식']] },
  { no: '08', name: '함수', subs: [['08-1', '함수'], ['08-2', '여러 가지 함수'], ['08-3', '합성함수'], ['08-4', '역함수']] },
  { no: '09', name: '유리함수', subs: [['09-2', '유리식의 계산'], ['09-5', '유리함수 y=k/(x-p)+q (k≠0)의 그래프']] },
  { no: '10', name: '무리함수', subs: [['10-1', '무리식의 뜻'], ['10-2', '무리식의 계산'], ['10-3', '무리함수'], ['10-5', '무리함수 y=√(a(x-p))+q (a≠0)의 그래프']] },
]

/** API가 받는 한 줄: problem_type_assignments(주 유형) + problem_versions 묶음 */
export type BankRow = {
  hyper_problem_type_id: string
  problem_versions: {
    id: string
    problem_text: string
    item_format: string
    review_status: string
    content_metadata: Record<string, unknown> | null
    problems: { public_code: string; review_status: string; archived_at: string | null; current_version_id: string | null } | null
    problem_answers: { id: string }[]
    problem_assets: { storage_path: string | null }[]
    problem_classification_meta: { difficulty_level: number | null } | { difficulty_level: number | null }[] | null
    problem_difficulty: { overall_difficulty: number | null }[]
  }
}

const BAD_REVIEW = new Set(['NEEDS_REVIEW', 'REJECTED'])

/** 출제 대상이면 문제, 아니면 뺀 이유(한국어). 정답 글은 받지도 돌려주지도 않는다(있는지만 본다). */
export function toBankProblem(row: BankRow): BankProblem | string {
  const v = row.problem_versions
  const p = v.problems
  const meta = v.content_metadata ?? {}
  if (!p || p.archived_at || p.current_version_id !== v.id) return '보관·옛 버전'
  // shortcut: DB에 VERIFIED 문제가 아직 없어 '검수 필요·반려'만 뺀다. 검수 완료 표시가 쌓이면 VERIFIED만 남기도록 바꾼다
  if (BAD_REVIEW.has(p.review_status) || BAD_REVIEW.has(v.review_status)) return '검수 필요'
  if (meta.image_only) return '그림만'
  if (!v.problem_answers?.length) return '정답 없음'
  const text = (v.problem_text ?? '').trim()
  if (!text) return '문제 글 없음'
  if (/그림/.test(text) && !v.problem_assets?.length) return '그림 필요한데 그림 없음'
  const format: Format =
    v.item_format === 'MULTIPLE_CHOICE' ? '객관식' : v.item_format === 'CONSTRUCTED_RESPONSE' || meta.question_form === '서술형' ? '서술형' : '단답형'
  if (format === '객관식' && !text.includes('①')) return '객관식 보기 없음'
  const cm = Array.isArray(v.problem_classification_meta) ? v.problem_classification_meta[0] : v.problem_classification_meta
  // shortcut: 6단계 난이도 값이 DB에 아직 없어 5단계 분류값(1~5)을 하~상으로 옮긴다(최상 없음). 6단계 값이 들어오면 그 값을 쓴다
  const raw = cm?.difficulty_level ?? Math.round(v.problem_difficulty?.[0]?.overall_difficulty ?? 3)
  const level = Math.min(5, Math.max(1, raw)) - 1
  const image = v.problem_assets?.[0]?.storage_path ?? undefined
  return { id: v.id, code: p.public_code, typeId: row.hyper_problem_type_id, level, format, text, image }
}

/** 문제 글을 본문과 보기(①~⑤)로 나눈다 */
export function splitChoices(text: string): { stem: string; choices: string[] } {
  const i = text.indexOf('①')
  if (i < 0) return { stem: text, choices: [] }
  return { stem: text.slice(0, i).trim(), choices: text.slice(i + 1).split(/[②③④⑤]/).map((s) => s.trim()) }
}

/** 시드 난수(mulberry32) */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 개수 n을 비율(가중치)대로 정수로 나눈다(최대 나머지 방식) */
export function apportion(n: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const exact = weights.map((w) => (n * w) / sum)
  const out = exact.map(Math.floor)
  const order = exact.map((e, i) => [e - Math.floor(e), i]).sort((a, b) => b[0] - a[0])
  for (let k = 0; out.reduce((a, b) => a + b, 0) < n; k++) out[order[k % order.length][1]]++
  return out
}

/** 난이도 % 6칸을 합계 100으로 맞춘다 */
export const fixPercents = (p: number[]) => apportion(100, p.some((x) => x > 0) ? p : [1, 1, 1, 1, 1, 1])

/** 가까운 난이도 순서(같은 난이도 → ±1(쉬운 쪽 먼저) → ±2 …) */
const nearLevels = (lv: number) => [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5].map((d) => lv + d).filter((x) => x >= 0 && x < 6)

function pickNear(pool: BankProblem[], used: Set<string>, level: number, rand: () => number): BankProblem | null {
  for (const lv of nearLevels(level)) {
    const c = pool.filter((p) => p.level === lv && !used.has(p.id))
    if (c.length) return c[Math.floor(rand() * c.length)]
  }
  return null
}

export type Generated = { items: BankProblem[]; shortage: number; substituted: number }

/**
 * 자동 출제: 고른 유형에 문제 수를 고르게 나누고(남는 수·모자란 유형 몫은 문제가 많은 유형부터),
 * 유형 안에서는 난이도 비율대로 무작위로 뽑는다. 모자란 난이도는 가까운 난이도에서 채운다. 중복 없음.
 */
export function generate(pool: BankProblem[], typeIds: string[], count: number, percents: number[], formats: Set<string>, seed: number): Generated {
  const rand = rng(seed)
  const byType = typeIds
    .map((id) => ({ id, ps: pool.filter((p) => p.typeId === id && formats.has(p.format)) }))
    .filter((t) => t.ps.length)
    .sort((a, b) => b.ps.length - a.ps.length)
  const quota = byType.map(() => 0)
  for (let given = 0, moved = true; given < count && moved; ) {
    moved = false
    for (let i = 0; i < byType.length && given < count; i++) {
      if (quota[i] < byType[i].ps.length) {
        quota[i]++
        given++
        moved = true
      }
    }
  }
  // 난이도 몫은 전체 문제 수 기준으로 정하고 유형마다 돌아가며 나눠 준다(유형별 반올림으로 '중'에 쏠리지 않게)
  const total = quota.reduce((a, b) => a + b, 0)
  const need = byType.map(() => [] as number[])
  let t = 0
  for (const lv of apportion(total, percents).flatMap((n, lv) => Array<number>(n).fill(lv))) {
    while (need[t].length >= quota[t]) t = (t + 1) % byType.length
    need[t].push(lv)
    t = (t + 1) % byType.length
  }
  const used = new Set<string>()
  const items: BankProblem[] = []
  let substituted = 0
  byType.forEach((ty, i) => {
    for (const lv of need[i]) {
      const p = pickNear(ty.ps, used, lv, rand)
      if (!p) continue
      if (p.level !== lv) substituted++
      used.add(p.id)
      items.push(p)
    }
  })
  const order = new Map(typeIds.map((id, i) => [id, i]))
  items.sort((a, b) => (order.get(a.typeId) ?? 0) - (order.get(b.typeId) ?? 0) || a.level - b.level)
  return { items, shortage: count - items.length, substituted }
}

/** [바꾸기]: 같은 유형·같은 난이도의 안 쓴 문제, 없으면 같은 유형의 가까운 난이도 */
export function swap(pool: BankProblem[], items: BankProblem[], index: number, seed: number): { item: BankProblem; near: boolean } | null {
  const cur = items[index]
  const used = new Set(items.map((p) => p.id))
  const p = pickNear(pool.filter((x) => x.typeId === cur.typeId && x.format === cur.format), used, cur.level, rng(seed))
  return p && { item: p, near: p.level !== cur.level }
}
