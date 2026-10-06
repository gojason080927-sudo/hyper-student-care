/**
 * 실행: npx tsx src/utils/mathMonthlyReport.test.ts
 * 수학 월말평가 보고서 — 점수·등급·진단·반 평균 숨김 규칙, SQL 개인정보 가드
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildDefaultItems,
  buildReportView,
  calcScore,
  classAvgFromRow,
  diagnose,
  overallGrade,
  recommendComments,
  recommendPlan,
  unitInsight,
  validateExamSetup,
  type MathMonthlyReportData,
} from './mathMonthlyReport'

const items = buildDefaultItems(10, 10).map((i) => ({ ...i, difficulty: i.no <= 5 ? ('basic' as const) : ('high' as const) }))
assert.equal(calcScore(items, []), 100)
assert.equal(calcScore(items, [1, 2, 9]), 70)

assert.equal(overallGrade(90).label, '매우 우수')
assert.equal(overallGrade(80).stars, 4)
assert.equal(overallGrade(70).label, '양호')
assert.equal(overallGrade(69.9).label, '노력 필요')

// 반 평균이 있을 때: ±5%p
assert.equal(diagnose(70, 65), 'strength')
assert.equal(diagnose(60, 65), 'weak')
assert.equal(diagnose(62, 65), 'normal')
// 반 평균이 없을 때(응시 3명 미만): 80% 이상 / 60% 미만
assert.equal(diagnose(80, null), 'strength')
assert.equal(diagnose(59, null), 'weak')
assert.equal(diagnose(70, null), 'normal')

// 응시자 3명 미만이면 반 평균은 null
assert.equal(classAvgFromRow({ n: 2, avg_score: 70, total_score: 100, unit_rates: [], difficulty_rates: [] }), null)
assert.equal(classAvgFromRow(null), null)
assert.equal(classAvgFromRow({ n: 3, avg_score: 70, total_score: 100, unit_rates: [], difficulty_rates: [] })?.n, 3)

const data: MathMonthlyReportData = {
  exam: {
    id: 'e', grade: '고1', className: 'A', examDate: '2026-10-31', year: 2026, month: 10, title: 't', teacherName: '',
    questionCount: 10, items, units: [{ name: 'U1', from: 1, to: 5 }, { name: 'U2', from: 6, to: 10 }],
  },
  result: { score: 0, wrongItems: [{ no: 6, cause: 'calc' }, { no: 7, cause: 'time' }, { no: 8, cause: 'calc' }], strengths: '', improvements: '', teacherComment: '', nextPlan: [] },
  classAvg: null,
}
const view = buildReportView(data)
assert.equal(view.score, 70)
assert.equal(view.units[0].diagnosis, 'strength')
assert.equal(view.units[1].diagnosis, 'weak')
assert.equal(view.units[1].diff, null)
assert.ok(recommendPlan(data.exam, data.result.wrongItems).length <= 5)

assert.ok(validateExamSetup({ className: 'A', examDate: '2026-10-31', title: 't', items, units: data.exam.units }).length === 0)
assert.ok(validateExamSetup({ className: 'A', examDate: '2026-10-31', title: 't', items, units: [{ name: 'U1', from: 1, to: 5 }] }).length > 0)

// 요약 문구는 표의 진단과 같은 기준: 80% 강점이면 '보강'으로 나오면 안 된다
const allStrong = [{ name: '적분', rate: 80, diagnosis: 'strength' as const }, { name: '미분', rate: 90, diagnosis: 'strength' as const }]
const ins = unitInsight(allStrong)
assert.equal(ins.weak, null)
assert.equal(ins.lowest?.name, '적분')
assert.equal(ins.strength?.name, '미분')
const noStrong = unitInsight([{ name: 'A', rate: 70, diagnosis: 'normal' as const }, { name: 'B', rate: 65, diagnosis: 'normal' as const }])
assert.equal(noStrong.strength, null)
assert.equal(noStrong.highest?.name, 'A')
const draft = recommendComments(
  { items: buildDefaultItems(5, 20), units: [{ name: '적분', from: 1, to: 5 }] },
  [{ no: 1, cause: 'calc' }],
)
assert.ok(!draft.improvements.includes('보강이 필요'), '적분 80%는 강점이므로 보강 문구 없음')
assert.ok(draft.improvements.startsWith('가장 낮은 단원: 적분 80%'))

// SQL 개인정보·보안 가드
const sql = readFileSync('supabase/math-monthly-report-v1-migration.sql', 'utf8')
assert.ok(/REVOKE ALL ON FUNCTION public\.get_parent_math_monthly_reports\(text\) FROM PUBLIC/.test(sql))
assert.ok(/IF v_n >= 3 THEN/.test(sql), '응시자 3명 미만 반 평균 null')
assert.ok(!/GRANT[^;]*math_monthly_(exams|results)[^;]*TO[^;]*anon/.test(sql), '표는 anon 접근 불가')
assert.ok(/publish_math_monthly_exam[\s\S]*auth\.uid\(\) IS NULL/.test(sql))
assert.ok(!/CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/.test(sql), '기존 번들 RPC 미수정')

console.log('mathMonthlyReport tests passed')
