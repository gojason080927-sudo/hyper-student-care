/**
 * 대학50 상담표 판정 — 스프레드시트와 동일 로직 검증
 * npx tsx src/features/admissionAnalysis/utils/universityCounselingAnalyzer.test.ts
 */
import assert from 'node:assert/strict'
import {
  analyzeUniversityCounselingTable,
  classifyCounselingStatus,
  counselingStatusLabel,
} from './universityCounselingAnalyzer'
import { listUniversityCounselingTable50 } from '../data/universityCounselingData'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

section('데이터 로드')
const rows = listUniversityCounselingTable50()
assert.equal(rows.length, 50)
assert.equal(rows[0]?.universityName, '서울대')
assert.ok(!rows.some((r) => r.universityName.includes('동신')))

section('판정 수식 (cut5=1.13 한양대)')
assert.equal(classifyCounselingStatus(1.03, 1.13), 'safe')
assert.equal(classifyCounselingStatus(1.18, 1.13), 'target')
assert.equal(classifyCounselingStatus(1.28, 1.13), 'ambitious')
assert.equal(classifyCounselingStatus(1.29, 1.13), 'reach')
assert.equal(counselingStatusLabel('ambitious'), '소신')
assert.equal(counselingStatusLabel('reach'), '상향')

section('학생 1.20')
{
  const r = analyzeUniversityCounselingTable({ studentGrade5: 1.2 })
  assert.equal(r.ready, true)
  assert.equal(r.all.length, 50)
  const names = (list: typeof r.ambitious) =>
    list.map((m) => m.row.universityName)
  console.log('소신', names(r.ambitious).join(', '))
  console.log('적정', names(r.target).join(', '))
  console.log(
    '안정(상위10)',
    names(r.safe).slice(0, 10).join(', '),
    `... total ${r.safe.length}`,
  )
  console.log('상향', names(r.reach).join(', '))
  assert.deepEqual(names(r.ambitious), ['고려대', '서강대', '한양대'])
  assert.ok(names(r.target).includes('성균관대'))
  assert.ok(names(r.target).includes('중앙대'))
  assert.deepEqual(names(r.reach), ['서울대', '연세대'])
  assert.ok(!r.all.some((m) => m.row.universityName.includes('동신')))
}

section('성적대별 요약')
for (const g of [1.2, 1.5, 1.8, 2.0, 2.5, 3.0]) {
  const r = analyzeUniversityCounselingTable({ studentGrade5: g })
  console.log(
    `${g.toFixed(2)} 소신=${r.ambitious.length} 적정=${r.target.length} 안정=${r.safe.length} 상향=${r.reach.length}`,
  )
}

console.log('\nOK universityCounselingAnalyzer.test.ts')
