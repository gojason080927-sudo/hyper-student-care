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
    const daily = page.locator('[data-preview-block="daily-test"]')
    await daily.waitFor({ state: 'visible' })
    const mic = daily.locator('[data-voice-input] button').first()
    const recording = daily.locator('[data-voice-listening-hint=""]')
    const transcribing = daily.locator('[data-voice-transcribing="true"]')
    const error = daily.locator('[data-voice-error="true"]')
    const summary = daily.locator('[data-voice-summary="true"]')
    await mic.waitFor({ state: 'visible' })
    await recording.first().waitFor({ state: 'visible' })
    await transcribing.first().waitFor({ state: 'visible' })
    await error.first().waitFor({ state: 'visible' })
    await summary.first().waitFor({ state: 'visible' })
    assert.match((await mic.innerText()).replace(/\s+/g, ''), /음성입력/)
    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    assert.ok(overflowX <= 1, `${viewport.name} overflowX=${overflowX}`)

    const nav = page.locator('nav[aria-label="강사용 모바일 메뉴"]')
    assert.ok(await nav.count())

    async function assertAboveNav(locator: ReturnType<typeof page.locator>, label: string) {
      const handle = locator.first()
      await handle.evaluate((el) => {
        const navEl = document.querySelector('nav[aria-label="강사용 모바일 메뉴"]')
        const navH = navEl?.getBoundingClientRect().height ?? 72
        el.scrollIntoView({ block: 'center', inline: 'nearest' })
        const rect = el.getBoundingClientRect()
        const limit = window.innerHeight - navH - 8
        if (rect.bottom > limit) window.scrollBy(0, rect.bottom - limit)
      })
      const box = await handle.boundingBox()
      const navBox = await nav.boundingBox()
      assert.ok(box, `${viewport.name} missing ${label}`)
      assert.ok(navBox, `${viewport.name} missing bottom nav`)
      assert.ok(
        box.y + box.height <= navBox.y + 2,
        `${viewport.name} ${label} overlaps bottom nav (el=${box.y}+${box.height} nav=${navBox.y})`,
      )
    }

    await assertAboveNav(mic, 'mic')
    await assertAboveNav(recording, 'recording')
    await assertAboveNav(transcribing, 'transcribing')
    await assertAboveNav(error, 'error')

    const shotDir = process.env.VOICE_STT_SCREENSHOT_DIR
    if (shotDir && (viewport.name === '390x844' || viewport.name === '360')) {
      await daily.scrollIntoViewIfNeeded()
      await page.screenshot({
        path: `${shotDir}/iphone_recorded_stt_daily_test_${viewport.name}.png`,
        fullPage: false,
      })
    }
    await page.close()
    console.log(`viewport ${viewport.name} ok`)
  }
} finally {
  await browser.close()
}

console.log('verify-iphone-recorded-stt-viewports.ts passed')
