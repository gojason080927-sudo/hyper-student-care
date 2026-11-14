import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const url =
  'https://hyper-student-care.vercel.app/care/ceaLvYlUdZu9XEqXj0mi2wOjY5bXCL3W/career-result/3ea14427-be55-4234-8793-40e9c6b1d812'

function countPdfPages(buf) {
  return (buf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 1800 } })
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForSelector('.career-print-page', { timeout: 30000 })
const printBtn = page.getByRole('button', { name: '결과지 출력' })
await printBtn.waitFor({ state: 'visible' })

await page.emulateMedia({ media: 'print' })
const pageCount = await page.locator('.career-print-page').count()
const pageTexts = await page.locator('.career-print-page').evaluateAll((els) => els.map((el) => el.innerText))
const pdf = await page.pdf({
  width: '210mm',
  height: '297mm',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
})
const pdfBuf = Buffer.from(pdf)
const pdfPages = countPdfPages(pdfBuf)
writeFileSync('supabase/.temp/prod-career-report.pdf', pdfBuf)

const [p1, p2, p3, p4, p5] = pageTexts
const reasons = await page.locator('.career-print-page--p3 .career-print-table tbody tr').evaluateAll((rows) =>
  rows.map((row) => row.querySelectorAll('td')[3]?.innerText ?? ''),
)

const result = {
  url,
  pageCount,
  pdfPages,
  student: await page.locator('.career-print-meta').textContent(),
  p3: {
    behavior: p3.includes('행동 특성'),
    efficacy: p3.includes('진로 실행역량'),
    readiness: p3.includes('진로 준비도'),
    top10: p3.includes('추천 전공 TOP10'),
    noGuide: !p3.includes('진로 탐색·준비 가이드'),
  },
  p4: {
    title: p4.includes('추천 전공 상세 분석'),
    detail: p4.includes('세부 추천학과'),
    deep: p4.includes('TOP3 전공 심층 분석'),
    why: p4.includes('왜 잘 맞을까'),
    majors: p4.includes('관련 학과'),
    subjects: p4.includes('추천 탐색 교과'),
    topics: p4.includes('추천 탐구 주제'),
    careers: p4.includes('대표 진출 직업'),
    points: p4.includes('나의 전공 선택 포인트'),
    noTop10: !p4.includes('추천 전공 TOP10'),
  },
  p5: {
    guideFirst: p5.indexOf('진로 탐색·준비 가이드') >= 0 && p5.indexOf('진로 탐색·준비 가이드') < p5.indexOf('고교학점제'),
    explore: p5.includes('탐색하기'),
    experience: p5.includes('경험하기'),
    prepare: p5.includes('준비하기'),
    credit: p5.includes('고교학점제 기반 진로 설계 가이드'),
    s1: p5.includes('1. 고교학점제란?'),
    s5: p5.includes('5. 확인할 부분'),
  },
  uniqueReasons: new Set(reasons).size,
  bannedTemplate: reasons.filter((row) => row.includes('계열의 학습 특성과 잘 맞습니다')).length,
  reasons,
  printButtonVisibleBeforePrintMedia: true,
}

writeFileSync('supabase/.temp/prod-career-report-verify.json', JSON.stringify(result, null, 2), 'utf8')
console.log(JSON.stringify(result, null, 2))
await browser.close()
if (pageCount !== 5 || pdfPages !== 5) throw new Error(`pages screen=${pageCount} pdf=${pdfPages}`)
if (!result.p3.behavior || !result.p3.top10 || !result.p3.noGuide) throw new Error('PAGE3 fail')
if (!result.p4.title || !result.p4.deep || !result.p4.noTop10) throw new Error('PAGE4 fail')
if (!result.p5.guideFirst || !result.p5.s1 || !result.p5.s5) throw new Error('PAGE5 fail')
if (result.uniqueReasons !== 10 || result.bannedTemplate !== 0) throw new Error('TOP10 reasons fail')
console.log('production print verify OK')
