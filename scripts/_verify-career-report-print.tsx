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
import {
  analyzeTop10ReasonUniqueness,
  buildDistinctMajorReason,
  buildTop3DeepCards,
} from '../src/features/careerAssessment/utils/careerMajorDeepAnalysis.ts'

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
  console.warn(`protected session response count is ${protectedRows[0]?.n} (expected 5); continuing SELECT-only print verify`)
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
          lastCardToFooterMm: (() => {
            const cards = [
              ...el.querySelectorAll<HTMLElement>(
                '.career-print-card, .career-print-hero, .career-print-scale-grid, .career-print-page4-title, .career-print-page5-title, .career-print-deep-grid',
              ),
            ]
            const last = cards.at(-1)
            if (!last || !footerBox) return null
            return (footerBox.top - last.getBoundingClientRect().bottom) / pxPerMm
          })(),
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
    const footerOverlap = layout.filter(
      (row) => row.page > 1 && row.lastCardToFooterMm != null && row.lastCardToFooterMm < 3,
    )
    if (footerOverlap.length > 0) {
      throw new Error(`${row.id} footer overlap ${JSON.stringify(footerOverlap)}`)
    }
    const pageTexts = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.career-print-page')].map((el) => el.innerText),
    )
    const [p1, p2, p3, p4, p5] = pageTexts
    if (!p3 || !p4 || !p5) throw new Error(`${row.id} missing print pages`)
    for (const required of ['행동 특성', '진로 실행역량', '진로 준비도', '추천 전공 TOP10']) {
      if (!p3.includes(required)) throw new Error(`${row.id} PAGE3 missing ${required}`)
    }
    if (p3.includes('진로 탐색·준비 가이드')) throw new Error(`${row.id} PAGE3 still has exploration guide`)
    for (const required of [
      '추천 전공 상세 분석',
      '세부 추천학과',
      'TOP3 전공 심층 분석',
      '왜 잘 맞을까',
      '관련 학과',
      '추천 탐색 교과',
      '추천 탐구 주제',
      '대표 진출 직업',
      '나의 전공 선택 포인트',
    ]) {
      if (!p4.includes(required)) throw new Error(`${row.id} PAGE4 missing ${required}`)
    }
    if (p4.includes('추천 전공 TOP10')) throw new Error(`${row.id} PAGE4 still has TOP10`)
    for (const required of [
      '진로 탐색·준비 가이드',
      '탐색하기',
      '경험하기',
      '준비하기',
      '고교학점제 기반 진로 설계 가이드',
      '1. 고교학점제란?',
      '5. 확인할 부분',
    ]) {
      if (!p5.includes(required)) throw new Error(`${row.id} PAGE5 missing ${required}`)
    }

    const top10 = scores.majorGroupScores.slice(0, 10)
    const reasons = top10.map((group) => buildDistinctMajorReason(group, scores))
    const uniqueness = analyzeTop10ReasonUniqueness(reasons, top10)
    if (!uniqueness.ok) {
      throw new Error(`${row.id} TOP10 reasons not distinct ${JSON.stringify({ uniqueness, reasons }, null, 2)}`)
    }
    const top3 = buildTop3DeepCards(scores)
    const top3Summary = top3.map((card) => ({
      rank: card.rank,
      name: card.group.name,
      score: card.group.score,
      majors: card.relatedMajors.length,
      subjects: card.exploratorySubjects.length,
      topics: card.explorationTopics.length,
      careers: card.careers.length,
    }))
    console.log(`${row.id} TOP3 ${JSON.stringify(top3Summary, null, 2)}`)
    console.log(`${row.id} TOP10 reasons:\n${reasons.map((reason, i) => `${i + 1}. ${top10[i]?.name}: ${reason}`).join('\n')}`)

    if (row.id === ENROLLED_RESULT) {
      const pages = page.locator('.career-print-page')
      for (let i = 2; i < 5; i += 1) {
        await pages.nth(i).screenshot({ path: `supabase/.temp-career-report/page-${i + 1}.png` })
      }
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
    if (html.includes('undefined') || html.includes('>null<')) {
      throw new Error(`${row.id} leaked placeholder`)
    }
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
