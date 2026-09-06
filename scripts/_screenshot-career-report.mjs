import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const id = '3ea14427-be55-4234-8793-40e9c6b1d812'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 900, height: 1280 } })
await page.goto(pathToFileURL(resolve(`supabase/.temp-career-report/${id}.html`)).href, { waitUntil: 'load' })
await page.emulateMedia({ media: 'print' })
const pages = page.locator('.career-print-page')
const n = await pages.count()
const metrics = await pages.evaluateAll((els) => {
  const pxPerMm = 96 / 25.4
  return els.map((el, i) => {
    const pageBox = el.getBoundingClientRect()
    const frame = el.querySelector('.career-print-frame')
    const footer = el.querySelector('.career-print-footer')
    const cards = [...el.querySelectorAll('.career-print-card, .career-print-hero, .career-print-scale-grid, .career-print-page5-title')]
    return {
      page: i + 1,
      overflowX: el.scrollWidth - el.clientWidth,
      overflowY: el.scrollHeight - el.clientHeight,
      frameTopMm: frame ? (frame.getBoundingClientRect().top - pageBox.top) / pxPerMm : null,
      frameRightMm: frame ? (pageBox.right - frame.getBoundingClientRect().right) / pxPerMm : null,
      frameLeftMm: frame ? (frame.getBoundingClientRect().left - pageBox.left) / pxPerMm : null,
      footerFromBottomMm: footer
        ? (pageBox.bottom - footer.getBoundingClientRect().bottom) / pxPerMm
        : null,
      lastCardToFooterMm: (() => {
        const last = cards.at(-1)
        if (!last || !footer) return null
        return (footer.getBoundingClientRect().top - last.getBoundingClientRect().bottom) / pxPerMm
      })(),
      cards: cards.map((card) => {
        const box = card.getBoundingClientRect()
        return {
          h: Math.round(box.height / pxPerMm),
          top: Math.round((box.top - pageBox.top) / pxPerMm),
        }
      }),
    }
  })
})
console.log(JSON.stringify(metrics, null, 2))
for (let i = 0; i < n; i += 1) {
  await pages.nth(i).screenshot({ path: `supabase/.temp-career-report/page-${i + 1}.png` })
}
await browser.close()
console.log(`screenshots ${n}`)
