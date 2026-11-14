/**
 * 대입 내신 분석 — Production 추천 경로 스모크
 * npx tsx src/features/admissionAnalysis/utils/admissionScoreBandSmoke.test.ts
 */
import assert from 'node:assert/strict'
import { buildCounselingReportSnapshot } from './counselingReport'
import { admissionRecommendationWindow } from '../config/admissionThresholds'
import { listAnalyzableAdmissionRecords } from '../data/universityAdmissionData'
import {
  analyzeUniversityAdmissions,
  listDisplayedAdmissionCards,
  pickAutoSelectIds,
} from './universityAdmissionAnalyzer'

const records = listAnalyzableAdmissionRecords()

console.log('\n=== Production 추천 스모크 ===')
for (const g of [1.2, 1.4, 1.6, 2.0, 2.5, 3.0]) {
  const result = analyzeUniversityAdmissions({
    studentGrade: g,
    universityRecords: records,
    preferGradeSystem: '9-grade',
  })
  assert.equal(result.ready, true)
  const shown = listDisplayedAdmissionCards(result)
  const bad = shown.filter(
    (m) =>
      m.cutoffUsed != null &&
      Math.abs(m.cutoffUsed - g) > admissionRecommendationWindow.maxDistance + 0.001,
  )
  assert.equal(bad.length, 0)
  console.log(
    `grade9=${g.toFixed(2)} shown=${shown.length} a=${result.ambitious.length} t=${result.target.length} s=${result.safe.length}`,
  )
}

const r = analyzeUniversityAdmissions({
  studentGrade: 1.6,
  universityRecords: records,
  preferGradeSystem: '9-grade',
})
const shown = listDisplayedAdmissionCards(r)
const ids = pickAutoSelectIds(r)
const selected = shown.filter((m) => ids.includes(m.university.id))
const snap = buildCounselingReportSnapshot({
  profile: { name: '김선영', school: '상산고등학교', gradeYear: '고3' },
  subjects: [],
  grade5Average: 1.4,
  grade9Average: 1.6,
  selectedMatches: selected,
  counselorName: '테스트',
  counselingMemo: '메모',
})
assert.equal(
  snap.selected.ambitious.length +
    snap.selected.target.length +
    snap.selected.safe.length,
  selected.length,
)

console.log('\nAll admissionScoreBandSmoke tests passed.')
