/**
 * 학부모 모바일 레이아웃 360/390/430 실측.
 * 실행: node scripts/_verify-parent-mobile-layout.mjs
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 5174
const URL = `http://127.0.0.1:${PORT}/dev/parent-mobile-layout`
const WIDTHS = [360, 390, 430]
const ARTIFACT_DIR = '/opt/cursor/artifacts/parent-mobile-layout'

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
  let ready = false
  const onData = (buf) => {
    const text = buf.toString()
    if (text.includes('Local:') || text.includes(String(PORT))) ready = true
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
  const started = Date.now()
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
mkdirSync('/tmp/parent-mobile-layout', { recursive: true })

const browser = await chromium.launch({ headless: true })
const report = []

try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({
      viewport: { width, height: 844 },
      deviceScaleFactor: 2,
    })
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-preview-section="home"]')
    await page.waitForSelector('[data-preview-section="today-report"]')
    await page.waitForTimeout(400)

    const metrics = await page.evaluate(() => {
      const root = document.documentElement
      const badges = [...document.querySelectorAll('span, button')].filter((el) =>
        /🟢 우수|🔵 양호|🟡 주의|🔴 위험/.test(el.textContent ?? ''),
      )
      const clippedBadges = badges
        .filter((el) => {
          const rect = el.getBoundingClientRect()
          return (
            rect.width < 12 ||
            rect.height < 10 ||
            rect.right > window.innerWidth + 1 ||
            rect.left < -1
          )
        })
        .map((el) => (el.textContent ?? '').trim())

      const titles = [
        ...document.querySelectorAll(
          '[data-preview-section="today-report"] p.break-words.text-base.font-bold',
        ),
      ]
      const homeworkTitle = titles[0]
      const progressTitle = titles[1]
      const name = document.querySelector('[data-preview-section="today-report"] h1')
      const badge = badges[0]
      const textOverlaps = []
      if (name && badge) {
        const a = name.getBoundingClientRect()
        const b = badge.getBoundingClientRect()
        const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (overlapW > 2 && overlapH > 2) textOverlaps.push('student name x risk badge')
      }

      const largeGaps = []
      const sections = [
        ...document.querySelectorAll('[data-preview-section="today-report"] > section'),
      ]
      for (let i = 0; i < sections.length - 1; i += 1) {
        const gap =
          sections[i + 1].getBoundingClientRect().top - sections[i].getBoundingClientRect().bottom
        if (gap > 40) {
          largeGaps.push(
            `${Math.round(gap)}px after ${sections[i].querySelector('h2')?.textContent ?? 'section'}`,
          )
        }
      }

      const homeTags = [...document.querySelectorAll('[data-preview-section="home"] .pm-featured-tag')].map(
        (el) => (el.textContent ?? '').trim(),
      )
      const evaluationTitle = (
        [...document.querySelectorAll('[data-preview-section="today-report"] p')].find((el) =>
          (el.textContent ?? '').includes('전일 학습 종합 평가'),
        )?.textContent ?? ''
      ).trim()
      const gradeLegend = [...document.querySelectorAll('[data-preview-grades] span, [data-preview-grades] button')].map(
        (el) => (el.textContent ?? '').trim(),
      )

      return {
        innerWidth: window.innerWidth,
        scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
        clippedBadges,
        textOverlaps,
        homeworkTitleFontSize: homeworkTitle ? getComputedStyle(homeworkTitle).fontSize : '',
        progressTitleFontSize: progressTitle ? getComputedStyle(progressTitle).fontSize : '',
        homeworkTitleText: homeworkTitle?.textContent?.trim() ?? '',
        progressTitleText: progressTitle?.textContent?.trim() ?? '',
        largeGaps,
        homeTags,
        evaluationTitle,
        gradeLegend,
      }
    })

    const fails = []
    if (metrics.scrollWidth > metrics.innerWidth + 1) {
      fails.push(`horizontal overflow ${metrics.scrollWidth} > ${metrics.innerWidth}`)
    }
    for (const badge of metrics.clippedBadges) fails.push(`badge clipped: ${badge}`)
    for (const overlap of metrics.textOverlaps) fails.push(`text overlap: ${overlap}`)
    if (metrics.homeworkTitleFontSize !== metrics.progressTitleFontSize) {
      fails.push(
        `homework/progress title size mismatch ${metrics.homeworkTitleFontSize} vs ${metrics.progressTitleFontSize}`,
      )
    }
    for (const gap of metrics.largeGaps) fails.push(`large empty gap: ${gap}`)
    if (JSON.stringify(metrics.homeTags) !== JSON.stringify(['출결', '오늘의 진도', '과제 수행', '일일 테스트', '수업태도'])) {
      fails.push(`HOME chips ${JSON.stringify(metrics.homeTags)}`)
    }
    if (metrics.evaluationTitle !== '전일 학습 종합 평가') {
      fails.push(`evaluation title: ${metrics.evaluationTitle}`)
    }
    if (
      !metrics.gradeLegend.includes('🟢 우수') ||
      !metrics.gradeLegend.includes('🔵 양호') ||
      !metrics.gradeLegend.includes('🟡 주의') ||
      !metrics.gradeLegend.includes('🔴 위험')
    ) {
      fails.push(`grade legend ${JSON.stringify(metrics.gradeLegend)}`)
    }

    const screenshotPath = `${ARTIFACT_DIR}/parent-mobile-${width}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await page.screenshot({
      path: `/tmp/parent-mobile-layout/parent-mobile-${width}.png`,
      fullPage: true,
    })
    report.push({ width, metrics, fails, screenshotPath })
    await page.close()
  }
} finally {
  await browser.close()
  if (server?.pid) {
    try {
      process.kill(-server.pid, 'SIGKILL')
    } catch {
      try {
        server.kill('SIGKILL')
      } catch {
        // already gone
      }
    }
  }
}

writeFileSync(`${ARTIFACT_DIR}/report.json`, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (report.some((item) => item.fails.length > 0)) process.exit(1)
console.log('parent mobile layout OK')
