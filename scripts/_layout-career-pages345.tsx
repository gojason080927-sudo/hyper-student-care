/**
 * PAGE 3~5 인쇄 레이아웃을 서로 다른 TOP3 조합으로 확인한다.
 * 실행: npx tsx --import ./scripts/register-css-empty.mjs scripts/_layout-career-pages345.tsx
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import React, { createElement } from 'react'

;(globalThis as { React?: typeof React }).React = React
import { renderToStaticMarkup } from 'react-dom/server'
import { CareerResultReport } from '../src/features/careerAssessment/components/CareerResultReport.tsx'
import { CAREER_MAJOR_DICTIONARY } from '../src/features/careerAssessment/data/majorDictionary.ts'
import { CAREER_MAJOR_PROFILES } from '../src/features/careerAssessment/data/majorProfiles.ts'
import { CAREER_QUESTIONS } from '../src/features/careerAssessment/data/questions.ts'
import { scoreCareerAssessment } from '../src/features/careerAssessment/engine/scoring.ts'

function answersWithCodes(highCodes: string[], high = 5, low = 2): Record<number, number> {
  const answers: Record<number, number> = {}
  for (const question of CAREER_QUESTIONS) {
    answers[question.questionNumber] = highCodes.includes(question.scoringCode) ? high : low
  }
  return answers
}

function countPdfPages(buf: Buffer) {
  return (buf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length
}

const profiles = [
  { id: 'inquiry', codes: ['I', 'S', 'LOG', 'OBS', 'INT', 'CONTRIBUTION', 'GROWTH', 'ANALYSIS'] },
  { id: 'practical', codes: ['R', 'E', 'PRA', 'SPA', 'ACHIEVEMENT', 'EXECUTION'] },
  { id: 'creative', codes: ['A', 'E', 'CRE', 'VER', 'CREATIVITY', 'FLEXIBILITY'] },
]

const css = readFileSync('src/features/careerAssessment/styles/careerResultPrint.css', 'utf8')
mkdirSync('supabase/.temp-career-report', { recursive: true })
const { chromium } = await import('playwright')
const browser = await chromium.launch({ headless: true })

try {
  for (const profile of profiles) {
    const scores = scoreCareerAssessment({
      answers: answersWithCodes(profile.codes),
      questions: CAREER_QUESTIONS,
      profiles: CAREER_MAJOR_PROFILES,
      dictionary: CAREER_MAJOR_DICTIONARY,
    })
    const markup = renderToStaticMarkup(
      createElement(CareerResultReport, {
        student: { name: profile.id, school: 'HYPER고', grade: '2학년' },
        testedAt: '2026-09-07T00:00:00.000Z',
        scores,
        showActions: false,
      }),
    )
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><style>html,body{margin:0;padding:0;background:#fff;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;} ${css}</style></head><body>${markup}</body></html>`
    const htmlPath = resolve(`supabase/.temp-career-report/layout-${profile.id}.html`)
    writeFileSync(htmlPath, html, 'utf8')
    const page = await browser.newPage({ viewport: { width: 900, height: 1280 } })
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
    await page.emulateMedia({ media: 'print' })
    const metrics = await page.evaluate(() => {
      const pxPerMm = 96 / 25.4
      return [...document.querySelectorAll<HTMLElement>('.career-print-page')].map((el, i) => {
        const pageBox = el.getBoundingClientRect()
        const footer = el.querySelector<HTMLElement>('.career-print-footer')
        const cards = [
          ...el.querySelectorAll<HTMLElement>(
            '.career-print-card, .career-print-hero, .career-print-scale-grid, .career-print-page4-title, .career-print-page5-title, .career-print-deep-grid',
          ),
        ]
        const last = cards.at(-1)
        const footerBox = footer?.getBoundingClientRect()
        return {
          page: i + 1,
          overflowY: el.scrollHeight - el.clientHeight,
          lastCardToFooterMm:
            last && footerBox ? (footerBox.top - last.getBoundingClientRect().bottom) / pxPerMm : null,
          top10: el.querySelectorAll('.career-print-table tbody tr').length,
          deep: el.querySelectorAll('.career-print-deep-card').length,
          guide: Boolean(el.querySelector('.career-print-guide')),
          credit: el.textContent?.includes('1. 고교학점제란?') ?? false,
        }
      })
    })
    const pdf = Buffer.from(
      await page.pdf({
        width: '210mm',
        height: '297mm',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      }),
    )
    const pdfPages = countPdfPages(pdf)
    writeFileSync(`supabase/.temp-career-report/layout-${profile.id}.pdf`, pdf)
    if (pdfPages !== 5) throw new Error(`${profile.id} pdfPages=${pdfPages}`)
    if (metrics.length !== 5) throw new Error(`${profile.id} pages=${metrics.length}`)
    if (metrics[2]?.top10 !== 10) throw new Error(`${profile.id} page3 top10=${metrics[2]?.top10}`)
    if (metrics[3]?.deep !== 3) throw new Error(`${profile.id} page4 deep=${metrics[3]?.deep}`)
    if (!metrics[4]?.guide || !metrics[4]?.credit) throw new Error(`${profile.id} page5 missing guide`)
    const bad = metrics.filter((row) => row.overflowY > 2 || (row.page > 1 && (row.lastCardToFooterMm ?? 0) < 3))
    if (bad.length > 0) throw new Error(`${profile.id} layout ${JSON.stringify(bad)}`)
    console.log(
      JSON.stringify(
        {
          id: profile.id,
          top3: scores.majorGroupScores.slice(0, 3).map((row) => row.name),
          pdfPages,
          footerMm: metrics.map((row) => row.lastCardToFooterMm),
        },
        null,
        2,
      ),
    )
    await page.close()
  }
} finally {
  await browser.close()
}

console.log('page 3-5 layout variants OK')
