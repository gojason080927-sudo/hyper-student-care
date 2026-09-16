/**
 * Mobile viewport check for teacher daily-test physical voice diagnostic.
 * 실행: npx tsx scripts/verify-iphone-voice-diagnostic-viewports.ts
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '430', width: 430, height: 932 },
] as const

const base = process.env.VOICE_DIAGNOSTIC_PREVIEW_URL ?? 'http://127.0.0.1:5173'
const url = `${base.replace(/\/$/, '')}/dev/teacher-today-report-layout`

const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
    const panel = page.locator('[data-iphone-voice-diagnostic="true"]')
    await panel.first().waitFor({ state: 'visible', timeout: 20_000 })
    const box = await panel.first().boundingBox()
    assert.ok(box, `${viewport.name} missing diagnostic panel`)
    assert.ok(box.width <= viewport.width + 1, `${viewport.name} overflow width=${box.width}`)
    const copy = page.locator('[data-iphone-voice-diagnostic-copy="true"]')
    await copy.first().waitFor({ state: 'visible' })
    const copyBox = await copy.first().boundingBox()
    assert.ok(copyBox, `${viewport.name} missing copy button`)
    assert.ok(copyBox.width <= viewport.width, `${viewport.name} copy overflow`)
    const toggle = page.locator('[data-iphone-voice-diagnostic-toggle="true"]')
    await toggle.first().waitFor({ state: 'visible' })
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    assert.ok(overflowX <= 1, `${viewport.name} page overflowX=${overflowX}`)
    await page.close()
    console.log(`viewport ${viewport.name} ok`)
  }
} finally {
  await browser.close()
}

console.log('verify-iphone-voice-diagnostic-viewports.ts passed')
