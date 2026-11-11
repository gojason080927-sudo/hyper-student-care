/**
 * 문제지 출력 점검(로컬 전용): 문제은행에서 실제로 읽어 출제 → 인쇄 HTML → Playwright PDF, 쪽수·쪼개짐·간격 확인.
 * 실행: npx tsx scripts/worksheet-print-check.ts <문제은행 .env.local> <출력 폴더>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import { _loadBankForTest } from '../api/question-bank'
import { CM2_UNITS, generate } from '../src/lib/questionBank'
import { buildWorksheetHtml } from '../src/lib/worksheetPrint'

const [envFile, outDir] = process.argv.slice(2)
const E = Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]))
const bank = await _loadBankForTest({ appUrl: '', appAnonKey: '', bankUrl: E.SUPABASE_URL, bankKey: E.SUPABASE_SERVICE_ROLE_KEY })

const cnt = new Map<string, number>()
for (const p of bank.problems) cnt.set(p.typeId, (cnt.get(p.typeId) ?? 0) + 1)
const zero = bank.types.filter((t) => !cnt.get(t.id)).map((t) => `${t.code} ${t.name}`)
const fmt: Record<string, number> = {}
for (const p of bank.problems) fmt[p.format] = (fmt[p.format] ?? 0) + 1
console.log(JSON.stringify({ 유형: bank.types.length, 출제가능: bank.problems.length, 형식별: fmt, 제외: bank.excluded, 문제0개유형: zero }, null, 1))

// 시험 출력: 집합과 명제(대단원 05~07) 소단원 전체, 20문제
const setUnits = new Set(CM2_UNITS.filter((u) => ['05', '06', '07'].includes(u.no)).flatMap((u) => u.subs.map((s) => s[0])))
const ids = bank.types.filter((t) => setUnits.has(t.sub)).map((t) => t.id)
const g = generate(bank.problems, ids, 20, [10, 20, 30, 25, 10, 5], new Set(['객관식', '단답형', '서술형']), 20261111)
const katexDir = resolve('node_modules/katex/dist')
const html = buildWorksheetHtml(
  { left: '공통수학2 예상문제', right: '집합과 명제 - 1회', meta: '시험 출력 · 2026.11.11', fileName: '공통수학2_집합과명제_시험출력', items: g.items },
  { katexCss: readFileSync(resolve(katexDir, 'katex.min.css'), 'utf8'), base: pathToFileURL(katexDir).href + '/' },
)
mkdirSync(outDir, { recursive: true })
const htmlPath = resolve(outDir, '_check.html')
writeFileSync(htmlPath, html)
const browser = await chromium.launch({ channel: 'msedge' }) // 로컬 PC의 Edge 사용(브라우저 내려받기 없이)
const page = await browser.newPage()
await page.goto(pathToFileURL(htmlPath).href)
await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true)
const report = await page.evaluate(() => {
  const L = parseFloat(getComputedStyle(document.querySelector('.col')!).lineHeight)
  const bad: string[] = []
  let qn = 0
  document.querySelectorAll('.page').forEach((pg, pi) => {
    const body = pg.querySelector('.body')!.getBoundingClientRect()
    pg.querySelectorAll('.col').forEach((col, ci) => {
      const c = col.getBoundingClientRect()
      const qs = [...col.querySelectorAll(':scope > .q')].map((q) => q.getBoundingClientRect())
      qn += qs.length
      qs.forEach((q, i) => {
        if (q.bottom > c.bottom + 0.5 || q.top < c.top - 0.5) bad.push(`p${pi + 1}c${ci + 1}q${i + 1} 칸 넘침`)
        const gap = i ? q.top - qs[i - 1].bottom : q.top - body.top
        if (Math.abs(gap - (i ? 3 * L : L)) > 0.5) bad.push(`p${pi + 1}c${ci + 1}q${i + 1} 간격 ${(gap / L).toFixed(2)}줄`)
      })
    })
  })
  return { pages: document.querySelectorAll('.page').length, questions: qn, lineHeightPx: L, bad }
})
await page.pdf({ path: resolve(outDir, '공통수학2_집합과명제_20문제_시험출력.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true })
await page.setViewportSize({ width: 794, height: 1123 })
await page.locator('.page').first().screenshot({ path: resolve(outDir, '_첫쪽.png') })
await browser.close()
console.log(JSON.stringify({ 출제: g.items.length, 부족: g.shortage, 인접대체: g.substituted, ...report }))
