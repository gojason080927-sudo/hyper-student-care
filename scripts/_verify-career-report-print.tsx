/**
 * 결과지 5페이지 인쇄 검증. Production 테스트 결과는 SELECT만 한다.
 * 실행: npx tsx --import ./scripts/register-css-empty.mjs scripts/_verify-career-report-print.tsx
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
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
    throw new Error('refused mutating SQL in report print verify')
  }
  writeFileSync('supabase/.temp-career-report-print.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-report-print.sql', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return (JSON.parse(result.slice(result.indexOf('{'))) as { rows?: unknown[] }).rows ?? []
}

function countPdfPages(buf: Buffer) {
  const text = buf.toString('latin1')
  return (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length
}

function wrapHtml(title: string, markup: string, css: string) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; padding: 0; background: #fff; font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; }
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

if (rows.length !== 2) {
  throw new Error(`expected 2 test results, got ${rows.length}`)
}

const css = readFileSync('src/features/careerAssessment/styles/careerResultPrint.css', 'utf8')
mkdirSync('supabase/.temp-career-report', { recursive: true })

const summaries: Array<{
  id: string
  kind: string
  top2: string
  topMajor: string
  pdfPages: number
  pageCount: number
}> = []

const { chromium } = await import('playwright')
const browser = await chromium.launch({ headless: true })

try {
  for (const row of rows) {
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
    const htmlPath = resolve(`supabase/.temp-career-report/${row.id}.html`)
    writeFileSync(htmlPath, html, 'utf8')

    const page = await browser.newPage()
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
    await page.emulateMedia({ media: 'print' })
    const pageCount = await page.locator('.career-print-page').count()
    const layout = await page.evaluate(() => {
      const pxPerMm = 96 / 25.4
      return [...document.querySelectorAll<HTMLElement>('.career-print-page')].map((el, i) => {
        const style = getComputedStyle(el)
        const frame = el.querySelector<HTMLElement>('.career-print-frame')
        const footer = el.querySelector<HTMLElement>('.career-print-footer')
        const frameStyle = frame ? getComputedStyle(frame) : null
        const pageBox = el.getBoundingClientRect()
        const footerBox = footer?.getBoundingClientRect()
        return {
          page: i + 1,
          overflowX: el.scrollWidth - el.clientWidth,
          overflowY: el.scrollHeight - el.clientHeight,
          padLeftMm: parseFloat(style.paddingLeft) / pxPerMm,
          padRightMm: parseFloat(style.paddingRight) / pxPerMm,
          padTopMm: parseFloat(style.paddingTop) / pxPerMm,
          padBottomMm: parseFloat(style.paddingBottom) / pxPerMm,
          widthMm: pageBox.width / pxPerMm,
          heightMm: pageBox.height / pxPerMm,
          frameBorder: frameStyle?.borderTopWidth ?? '0',
          framePadLeftMm: frameStyle ? parseFloat(frameStyle.paddingLeft) / pxPerMm : 0,
          framePadRightMm: frameStyle ? parseFloat(frameStyle.paddingRight) / pxPerMm : 0,
          contentInsetLeftMm:
            (parseFloat(style.paddingLeft) + (frameStyle ? parseFloat(frameStyle.paddingLeft) : 0)) / pxPerMm,
          contentInsetRightMm:
            (parseFloat(style.paddingRight) + (frameStyle ? parseFloat(frameStyle.paddingRight) : 0)) / pxPerMm,
          footerFromBottomMm: footerBox ? (pageBox.bottom - footerBox.bottom) / pxPerMm : null,
          footerHeightMm: footerBox ? footerBox.height / pxPerMm : null,
        }
      })
    })
    const overflowPages = layout.filter((row) => row.overflowX > 0.5)
    if (overflowPages.length > 0) {
      throw new Error(`${row.id} horizontal overflow ${JSON.stringify(overflowPages)}`)
    }
    const clipped = layout.filter((row) => row.overflowY > 2)
    if (clipped.length > 0) {
      throw new Error(`${row.id} vertical clip ${JSON.stringify(clipped)}`)
    }
    const pdf = await page.pdf({
      width: '210mm',
      height: '297mm',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    })
    const pdfBuf = Buffer.from(pdf)
    const rawPageMarks = pdfBuf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length ?? 0
    const rawPagesMarks = pdfBuf.toString('latin1').match(/\/Type\s*\/Pages\b/g)?.length ?? 0
    const pdfPages = countPdfPages(pdfBuf)
    console.log(`${row.id} pageCount=${pageCount} pdfPages=${pdfPages} rawPage=${rawPageMarks} rawPages=${rawPagesMarks} bytes=${pdfBuf.length}`)
    console.log(`${row.id} layout ${JSON.stringify(layout, null, 2)}`)
    writeFileSync(`supabase/.temp-career-report/${row.id}.pdf`, pdf)
    await page.close()

    summaries.push({
      id: row.id,
      kind: row.guest_id ? 'guest' : 'enrolled',
      top2: scores.riasecTop2.join('+'),
      topMajor: scores.majorGroupScores[0]?.name ?? '',
      pdfPages,
      pageCount,
      layout,
    })

    if (pageCount !== 5) throw new Error(`${row.id} screen pages=${pageCount}`)
    if (pdfPages !== 5) throw new Error(`${row.id} pdf pages=${pdfPages}`)
    if (/수리을/.test(html)) throw new Error(`${row.id} contains 수리을`)
    if (html.includes('수업·실습')) throw new Error(`${row.id} still has 수업·실습 fallback`)
  }
} finally {
  await browser.close()
}

const enrolled = summaries.find((row) => row.kind === 'enrolled')
const guest = summaries.find((row) => row.kind === 'guest')
if (!enrolled || !guest) throw new Error('missing enrolled or guest summary')
if (enrolled.top2 === guest.top2 && enrolled.topMajor === guest.topMajor) {
  console.warn('warning: enrolled/guest top traits look identical; still valid if answers were similar')
}

writeFileSync('supabase/.temp-career-report/summary.json', JSON.stringify(summaries, null, 2), 'utf8')
console.log(JSON.stringify(summaries, null, 2))
console.log('career report print verify OK')
