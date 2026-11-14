/**
 * v124 상향/소신/적정 판정·분산 선정 검증
 * npx tsx src/features/admissionAnalysis/utils/v124Recommendation.test.ts
 */
import assert from 'node:assert/strict'
import {
  V124_BAND_OFFSET,
  classifyV124Band,
  cutoffToHundredths,
  recommendV124Universities,
  splitCutoffWindow,
  v124BandCutoffWindow,
  v124BandLabel,
} from './v124Recommendation'
import { classifyV124RegionGroup, v124RegionRank } from './v124Region'
import { loadV124RecommendationRecords } from '../data/v124MasterData'
import type { V124RecommendationRecord } from '../types/v124Recommendation'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

function stub(partial: Partial<V124RecommendationRecord> & Pick<
  V124RecommendationRecord,
  'id' | 'universityName' | 'campus' | 'departmentName' | 'curriculumCutoff70'
>): V124RecommendationRecord {
  return {
    admissionType: '학생부교과',
    curriculumCompetitionRate: null,
    csatStatus: 'unverified',
    csatNote: '',
    comprehensiveCutoff70: null,
    comprehensiveCutoff50: null,
    comprehensiveCompetitionRate: null,
    ...partial,
  }
}

function bucketIndex(cut: number, buckets: Array<{ minC: number; maxC: number }>) {
  const c = cutoffToHundredths(cut)
  return buckets.findIndex((b) => c >= b.minC && c <= b.maxC)
}

section('S=2.00 확정 구간 · 초상향 제외')
assert.equal(V124_BAND_OFFSET.maxPerBand, 30)
assert.deepEqual(v124BandCutoffWindow(2, 'reach'), { minC: 180, maxC: 189 })
assert.deepEqual(v124BandCutoffWindow(2, 'ambitious'), { minC: 190, maxC: 199 })
assert.deepEqual(v124BandCutoffWindow(2, 'target'), { minC: 200, maxC: 215 })
assert.deepEqual(splitCutoffWindow(180, 189), [
  { minC: 180, maxC: 182 },
  { minC: 183, maxC: 185 },
  { minC: 186, maxC: 189 },
])
assert.deepEqual(splitCutoffWindow(190, 199), [
  { minC: 190, maxC: 192 },
  { minC: 193, maxC: 195 },
  { minC: 196, maxC: 199 },
])
assert.equal(classifyV124Band(2, 1.07), null)
assert.equal(classifyV124Band(2, 1.2), null)
assert.equal(classifyV124Band(2, 1.4), null)
assert.equal(classifyV124Band(2, 1.59), null)
assert.equal(classifyV124Band(2, 1.7), null)
assert.equal(classifyV124Band(2, 1.79), null)
assert.equal(classifyV124Band(2, 1.8), 'reach')
assert.equal(classifyV124Band(2, 1.89), 'reach')
assert.equal(classifyV124Band(2, 1.9), 'ambitious')
assert.equal(classifyV124Band(2, 1.99), 'ambitious')
assert.equal(classifyV124Band(2, 2), 'target')
assert.equal(classifyV124Band(2, 2.15), 'target')
assert.equal(classifyV124Band(2, 2.16), null)
assert.equal(v124BandLabel('reach'), '상향')
assert.equal(v124BandLabel('ambitious'), '소신')
assert.equal(v124BandLabel('target'), '적정')

section('구간 중복 없음')
for (const s of [1.4, 2, 2.5]) {
  const seen = new Map<number, string>()
  for (let c = 50; c <= 400; c += 1) {
    const band = classifyV124Band(s, c / 100)
    if (!band) continue
    const prev = seen.get(c)
    assert.equal(prev, undefined, `${s} cutoff ${c / 100} in ${prev} and ${band}`)
    seen.set(c, band)
  }
}

section('30개를 채우려고 구간을 넓히지 않음')
const few = recommendV124Universities({
  studentGrade9: 2,
  records: [
    stub({
      id: 'out-high',
      universityName: '제외대',
      campus: '서울',
      departmentName: '의예과',
      curriculumCutoff70: 1.07,
    }),
    stub({
      id: 'in-1',
      universityName: '서울테스트대',
      campus: '서울',
      departmentName: '경영학과',
      curriculumCutoff70: 1.8,
    }),
    stub({
      id: 'in-2',
      universityName: '서울테스트대',
      campus: '서울',
      departmentName: '컴퓨터공학과',
      curriculumCutoff70: 1.89,
    }),
    stub({
      id: 'out-sosin',
      universityName: '서울테스트대',
      campus: '서울',
      departmentName: '철학과',
      curriculumCutoff70: 1.9,
    }),
  ],
})
assert.equal(few.reach.length, 2)
assert.equal(few.ambitious.length, 1)
assert.equal(few.target.length, 0)

section('구간 내 23개면 23개만 · 30개로 채우지 않음')
const twentyThree: V124RecommendationRecord[] = []
for (let i = 0; i < 23; i += 1) {
  twentyThree.push(
    stub({
      id: `r23-${i}`,
      universityName: `구간내대${i}`,
      campus: '서울',
      departmentName: `학과${i}`,
      curriculumCutoff70: (180 + (i % 10)) / 100,
    }),
  )
}
twentyThree.push(
  stub({
    id: 'out-of-reach',
    universityName: '범위밖대',
    campus: '서울',
    departmentName: '의예과',
    curriculumCutoff70: 1.79,
  }),
)
const shortReach = recommendV124Universities({
  studentGrade9: 2,
  records: twentyThree,
})
assert.equal(shortReach.reach.length, 23)
assert.equal(shortReach.ambitious.length, 0)
for (const m of shortReach.reach) {
  const c = cutoffToHundredths(m.record.curriculumCutoff70)
  assert.ok(c >= 180 && c <= 189)
}

section('컷 한쪽 몰림 방지 · 세 소구간에서 고르게 선정')
const spreadRecords: V124RecommendationRecord[] = []
for (const [cut, prefix] of [
  [1.8, 'A'],
  [1.84, 'B'],
  [1.88, 'C'],
] as const) {
  for (let i = 0; i < 12; i += 1) {
    spreadRecords.push(
      stub({
        id: `${prefix}-${i}`,
        universityName: `${prefix}대학${i}`,
        campus: '서울',
        departmentName: `학과${i}`,
        curriculumCutoff70: cut,
      }),
    )
  }
}
const spread = recommendV124Universities({
  studentGrade9: 2,
  records: spreadRecords,
})
assert.equal(spread.reach.length, 30)
const reachCuts = spread.reach.map((m) => m.record.curriculumCutoff70)
assert.ok(reachCuts.includes(1.8))
assert.ok(reachCuts.includes(1.84))
assert.ok(reachCuts.includes(1.88))
assert.ok(reachCuts.filter((c) => c === 1.8).length < 30)

section('동일 대학 과다 반복 방지')
const oneUni: V124RecommendationRecord[] = []
for (let i = 0; i < 10; i += 1) {
  oneUni.push(
    stub({
      id: `same-${i}`,
      universityName: '반복대학교',
      campus: '서울',
      departmentName: `학과${i}`,
      curriculumCutoff70: 1.8 + (i % 10) * 0.01,
    }),
  )
}
for (let i = 0; i < 40; i += 1) {
  oneUni.push(
    stub({
      id: `other-${i}`,
      universityName: `다양대${i}`,
      campus: '서울',
      departmentName: '경영학과',
      curriculumCutoff70: 1.8 + (i % 10) * 0.01,
    }),
  )
}
const capped = recommendV124Universities({
  studentGrade9: 2,
  records: oneUni,
})
const repeatCount = capped.reach.filter(
  (m) => m.record.universityName === '반복대학교',
).length
assert.ok(repeatCount <= V124_BAND_OFFSET.maxPerUniversity)

section('지역 그룹')
assert.equal(classifyV124RegionGroup('서울', '건국대학교'), 'seoul')
assert.equal(classifyV124RegionGroup('인천', '인하대학교'), 'incheon-gyeonggi')
assert.equal(classifyV124RegionGroup('수원', '아주대학교'), 'incheon-gyeonggi')
assert.equal(
  classifyV124RegionGroup('대전', '국립공주대학교'),
  'regional-national',
)
assert.ok(v124RegionRank('seoul') < v124RegionRank('incheon-gyeonggi'))

section('소구간 안에서 서울이 인천/경기보다 앞')
const sample: V124RecommendationRecord[] = [
  stub({
    id: 'a',
    universityName: '수원테스트대',
    campus: '수원',
    departmentName: '경영학과',
    curriculumCutoff70: 1.81,
  }),
  stub({
    id: 'c',
    universityName: '서울테스트대',
    campus: '서울',
    departmentName: '컴퓨터공학과',
    curriculumCutoff70: 1.81,
    csatStatus: 'applied',
  }),
]
const r = recommendV124Universities({
  studentGrade9: 2,
  records: sample,
})
assert.equal(r.reach.length, 2)
assert.equal(r.reach[0]?.record.universityName, '서울테스트대')
assert.equal(r.reach[1]?.record.universityName, '수원테스트대')

section('MASTER 실데이터 · S=2.00 · 분산 · 최대 30')
const records = await loadV124RecommendationRecords()
const live = recommendV124Universities({ studentGrade9: 2, records })
assert.equal(live.ready, true)
assert.ok(live.reach.length <= 30)
assert.ok(live.ambitious.length <= 30)
assert.ok(live.target.length <= 30)
const forbidden = [1.07, 1.2, 1.4, 1.59, 1.7]
for (const m of [...live.reach, ...live.ambitious, ...live.target]) {
  assert.equal(m.band, classifyV124Band(2, m.record.curriculumCutoff70))
  assert.equal(forbidden.includes(m.record.curriculumCutoff70), false)
}
for (const m of live.reach) {
  const c = m.record.curriculumCutoff70
  assert.ok(c >= 1.8 && c <= 1.89, `상향 범위 밖 ${c}`)
}
for (const m of live.ambitious) {
  const c = m.record.curriculumCutoff70
  assert.ok(c >= 1.9 && c <= 1.99, `소신 범위 밖 ${c}`)
}
for (const m of live.target) {
  const c = m.record.curriculumCutoff70
  assert.ok(c >= 2 && c <= 2.15, `적정 범위 밖 ${c}`)
}

const reachBuckets = splitCutoffWindow(180, 189)
const ambitiousBuckets = splitCutoffWindow(190, 199)
const inBandReach = records.filter(
  (x) => classifyV124Band(2, x.curriculumCutoff70) === 'reach',
)
const inBandAmbitious = records.filter(
  (x) => classifyV124Band(2, x.curriculumCutoff70) === 'ambitious',
)
const availableReachBuckets = new Set(
  inBandReach.map((x) => bucketIndex(x.curriculumCutoff70, reachBuckets)),
)
const selectedReachBuckets = new Set(
  live.reach.map((m) => bucketIndex(m.record.curriculumCutoff70, reachBuckets)),
)
if (live.reach.length === 30 && availableReachBuckets.size >= 3) {
  assert.ok(
    selectedReachBuckets.size >= 3,
    `상향이 한쪽에 몰림: ${[...selectedReachBuckets].join(',')}`,
  )
}
const availableAmbitiousBuckets = new Set(
  inBandAmbitious.map((x) =>
    bucketIndex(x.curriculumCutoff70, ambitiousBuckets),
  ),
)
const selectedAmbitiousBuckets = new Set(
  live.ambitious.map((m) =>
    bucketIndex(m.record.curriculumCutoff70, ambitiousBuckets),
  ),
)
if (live.ambitious.length === 30 && availableAmbitiousBuckets.size >= 3) {
  assert.ok(
    selectedAmbitiousBuckets.size >= 3,
    `소신이 한쪽에 몰림: ${[...selectedAmbitiousBuckets].join(',')}`,
  )
}

function uniCounts(list: typeof live.reach) {
  const map = new Map<string, number>()
  for (const m of list) {
    map.set(m.record.universityName, (map.get(m.record.universityName) ?? 0) + 1)
  }
  return map
}
const reachUni = uniCounts(live.reach)
const uniqueReachUnis = new Set(inBandReach.map((x) => x.universityName)).size
if (uniqueReachUnis >= 8) {
  for (const [name, n] of reachUni) {
    assert.ok(n <= V124_BAND_OFFSET.maxPerUniversity, `${name} ${n}회`)
  }
}

assert.ok(records.length > 1000)
console.log(
  `2.00 상향=${live.reach.length} 소신=${live.ambitious.length} 적정=${live.target.length}`,
)
console.log(
  '상향 컷',
  live.reach.map((m) => m.record.curriculumCutoff70).join(', '),
)
console.log(
  '소신 컷',
  live.ambitious.map((m) => m.record.curriculumCutoff70).join(', '),
)
console.log(
  '적정 컷',
  live.target.map((m) => m.record.curriculumCutoff70).join(', '),
)
console.log(
  '상향 소구간',
  [...selectedReachBuckets].sort().join(','),
  '/ 소신 소구간',
  [...selectedAmbitiousBuckets].sort().join(','),
)

console.log('\nAll v124Recommendation tests passed.')
