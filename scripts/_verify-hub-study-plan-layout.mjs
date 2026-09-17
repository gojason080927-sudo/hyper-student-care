/**
 * My Study Plan 상세 화면 360/390/430 overflow 실측.
 * 실행: node scripts/_verify-hub-study-plan-layout.mjs
 */
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 5176
const URL = `http://127.0.0.1:${PORT}/dev/hub-study-plan-layout`
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
]
const ARTIFACT_DIR = '/opt/cursor/artifacts/hub-study-plan-v2'

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureDevServer() {
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(2000) })
    if (res.ok) return null
  } catch {
    // start below
  }
  const child = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT)], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
    detached: true,
  })
  const started = Date.now()
  let ready = false
  while (!ready && Date.now() - started < 90000) {
    await wait(400)
    try {
      const res = await fetch(URL, { signal: AbortSignal.timeout(1000) })
      if (res.ok) ready = true
    } catch {
      // keep waiting
    }
  }
  if (!ready) {
    try {
      if (child.pid) process.kill(-child.pid, 'SIGKILL')
    } catch {
      child.kill('SIGKILL')
    }
    throw new Error('vite dev server failed to start')
  }
  return child
}

const server = await ensureDevServer()
mkdirSync(ARTIFACT_DIR, { recursive: true })

const browser = await chromium.launch({ headless: true })
const report = []

try {
  for (const { name, width, height } of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 2,
    })
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-study-plan-rate]')
    await page.waitForTimeout(250)

    const fails = []
    const overflowX = await page.evaluate(() => {
      const root = document.scrollingElement || document.documentElement
      return Math.max(0, root.scrollWidth - root.clientWidth)
    })
    if (overflowX > 1) fails.push(`overflowX=${overflowX}`)

    const rateText = await page.locator('[data-study-plan-rate]').innerText()
    if (!rateText.includes('이번 주 달성률')) fails.push('missing weekly title')
    if (!rateText.includes('%') && !rateText.includes('—')) fails.push('missing percent')

    const completedBtns = await page.locator('[data-result-completed]').count()
    const failedBtns = await page.locator('[data-result-failed]').count()
    if (completedBtns < 1) fails.push('missing 완료 buttons')
    if (failedBtns < 1) fails.push('missing 실패 buttons')
    if ((await page.locator('text=미실행').count()) > 0) fails.push('미실행 present')
    if ((await page.locator('text=보류').count()) > 0) fails.push('보류 present')

    const deleteBtns = await page.locator('[data-plan-delete]').count()
    if (deleteBtns < 1) fails.push('pending delete missing')
    const completedCards = await page.locator('.hub-plan-card.is-done [data-plan-delete]').count()
    const failedCards = await page.locator('.hub-plan-card.is-failed [data-plan-delete]').count()
    if (completedCards !== 0) fails.push('completed plan still has delete')
    if (failedCards !== 0) fails.push('failed plan still has delete')

    const shot = `${ARTIFACT_DIR}/study-plan-integrity-${name}.png`
    await page.screenshot({ path: shot, fullPage: true })
    report.push({ name, width, overflowX, fails, shot })
    await page.close()
    if (fails.length) {
      throw new Error(`${name}: ${fails.join('; ')}`)
    }
    console.log(`viewport ${name} ok overflowX=${overflowX}`)
  }
} finally {
  await browser.close()
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGKILL')
    } catch {
      server.kill('SIGKILL')
    }
  }
}

console.log('_verify-hub-study-plan-layout.mjs passed')
console.log(JSON.stringify(report, null, 2))
