/**
 * Production 테스트 결과 → 정적 HTML. SELECT만 수행.
 * 실행: npx tsx --import ./scripts/register-css-empty.mjs scripts/_render-career-report-html.tsx
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React, { createElement } from 'react'

;(globalThis as { React?: typeof React }).React = React
import { renderToStaticMarkup } from 'react-dom/server'
import { CareerResultReport } from '../src/features/careerAssessment/components/CareerResultReport.tsx'
import type { CareerAssessmentScores } from '../src/features/careerAssessment/types.ts'

const ENROLLED_RESULT = '3ea14427-be55-4234-8793-40e9c6b1d812'
const GUEST_RESULT = '21a01db9-cab6-491d-a00c-1ea7e8811be4'
const PROTECTED_SESSION = '6401e930-d7d2-4349-9b33-b6a0b1d4d595'

function sqlQuery(sql: string) {
  if (/delete|update|truncate|drop/i.test(sql)) {
    throw new Error('refused mutating SQL in report html render')
  }
  writeFileSync('supabase/.temp-career-report-print.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-report-print.sql', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return (JSON.parse(result.slice(result.indexOf('{'))) as { rows?: unknown[] }).rows ?? []
}

function wrapHtml(title: string, markup: string, css: string) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; padding: 0; background: #e4e4e7; font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; }
    ${css}
  </style>
</head>
<body>${markup}</body>
</html>`
}

const protectedRows = sqlQuery(`
  SELECT count(*)::int AS n
  FROM public.career_assessment_responses
  WHERE session_id = '${PROTECTED_SESSION}';
`) as Array<{ n: number }>
if (protectedRows[0]?.n !== 5) {
  throw new Error(`protected session drifted to ${protectedRows[0]?.n}`)
}

const rows = sqlQuery(`
  SELECT r.id, r.student_id, r.guest_id, r.created_at, r.result_payload,
         s.name AS student_name, s.school AS student_school, s.grade AS student_grade,
         g.name AS guest_name, g.school AS guest_school, g.grade AS guest_grade
  FROM public.career_assessment_results r
  LEFT JOIN public.students s ON s.id = r.student_id
  LEFT JOIN public.career_assessment_guests g ON g.id = r.guest_id
  WHERE r.id IN ('${ENROLLED_RESULT}', '${GUEST_RESULT}')
  ORDER BY r.id;
`) as Array<{
  id: string
  student_id: string | null
  guest_id: string | null
  created_at: string
  result_payload: CareerAssessmentScores
  student_name: string | null
  student_school: string | null
  student_grade: string | null
  guest_name: string | null
  guest_school: string | null
  guest_grade: string | null
}>

if (rows.length !== 2) throw new Error(`expected 2 test results, got ${rows.length}`)

const css = readFileSync('src/features/careerAssessment/styles/careerResultPrint.css', 'utf8')
mkdirSync('supabase/.temp-career-report', { recursive: true })

const summaries = rows.map((row) => {
  const scores = row.result_payload
  const student = {
    name: row.student_name ?? row.guest_name ?? '학생',
    school: row.student_school ?? row.guest_school ?? '',
    grade: row.student_grade ?? row.guest_grade ?? '',
  }
  const markup = renderToStaticMarkup(
    createElement(CareerResultReport, {
      student,
      testedAt: row.created_at,
      scores,
      showActions: false,
    }),
  )
  const html = wrapHtml(`career report ${row.id}`, markup, css)
  if (/수리을/.test(html)) throw new Error(`${row.id} contains 수리을`)
  if (html.includes('수업·실습')) throw new Error(`${row.id} still has 수업·실습 fallback`)
  const pageCount = (html.match(/career-print-page career-print-page--/g) ?? []).length
  if (pageCount !== 5) throw new Error(`${row.id} html pages=${pageCount}`)
  const htmlPath = resolve(`supabase/.temp-career-report/${row.id}.html`)
  writeFileSync(htmlPath, html, 'utf8')
  return {
    id: row.id,
    kind: row.guest_id ? 'guest' : 'enrolled',
    name: student.name,
    top2: scores.riasecTop2.join('+'),
    topMajor: scores.majorGroupScores[0]?.name ?? '',
    topMajorScore: scores.majorGroupScores[0]?.score ?? null,
    efficacy: scores.careerEfficacy,
    readiness: scores.careerReadiness,
    htmlPath,
    pageCount,
  }
})

writeFileSync('supabase/.temp-career-report/summary.json', JSON.stringify(summaries, null, 2), 'utf8')
console.log(JSON.stringify(summaries, null, 2))
console.log('career report html render OK')
