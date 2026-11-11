/** 실행: npx tsx src/lib/questionBank.test.ts */
import assert from 'node:assert/strict'
import { handleQuestionBank, verifyTeacher } from '../../api/question-bank'
import { apportion, fixPercents, generate, swap, toBankProblem, type BankProblem, type BankRow } from './questionBank'

const mk = (typeId: string, level: number, n: number, format: BankProblem['format'] = '단답형'): BankProblem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${typeId}-${level}-${i}`, code: 'HQB', typeId, level, format, text: 't' }))
const all = new Set(['객관식', '단답형', '서술형'])
const pct = [10, 20, 30, 25, 10, 5]
const big = ['A', 'B', 'C'].flatMap((t) => [0, 1, 2, 3, 4, 5].flatMap((lv) => mk(t, lv, 20)))

// 총 문제 수 일치·중복 없음·같은 난수면 같은 출제
let g = generate(big, ['A', 'B', 'C'], 40, pct, all, 7)
assert.equal(g.items.length, 40)
assert.equal(new Set(g.items.map((p) => p.id)).size, 40)
assert.deepEqual(generate(big, ['A', 'B', 'C'], 40, pct, all, 7).items, g.items)
assert.equal(g.shortage, 0)
assert.equal(g.substituted, 0)
// 난이도 비율: 문제 수가 넉넉하면 목표와 ±1 이내
const want = apportion(40, pct)
for (let lv = 0; lv < 6; lv++) assert.ok(Math.abs(g.items.filter((p) => p.level === lv).length - want[lv]) <= 1, `level ${lv}`)
// 유형에 고르게(40/3 → 14·13·13)
const per = ['A', 'B', 'C'].map((t) => g.items.filter((p) => p.typeId === t).length).sort()
assert.deepEqual(per, [13, 13, 14])

// 부족 시 인접 난이도 대체: '상' 문제가 없으면 가까운 난이도로
const noHard = mk('A', 2, 30).concat(mk('A', 3, 30))
g = generate(noHard, ['A'], 20, [0, 0, 0, 0, 100, 0], all, 1)
assert.equal(g.items.length, 20)
assert.equal(g.substituted, 20)
assert.ok(g.items.every((p) => p.level === 3))
// 유형 안 문제가 모자라면 다른 유형이 채우고, 전체가 모자라면 가능한 만큼 + 부족 수
g = generate(mk('A', 2, 3).concat(mk('B', 2, 30)), ['A', 'B'], 20, pct, all, 1)
assert.equal(g.items.filter((p) => p.typeId === 'A').length, 3)
assert.equal(g.items.length, 20)
g = generate(mk('A', 2, 5), ['A'], 20, pct, all, 1)
assert.equal(g.items.length, 5)
assert.equal(g.shortage, 15)
// 형식 필터
assert.equal(generate(mk('A', 2, 5, '객관식'), ['A'], 3, pct, new Set(['단답형']), 1).items.length, 0)
assert.deepEqual(fixPercents([10, 10, 0, 0, 0, 0]), [50, 50, 0, 0, 0, 0])

// 바꾸기: 같은 유형·같은 난이도의 안 쓴 문제 → 없으면 인접 난이도 → 없으면 null
const items = mk('A', 2, 1)
const sw = swap(mk('A', 2, 2).concat(mk('A', 3, 1)), items, 0, 3)
assert.ok(sw && sw.item.id === 'A-2-1' && !sw.near)
const sw2 = swap(mk('A', 2, 1).concat(mk('A', 3, 1)), items, 0, 3)
assert.ok(sw2 && sw2.item.level === 3 && sw2.near)
assert.equal(swap(items, items, 0, 3), null)

// 출제 대상 판정: 그림만·검수 필요·정답 없음·보기 없는 객관식 제외
const row = (o: Partial<BankRow['problem_versions']> = {}, meta: Record<string, unknown> = {}): BankRow => ({
  hyper_problem_type_id: 'A',
  problem_versions: {
    id: 'v', problem_text: '$x$의 값은? ① 1 ② 2 ③ 3 ④ 4 ⑤ 5', item_format: 'MULTIPLE_CHOICE', review_status: 'UNREVIEWED', content_metadata: meta,
    problems: { public_code: 'HQB-1', review_status: 'UNREVIEWED', archived_at: null, current_version_id: 'v' },
    problem_answers: [{ id: 'a' }], problem_assets: [], problem_classification_meta: { difficulty_level: 4 }, problem_difficulty: [], ...o,
  },
})
const ok = toBankProblem(row())
assert.ok(typeof ok !== 'string' && ok.level === 3 && ok.format === '객관식')
assert.equal(toBankProblem(row({}, { image_only: true })), '그림만')
assert.equal(toBankProblem(row({ review_status: 'NEEDS_REVIEW' })), '검수 필요')
assert.equal(toBankProblem(row({ problem_answers: [] })), '정답 없음')
assert.equal(toBankProblem(row({ problem_text: '$x$의 값은?' })), '객관식 보기 없음')
assert.equal(toBankProblem(row({ problem_text: '그림과 같이 … 구하시오.', item_format: 'SHORT_ANSWER' })), '그림 필요한데 그림 없음')

// 학생 계정 읽기 차단: 로그인 토큰이 없거나 앱이 강사로 확인해 주지 않으면 401, 문제은행은 읽지 않는다
const env = { appUrl: 'https://app.example', appAnonKey: 'anon', bankUrl: 'https://bank.example', bankKey: 'svc' }
const noUser = (async () => new Response('{}', { status: 401 })) as typeof fetch
assert.equal(await verifyTeacher('', env, noUser), false)
assert.equal(await verifyTeacher('student-or-anon', env, noUser), false)
assert.equal(await verifyTeacher('t', env, (async () => new Response('{"id":"u1"}')) as typeof fetch), true)
const realFetch = globalThis.fetch
globalThis.fetch = noUser
try {
  assert.equal((await handleQuestionBank(new Request('http://x/api/question-bank'), env)).status, 401)
  assert.equal((await handleQuestionBank(new Request('http://x/api/question-bank', { headers: { Authorization: 'Bearer anon-key' } }), env)).status, 401)
} finally {
  globalThis.fetch = realFetch
}
console.log('questionBank ok')
