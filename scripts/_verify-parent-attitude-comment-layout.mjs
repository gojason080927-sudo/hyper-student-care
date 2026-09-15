/**
 * Parent Today Report 수업태도 강사의 의견 모바일 wrap 실측.
 * 실행: node scripts/_verify-parent-attitude-comment-layout.mjs
 */
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 5175
const URL = `http://127.0.0.1:${PORT}/dev/parent-mobile-layout`
const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '390x844', width: 390, height: 844 },
  { name: '393x852', width: 393, height: 852 },
  { name: '430', width: 430, height: 932 },
]
const ARTIFACT_DIR = '/opt/cursor/artifacts/parent-attitude-teacher-comment'

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

const browser = await chromium.launch({ headless: true })
const report = []

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 2,
    })
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-preview-section="today-report"]')
    await page.waitForSelector('[data-parent-attitude-teacher-comment]')
    await page.waitForTimeout(300)

    const metrics = await page.evaluate(() => {
      const comment = document.querySelector('[data-parent-attitude-teacher-comment]')
      const withComment = document.querySelector('[data-preview-attitude="with-comment"]')
      const noComment = document.querySelector('[data-preview-attitude="no-comment"]')
      const nav = document.querySelector('nav, [data-parent-bottom-nav], .parent-bottom-nav')
      const commentRect = comment?.getBoundingClientRect()
      const commentText = comment?.querySelector('p.whitespace-pre-wrap')
      const label = comment?.querySelector('p.text-xs')?.textContent?.trim() ?? ''
      const body = commentText?.textContent?.trim() ?? ''
      const hiddenCount = noComment?.querySelectorAll('[data-parent-attitude-teacher-comment]').length ?? -1
      const overflowX =
        (comment?.scrollWidth ?? 0) > (comment?.clientWidth ?? 0) + 1 ||
        document.documentElement.scrollWidth > window.innerWidth + 1
      const clipped =
        !!commentText &&
        (commentText.scrollHeight > commentText.clientHeight + 2 ||
          commentText.scrollWidth > commentText.clientWidth + 2)
      let navOverlap = false
      if (commentRect && nav) {
        const navRect = nav.getBoundingClientRect()
        navOverlap =
          Math.min(commentRect.bottom, navRect.bottom) - Math.max(commentRect.top, navRect.top) > 2 &&
          Math.min(commentRect.right, navRect.right) - Math.max(commentRect.left, navRect.left) > 2
      }
      return {
        innerWidth: window.innerWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        label,
        body,
        hiddenCount,
        withCommentVisible: Boolean(withComment && comment),
        overflowX,
        clipped,
        navOverlap,
        commentWidth: commentRect?.width ?? 0,
      }
    })

    const fails = []
    if (metrics.label !== '강사의 의견') fails.push(`label: ${metrics.label}`)
    if (!metrics.body.includes('이차함수')) fails.push(`missing long comment: ${metrics.body}`)
    if (metrics.hiddenCount !== 0) fails.push(`empty-note UI leaked: ${metrics.hiddenCount}`)
    if (metrics.overflowX || metrics.scrollWidth > metrics.innerWidth + 1) {
      fails.push(`horizontal overflow ${metrics.scrollWidth} > ${metrics.innerWidth}`)
    }
    if (metrics.clipped) fails.push('comment text clipped')
    if (metrics.navOverlap) fails.push('bottom nav overlap')
    if (metrics.commentWidth > metrics.innerWidth) fails.push('comment wider than viewport')

    const screenshotPath = `${ARTIFACT_DIR}/attitude-comment-${viewport.name}.png`
    await page.locator('[data-preview-attitude="with-comment"]').screenshot({ path: screenshotPath })
    report.push({ viewport: viewport.name, metrics, fails, screenshotPath })
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
const failed = report.filter((row) => row.fails.length > 0)
if (failed.length > 0) {
  console.error(JSON.stringify(failed, null, 2))
  process.exit(1)
}
console.log(`parent attitude comment layout OK ${VIEWPORTS.map((item) => item.name).join(', ')}`)
