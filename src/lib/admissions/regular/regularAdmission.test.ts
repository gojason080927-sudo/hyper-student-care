/**
 * 정시 분석 엔진 TEST A–G
 * npx tsx src/lib/admissions/regular/regularAdmission.test.ts
 */
import assert from 'node:assert/strict'
import { REGULAR_ADMISSION_MASTER } from '../../../data/admissions/regularAdmissionMaster'
import { loadRegularAdmissionMaster } from '../../../data/admissions/regularAdmissionRepository'
import { PRODUCTION_REGULAR_ADMISSION_COUNT } from '../../../data/admissions/regularAdmissionProductionAdapter'
import { classifyAveragePercentile } from './classifier'
import { convertEnglishGrade } from './english'
import { evaluateRegularAdmissionRow } from './evaluator'
import { officialInquiryCutoff, studentInquiryValue } from './inquiry'
import { buildStudentMetrics } from './metrics'
import { recommendRegularAdmission } from './recommender'
import { REGULAR_ADMISSION_THRESHOLDS } from './thresholds'
import type { RegularAdmissionMasterRow, RegularAdmissionStudentInput } from './types'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

function baseInput(
  patch: Partial<RegularAdmissionStudentInput> = {},
): RegularAdmissionStudentInput {
  return {
    name: '테스트',
    school: '검증고',
    gradeYear: '고3',
    koreanStandardScore: null,
    koreanPercentile: 96,
    mathSelection: '미적분',
    mathStandardScore: null,
    mathPercentile: 72,
    englishGrade: 2,
    inquiry1Type: '과학탐구',
    inquiry1Name: '지구과학Ⅰ',
    inquiry1StandardScore: null,
    inquiry1Percentile: 95,
    inquiry2Type: '과학탐구',
    inquiry2Name: '생명과학Ⅰ',
    inquiry2StandardScore: null,
    inquiry2Percentile: 94,
    historyGrade: 2,
    ...patch,
  }
}

function mustFind(rows: RegularAdmissionMasterRow[], id: string): RegularAdmissionMasterRow {
  const row = rows.find((r) => r.id === id)
  assert.ok(row, `MASTER row missing: ${id}`)
  return row
}

section('studentMetrics 파생값 — 영어는 평균백분위에 넣지 않음')
const metricsA = buildStudentMetrics(baseInput())
assert.equal(metricsA.inquiryAveragePercentile, 94.5)
assert.equal(metricsA.inquiryBestPercentile, 95)
assert.equal(metricsA.koreanMathInquiryAverage, (96 + 72 + 94.5) / 3)
assert.equal(metricsA.scienceInquiryCount, 2)
assert.equal(metricsA.fourDomainPercentileAverage, (96 + 72 + 95 + 94) / 4)
assert.ok(
  metricsA.fourDomainPercentileAverage !==
    (96 + 72 + 94.5 + 96) / 4,
  '영어 등급을 백분위로 환산해 평균에 넣으면 안 됨',
)

section('TEST A — 동일 평균이 아니라 반영비율로 공대/인문 유불리')
const records = REGULAR_ADMISSION_MASTER
const eng = evaluateRegularAdmissionRow(mustFind(records, 'test-eng-weighted'), metricsA)
const hum = evaluateRegularAdmissionRow(mustFind(records, 'test-hum-weighted'), metricsA)
assert.equal(eng.skipped, false, eng.skipReason ?? '')
assert.equal(hum.skipped, false, hum.skipReason ?? '')
assert.ok(eng.supportGap != null && hum.supportGap != null)
assert.ok(
  eng.supportGap < hum.supportGap,
  `공대 gap ${eng.supportGap} 이 인문 gap ${hum.supportGap} 보다 작아야 함`,
)
assert.ok(
  eng.band !== hum.band || eng.band == null || hum.band == null,
  '동일 평균만으로 다른 반영비율 모집단위를 구분하지 못하면 버그',
)
assert.equal(eng.comparisonBasis, '과목별 70% + 대학 반영비율')
assert.equal(hum.comparisonBasis, '과목별 70% + 대학 반영비율')

const recA = recommendRegularAdmission({ metrics: metricsA, records })
assert.ok(recA.ready)
assert.ok(recA.reach.length <= REGULAR_ADMISSION_THRESHOLDS.maxPerBand)
assert.ok(recA.ambitious.length <= REGULAR_ADMISSION_THRESHOLDS.maxPerBand)
assert.ok(recA.target.length <= REGULAR_ADMISSION_THRESHOLDS.maxPerBand)
assert.ok(
  recA.reach.length + recA.ambitious.length + recA.target.length > 0,
  '추천 결과가 비어 있음',
)
const bandsUsed = new Set(
  [...recA.reach, ...recA.ambitious, ...recA.target].map(
    (m) => m.evaluation.row.calculationType,
  ),
)
assert.ok(bandsUsed.size >= 2, '모든 대학을 같은 계산방식으로 판정하면 안 됨')

section('TEST B — 확률과통계 학생은 미적분/기하 필수 모집단위 제외')
const metricsProb = buildStudentMetrics(baseInput({ mathSelection: '확률과통계' }))
const mathReq = evaluateRegularAdmissionRow(
  mustFind(records, 'test-math-required'),
  metricsProb,
)
assert.equal(mathReq.eligibilityOk, false)
assert.match(mathReq.eligibilityNote ?? '', /수학 선택과목/)
const recB = recommendRegularAdmission({ metrics: metricsProb, records })
assert.equal(
  [...recB.reach, ...recB.ambitious, ...recB.target].some(
    (m) => m.evaluation.row.id === 'test-math-required',
  ),
  false,
)
const metricsCalc = buildStudentMetrics(baseInput({ mathSelection: '미적분' }))
const mathReqOk = evaluateRegularAdmissionRow(
  mustFind(records, 'test-math-required'),
  metricsCalc,
)
assert.equal(mathReqOk.eligibilityOk, true)
assert.equal(mathReqOk.skipped, false, mathReqOk.skipReason ?? '')

section('TEST C — 탐구 상위 1과목은 높은 과목 하나만 사용')
const best1 = evaluateRegularAdmissionRow(
  mustFind(records, 'test-inquiry-best1'),
  metricsA,
)
assert.equal(best1.skipped, false, best1.skipReason ?? '')
assert.equal(best1.studentValue, 95)
assert.notEqual(best1.studentValue, 94.5)
assert.equal(studentInquiryValue(metricsA, 'BEST_1'), 95)

section('TEST D — 탐구 2과목 평균은 정확히 평균 사용')
const avg2 = evaluateRegularAdmissionRow(
  mustFind(records, 'test-inquiry-avg2'),
  metricsA,
)
assert.equal(avg2.skipped, false, avg2.skipReason ?? '')
assert.equal(avg2.studentValue, 94.5)
assert.equal(studentInquiryValue(metricsA, 'AVERAGE_2'), 94.5)
const avg2Row = mustFind(records, 'test-inquiry-avg2')
assert.equal(avg2Row.inquiry1_70, null)
assert.equal(avg2Row.inquiry2_70, null)
assert.equal(officialInquiryCutoff(avg2Row), 86)

section('TEST E — 상위 3개 영역은 학생에게 유리한 3개 선택')
const best3 = evaluateRegularAdmissionRow(mustFind(records, 'test-best3'), metricsA)
assert.equal(best3.skipped, false, best3.skipReason ?? '')
assert.ok(best3.usedDomains.includes('국어'))
assert.ok(best3.usedDomains.includes('영어'))
assert.ok(best3.usedDomains.includes('탐구'))
assert.equal(best3.usedDomains.includes('수학'), false)
assert.equal(best3.comparisonBasis, '상위 3개 영역 백분위')
const expectedBest3 = (96 + 96 + 94.5) / 3
assert.ok(Math.abs((best3.studentValue ?? 0) - expectedBest3) < 0.001)

section('TEST F — 평균백분위 대학은 공식 평균백분위 기준')
const avgUni = evaluateRegularAdmissionRow(
  mustFind(records, 'test-avg-percentile'),
  metricsA,
)
assert.equal(avgUni.skipped, false, avgUni.skipReason ?? '')
assert.equal(avgUni.comparisonBasis, '공식 평균백분위')
assert.equal(avgUni.studentValue, metricsA.koreanMathInquiryAverage)
assert.equal(avgUni.cutoffValue, 86)
assert.equal(classifyAveragePercentile(avgUni.supportGap ?? 0), avgUni.band)

section('TEST G — 대학환산만 있는 대학에서 과목별 70%를 생성하지 않음')
const convertedRow = mustFind(records, 'test-converted-only')
assert.equal(convertedRow.korean70, null)
assert.equal(convertedRow.math70, null)
assert.equal(convertedRow.inquiry1_70, null)
assert.equal(convertedRow.inquiry2_70, null)
const metricsG = buildStudentMetrics(
  baseInput({
    koreanStandardScore: 135,
    mathStandardScore: 128,
    inquiry1StandardScore: 68,
    inquiry2StandardScore: 66,
  }),
)
const converted = evaluateRegularAdmissionRow(convertedRow, metricsG)
assert.equal(converted.skipped, false, converted.skipReason ?? '')
assert.equal(converted.comparisonBasis, '대학 자체 환산점수')
assert.equal(converted.subjectDiffs.koreanDiff, null)
assert.equal(converted.subjectDiffs.mathDiff, null)
assert.equal(converted.row.korean70, null)

section('영어 환산 — 공식표 있을 때만')
assert.equal(convertEnglishGrade(convertedRow, 2), 96)
assert.equal(
  convertEnglishGrade(
    { ...convertedRow, englishCalculationType: 'NONE', englishConversionTable: null },
    2,
  ),
  null,
)

section('제외 대상 · 과기특성화대는 상향/소신/적정에 넣지 않음')
const ids = new Set(
  [...recA.reach, ...recA.ambitious, ...recA.target].map((m) => m.evaluation.row.id),
)
assert.equal(ids.has('test-junior-college'), false)
assert.equal(ids.has('test-theology'), false)
assert.equal(ids.has('test-arts'), false)
assert.equal(ids.has('test-science-tech-gist'), false)
assert.ok(recA.scienceTechReference.some((e) => e.row.university === 'GIST'))

section('각 결과에 비교기준 존재')
for (const m of [...recA.reach, ...recA.ambitious, ...recA.target]) {
  assert.ok(m.evaluation.comparisonBasis.length > 0)
}

section('PRODUCTION JSON 로딩 · 중복 키 없음')
const production = await loadRegularAdmissionMaster()
assert.ok(production.length > 0)
assert.ok(production.length <= PRODUCTION_REGULAR_ADMISSION_COUNT)
assert.ok(production.every((r) => r.id && r.university && r.department))
assert.equal(
  production.some((r) => r.id.startsWith('test-')),
  false,
  'production 추천에 seed id가 포함되면 안 됨',
)
const recP = recommendRegularAdmission({ metrics: metricsA, records: production })
assert.ok(
  recP.reach.length + recP.ambitious.length + recP.target.length > 0,
  'production 876건 추천 결과가 비어 있음',
)
assert.ok(recP.reach.length <= 30 && recP.ambitious.length <= 30 && recP.target.length <= 30)

console.log('\n정시 분석 TEST A–G PASS')
