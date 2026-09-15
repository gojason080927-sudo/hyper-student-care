/**
 * 강사 Today Report 모바일 레이아웃 360/390/430 + iPhone-representative viewports 실측.
 * 실행: node scripts/_verify-teacher-today-report-layout.mjs
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 5175
const URL = `http://127.0.0.1:${PORT}/dev/teacher-today-report-layout`
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390', width: 390, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '430', width: 430, height: 932 },
]
const ARTIFACT_DIR = '/opt/cursor/artifacts/teacher-today-report-layout'
const EXPECTED_ORDER = [
  '출결',
  '숙제 수행 결과',
  '반 공통 오늘 과제',
  '교재 준비',
  '반 공통 오늘의 진도',
  '일일테스트',
  '수업태도',
]

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
  const onData = (buf) => {
    buf.toString()
  }
  child.stdout.on('data', onData)
  child.stderr.on('data', onData)
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
mkdirSync('/tmp/teacher-today-report-layout', { recursive: true })

const browser = await chromium.launch({ headless: true })
const report = []

try {
  for (const { name, width, height } of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 2,
    })
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-preview-section="today-report"]')
    await page.waitForTimeout(300)

    const fails = []

    const riskBadges = await page.locator('text=/🟢 우수|🟡 주의|🔴 위험/').count()
    if (riskBadges > 0) fails.push(`teacher risk badges: ${riskBadges}`)

    const feedback = await page.locator('text=강사 피드백').count()
    if (feedback > 0) fails.push('teacher 강사 피드백 section present')

    const labels = await page.$$eval('[data-section-label]', (els) =>
      els.map((el) => el.getAttribute('data-section-label')),
    )
    if (JSON.stringify(labels) !== JSON.stringify(EXPECTED_ORDER)) {
      fails.push(`section order ${JSON.stringify(labels)}`)
    }
    const prepIndex = labels.indexOf('교재 준비')
    const progressIndex = labels.indexOf('반 공통 오늘의 진도')
    if (!(prepIndex >= 0 && progressIndex === prepIndex + 1)) {
      fails.push('교재 준비 is not immediately above 오늘의 진도')
    }

    const homeCopy = await page.locator('[data-preview-section="home"]').innerText()
    if (!homeCopy.includes('출결 · 숙제 · 교재준비') || !homeCopy.includes('진도 · 일일테스트 · 수업태도')) {
      fails.push('HOME copy mismatch')
    }
    if (homeCopy.includes('특이사항')) fails.push('HOME still mentions 특이사항')

    const collapsedIssues = await page.locator('[data-attitude-state="excellent"]').count()
    if (collapsedIssues !== 1) fails.push(`collapsed 우수 state missing (${collapsedIssues})`)
    const hiddenIssue = await page.locator('button:text("졸음")').count()
    if (hiddenIssue !== 0) fails.push('issue chips visible before expand')

    await page.getByRole('button', { name: '수업태도 우수 — 문제가 있으면 눌러 선택' }).click()
    await page.waitForSelector('[data-attitude-state="editing"]')
    for (const issue of ['집중 저하', '졸음', '잡담', '수업방해', '태도 불량']) {
      if ((await page.locator(`button:text-is("${issue}")`).count()) === 0) {
        fails.push(`missing issue chip: ${issue}`)
      }
    }

    await page.getByRole('button', { name: '졸음', exact: true }).click()
    await page.waitForSelector('[data-attitude-note]')
    const placeholder = await page.locator('[data-attitude-note] textarea').getAttribute('placeholder')
    if (placeholder !== '수업 중 확인한 내용을 간단히 입력') {
      fails.push(`memo placeholder: ${placeholder}`)
    }
    await page.locator('[data-attitude-note] textarea').fill(
      '전날 수면 부족으로 보이며 후반부에는 집중도 회복',
    )
    await page.screenshot({
      path: `${ARTIFACT_DIR}/teacher-today-report-${name}-attitude-memo.png`,
      fullPage: true,
    })

    await page.getByRole('button', { name: '졸음', exact: true }).click()
    await page.waitForSelector('[data-attitude-state="excellent"]')
    if ((await page.locator('[data-attitude-note]').count()) !== 0) {
      fails.push('memo still visible after collapse')
    }

    const attendanceOk =
      (await page.locator('text=출석').count()) > 0 &&
      (await page.locator('text=지각').count()) > 0 &&
      (await page.locator('text=결석').count()) > 0 &&
      (await page.locator('text=조퇴').count()) > 0 &&
      (await page.locator('text=인정').count()) > 0 &&
      (await page.locator('text=무단').count()) > 0
    if (!attendanceOk) fails.push('attendance 인정/무단 not visible')

    const voiceUi =
      (await page.locator('[data-voice-input]').count()) > 0 &&
      (await page.locator('button:text-is("텍스트")').count()) > 0
    if (!voiceUi) {
      fails.push('section voice input UI missing')
    } else {
      const voiceOverflowText = await page.locator('[data-voice-input]').first().innerText()
      if (voiceOverflowText.includes('확인 필요') && voiceOverflowText.length > 400) {
        fails.push('voice status text unexpectedly long')
      }
    }
    const dailyCard = await page.locator('[data-preview-block="daily-test"]').innerText()
    if (!dailyCard.includes('음성입력')) fails.push('daily-test mic chip missing')
    if (!dailyCard.includes('강사의 피드백')) fails.push('daily-test feedback label missing')
    if (!dailyCard.includes('2차 함수에 대한 이해가 늦는 거 같다')) {
      fails.push('daily-test feedback textarea missing Samsung sentence')
    }

    const homeworkOk =
      (await page.locator('text=완료').count()) > 0 &&
      (await page.locator('text=부분 완료').count()) > 0
    if (!homeworkOk) fails.push('homework 완료/부분 완료 not visible')

    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      return {
        innerWidth: window.innerWidth,
        scrollWidth: Math.max(root.scrollWidth, document.body.scrollWidth),
      }
    })
    if (overflow.scrollWidth > overflow.innerWidth + 1) {
      fails.push(`horizontal overflow ${overflow.scrollWidth} > ${overflow.innerWidth}`)
    }

    await page.locator('button', { hasText: '수업태도 일괄 저장' }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)

    const navOverlap = await page.evaluate(() => {
      const save = [...document.querySelectorAll('button')].find((el) =>
        (el.textContent ?? '').includes('수업태도 일괄 저장'),
      )
      const nav = document.querySelector('nav[aria-label="강사용 모바일 메뉴"]')
      if (!save || !nav) return 'missing save or nav'
      const a = save.getBoundingClientRect()
      const b = nav.getBoundingClientRect()
      const overlapW = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const overlapH = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (overlapW > 2 && overlapH > 2) return 'save x bottom nav'
      return ''
    })
    if (navOverlap) fails.push(navOverlap)

    const screenshotPath = `${ARTIFACT_DIR}/teacher-today-report-${name}.png`
    await page.screenshot({ path: screenshotPath, fullPage: true })
    await page.screenshot({
      path: `/tmp/teacher-today-report-layout/${name}.png`,
      fullPage: true,
    })
    report.push({ name, width, height, fails, screenshotPath, overflow })
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
console.log('teacher today report layout OK')
