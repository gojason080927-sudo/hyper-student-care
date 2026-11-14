/**
 * 9등급 환산 ↔ 70%컷 추천 검증
 * npx tsx src/features/admissionAnalysis/utils/grade9CutoffAnalyzer.test.ts
 */
import assert from 'node:assert/strict'
import {
  analyzeGrade9CutoffRecommendations,
  calcRecommendationWindow,
  classifyGrade9Band,
} from './grade9CutoffAnalyzer'
import { listUniversityCutoffSummaries } from '../data/universityCutoffData'
import { admissionBandConfig } from '../config/admissionBandConfig'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

section('window')
{
  const w = calcRecommendationWindow(1.6)
  assert.equal(w.min, 1.4)
  assert.equal(w.max, 1.6)
  assert.equal(w.targetMin, 1.5)
  assert.equal(classifyGrade9Band(1.41, 1.6), 'ambitious')
  assert.equal(classifyGrade9Band(1.55, 1.6), 'target')
  assert.equal(classifyGrade9Band(1.6, 1.6), 'target')
  assert.equal(classifyGrade9Band(1.61, 1.6), null)
  assert.equal(classifyGrade9Band(1.39, 1.6), null)
}

section('data')
{
  const summaries = listUniversityCutoffSummaries()
  assert.ok(summaries.length >= 50)
}

section('학생 1.60')
{
  const r = analyzeGrade9CutoffRecommendations({ studentGrade9: 1.6 })
  assert.equal(r.ready, true)
  assert.equal(r.windowMin, 1.4)
  assert.equal(r.windowMax, 1.6)
  console.log(
    'displayed',
    r.displayed.map(
      (m) =>
        `${grade9BandLabel(m.band)} ${m.summary.universityName} ${m.cutoffUsed.toFixed(2)}`,
    ),
  )
  assert.ok(r.displayed.length > 0)
  assert.ok(r.displayed.every((m) => m.cutoffUsed >= 1.4 && m.cutoffUsed <= 1.6))
  assert.ok(r.displayed.every((m) => m.studentGrade9 === 1.6))
  const outOfRange = r.displayed.filter(
    (m) => m.cutoffUsed < 1.4 - 0.001 || m.cutoffUsed > 1.6 + 0.001,
  )
  assert.equal(outOfRange.length, 0)
}

function grade9BandLabel(band: 'ambitious' | 'target') {
  return band === 'ambitious' ? '상향' : '적정'
}

section('다른 등급')
for (const g of [1.4, 1.8, 2.2, 3.0]) {
  const r = analyzeGrade9CutoffRecommendations({ studentGrade9: g })
  const min = Math.round((g - admissionBandConfig.ambitiousOffset) * 100) / 100
  const max = g
  const bad = r.displayed.filter(
    (m) => m.cutoffUsed < min - 0.001 || m.cutoffUsed > max + 0.001,
  )
  console.log(
    `g=${g.toFixed(2)} window=${min.toFixed(2)}~${max.toFixed(2)} n=${r.displayed.length} a=${r.ambitious.length} t=${r.target.length}`,
    r.displayed.map((m) => `${m.summary.universityName}:${m.cutoffUsed}`).join(', '),
  )
  assert.equal(bad.length, 0)
}

console.log('\nOK grade9CutoffAnalyzer.test.ts')
