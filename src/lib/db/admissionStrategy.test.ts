/**
 * 실행: node --experimental-strip-types src/lib/db/admissionStrategy.test.ts
 */
import assert from 'node:assert/strict'
import {
  admissionStrategyFromRow,
  filterAdmissionStrategyByTrack,
  filterPublishedAdmissionStrategyPosts,
  parseParentAdmissionStrategyPosts,
  type AdmissionStrategyRow,
} from './admissionStrategyModel.ts'

const row: AdmissionStrategyRow = {
  id: 'p1',
  track: '고입',
  title: '고입 일정',
  content: '본문',
  published_at: '2026-09-04',
  is_published: true,
  author_name: '강사',
  created_at: '2026-09-04T00:00:00Z',
  updated_at: '2026-09-04T00:00:00Z',
}

const mapped = admissionStrategyFromRow(row)
assert.equal(mapped.track, '고입')
assert.equal(mapped.publishedAt, '2026-09-04')
assert.equal(mapped.isPublished, true)

const mixed = [
  mapped,
  { ...mapped, id: 'p2', track: '대입' as const, isPublished: false },
  { ...mapped, id: 'p3', track: '대입' as const, isPublished: true },
]

assert.deepEqual(
  filterPublishedAdmissionStrategyPosts(mixed).map((item) => item.id),
  ['p1', 'p3'],
)
assert.deepEqual(
  filterAdmissionStrategyByTrack(mixed, '대입').map((item) => item.id),
  ['p2', 'p3'],
)

const parsed = parseParentAdmissionStrategyPosts([
  {
    id: 'a',
    track: '대입',
    title: '정시 안내',
    content: '내용',
    published_at: '2026-09-01',
    author_name: '원장',
    is_published: false,
  },
  { id: '', track: '고입', title: '무시' },
])
assert.equal(parsed.length, 1)
assert.equal(parsed[0]?.track, '대입')
assert.equal(parsed[0]?.title, '정시 안내')
assert.ok(!('isPublished' in parsed[0]!))

assert.deepEqual(parseParentAdmissionStrategyPosts(null), [])

console.log('admissionStrategy OK')
