/**
 * 실행: node --experimental-strip-types src/lib/admissionStrategy/viewerNavigation.test.ts
 */
import assert from 'node:assert/strict'
import {
  clampPageIndex,
  edgeTapDirection,
  shouldAcceptViewerNavigation,
  stepPageIndex,
  VIEWER_GHOST_MOUSE_MS,
  VIEWER_POINTER_NAV_COOLDOWN_MS,
} from './viewerNavigation.ts'

assert.equal(clampPageIndex(0, 20), 0)
assert.equal(clampPageIndex(19, 20), 19)
assert.equal(clampPageIndex(-1, 20), 0)
assert.equal(clampPageIndex(20, 20), 19)
assert.equal(clampPageIndex(7, 0), 0)

assert.equal(stepPageIndex(0, 1, 20), 1)
assert.equal(stepPageIndex(1, 1, 20), 2)
assert.equal(stepPageIndex(18, 1, 20), 19)
assert.equal(stepPageIndex(19, 1, 20), 19)
assert.equal(stepPageIndex(1, -1, 20), 0)
assert.equal(stepPageIndex(0, -1, 20), 0)
assert.equal(stepPageIndex(6, 1, 20), 7)
assert.equal(stepPageIndex(18, 1, 20), 19)

const landscape = { left: 0, width: 844 }
assert.equal(edgeTapDirection(40, landscape), -1)
assert.equal(edgeTapDirection(422, landscape), 0)
assert.equal(edgeTapDirection(800, landscape), 1)

const portrait = { left: 0, width: 390 }
assert.equal(edgeTapDirection(50, portrait), -1)
assert.equal(edgeTapDirection(195, portrait), 0)
assert.equal(edgeTapDirection(360, portrait), 1)

const padded = { left: 47, width: 750 }
assert.equal(edgeTapDirection(60, padded), -1)
assert.equal(edgeTapDirection(400, padded), 0)
assert.equal(edgeTapDirection(780, padded), 1)

assert.equal(
  shouldAcceptViewerNavigation({ now: 1000, lastAcceptedAt: 0 }),
  true,
)
assert.equal(
  shouldAcceptViewerNavigation({
    now: VIEWER_POINTER_NAV_COOLDOWN_MS - 1,
    lastAcceptedAt: 0,
  }),
  false,
)
assert.equal(
  shouldAcceptViewerNavigation({
    now: 1000,
    lastAcceptedAt: 900,
    pointerType: 'mouse',
    lastTouchAt: 1000 - (VIEWER_GHOST_MOUSE_MS - 10),
  }),
  false,
)
assert.equal(
  shouldAcceptViewerNavigation({
    now: 2000,
    lastAcceptedAt: 1000,
    pointerType: 'mouse',
    lastTouchAt: 1000,
  }),
  true,
)
assert.equal(
  shouldAcceptViewerNavigation({
    now: 2000,
    lastAcceptedAt: 1000,
    pointerType: 'touch',
    lastTouchAt: 2000,
  }),
  true,
)

console.log('viewerNavigation OK')
