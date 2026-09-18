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
    const commentBox = page.locator('[data-attitude-comment] textarea')
    if ((await commentBox.count()) === 0) fails.push('강사의 의견 textarea missing')
    const commentPlaceholder = await commentBox.getAttribute('placeholder')
    if (commentPlaceholder !== '오늘 수업에서 확인한 의견을 입력') {
      fails.push(`comment placeholder: ${commentPlaceholder}`)
    }
    await commentBox.fill('전날 수면 부족으로 보이며 후반부에는 집중도 회복')
    await page.screenshot({
      path: `${ARTIFACT_DIR}/teacher-today-report-${name}-attitude-memo.png`,
      fullPage: true,
    })

    await page.getByRole('button', { name: '졸음', exact: true }).click()
    await page.waitForSelector('[data-attitude-state="excellent"]')
    if ((await page.locator('[data-attitude-note]').count()) !== 0) {
      fails.push('issue-gated memo still visible after collapse')
    }
    if ((await page.locator('[data-attitude-comment]').count()) === 0) {
      fails.push('강사의 의견 missing after collapse')
    }

    const progressBlock = await page.locator('[data-preview-block="progress"]').innerText()
    if (!progressBlock.includes('현재 진도')) fails.push('progress current text missing')
    if (!progressBlock.includes('현재 페이지')) fails.push('progress current page missing')
    if (!progressBlock.includes('전체 페이지')) fails.push('progress total page missing')
    if ((await page.getByRole('button', { name: '수학 개념 진도 음성 입력' }).count()) === 0) {
      fails.push('progress mic chip missing')
    }

    const attitudeBlock = await page.locator('[data-preview-block="attitude"]').innerText()
    if (!attitudeBlock.includes('강사의 의견')) fails.push('attitude comment label missing')
    if (!attitudeBlock.includes('카카오')) fails.push('Kakao missing')
    if ((await page.getByRole('button', { name: '김하이퍼 강사의 의견 음성 입력' }).count()) === 0) {
      fails.push('attitude comment mic missing')
    }
    if (!attitudeBlock.includes('결석 · 입력 제외')) fails.push('attitude absent row missing')
    if ((await page.locator('[data-preview-block="attitude"] [data-absent-excluded="true"]').count()) === 0) {
      fails.push('attitude absent exclusion marker missing')
    }
    if ((await page.locator('[data-preview-block="attitude"] [data-attitude-comment]').count()) !== 1) {
      fails.push('attitude comment should exist only for attending student')
    }

    const attendanceOk =
      (await page.locator('text=출석').count()) > 0 &&
      (await page.locator('text=지각').count()) > 0 &&
      (await page.locator('text=결석').count()) > 0 &&
      (await page.locator('text=조퇴').count()) > 0 &&
      (await page.locator('text=인정').count()) > 0 &&
      (await page.locator('text=무단').count()) > 0
    if (!attendanceOk) fails.push('attendance 인정/무단 not visible')

    const holdMics = await page.locator('[data-hold-until-stop="true"]').count()
    if (holdMics < 8) fails.push(`hold-until-stop mics: ${holdMics}`)
    if ((await page.locator('[data-voice-listening="false"]').count()) !== holdMics) {
      fails.push('idle mics should not be in listening state')
    }
    for (const chip of ['출결', '숙제', '과제', '교재', '진도', '태도', '의견', '음성입력']) {
      if ((await page.locator(`button:has-text("${chip}")`).count()) === 0) {
        fails.push(`idle mic chip missing: ${chip}`)
      }
    }

    const homeworkMic = await page.locator('[data-preview-block="homework"] [data-hold-until-stop="true"]').count()
    if (homeworkMic === 0) fails.push('homework mic missing')
    const assignmentMic = await page.locator('[data-preview-block="assignment"] [data-hold-until-stop="true"]').count()
    if (assignmentMic === 0) fails.push('assignment mic missing')
    const materialMic = await page.locator('[data-preview-block="absent-excluded"] [data-hold-until-stop="true"]').count()
    if (materialMic === 0) fails.push('material mic missing')
    const dailyCard = await page.locator('[data-preview-block="daily-test"]').innerText()
    if (!dailyCard.includes('음성입력')) fails.push('daily-test mic chip missing')
    if (!dailyCard.includes('강사의 피드백')) fails.push('daily-test feedback label missing')
    if (!dailyCard.includes('오답 분석')) fails.push('daily-test error analysis missing')
    if (!dailyCard.includes('개념 부족')) fails.push('daily-test concept error missing')
    if (!dailyCard.includes('계산 실수')) fails.push('daily-test calculation error missing')
    if (!dailyCard.includes('응용 능력 부족')) fails.push('daily-test application error missing')
    if (!dailyCard.includes('문제 이해 부족')) fails.push('daily-test comprehension error missing')
    for (const round of ['1차', '2차', '3차', '4차']) {
      if (!dailyCard.includes(round)) fails.push(`daily-test ${round} missing`)
    }
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

    const liveTranscript = await page.evaluate(() => {
      const live = document.querySelector('[data-live-transcript]')
      const name = [...document.querySelectorAll('p')].find((el) => (el.textContent ?? '').trim() === '류정현')
      const nav = document.querySelector('nav[aria-label="강사용 모바일 메뉴"]')
      const score = [...document.querySelectorAll('span')].find((el) => (el.textContent ?? '').trim() === '1차')
      if (!live) return { error: 'missing live transcript' }
      const rect = live.getBoundingClientRect()
      const clipped =
        live.scrollWidth > live.clientWidth + 2 && getComputedStyle(live).overflowX === 'visible'
      let nameOverlap = false
      if (name) {
        const a = name.getBoundingClientRect()
        const overlapW = Math.min(rect.right, a.right) - Math.max(rect.left, a.left)
        const overlapH = Math.min(rect.bottom, a.bottom) - Math.max(rect.top, a.top)
        nameOverlap = overlapW > 2 && overlapH > 2
      }
      let scoreOverlap = false
      if (score) {
        const a = score.getBoundingClientRect()
        const overlapW = Math.min(rect.right, a.right) - Math.max(rect.left, a.left)
        const overlapH = Math.min(rect.bottom, a.bottom) - Math.max(rect.top, a.top)
        scoreOverlap = overlapW > 2 && overlapH > 2
      }
      let navOverlap = false
      if (nav) {
        const a = nav.getBoundingClientRect()
        const overlapW = Math.min(rect.right, a.right) - Math.max(rect.left, a.left)
        const overlapH = Math.min(rect.bottom, a.bottom) - Math.max(rect.top, a.top)
        navOverlap = overlapW > 2 && overlapH > 2
      }
      return {
        text: (live.textContent ?? '').trim(),
        overflowX: live.scrollWidth > window.innerWidth + 1,
        clipped,
        nameOverlap,
        scoreOverlap,
        navOverlap,
      }
    })
    if (liveTranscript.error) fails.push(liveTranscript.error)
    if (liveTranscript.text && !liveTranscript.text.includes('1차 30점')) {
      fails.push(`live transcript missing scores: ${liveTranscript.text}`)
    }
    if (liveTranscript.overflowX) fails.push('live transcript horizontal overflow')
    if (liveTranscript.clipped) fails.push('live transcript clipped')
    if (liveTranscript.nameOverlap) fails.push('live transcript overlaps student name')
    if (liveTranscript.scoreOverlap) fails.push('live transcript overlaps score cards')
    if (liveTranscript.navOverlap) fails.push('live transcript overlaps bottom nav')

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
