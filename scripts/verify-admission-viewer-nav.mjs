/**
 * 입시전략 뷰어: 한 입력 = pageIndex ±1.
 * 키보드로 대체하지 않고, 실제 edge tap / swipe / control click으로 연속 이동한다.
 *
 * 실행: node scripts/verify-admission-viewer-nav.mjs
 * 개발 서버: npx vite --port 5174  (vite preview 는 /dev/admission-viewer 가 없다)
 */
import { chromium, devices } from 'playwright'

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5174'
const URL = `${BASE}/dev/admission-viewer`
const TAP_GAP_MS = 320

function fail(message) {
  console.error(`FAIL ${message}`)
  throw new Error(message)
}

function ok(message) {
  console.log(`OK   ${message}`)
}

async function pageNumber(page) {
  const label = page.locator('[data-testid="viewer-page-label"]')
  await label.waitFor({ state: 'visible', timeout: 15_000 })
  const value = await label.getAttribute('data-page')
  return Number(value)
}

async function navLog(page) {
  return page.evaluate(() => window.__admissionViewerNav ?? [])
}

async function waitGap(page) {
  await page.waitForTimeout(TAP_GAP_MS)
}

async function firePointer(page, clientX, clientY, pointerType, type, pointerId = 1) {
  await page.evaluate(
    ({ selector, clientX: x, clientY: y, pointerType: pt, type: eventType, pointerId: id }) => {
      const el = document.querySelector(selector)
      if (!el) throw new Error(`missing ${selector}`)
      el.dispatchEvent(
        new PointerEvent(eventType, {
          bubbles: true,
          cancelable: true,
          composed: true,
          pointerId: id,
          pointerType: pt,
          clientX: x,
          clientY: y,
          screenX: x,
          screenY: y,
          isPrimary: true,
          button: 0,
          buttons: eventType === 'pointerdown' ? 1 : 0,
        }),
      )
    },
    {
      selector: '[data-testid="viewer-stage"]',
      clientX,
      clientY,
      pointerType,
      type,
      pointerId,
    },
  )
}

async function stageBox(page) {
  const box = await page.locator('[data-testid="viewer-stage"]').boundingBox()
  if (!box) fail('viewer stage bounding box missing')
  return box
}

async function edgeTap(page, side, pointerType = 'touch') {
  const box = await stageBox(page)
  const x = side === 'right' ? box.x + box.width * 0.92 : box.x + box.width * 0.08
  const y = box.y + box.height / 2
  await firePointer(page, x, y, pointerType, 'pointerdown')
  await firePointer(page, x, y, pointerType, 'pointerup')
}

async function overlayButtonSlotTap(page, side, pointerType = 'touch') {
  const box = await stageBox(page)
  const x = side === 'right' ? box.x + box.width - 4 - 22 : box.x + 4 + 22
  const y = box.y + box.height / 2
  await firePointer(page, x, y, pointerType, 'pointerdown')
  await firePointer(page, x, y, pointerType, 'pointerup')
}

async function swipe(page, direction, pointerType = 'touch') {
  const box = await stageBox(page)
  const y = box.y + box.height / 2
  const startX = box.x + box.width / 2
  const endX = direction === 'next' ? startX - 120 : startX + 120
  await firePointer(page, startX, y, pointerType, 'pointerdown')
  await firePointer(page, endX, y, pointerType, 'pointerup')
}

async function ghostMouseAfterTouch(page, side) {
  const box = await stageBox(page)
  const x = side === 'right' ? box.x + box.width * 0.92 : box.x + box.width * 0.08
  const y = box.y + box.height / 2
  await firePointer(page, x, y, 'touch', 'pointerdown', 1)
  await firePointer(page, x, y, 'touch', 'pointerup', 1)
  await firePointer(page, x, y, 'mouse', 'pointerdown', 2)
  await firePointer(page, x, y, 'mouse', 'pointerup', 2)
}

async function sequential(page, label, from, to, act) {
  const expectedDelta = Math.sign(to - from)
  let current = await pageNumber(page)
  if (current !== from) fail(`${label}: start page ${current}, expected ${from}`)
  const beforeLog = (await navLog(page)).length
  while (current !== to) {
    await act()
    await waitGap(page)
    const next = await pageNumber(page)
    const delta = next - current
    if (delta !== expectedDelta) {
      fail(`${label}: ${current} → ${next} (delta ${delta}), expected ${expectedDelta}`)
    }
    current = next
  }
  const added = (await navLog(page)).length - beforeLog
  const expectedSteps = Math.abs(to - from)
  if (added !== expectedSteps) {
    fail(`${label}: nav records +${added}, expected ${expectedSteps}`)
  }
  ok(`${label}: ${from} → ${to} (${expectedSteps} steps, ±1 each)`)
}

async function openViewer(context) {
  const page = await context.newPage()
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.locator('[data-testid="viewer-stage"]').waitFor({ state: 'visible', timeout: 15_000 })
  const n = await pageNumber(page)
  if (n !== 1) fail(`viewer opened at page ${n}, expected 1`)
  return page
}

const iphone = devices['iPhone 12']
const iphoneLandscape = devices['iPhone 12 landscape']

const browser = await chromium.launch({ headless: true })

try {
  {
    const context = await browser.newContext({
      ...iphoneLandscape,
      locale: 'ko-KR',
    })
    const page = await openViewer(context)

    await sequential(page, 'landscape right-edge 1→20', 1, 20, () => edgeTap(page, 'right'))
    await sequential(page, 'landscape left-edge 20→1', 20, 1, () => edgeTap(page, 'left'))

    await page.locator('[aria-label="닫기"]').click()
    await page.getByRole('button', { name: '뷰어 열기' }).click()
    await page.locator('[data-testid="viewer-stage"]').waitFor({ state: 'visible' })

    await sequential(page, 'landscape overlay-slot 1→20', 1, 20, () => overlayButtonSlotTap(page, 'right'))
    await sequential(page, 'landscape overlay-slot 20→1', 20, 1, () => overlayButtonSlotTap(page, 'left'))

    await page.locator('[aria-label="닫기"]').click()
    await page.getByRole('button', { name: '뷰어 열기' }).click()
    await page.locator('[data-testid="viewer-stage"]').waitFor({ state: 'visible' })

    await sequential(page, 'landscape swipe 1→20', 1, 20, () => swipe(page, 'next'))
    await sequential(page, 'landscape swipe 20→1', 20, 1, () => swipe(page, 'prev'))

    await page.locator('[aria-label="닫기"]').click()
    await page.getByRole('button', { name: '뷰어 열기' }).click()
    await page.locator('[data-testid="viewer-stage"]').waitFor({ state: 'visible' })

    const beforeGhost = await pageNumber(page)
    await ghostMouseAfterTouch(page, 'right')
    await waitGap(page)
    const afterGhost = await pageNumber(page)
    if (afterGhost - beforeGhost !== 1) {
      fail(`ghost mouse after touch: ${beforeGhost} → ${afterGhost}`)
    }
    ok('landscape touch + compatibility mouse = ±1')

    await context.close()
  }

  {
    const context = await browser.newContext({
      ...iphone,
      locale: 'ko-KR',
    })
    const page = await openViewer(context)
    await sequential(page, 'portrait right-edge 1→20', 1, 20, () => edgeTap(page, 'right'))
    await sequential(page, 'portrait left-edge 20→1', 20, 1, () => edgeTap(page, 'left'))
    await context.close()
  }

  {
    const context = await browser.newContext({
      ...iphone,
      locale: 'ko-KR',
    })
    const page = await openViewer(context)
    await sequential(page, 'orientation prep 1→7', 1, 7, () => edgeTap(page, 'right'))
    await page.setViewportSize({ width: iphoneLandscape.viewport.width, height: iphoneLandscape.viewport.height })
    await waitGap(page)
    const after7 = await pageNumber(page)
    if (after7 !== 7) fail(`rotate at 7: now ${after7}`)
    ok('orientation 7 → 7')

    await sequential(page, 'after rotate continue 7→19', 7, 19, () => edgeTap(page, 'right'))
    await page.setViewportSize({ width: iphone.viewport.width, height: iphone.viewport.height })
    await waitGap(page)
    const after19 = await pageNumber(page)
    if (after19 !== 19) fail(`rotate at 19: now ${after19}`)
    ok('orientation 19 → 19')
    await context.close()
  }

  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'ko-KR',
    })
    const page = await openViewer(context)
    const nextBtn = page.locator('[data-viewer-control="next"]')
    await nextBtn.waitFor({ state: 'visible', timeout: 5_000 })
    await sequential(page, 'desktop control 1→5', 1, 5, () => nextBtn.click())
    const prevBtn = page.locator('[data-viewer-control="prev"]')
    await sequential(page, 'desktop control 5→1', 5, 1, () => prevBtn.click())

    const box = await nextBtn.boundingBox()
    if (!box) fail('next button box missing')
    const before = await pageNumber(page)
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await waitGap(page)
    const after = await pageNumber(page)
    if (after - before !== 1) fail(`desktop next-button hit: ${before} → ${after}`)
    ok('desktop next-button coordinates = ±1 (not +2)')
    await context.close()
  }

  ok('all viewer navigation sequences passed')
} finally {
  await browser.close()
}
