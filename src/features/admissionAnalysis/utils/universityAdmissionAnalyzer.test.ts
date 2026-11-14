/**
 * 추천범위·성적대 재테스트
 * npx tsx src/features/admissionAnalysis/utils/universityAdmissionAnalyzer.test.ts
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { admissionRecommendationWindow } from '../config/admissionThresholds'
import { importAdmissionRecordsFromJsonArray } from './admissionDataImporter'
import {
  analyzeUniversityAdmissions,
  calcCutoffDifference,
  classifySupportBand,
  formatAdvantageLabel,
  listDisplayedAdmissionCards,
  pickAutoSelectIds,
} from './universityAdmissionAnalyzer'
import { buildCounselingReportSnapshot } from './counselingReport'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

section('difference 방향')
assert.equal(calcCutoffDifference(1.2, 1.5), -0.3)
assert.equal(formatAdvantageLabel(-0.3), '+0.30 우위')
assert.equal(formatAdvantageLabel(0.3), '-0.30 열위')

section('밴드 (window 내)')
assert.equal(classifySupportBand(0.2), 'ambitious')
assert.equal(classifySupportBand(0), 'target')
assert.equal(classifySupportBand(-0.2), 'safe')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const bundle = JSON.parse(
  fs.readFileSync(
    path.join(root, 'src/features/admissionAnalysis/data/official/officialAdmissionResults.json'),
    'utf8',
  ),
) as { records: unknown[] }
const { accepted } = importAdmissionRecordsFromJsonArray(bundle.records)

function assertRecommendationQuality(
  studentGrade: number,
  label: string,
) {
  const r = analyzeUniversityAdmissions({
    studentGrade,
    universityRecords: accepted,
  })
  const shown = listDisplayedAdmissionCards(r)
  const far = shown.filter(
    (c) =>
      c.cutoffUsed != null &&
      Math.abs(c.cutoffUsed - studentGrade) >
        admissionRecommendationWindow.maxDistance + 0.001,
  )
  assert.equal(far.length, 0, `${label}: 성적 차이가 큰 대학 포함`)

  const dongshinFar = shown.some(
    (c) =>
      c.university.universityName.includes('동신') &&
      c.cutoffUsed != null &&
      c.cutoffUsed >= 7,
  )
  assert.equal(dongshinFar, false, `${label}: 동신대 7점대 포함`)

  const sky = shown.some((c) =>
    /서울대학교|연세대학교|고려대학교/.test(c.university.universityName),
  )
  assert.equal(sky, false, `${label}: 공식 교과 70%컷 없는 SKY 자동판정`)

  const byUni = new Map<string, number>()
  const deptKeys = new Set<string>()
  for (const c of shown) {
    const uni = c.university.universityName
    byUni.set(uni, (byUni.get(uni) ?? 0) + 1)
    const deptKey = `${uni}|${c.university.departmentName}`
    assert.equal(deptKeys.has(deptKey), false, `${label}: 모집단위 중복 ${deptKey}`)
    deptKeys.add(deptKey)
    assert.equal(Boolean(c.university.sourceUrl), true, `${label}: 출처 URL 없음`)
    assert.equal(c.university.officialData, true)
    assert.equal(c.university.admissionCategory, '학생부교과')
  }
  for (const [uni, n] of byUni) {
    assert.ok(
      n <= admissionRecommendationWindow.maxDepartmentsPerUniversity,
      `${label}: ${uni} 모집단위 ${n}개`,
    )
  }
  assert.ok(r.ambitious.length <= admissionRecommendationWindow.maxPerBand.ambitious)
  assert.ok(r.target.length <= admissionRecommendationWindow.maxPerBand.target)
  assert.ok(r.safe.length <= admissionRecommendationWindow.maxPerBand.safe)

  console.log(
    `${label} n=${shown.length} a=${r.ambitious.length} t=${r.target.length} s=${r.safe.length} ` +
      shown
        .map(
          (c) =>
            `${c.band} ${c.university.universityName}/${c.university.departmentName}:${c.cutoffUsed}`,
        )
        .join(' | '),
  )
  return { r, shown }
}

section('학생 1.60 — 동신대 7.77 제외')
const { r: r160, shown: allShown } = assertRecommendationQuality(1.6, '1.60')
assert.equal(r160.ready, true)
if (allShown.length > 0) {
  const maxCut = Math.max(...allShown.map((c) => c.cutoffUsed ?? 0))
  const minCut = Math.min(...allShown.map((c) => c.cutoffUsed ?? 99))
  console.log(`cutoff range in view: ${minCut.toFixed(2)} ~ ${maxCut.toFixed(2)}`)
  assert.ok(maxCut <= 1.6 + admissionRecommendationWindow.maxDistance + 0.001)
}

section('성적대별 필수 테스트')
for (const g of [1.2, 1.4, 1.6, 2.0, 2.5, 3.0]) {
  assertRecommendationQuality(g, g.toFixed(2))
}

section('자동선택·REPORT')
const ids = pickAutoSelectIds(r160)
assert.ok(ids.length <= 17)
assert.equal(ids.length, allShown.length)
const selected = allShown.filter((c) => ids.includes(c.university.id))
const snap = buildCounselingReportSnapshot({
  profile: { name: '테스트', school: '테스트고', gradeYear: '고3' },
  subjects: [],
  grade5Average: 1.4,
  grade9Average: 1.6,
  selectedMatches: selected,
  counselorName: '강사',
  counselingMemo: '메모',
})
assert.equal(
  snap.selected.ambitious.length +
    snap.selected.target.length +
    snap.selected.safe.length,
  selected.length,
)

console.log('\nAll universityAdmissionAnalyzer tests passed.')
