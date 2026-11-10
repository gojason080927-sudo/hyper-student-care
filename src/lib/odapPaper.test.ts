/** 실행: npx tsx src/lib/odapPaper.test.ts */
import assert from 'node:assert/strict'
import { buildOdapPaper, type OdapItem } from './odapPaper'

const it = (id: string, status: OdapItem['status'], sub = 's' + id, level = '중'): OdapItem => ({
  id, no: id, unit: 'u', sub, level, date: '2026-11-01', status,
})
const items = [it('1', '남음'), it('2', '쌍둥이 대기'), it('3', '회수 완료'), it('4', '남음')]

// 체크한 문제 먼저, 모자라면 체크한 문제의 쌍둥이로 채움
let p = buildOdapPaper(items, new Set(['4', '1']), 5, false)
assert.deepEqual(p.map((s) => (s.kind === '오답' ? s.item.id : 't' + s.from.id)), ['1', '4', 't1', 't4', 't1'])
assert.equal(p[2].kind === '쌍둥이' && p[2].sub, 's1')

// 남은 오답만이면 회수 완료는 체크해도 빠짐, 포함이면 들어감
assert.equal(buildOdapPaper(items, new Set(['3']), 1, false)[0].kind, '쌍둥이')
assert.equal(buildOdapPaper(items, new Set(['3']), 1, true)[0].kind, '오답')

// 체크가 문제 수보다 많으면 문제 수만큼만
assert.equal(buildOdapPaper(items, new Set(['1', '2', '4']), 2, false).length, 2)

// 체크가 없으면 범위 안 오답 전체로 쌍둥이를 채움, 범위가 비면 빈 문제지
assert.equal(buildOdapPaper(items, new Set(), 3, false).every((s) => s.kind === '쌍둥이' && s.from.status !== '회수 완료'), true)
assert.equal(buildOdapPaper([], new Set(), 3, false).length, 0)
console.log('odapPaper ok')
