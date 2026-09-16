/**
 * Mobile viewport check for iPhone recorded-STT daily-test UI states.
 * 실행: npx tsx scripts/verify-iphone-recorded-stt-viewports.ts
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

const base = process.env.VOICE_STT_PREVIEW_URL ?? 'http://127.0.0.1:5173'
const url = `${base.replace(/\/$/, '')}/dev/teacher-today-report-layout`

const browser = await chromium.launch({ headless: true })
try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 })
    await page.locator('[data-preview-block="daily-test"]').waitFor({ state: 'visible' })
    const recording = page.locator('[data-voice-listening-hint=""]')
    const transcribing = page.locator('[data-voice-transcribing="true"]')
    const error = page.locator('[data-voice-error="true"]')
    const summary = page.locator('[data-preview-block="daily-test"] [data-voice-summary="true"]')
    await recording.first().waitFor({ state: 'visible' })
    await transcribing.first().waitFor({ state: 'visible' })
    await error.first().waitFor({ state: 'visible' })
    await summary.first().waitFor({ state: 'visible' })
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    assert.ok(overflowX <= 1, `${viewport.name} overflowX=${overflowX}`)
        const navBox = await page.locator('nav[aria-label="강사용 모바일 메뉴"]').boundingBox()
        const errorBox = await error.first().boundingBox()
        const recordingBox = await recording.first().boundingBox()
        const transcribingBox = await transcribing.first().boundingBox()
        assert.ok(navBox, `${viewport.name} missing bottom nav`)
        for (const [label, box] of [
          ['error', errorBox],
          ['recording', recordingBox],
          ['transcribing', transcribingBox],
        ] as const) {
          assert.ok(box, `${viewport.name} missing ${label}`)
          assert.ok(
            box!.y + box!.height <= navBox!.y + 2,
            `${viewport.name} ${label} overlaps bottom nav`,
          )
        }
        const shotDir = process.env.VOICE_STT_SCREENSHOT_DIR
        if (shotDir && viewport.name === '390x844') {
          await page.screenshot({
            path: `${shotDir}/iphone_recorded_stt_daily_test_${viewport.name}.png`,
            fullPage: true,
          })
        }
    await page.close()
    console.log(`viewport ${viewport.name} ok`)
  }
} finally {
  await browser.close()
}

console.log('verify-iphone-recorded-stt-viewports.ts passed')
