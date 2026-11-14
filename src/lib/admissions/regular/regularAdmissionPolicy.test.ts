/**
 * 정시 정책 테스트 — 제외/중복/null/5학생
 * npx tsx src/lib/admissions/regular/regularAdmissionPolicy.test.ts
 */
import assert from 'node:assert/strict'
import { REGULAR_ADMISSION_MASTER } from '../../../data/admissions/regularAdmissionMaster'
import { loadRegularAdmissionMaster } from '../../../data/admissions/regularAdmissionRepository'
import { evaluateRegularAdmissionRow } from './evaluator'
import {
  isExcludedFromProductionRecommendation,
  isExcludedUniversity,
  recommendationUniqueKey,
} from './exclusions'
import { formatCount, formatGrade, formatScore } from './format'
import { buildStudentMetrics } from './metrics'
import { recommendRegularAdmission } from './recommender'
import { REGULAR_ADMISSION_THRESHOLDS } from './thresholds'
import { recommendationContinuityOk, recommendationContinuityGaps } from './continuity'
import { isMedicalSpecialGroup } from './fieldClassify'
import type {
  RegularAdmissionMasterRow,
  RegularAdmissionStudentInput,
  RegularRecommendationResult,
} from './types'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

function input(patch: Partial<RegularAdmissionStudentInput>): RegularAdmissionStudentInput {
  return {
    name: '테스트',
    school: '검증고',
    gradeYear: '고3',
    koreanStandardScore: null,
    koreanPercentile: null,
    mathSelection: '',
    mathStandardScore: null,
    mathPercentile: null,
    englishGrade: null,
    inquiry1Type: '',
    inquiry1Name: '',
    inquiry1StandardScore: null,
    inquiry1Percentile: null,
    inquiry2Type: '',
    inquiry2Name: '',
    inquiry2StandardScore: null,
    inquiry2Percentile: null,
    historyGrade: null,
    ...patch,
  }
}

function percentileAdmissionLevel(row: RegularAdmissionMasterRow): number | null {
  if (row.averagePercentile70 != null) return row.averagePercentile70
  const subjects = [row.korean70, row.math70, row.inquiryAverage70, row.inquiry1_70, row.inquiry2_70].filter(
    (v): v is number => v != null,
  )
  if (subjects.length === 0) return null
  return subjects.reduce((a, b) => a + b, 0) / subjects.length
}

function meanPercentileLevel(result: RegularRecommendationResult): number | null {
  const rows = [...result.reach, ...result.ambitious, ...result.target].map((m) => m.evaluation.row)
  const vals = rows
    .map(percentileAdmissionLevel)
    .filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function allMatches(result: RegularRecommendationResult) {
  return [...result.reach, ...result.ambitious, ...result.target]
}

section('null은 0으로 표시·비교하지 않음')
assert.equal(formatScore(null), '-')
assert.equal(formatCount(null), '-')
assert.equal(formatGrade(null), '-')
assert.equal(formatScore(0), '0.0')
const emptyMetrics = buildStudentMetrics(input({}))
assert.equal(emptyMetrics.koreanPercentile, null)
assert.equal(emptyMetrics.mathPercentile, null)
assert.equal(emptyMetrics.inquiry1Percentile, null)
assert.equal(emptyMetrics.inquiryAveragePercentile, null)

section('제외 대학 7곳')
for (const name of [
  '서경대학교',
  '협성대학교',
  '대진대학교',
  '강남대학교',
  '성결대학교',
  '용인대학교',
  '한신대학교',
  '서경대',
  '용인대',
]) {
  assert.equal(isExcludedUniversity(name), true, name)
}
assert.equal(isExcludedUniversity('서울대'), false)

section('예체능·실기·신학 계열 제외')
assert.equal(
  isExcludedFromProductionRecommendation({
    university: '검증대',
    department: '체육학과',
    excludeCategory: 'arts',
    fieldTrack: '예체능',
  }),
  true,
)
assert.equal(
  isExcludedFromProductionRecommendation({
    university: '검증대',
    department: '실기전형',
    excludeCategory: 'practical',
    fieldTrack: '실기',
  }),
  true,
)
assert.equal(
  isExcludedFromProductionRecommendation({
    university: '검증대',
    department: '신학과',
    excludeCategory: 'theology',
    fieldTrack: '신학',
  }),
  true,
)

section('대학환산 공식 미재현 시 비교 불가')
const converted = REGULAR_ADMISSION_MASTER.find((r) => r.id === 'test-converted-only')
assert.ok(converted)
const incomplete = {
  ...converted,
  englishCalculationType: 'NONE' as const,
  englishConversionTable: null,
}
const skippedConverted = evaluateRegularAdmissionRow(
  incomplete,
  buildStudentMetrics(
    input({
      koreanStandardScore: 135,
      mathStandardScore: 128,
      mathSelection: '미적분',
      inquiry1StandardScore: 68,
      inquiry2StandardScore: 66,
      englishGrade: 2,
    }),
  ),
)
assert.equal(skippedConverted.skipped, true)
assert.equal(skippedConverted.skipReason, '대학환산점수 직접 비교 불가')

section('PRODUCTION 제외·중복·null 유지')
const production = await loadRegularAdmissionMaster()
assert.equal(REGULAR_ADMISSION_THRESHOLDS.maxPerBand, 30)

const excludedUnis = production.filter((r) => isExcludedUniversity(r.university))
assert.equal(excludedUnis.length, 0, `제외 대학이 MASTER에 남아 추천 후보에 포함됨: ${excludedUnis.map((r) => r.university).join(',')}`)

const excludedTracks = production.filter((r) =>
  isExcludedFromProductionRecommendation(r),
)
const recFromProduction = recommendRegularAdmission({
  metrics: buildStudentMetrics(
    input({
      koreanPercentile: 96,
      mathPercentile: 92,
      mathSelection: '미적분',
      englishGrade: 1,
      inquiry1Percentile: 95,
      inquiry2Percentile: 94,
      historyGrade: 1,
    }),
  ),
  records: production,
})
for (const m of allMatches(recFromProduction)) {
  assert.equal(isExcludedFromProductionRecommendation(m.evaluation.row), false)
  assert.equal(isExcludedUniversity(m.evaluation.row.university), false)
}

const keys = production.map(recommendationUniqueKey)
assert.equal(keys.length, new Set(keys).size, '변환 단계 중복 키')

const recKeys = allMatches(recFromProduction).map((m) =>
  recommendationUniqueKey(m.evaluation.row),
)
assert.equal(recKeys.length, new Set(recKeys).size, '추천 단계 중복 키')

assert.ok(production.every((r) => r.korean70 !== 0 || r.korean70 === 0))
const nullKorean = production.filter((r) => r.korean70 == null)
assert.ok(nullKorean.every((r) => r.korean70 !== 0))
assert.ok(production.every((r) => r.korean70 == null || Number.isFinite(r.korean70)))
assert.ok(production.every((r) => r.fillCount == null || Number.isFinite(r.fillCount)))
assert.ok(production.every((r) => typeof r.sourceUrl === 'string'))

section('상담 테스트 성적 92/95/91/88 — 구간 연속·다양성')
const counselingMetrics = buildStudentMetrics(
  input({
    koreanPercentile: 92,
    mathPercentile: 95,
    mathSelection: '미적분',
    englishGrade: 2,
    inquiry1Percentile: 91,
    inquiry2Percentile: 88,
    historyGrade: 2,
  }),
)
const counseling = recommendRegularAdmission({
  metrics: counselingMetrics,
  records: production,
})
{
  let near = 0
  let nearReach = 0
  let nearTarget = 0
  for (const row of production) {
    const ev = evaluateRegularAdmissionRow(row, counselingMetrics)
    if (ev.skipped || ev.supportGap == null || ev.confidenceLevel === 'D' || !ev.eligibilityOk) continue
    const g = ev.supportGap
    if (g >= -1.2 && g <= 1.2) near += 1
    if (g >= -4 && g < -0.3) nearReach += 1
    if (g >= 0.3 && g <= 4) nearTarget += 1
  }
  console.log(`비교가능 후보 소신창=${near} 상향창=${nearReach} 적정창=${nearTarget}`)
}
assert.ok(counseling.ambitious.length >= 1, '소신이 비어 있음')
assert.ok(counseling.reach.length <= 30 && counseling.ambitious.length <= 30 && counseling.target.length <= 30)
assert.equal(
  recommendationContinuityOk(counseling),
  true,
  `구간 단절: ${JSON.stringify(recommendationContinuityGaps(counseling))}`,
)
for (const m of counseling.reach) {
  assert.ok((m.evaluation.supportGap ?? 0) >= -4 && (m.evaluation.supportGap ?? 0) < -0.3)
}
for (const m of counseling.ambitious) {
  assert.ok(Math.abs(m.evaluation.supportGap ?? 99) <= 1.2)
}
for (const m of counseling.target) {
  const g = m.evaluation.supportGap ?? 99
  assert.ok(g >= 0.3 && g <= 4, `적정 gap ${g} 이 허용 범위 밖`)
  assert.ok(g <= 4.0001, '적정에 +5 이상 모집단위가 포함됨')
}
for (const band of ['reach', 'ambitious', 'target'] as const) {
  const list = band === 'reach' ? counseling.reach : band === 'ambitious' ? counseling.ambitious : counseling.target
  const uniCount = new Map<string, number>()
  let medical = 0
  for (const m of list) {
    const uni = m.evaluation.row.university
    uniCount.set(uni, (uniCount.get(uni) ?? 0) + 1)
    if (isMedicalSpecialGroup(m.evaluation.row)) medical += 1
  }
  for (const [uni, n] of uniCount) {
    assert.ok(n <= 4, `${band} ${uni} ${n}개 — 동일 대학 과다`)
  }
  assert.ok(medical <= 5, `${band} 의약계열 ${medical}개`)
}
const cutRange = (list: typeof counseling.reach) => {
  const c = list
    .map((m) => m.evaluation.cutoffValue)
    .filter((v): v is number => v != null && v <= 100)
  if (!c.length) return '-'
  return `${Math.min(...c).toFixed(1)}~${Math.max(...c).toFixed(1)}`
}
console.log(
  `상담성적 상향=${counseling.reach.length}(${cutRange(counseling.reach)}) 소신=${counseling.ambitious.length}(${cutRange(counseling.ambitious)}) 적정=${counseling.target.length}(${cutRange(counseling.target)})`,
)
for (const [label, list] of [
  ['상향', counseling.reach],
  ['소신', counseling.ambitious],
  ['적정', counseling.target],
] as const) {
  console.log(
    list
      .slice(0, 10)
      .map(
        (m, i) =>
          `${label}${i + 1} ${m.evaluation.row.university} ${m.evaluation.row.department} cut=${m.evaluation.cutoffValue} gap=${m.evaluation.supportGap?.toFixed(1)}`,
      )
      .join('\n'),
  )
}

section('5명 성적대 — 성적이 높을수록 추천 입결 수준 상승')
const students: Array<{ label: string; patch: Partial<RegularAdmissionStudentInput> }> = [
  {
    label: '최상위권',
    patch: {
      koreanPercentile: 99,
      mathPercentile: 98,
      mathSelection: '미적분',
      englishGrade: 1,
      inquiry1Percentile: 99,
      inquiry2Percentile: 98,
      historyGrade: 1,
    },
  },
  {
    label: '상위권',
    patch: {
      koreanPercentile: 92,
      mathPercentile: 90,
      mathSelection: '미적분',
      englishGrade: 2,
      inquiry1Percentile: 91,
      inquiry2Percentile: 90,
      historyGrade: 2,
    },
  },
  {
    label: '중상위권',
    patch: {
      koreanPercentile: 85,
      mathPercentile: 82,
      mathSelection: '미적분',
      englishGrade: 2,
      inquiry1Percentile: 84,
      inquiry2Percentile: 83,
      historyGrade: 2,
    },
  },
  {
    label: '중위권',
    patch: {
      koreanPercentile: 75,
      mathPercentile: 72,
      mathSelection: '확률과통계',
      englishGrade: 3,
      inquiry1Percentile: 74,
      inquiry2Percentile: 70,
      historyGrade: 3,
    },
  },
  {
    label: '하위권',
    patch: {
      koreanPercentile: 60,
      mathPercentile: 55,
      mathSelection: '확률과통계',
      englishGrade: 4,
      inquiry1Percentile: 58,
      inquiry2Percentile: 55,
      historyGrade: 4,
    },
  },
]

const levels: Array<{ label: string; mean: number; targetMax: number | null; result: RegularRecommendationResult }> = []
for (const student of students) {
  const result = recommendRegularAdmission({
    metrics: buildStudentMetrics(input(student.patch)),
    records: production,
  })
  const mean = meanPercentileLevel(result)
  assert.ok(mean != null, `${student.label} 비교 가능한 백분위 입결이 없음`)
  const targetLevels = result.target
    .map((m) => percentileAdmissionLevel(m.evaluation.row))
    .filter((v): v is number => v != null)
  const targetMax = targetLevels.length ? Math.max(...targetLevels) : null
  levels.push({ label: student.label, mean, targetMax, result })
  const recKeysStudent = allMatches(result).map((m) => recommendationUniqueKey(m.evaluation.row))
  assert.equal(recKeysStudent.length, new Set(recKeysStudent).size, `${student.label} 중복 추천`)
  assert.ok(result.reach.length <= 30)
  assert.ok(result.ambitious.length <= 30)
  assert.ok(result.target.length <= 30)
  for (const m of allMatches(result)) {
    assert.notEqual(m.evaluation.dataQuality, undefined)
    if (m.evaluation.cutoffValue == null) {
      assert.fail(`${student.label} 공식 미공개 컷을 비교값으로 사용`)
    }
  }
}

for (let i = 0; i < levels.length - 1; i += 1) {
  assert.ok(
    levels[i].mean + 0.4 >= levels[i + 1].mean,
    `${levels[i].label} 평균입결 ${levels[i].mean.toFixed(2)} 이 ${levels[i + 1].label} ${levels[i + 1].mean.toFixed(2)} 보다 낮으면 안 됨`,
  )
}

const top = levels[0]
const low = levels[levels.length - 1]
if (top.targetMax != null && low.targetMax != null) {
  assert.ok(
    top.targetMax + 1 >= low.targetMax,
    `최상위권 적정 최고입결 ${top.targetMax} 이 하위권 ${low.targetMax} 보다 낮음`,
  )
}
assert.ok(
  top.mean >= 80,
  `최상위권 추천 평균입결이 너무 낮음: ${top.mean}`,
)
assert.ok(
  low.mean <= top.mean,
  '하위권 추천 평균입결이 최상위권보다 높음',
)

section('제외 대상이 추천 결과에 없음')
assert.equal(excludedTracks.some((r) => allMatches(recFromProduction).some((m) => m.evaluation.row.id === r.id)), false)

console.log('\n정시 정책 테스트 PASS')
console.log(
  levels
    .map((l) => `${l.label} mean=${l.mean.toFixed(1)} 상향=${l.result.reach.length} 소신=${l.result.ambitious.length} 적정=${l.result.target.length}`)
    .join('\n'),
)
